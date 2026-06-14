// components/admin/CajaReciboModal.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import ProfessionalModal from '@/components/booking/ProfessionalModal';
import CitasPendientesModal from '@/components/admin/CitasPendientesModal';
import CalcularComisionesModal from '@/components/admin/CalcularComisionesModal'; // ← AGREGAR

// ← ← ← INTERFACES ← ← ←
interface Servicio {
  id: number;
  nombre: string;
  precio_min: string | number;
  categoria_nombre: string;
  duracion?: string;              // ← ← ← AGREGADO (soluciona tu error)
  imagen_url?: string | null;     // ← ← ← AGREGADO (para línea 617)
}

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string | number;
  stock_actual: number;
  categoria_nombre: string;
  imagen_url?: string | null;     // ← ← ← AGREGADO
}

interface Profesional {
  id: number;
  nombre: string;
}

interface ReciboItem {
  id: string;
  tipo: 'servicio' | 'producto' | 'otro';
  servicioId?: number;
  productoId?: number;
  descripcion: string;
  categoria?: string; 
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  duracion?: string
  profesionalId?: number;
  profesionalNombre?: string;
  citaId?: number;
  codigoReserva?: string;
  esNuevo?: boolean;  // ← ← ← NUEVO: Para diferenciar items agregados en edición
  imagenUrl?: string | null;    // ← ← ← AGREGADO
  productosAsociados?: any[];   // ← ← ← AGREGADO
  stockActual?: number;         // ← ← ← AGREGADO
  propinaItem?: number;  // Propina asignada a este item (para envío al backend)
}

interface CajaReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCajaId?: number;  // ← ← ← OPCIONAL (con ?)
  reciboParaEditarId?: number | null;
  apiUrl?: string;
  token?: string | null;
  onReciboCreado?: (recibo: any) => void;
  onReciboActualizado?: (recibo: any) => void;
  onComisionesPagadas?: () => void;
  modalComisionesOpen?: boolean;
  onModalComisionesClose?: () => void;
}
interface AbonoRecibo {
  id: number;
  recibo: number;
  monto: number;
  metodo_pago: 'nequi' | 'transferencia' | 'efectivo' | 'daviplata' | 'bold' | 'tarjeta';
  fecha_abono: string;
  referencia_externa?: string;
  metodo_pago_display: string;
  notas?: string;
}

// ← ← ← AGREGAR A LAS INTERFACES EXISTENTES ← ← ←
interface InfoAliado {
  es_aliado: boolean;
  porcentaje: number;
  aliado_nombre: string;
  convenio_id: number | null;
  cliente_aliado_id: number | null;
}

// ← ← ← NUEVAS INTERFACES PARA BÚSQUEDA DE CLIENTES ← ← ←
interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  esRegistrado: boolean;
  userId?: number;
}

interface NuevoClienteData {
  nombre: string;
  telefono: string;
  email: string;
}




// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
// ← ← ← HELPERS: Fechas con timezone Colombia (UTC-5) ← ← ←
// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←

// Obtener fecha en formato YYYY-MM-DD en timezone Colombia
const getColombiaDate = (): string => {
  const now = new Date();
  const colombiaDate = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  const [day, month, year] = colombiaDate.split('/');
  return `${year}-${month}-${day}`;
};

// Obtener hora en formato HH:MM en timezone Colombia
const getColombiaTime = (): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
};

/// Obtener datetime completo en formato ISO Colombia CON TIMEZONE
const getColombiaDateTime = (): string => {
  const now = new Date();
  const colombiaStr = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(now).replace(',', '');
  
  // Convertir "YYYY/MM/DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS-05:00"
  const [datePart, timePart] = colombiaStr.split(' ');
  const [y, m, d] = datePart.split('/');
  
  // ← ← ← CLAVE: Agregar offset de Colombia (-05:00) ← ← ←
  return `${y}-${m}-${d}T${timePart}-05:00`;
};




export default function CajaReciboModal({
  isOpen,
  onClose,
  sessionCajaId,
  reciboParaEditarId = null,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  onReciboCreado,
  onReciboActualizado,
  onComisionesPagadas,
  modalComisionesOpen = false,
  onModalComisionesClose,
}: CajaReciboModalProps) {
  
  // ← Estados principales
  const [tipoRecibo, setTipoRecibo] = useState<'entrada' | 'salida' | 'venta'>('venta');
  const [items, setItems] = useState<ReciboItem[]>([]);
  const [descuento, setDescuento] = useState<number>(0);
  const [propinaTotal, setPropinaTotal] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>('bold');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [clienteEmail, setClienteEmail] = useState<string>('');
  const [notas, setNotas] = useState<string>('');  
  const [montoPagar, setMontoPagar] = useState<number>(0);
  const montoPagarEditedRef = useRef(false);
  
  // ← ← ← NUEVOS ESTADOS PARA BÚSQUEDA DE CLIENTES ← ← ←
const [showClientModal, setShowClientModal] = useState(false);
const [showRegisterModal, setShowRegisterModal] = useState(false);
const [clientes, setClientes] = useState<Cliente[]>([]);
const [clienteSearchTerm, setClienteSearchTerm] = useState('');
const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);
const [nuevoClienteData, setNuevoClienteData] = useState<NuevoClienteData>({
  nombre: '',
  telefono: '',
  email: ''
});


  // ← ← ← NUEVOS ESTADOS PARA MODO EDICIÓN ← ← ←
  const [modoEdicion, setModoEdicion] = useState(false);
  const [reciboEditando, setReciboEditando] = useState<any | null>(null);
  const [reciboId, setReciboId] = useState<number | null>(null);
  
  // ← ← ← NUEVOS ESTADOS PARA MODAL DE PROFESIONAL ← ← ←
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [itemParaProfesional, setItemParaProfesional] = useState<ReciboItem | null>(null);

  // ← Estados para búsqueda de citas sin recibos
  const [showCitasModal, setShowCitasModal] = useState(false);
  
  // ← Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'servicio' | 'producto'>('servicio');
  const [searchResults, setSearchResults] = useState<(Servicio | Producto)[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const [movimientoDescripcion, setMovimientoDescripcion] = useState('');
  const [movimientoCantidad, setMovimientoCantidad] = useState(1);
  const [movimientoPrecio, setMovimientoPrecio] = useState(0);

  // ← Estados para propinas
  const [showPropinaModal, setShowPropinaModal] = useState(false);
  const [propinaMetodo, setPropinaMetodo] = useState<'equitativa' | 'proporcional' | 'manual'>('proporcional');
  const [propinaDistribucion, setPropinaDistribucion] = useState<Array<{
    profesionalId: number; 
    nombre: string; 
    monto: number; 
    porcentaje: number
  }>>([]);
  const [propinaEditable, setPropinaEditable] = useState<string>('');

  // ← ← ← NUEVO: Estado para modal de comisiones ← ← ←
  const [showComisionesModal, setShowComisionesModal] = useState(false);
  
  // ← Estados de carga y guardado
  const [loading, setLoading] = useState(false);
  const [estadoRecibo, setEstadoRecibo] = useState<'borrador' | 'publicado'>('borrador');
  
  // ← ← ← NUEVO: Bandera para evitar lógica de cierre duplicada en movimientos operativos ← ← ←
  const [movimientoOperativoRegistrado, setMovimientoOperativoRegistrado] = useState(false);
  
  // ← Datos auxiliares
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState<number | null>(null);

  // ← ← ← NUEVOS ESTADOS PARA FLUJO DE ABONOS ← ← ←
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [recibido, setRecibido] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('bold');
  const [referenciaExterna, setReferenciaExterna] = useState<string>('');

  const [itemToDelete, setItemToDelete] = useState<ReciboItem | null>(null);

  // ← ← ← AGREGAR ESTE ESTADO ← ← ←
  const [mostrarSelectorTipo, setMostrarSelectorTipo] = useState(true); 

  // ← ← ← AGREGAR ESTO junto a tus otros useState ← ← ←
const subtotal = useMemo(() => {
  return items.reduce((sum, item) => {
    const precio = Number(item.precioUnitario) || 0;
    const cantidad = Number(item.cantidad) || 1;
    return sum + (cantidad * precio);
  }, 0);
}, [items]);

// ← ← ← AGREGAR ESTO ← ← ←
const [abonos, setAbonos] = useState<AbonoRecibo[]>([]);


// ← ← ← AGREGAR ESTOS ESTADOS junto a tus otros useState ← ← ←
const [infoAliado, setInfoAliado] = useState<InfoAliado>({
  es_aliado: false,
  porcentaje: 0,
  aliado_nombre: '',
  convenio_id: null,
  cliente_aliado_id: null
});

const [descuentoAliadoAutomatico, setDescuentoAliadoAutomatico] = useState<number>(0);

// ← ← ← MODIFICAR: Incluir descuento de aliado en el total ← ← ←
// ← ← ← REEMPLAZAR el useMemo de total por este:
const total = useMemo(() => {
  // Solo se aplica un descuento (el que esté en el campo descuento)
  const descuentoAplicado = Number(descuento) || 0;
  const totalCalculado = subtotal - descuentoAplicado + (tipoRecibo === 'venta' ? propinaTotal : 0);
  // No permitir totales negativos
  return Math.max(0, Math.round(totalCalculado * 100) / 100);
}, [subtotal, descuento, propinaTotal, tipoRecibo]);


// ← ← ← RESUMEN DE ABONOS (reactivo + detección de exceso de pago) ← ← ←
const resumenAbonos = useMemo(() => {
    const totalNumerico = Number(total) || 0;
    const totalAbonado = abonos.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0);

    if (!abonos.length || totalNumerico <= 0) {
        return {
            total_abonado: totalAbonado,
            saldo_pendiente: totalNumerico <= 0 ? 0 : totalNumerico,
            porcentaje_abonado: totalNumerico > 0 ? (totalAbonado / totalNumerico) * 100 : (totalAbonado > 0 ? 100 : 0),
            puede_publicar: false,
            excede_total: totalAbonado > 0 // Si hay abonos pero total <= 0, se considera exceso
        };
    }

    const saldoPendiente = Math.max(0, totalNumerico - totalAbonado);
    const porcentajeAbonado = (totalAbonado / totalNumerico) * 100;
    const excedeTotal = totalAbonado > totalNumerico;

    return {
        total_abonado: totalAbonado,
        saldo_pendiente: saldoPendiente,
        porcentaje_abonado: porcentajeAbonado,
        puede_publicar: !excedeTotal && porcentajeAbonado >= 99.99, // ← CLAVE: Solo publica si NO excede y está ~100%
        excede_total: excedeTotal
    };
}, [abonos, total]);

// ← ← ← AGREGAR ESTE useMemo PARA VALIDAR ITEMS SINCRONIZADOS ← ← ←
const hayItemsNoSincronizados = useMemo(() => {
  return items.some(item => {
    // ← ← ← VALIDAR QUE ITEM.ID EXISTA ANTES DE USAR MÉTODOS DE STRING
    if (!item.id || item.id === null || item.id === undefined) {
      return true; // Si no tiene ID, se considera no sincronizado
    }
    
    const idEsTemporal =
      item.id.startsWith('new-') ||
      item.id.startsWith('cita-') ||
      item.id.startsWith('producto-') ||
      !/^\d+$/.test(String(item.id));
    
    const esNuevoEnEdicion = modoEdicion && item.esNuevo === true;
    
    return idEsTemporal || esNuevoEnEdicion;
  });
}, [items, modoEdicion]);


// ← ← ← NUEVO: Estado para advertencia visual ← ← ←
const [advertenciaTotal, setAdvertenciaTotal] = useState(false);

// Efecto para mostrar advertencia cuando el total cambia
useEffect(() => {
  if (resumenAbonos && !resumenAbonos.puede_publicar && abonos.length > 0) {
    setAdvertenciaTotal(true);
    const timer = setTimeout(() => setAdvertenciaTotal(false), 3000);
    return () => clearTimeout(timer);
  }
}, [total, resumenAbonos?.puede_publicar]);



// En el render, mostrar advertencia:
{advertenciaTotal && (
  <div className="text-xs text-orange-400 bg-orange-900/30 px-3 py-2 rounded mb-2">
    ⚠️ El total cambió. Verifica que los abonos cubran el 100% para publicar.
  </div>
)}
  

// ← ← ← NUEVO: Estado para saber si estamos editando o creando un abono
const [abonoEditandoId, setAbonoEditandoId] = useState<number | null>(null);

// 3. FUNCIÓN para cargar resumen de abonos
const cargarResumenAbonos = async (reciboId: number) => {
  try {
    const res = await fetch(`${apiUrl}/caja/abonos/resumen/${reciboId}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      // ← ← ← SOLO actualizar la lista de abonos, NO el resumen calculado
      setAbonos(data.abonos || []);
      // ← ← ← El resumen se calculará automáticamente por el useMemo
    }
  } catch (err) {
    console.error('Error cargando abonos:', err);
    setAbonos([]);  // Fallback: lista vacía
  }
};


// ← ← ← NUEVA FUNCIÓN: Cargar clientes desde backend ← ← ←
const loadClientes = async () => {
  try {
    // 1. Cargar usuarios registrados
    const usuariosRes = await fetch(`${apiUrl}/usuarios/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    let usuariosRegistrados: Cliente[] = [];
    if (usuariosRes.ok) {
      const usuariosData = await usuariosRes.json();
      const usuariosList = Array.isArray(usuariosData) ? usuariosData : (usuariosData.results || []);
      
      usuariosRegistrados = usuariosList.map((u: any) => ({
        id: u.id,
        nombre: [u.first_name, u.last_name, '-', u.username].filter(Boolean).join(' ').trim() || u.email?.split('@')[0] || 'Usuario',
        telefono: u.perfil?.telefono || u.telefono || u.username || '',
        email: u.email || '',
        esRegistrado: true,
        userId: u.id
      }));
    }
    
    // 2. Cargar clientes de citas (no registrados)
    const citasRes = await fetch(`${apiUrl}/citas/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    let clientesNoRegistrados: Cliente[] = [];
    if (citasRes.ok) {
      const citasData = await citasRes.json();
      const citasList = Array.isArray(citasData) ? citasData : (citasData.results || []);
      
      const clientesMap = new Map<string, Cliente>();
      for (const cita of citasList) {
        const nombre = cita.cliente_nombre?.trim();
        const email = cita.cliente_email?.trim()?.toLowerCase();
        const clienteId = cita.cliente;
        
        if (!nombre || clienteId) continue;
        
        const key = `${nombre.toLowerCase()}|${email || ''}`;
        if (!clientesMap.has(key)) {
          clientesMap.set(key, {
            id: -Date.now() - Math.random() * 1000,
            nombre: nombre,
            telefono: cita.cliente_telefono || '',
            email: email || '',
            esRegistrado: false
          });
        }
      }
      clientesNoRegistrados = Array.from(clientesMap.values());
    }
    
    // 3. Combinar y ordenar
    const clientesCombinadosMap = new Map<number, Cliente>();
    for (const usuario of usuariosRegistrados) clientesCombinadosMap.set(usuario.id, usuario);
    for (const cliente of clientesNoRegistrados) clientesCombinadosMap.set(cliente.id, cliente);
    
    const todosClientes = Array.from(clientesCombinadosMap.values())
      .sort((a, b) => {
        if (a.esRegistrado && !b.esRegistrado) return -1;
        if (!a.esRegistrado && b.esRegistrado) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
    
    setClientes(todosClientes.slice(0, 300));
  } catch (err) {
    console.error('❌ Error cargando clientes:', err);
  }
};

// ← ← ← NUEVO useEffect: Cargar clientes cuando se abre el modal ← ← ←
useEffect(() => {
  if (showClientModal) {
    loadClientes();
  }
}, [showClientModal]);

// ← ← ← NUEVO useMemo: Filtrar clientes ← ← ←
const clientesFiltrados = useMemo(() => {
  if (!clienteSearchTerm.trim()) return clientes;
  return clientes.filter(c => 
    c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    c.telefono.includes(clienteSearchTerm) ||
    c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
  );
}, [clientes, clienteSearchTerm]);

const handleAgregarMovimiento = () => {
  if (!movimientoDescripcion.trim()) {
    alert('⚠️ Por favor ingresa una descripción para el movimiento.');
    return;
  }
  if (movimientoPrecio <= 0) {
    alert('⚠️ El precio unitario debe ser mayor a 0.');
    return;
  }

  const newItem: ReciboItem = {
    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ← ID temporal único
    tipo: 'otro',
    descripcion: movimientoDescripcion,
    cantidad: movimientoCantidad,
    precioUnitario: movimientoPrecio,
    subtotal: movimientoCantidad * movimientoPrecio,
    esNuevo: true,
  };

  setItems(prev => [...prev, newItem]);
  
  // Limpiar formulario de movimiento
  setMovimientoDescripcion('');
  setMovimientoCantidad(1);
  setMovimientoPrecio(0);
};


// ← ← ← NUEVA FUNCIÓN: Verificar si cliente es aliado ← ← ←
const verificarClienteAliado = async (email: string, telefono: string, citaId?: number) => {
  if (!email && !telefono && !citaId) {
    setInfoAliado({
      es_aliado: false,
      porcentaje: 0,
      aliado_nombre: '',
      convenio_id: null,
      cliente_aliado_id: null
    });
    return;
  }

  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (telefono) params.append('telefono', telefono);
    if (citaId) params.append('cita_id', String(citaId));

    const res = await fetch(
      `${apiUrl}/aliados/verificar-cliente/?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      console.log('✅ [verificarClienteAliado] Respuesta:', data);
      setInfoAliado({
        es_aliado: data.es_aliado || false,
        porcentaje: data.porcentaje || 0,
        aliado_nombre: data.aliado_nombre || '',
        convenio_id: data.convenio_id || null,
        cliente_aliado_id: data.cliente_aliado_id || null
      });
    } else {
      console.warn('⚠️ [verificarClienteAliado] No se pudo verificar:', res.status);
      setInfoAliado({
        es_aliado: false,
        porcentaje: 0,
        aliado_nombre: '',
        convenio_id: null,
        cliente_aliado_id: null
      });
    }
  } catch (error) {
    console.error('❌ [verificarClienteAliado] Error:', error);
    setInfoAliado({
      es_aliado: false,
      porcentaje: 0,
      aliado_nombre: '',
      convenio_id: null,
      cliente_aliado_id: null
    });
  }
};


// ← ← ← NUEVAS FUNCIONES: Selección de cliente ← ← ←
const handleClienteSelect = (cliente: Cliente) => {
  setClienteNombre(cliente.nombre);
  setClienteTelefono(cliente.telefono);
  setClienteEmail(cliente.email);
  setClienteSeleccionadoId(cliente.esRegistrado ? cliente.userId || null : null);
  setShowClientModal(false);
  setClienteSearchTerm(''); // Limpiar búsqueda
};

const handleNuevoCliente = () => {
  setNuevoClienteData({ nombre: '', telefono: '', email: '' });
  setShowRegisterModal(true);
};

const handleGuardarNuevoCliente = () => {
  if (!nuevoClienteData.nombre.trim()) {
    alert('⚠️ El nombre es requerido');
    return;
  }
  
  setClienteNombre(nuevoClienteData.nombre);
  setClienteTelefono(nuevoClienteData.telefono);
  setClienteEmail(nuevoClienteData.email);
  setClienteSeleccionadoId(null);
  setShowRegisterModal(false);
  setShowClientModal(false);
  alert(`✅ Cliente "${nuevoClienteData.nombre}" agregado`);
};

// ← ← ← NUEVA FUNCIÓN: Registrar Movimiento Operativo (Entrada/Salida) ← ← ←
const handleRegistrarMovimientoOperativo = async () => {
    // ← ← ← VALIDACIONES ← ← ←
    if (items.length === 0) {
        alert('⚠️ Agrega al menos un concepto al movimiento.');
        return;
    }
    if (!sessionCajaId) {
        alert('⚠️ No hay sesión de caja activa. Por favor abre una sesión primero.');
        return;
    }
    if (!metodoPago) {
        alert('⚠️ Selecciona un método de pago/recepción.');
        return;
    }

    // Confirmación antes de publicar
    const confirmar = window.confirm(
        `¿Confirmar registro de ${tipoRecibo === 'entrada' ? 'INGRESO' : 'GASTO'}?\n` +
        `• Total: ${formatMoney(total)}\n` +
        `• Método: ${metodoPago}\n` +
        `• Items: ${items.length}\n` +
        `Esta acción registrará el movimiento y descontará/sumará de la caja inmediatamente.`
    );
    if (!confirmar) return;

    setLoading(true);
    try {
        // ← ← ← PREPARAR PAYLOAD ← ← ←
        const payload: any = {
            tipo: tipoRecibo,
            estado: 'publicado',
            subtotal: subtotal,
            descuento: 0,
            total: total,
            propina_total: 0,
            propina_metodo_distribucion: null,
            metodo_pago: metodoPago,
            session_caja: sessionCajaId,
            cliente_nombre: tipoRecibo === 'entrada'
                ? (clienteNombre?.trim() || 'Ingreso Operativo')
                : (clienteNombre?.trim() || 'Gasto Operativo'),
            cliente_telefono: '',
            cliente_email: '',
            notas: notas || `${tipoRecibo === 'entrada' ? 'Ingreso' : 'Gasto'} operativo registrado desde caja`,
            items_data: items.map(item => ({
                tipo_item: 'otro',
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio_unitario: item.precioUnitario,
                subtotal: item.subtotal,
            }))
        };

        let reciboCreado;

        // ← ← ← CLAVE: Si ya existe un reciboId (borrador), hacer PATCH en lugar de POST ← ← ←
        if (reciboId) {
            console.log('🔄 [handleRegistrarMovimientoOperativo] Actualizando borrador existente ID:', reciboId, 'a publicado');
            
            const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || JSON.stringify(error));
            }

            reciboCreado = await res.json();
            console.log('✅ [handleRegistrarMovimientoOperativo] Borrador actualizado a publicado:', reciboCreado.codigo_recibo);
        } else {
            console.log('🆕 [handleRegistrarMovimientoOperativo] Creando nuevo recibo publicado');
            
            const res = await fetch(`${apiUrl}/caja/recibos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || JSON.stringify(error));
            }

            reciboCreado = await res.json();
            console.log('✅ [handleRegistrarMovimientoOperativo] Recibo creado:', reciboCreado.codigo_recibo);
        }

        // ← ← ← ÉXITO ← ← ←
        alert(`✅ ${tipoRecibo === 'entrada' ? 'Ingreso' : 'Gasto'} registrado exitosamente\nRecibo: ${reciboCreado.codigo_recibo}\nTotal: ${formatMoney(parseFloat(reciboCreado.total))}`);

        // Disparar evento para refrescar la página de caja
        window.dispatchEvent(new CustomEvent('reciboCreado', {
            detail: { id: reciboCreado.id, codigo_recibo: reciboCreado.codigo_recibo }
        }));

        if (onReciboCreado) {
            onReciboCreado(reciboCreado);
        }

        // ← ← ← Limpiar estados y cerrar ← ← ←
        console.log('🧹 [handleRegistrarMovimientoOperativo] Limpiando estados...');
        
        setItems([]);
        setDescuento(0);
        setPropinaTotal(0);
        setPropinaEditable('0');
        setPropinaDistribucion([]);
        setClienteNombre('');
        setClienteTelefono('');
        setClienteEmail('');
        setNotas('');
        setSearchTerm('');
        setModoEdicion(false);
        setReciboEditando(null);
        setReciboId(null);
        setTipoRecibo('venta');
        setMetodoPago('bold');
        setEstadoRecibo('borrador');
        setPropinaMetodo('proporcional');
        setShowProfessionalModal(false);
        setItemParaProfesional(null);
        setItemsQuitados([]);
        setMovimientoOperativoRegistrado(false);
        setMovimientoDescripcion('');
        setMovimientoCantidad(1);
        setMovimientoPrecio(0);
        setMontoPagar(0);
        montoPagarEditedRef.current = false;

        console.log('🚪 [handleRegistrarMovimientoOperativo] Llamando a onClose() directamente');
        onClose();

    } catch (err: any) {
        console.error('❌ Error registrando movimiento operativo:', err);
        alert(`❌ Error: ${err.message}`);
    } finally {
        setLoading(false);
    }
};
// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
// ← ← ← WORKAROUND: Ajustar fecha para timezone Colombia (UTC-5) ← ← ←
// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
const adjustDateForColombia = (date: Date): string => {
  const utcHours = date.getUTCHours();
  
  // Si la hora UTC es < 5, en Colombia es el día anterior
  if (utcHours < 5) {
    const adjusted = new Date(date);
    adjusted.setUTCDate(adjusted.getUTCDate() - 1);
    return adjusted.toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

// ← ← ← Helper para hora en Colombia
const getTimeForColombia = (date: Date): string => {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  });
};


// ← ← ← NUEVO useEffect: Verificar aliado cuando cambian datos del cliente ← ← ←
useEffect(() => {
  // Solo verificar en modo venta y si hay datos del cliente
  if (tipoRecibo !== 'venta') {
    setInfoAliado({
      es_aliado: false,
      porcentaje: 0,
      aliado_nombre: '',
      convenio_id: null,
      cliente_aliado_id: null
    });
    return;
  }

  // Buscar la primera cita de servicio para obtener el cliente
  const primeraCitaServicio = items.find(i => i.tipo === 'servicio' && i.citaId);
  
  if (clienteEmail || clienteTelefono || primeraCitaServicio?.citaId) {
    // Debounce para no hacer muchas llamadas mientras se escribe
    const timeoutId = setTimeout(() => {
      verificarClienteAliado(
        clienteEmail, 
        clienteTelefono, 
        primeraCitaServicio?.citaId
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }
}, [clienteEmail, clienteTelefono, items, tipoRecibo]);


  // ← ← ← REEMPLAZAR el useEffect existente por este ← ← ←
useEffect(() => {
  // Solo sincronizar si el usuario NO ha editado manualmente
  if (!montoPagarEditedRef.current && total > 0) {
    setMontoPagar(total);
  }
}, [total]);  // Se ejecuta cuando cambia el total calculado


// ← ← ← MODIFICAR el onChange del input de montoPagar ← ← ←
// BUSCAR: el input con onChange={(e) => { ... setMontoPagar(valor); ... }}
// Y AGREGAR esta línea dentro del onChange:
montoPagarEditedRef.current = true;  // ← ← ← MARCAR COMO EDITADO MANUALMENTE


  // ← Formatear moneda
  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ← ← ← CARGAR RECIBO PARA EDITAR ← ← ←
  useEffect(() => {
    if (isOpen && reciboParaEditarId) {
      cargarReciboParaEditar();
    }
  }, [isOpen, reciboParaEditarId]);

  // ← ← ← NUEVO: Abrir modal de comisiones al seleccionar "Salida" ← ← ←
useEffect(() => {
  if (tipoRecibo === 'salida') {
    setShowComisionesModal(true);
  } else {
    setShowComisionesModal(false);
  }
}, [tipoRecibo]);

  // ← ← ← FUNCIÓN: Cargar códigos de reserva para múltiples citas ← ← ←
  const cargarCodigosReservaParaCitas = async (citaIds: number[]): Promise<Record<number, string>> => {
    if (citaIds.length === 0) return {};
    
    try {
      const idsParam = citaIds.join(',');
      const res = await fetch(`${apiUrl}/citas/?id__in=${idsParam}&fields=id,codigo_reserva`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) return {};
      
      const data = await res.json();
      const citasList = Array.isArray(data) ? data : (data.results || []);
      
      const mapaCodigos: Record<number, string> = {};
      citasList.forEach((cita: any) => {
        if (cita.id && cita.codigo_reserva) {
          mapaCodigos[cita.id] = cita.codigo_reserva;
        }
      });
      
      return mapaCodigos;
    } catch (err) {
      console.error('❌ Error cargando códigos de reserva:', err);
      return {};
    }
  };
  // ← ← ← AGREGAR ESTA FUNCIÓN en CajaReciboModal ← ← ←
const registrarAbonoEnCitas = async (montoAbono: number, metodoPago: string) => {
  // Obtener IDs de citas asociadas a los items de servicio
  const citasConServicio = items
    .filter(i => i.tipo === 'servicio' && i.citaId)
    .map(i => i.citaId);
  
  if (citasConServicio.length === 0) return;
  
  // Registrar pago parcial en cada cita (ajusta el endpoint según tu backend)
  for (const citaId of citasConServicio) {
    await fetch(`${apiUrl}/citas/${citaId}/registrar-abono/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        monto_abono: montoAbono / citasConServicio.length, // Distribuir proporcionalmente
        metodo_pago: metodoPago,
        recibo_caja_id: reciboId // Si estás editando
      })
    });
  }
};

  const cargarReciboParaEditar = async () => {
    if (!reciboParaEditarId) return;
    
    setLoading(true);
    setItemsQuitados([]);  // ← ← ← NUEVO
    console.log('📦 [CajaReciboModal] Cargando recibo para editar ID:', reciboParaEditarId);
    
    try {
      // ← ← ← 1. CARGAR RECIBO DESDE API ← ← ←
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboParaEditarId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error cargando recibo:', errorText);
        throw new Error('Error cargando recibo');
      }
      
      const recibo = await res.json();
      console.log('✅ [CajaReciboModal] Recibo cargado:', recibo.codigo_recibo);
      
      // ← ← ← 2. LIMPIAR ESTADO ANTES DE CARGAR (CRÍTICO) ← ← ←
      setItems([]);
      
      // ← ← ← 3. LLENAR ESTADOS CON DATOS DEL RECIBO ← ← ←
      setModoEdicion(true);
      setReciboEditando(recibo);
      setReciboId(recibo.id);
      setTipoRecibo(recibo.tipo);
      // ← ← ← CLAVE: Separar descuento manual del descuento de aliado ← ← ←
      const descuentoTotalGuardado = parseFloat(recibo.descuento) || 0;
      let descuentoManual = descuentoTotalGuardado;
      
      // Si el recibo tiene info de aliado, calcular el descuento de aliado y restarlo
      if (recibo.cliente_aliado_id && recibo.convenio_id) {
        // Obtener porcentaje del aliado desde las notas o calcularlo
        const notasMatch = recibo.notas?.match(/\[(\d+(?:\.\d+)?)%\]/);
        const porcentajeAliado = notasMatch ? parseFloat(notasMatch[1]) : 0;
        
        if (porcentajeAliado > 0) {
          // Calcular subtotal de servicios del recibo cargado
          const subtotalServicios = recibo.items
            .filter((item: any) => item.tipo_item === 'servicio')
            .reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
          
          const descuentoAliadoCalculado = (subtotalServicios * porcentajeAliado) / 100;
          
          // El descuento manual es el total menos el de aliado
          descuentoManual = Math.max(0, descuentoTotalGuardado - descuentoAliadoCalculado);
          
          // Actualizar infoAliado para que se muestre correctamente
          setInfoAliado({
            es_aliado: true,
            porcentaje: porcentajeAliado,
            aliado_nombre: recibo.cliente_nombre?.split('-')[0]?.trim() || 'Aliado',
            convenio_id: recibo.convenio_id,
            cliente_aliado_id: recibo.cliente_aliado_id
          });
          
          console.log(`🔍 Descuento total: ${descuentoTotalGuardado}, Aliado: ${descuentoAliadoCalculado}, Manual: ${descuentoManual}`);
        }
      }
      
      setDescuento(descuentoManual);
      setPropinaTotal(parseFloat(recibo.propina_total) || 0);
      setPropinaEditable(String(recibo.propina_total || 0));
      setMetodoPago(recibo.metodo_pago || 'bold');
      setClienteNombre(recibo.cliente_nombre || 'No proporcionado com');
      setClienteTelefono(recibo.cliente_telefono || 'No proporcionado com');
      setClienteEmail(recibo.cliente_email || 'No@proporcionado.com');
      setNotas(recibo.notas || '');
      setEstadoRecibo(recibo.estado);
      setMontoPagar(parseFloat(recibo.total) || 0);
      montoPagarEditedRef.current = false;
      setPropinaMetodo(recibo.propina_metodo_distribucion || 'proporcional');
      
      // ← ← ← 4. CARGAR ITEMS CON ESTRUCTURA CORRECTA ← ← ←
      if (recibo.items && Array.isArray(recibo.items)) {
      const itemsMapeados: ReciboItem[] = recibo.items.map((item: any) => {
          // ← ← ← 1. EXTRAER servicio_id CON VALIDACIÓN EXPLÍCITA ← ← ←
          let servicioId: number | undefined;
          if (item.tipo_item === 'servicio') {
              if (item.servicio_id) {
                  servicioId = item.servicio_id;
              } else if (item.cita && typeof item.cita === 'object' && item.cita.servicio) {
                  servicioId = typeof item.cita.servicio === 'object' && item.cita.servicio !== null
                      ? item.cita.servicio.id 
                      : item.cita.servicio;
              } else if (item.servicio && typeof item.servicio === 'object' && item.servicio !== null) {
                  servicioId = item.servicio.id;
              }
          }

          // ← ← ← 2. EXTRAER codigo_reserva CON VALIDACIÓN ← ← ←
          let codigoReserva: string | undefined;
          if (item.tipo_item === 'servicio' && item.cita) {
              if (typeof item.cita === 'object' && item.cita.codigo_reserva) {
                  codigoReserva = item.cita.codigo_reserva;
              } else if (item.codigo_reserva_cita) {
                  codigoReserva = item.codigo_reserva_cita;
              }
          }

          // ← ← ← 3. EXTRAER FKs CON CHEQUEO EXPLÍCITO DE NULL ← ← ←
          // ✅ CORRECCIÓN: item.cita && antes de typeof para evitar el trap de null
          const citaId = item.tipo_item === 'servicio' 
              ? (item.cita && typeof item.cita === 'object' ? item.cita.id : (item.cita_id || item.cita || undefined))
              : undefined;
              
          const profesionalId = item.profesional 
              ? (typeof item.profesional === 'object' ? item.profesional.id : item.profesional) 
              : undefined;

          // ✅ CORRECCIÓN: Validación explícita contra null
          const productoId = item.tipo_item === 'producto'
              ? (item.producto && typeof item.producto === 'object' && item.producto !== null
                  ? item.producto.id 
                  : (item.producto_id || item.producto || undefined))
              : undefined;

          return {
              id: String(item.id || ''),
              tipo: item.tipo_item,
              servicioId,
              productoId,
              descripcion: item.descripcion || 'Sin descripción',
              cantidad: item.cantidad || 1,
              precioUnitario: parseFloat(item.precio_unitario) || 0,
              subtotal: parseFloat(item.subtotal) || 0,
              profesionalId,
              profesionalNombre: item.profesional_nombre || undefined,
              citaId,
              codigoReserva,
              esNuevo: false,
              imagenUrl: item.imagen_url || null,
              propinaItem: parseFloat(item.propina_item) || 0,
          };
      });

      // ← ← ← 5. CARGAR CÓDIGOS DE RESERVA PARA CITAS QUE NO LOS TENGAN ← ← ←
      const itemsSinCodigo = itemsMapeados.filter(
          item => item.tipo === 'servicio' && item.citaId && !item.codigoReserva
      );
        
        if (itemsSinCodigo.length > 0) {
          const citaIds = Array.from(
            new Set(itemsSinCodigo.map(item => item.citaId!).filter(Boolean))
          ) as number[];
          
          if (citaIds.length > 0) {
            try {
              const codigosMapa = await cargarCodigosReservaParaCitas(citaIds);
              
              // Actualizar items con códigos de reserva
              const itemsActualizados = itemsMapeados.map(item => ({
                ...item,
                codigoReserva: item.citaId ? codigosMapa[item.citaId] : item.codigoReserva
              }));
              
              setItems(itemsActualizados);
              console.log(`✅ [CajaReciboModal] Códigos de reserva cargados para ${Object.keys(codigosMapa).length} citas`);
            } catch (err) {
              console.warn('⚠️ No se pudieron cargar códigos de reserva, usando items básicos');
              setItems(itemsMapeados);
            }
          } else {
            setItems(itemsMapeados);
          }
        } else {
          // Todos los items ya tienen código o no son servicios con cita
          setItems(itemsMapeados);
        }
        
        // ← ← ← 6. CALCULAR DISTRIBUCIÓN DE PROPINA EXISTENTE ← ← ←
        if (recibo.propina_total && parseFloat(recibo.propina_total) > 0) {
          const propina = parseFloat(recibo.propina_total);
          const metodo = recibo.propina_metodo_distribucion || 'proporcional';
          
          // Obtener profesionales con servicios desde items cargados
          const profesionalesConServicios = Array.from(
            new Set(
              itemsMapeados
                .filter((item: any) => item.tipo === 'servicio' && item.profesionalId)
                .map((item: any) => ({
                  id: item.profesionalId,
                  nombre: item.profesionalNombre || '',
                  subtotal: parseFloat(item.subtotal) || 0
                }))
            )
          );
          
          if (profesionalesConServicios.length > 0) {
            let distribucionInicial: Array<{profesionalId: number, nombre: string, monto: number, porcentaje: number}> = [];
            
            if (metodo === 'equitativa') {
              const cantidad = profesionalesConServicios.length;
              const montoBase = propina / cantidad;
              const residuo = propina - (montoBase * cantidad);
              distribucionInicial = profesionalesConServicios.map((p: any, index: number) => ({
                profesionalId: p.id,
                nombre: p.nombre || '',
                monto: index === cantidad - 1 ? Math.round(montoBase + residuo) : Math.round(montoBase),
                porcentaje: Math.round(100 / cantidad)
              }));
            } else if (metodo === 'proporcional') {
              const subtotalTotal = profesionalesConServicios.reduce(
                (sum: number, p: any) => sum + p.subtotal, 0
              );
              if (subtotalTotal > 0) {
                let montoRestante = propina;
                distribucionInicial = profesionalesConServicios.map((p: any, index: number, arr: any[]) => {
                  const porcentaje = (p.subtotal / subtotalTotal) * 100;
                  const monto = index === arr.length - 1
                    ? Math.round(montoRestante)
                    : Math.round((p.subtotal / subtotalTotal) * propina);
                  montoRestante -= monto;
                  return {
                    profesionalId: p.id,
                    nombre: p.nombre || '',
                    monto: monto,
                    porcentaje: Math.round(porcentaje)
                  };
                });
              }
            }
            
            setPropinaDistribucion(distribucionInicial);
            console.log(`💰 [CajaReciboModal] Propina distribuida: ${distribucionInicial.length} profesionales`);
          }
        }
      }

      if (recibo.id) {
        await cargarResumenAbonos(recibo.id);
      }
      
    } catch (err) {
      console.error('❌ [CajaReciboModal] Error cargando recibo:', err);
      alert('⚠️ Error cargando el recibo para editar');
    } finally {
      setLoading(false);
    }
  };

   const handleCitaSeleccionada = (cita: any) => {
    console.log('📦 [handleCitaSeleccionada] Cita recibida:', cita);
    
    // ← ← ← VALIDAR DATOS DE LA CITA ← ← ←
    if (!cita) {
      console.error('❌ No se recibió la cita');
      alert('⚠️ Error: No se recibió la información de la cita');
      return;
    }
    
    // ← ← ← EXTRAER DATOS CON CAMPOS PLANOS (CRÍTICO) ← ← ←
    // El modal envía: cita_id, servicio_id, profesional_id (no objetos anidados)
    const servicioId = cita.servicio_id || cita.servicio?.id || 0;
    const servicioNombre = cita.servicio_nombre || cita.servicio?.nombre || 'Servicio sin nombre';
    
    const profesionalId = cita.profesional_id || cita.profesional?.id || null;
    const profesionalNombre = cita.profesional_nombre || cita.profesional?.nombre || null;
    
    // ← ← ← PARSEAR PRECIO ← ← ←
    const precioTotal = typeof cita.precio_total === 'string'
      ? parseFloat(cita.precio_total.replace(/[^0-9.-]+/g, '')) || 0
      : Number(cita.precio_total) || 0;
    
    // ← ← ← CREAR ITEM CON ESTRUCTURA UNIFICADA ← ← ←
    const nuevoItem: ReciboItem = {
      id: `cita-${cita.cita_id}-${Date.now()}`,  // ← ← ← CAMBIO: cita_id (plano)
      tipo: 'servicio',
      servicioId: servicioId,  // ← ← ← CAMBIO: servicio_id (plano)
      descripcion: servicioNombre,  // ← ← ← CAMBIO: servicio_nombre (plano)
      cantidad: 1,
      precioUnitario: precioTotal,
      subtotal: precioTotal,
      profesionalId: profesionalId,  // ← ← ← CAMBIO: profesional_id (plano)
      profesionalNombre: profesionalNombre,  // ← ← ← CAMBIO: profesional_nombre (plano)
      citaId: cita.cita_id,  // ← ← ← CAMBIO: cita_id (plano)
      codigoReserva: cita.codigo_reserva,  // ← ← ← CAMBIO: codigo_reserva (plano)
      esNuevo: true  // ← ← ← Para diferenciar en edición
    };
    
    console.log('✅ [handleCitaSeleccionada] Item creado:', nuevoItem);
    
    // ← ← ← AGREGAR ITEM AL ESTADO ← ← ←
    setItems(prev => [...prev, nuevoItem]);
    
    // ← ← ← ALERTA SI NO TIENE PROFESIONAL ← ← ←
    if (!profesionalId) {
      setTimeout(() => {
        alert(
          '⚠️ Esta cita no tiene profesional asignado.\n\n' +
          'Por favor haz click en el item para asignar un profesional antes de publicar el recibo.'
        );
      }, 300);
    }
    
    // ← ← ← RECALCULAR PROPINA SI APLICA ← ← ←
    if (propinaTotal > 0) {
      setPropinaDistribucion(calcularDistribucionPropina);
    }
  };

  // ← ← ← FUNCIÓN: Abrir modal de profesional para un item específico ← ← ←
  const handleOpenProfessionalModal = (item: ReciboItem) => {
    if (item.tipo !== 'servicio') return;
    
    if (!item.servicioId) {
      console.warn('⚠️ Item de servicio sin servicioId, cargando todos los profesionales');
    }
    
    setItemParaProfesional(item);
    setShowProfessionalModal(true);
  };

  // ← ← ← FUNCIÓN: Manejar selección de profesional + actualizar cita ← ← ←
  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!itemParaProfesional) return;
    
    const itemId = itemParaProfesional.id;
    const citaId = itemParaProfesional.citaId;
    
    try {
      // ← ← ← PASO 1: Actualizar estado local inmediatamente ← ← ←
      setItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, profesionalId: profesional.id, profesionalNombre: profesional.nombre }
          : item
      ));
      
       // ← ← ← PASO 2: Si hay propina, recalcular distribución inmediatamente ← ← ←
      if (propinaTotal > 0) {
        // El useMemo se recalculará automáticamente por la dependencia [items]
        // Pero forzamos actualización explícita para feedback inmediato
        const nuevaDistribucion = calcularDistribucionPropina;
        if (nuevaDistribucion.length > 0) {
          setPropinaDistribucion(nuevaDistribucion);
        }
      }
    
      
      // ← ← ← PASO 3: ACTUALIZAR LA CITA EN BACKEND ← ← ←
      if (citaId) {
        console.log(`🔄 [CajaReciboModal] Actualizando cita ${citaId} con profesional ${profesional.id}`);
        
        const resCita = await fetch(`${apiUrl}/citas/${citaId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            profesional: profesional.id
          })
        });
        
        if (!resCita.ok) {
          console.warn(`⚠️ Error actualizando cita ${citaId}:`, await resCita.text());
          alert(`⚠️ Se asignó el profesional al recibo, pero no se pudo actualizar la cita.`);
        }
      }
      
      // ← ← ← PASO 4: Limpiar y cerrar modal ← ← ←
      setItemParaProfesional(null);
      setShowProfessionalModal(false);
      
    } catch (err: any) {
      console.error('❌ Error asignando profesional:', err);
      alert(`❌ Error: ${err.message}`);
      
      // Revertir cambio visual si falló
      setItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, profesionalId: itemParaProfesional.profesionalId, profesionalNombre: itemParaProfesional.profesionalNombre }
          : item
      ));
    }
  };

  // ← ← ← NUEVO useMemo: Calcular descuento automático de aliado ← ← ←
  const descuentoAliadoCalculado = useMemo(() => {
    // Si no es aliado, no hay descuento
    if (!infoAliado.es_aliado || infoAliado.porcentaje <= 0) {
      return 0;
    }

    // Solo calcular sobre SERVICIOS (no productos)
    const subtotalServicios = items
      .filter(item => item.tipo === 'servicio')
      .reduce((sum, item) => {
        const cantidad = Number(item.cantidad) || 1;
        const precio = Number(item.precioUnitario) || 0;        
        return sum + (cantidad * precio);
      }, 0);

console.log(`🧮 [descuentoAliadoCalculado] Subtotal servicios: $${subtotalServicios} | Items servicios: ${items.filter(i => i.tipo === 'servicio').length}`);


    if (subtotalServicios <= 0) return 0;

    // Calcular descuento proporcional
    const descuento = (subtotalServicios * infoAliado.porcentaje) / 100;
    
    // Redondear a 2 decimales
    const resultado = Math.round(descuento * 100) / 100;
    console.log(`💰 [descuentoAliadoCalculado] Descuento calculado: $${resultado} (${infoAliado.porcentaje}%)`);
    return resultado;
    }, [items, infoAliado.es_aliado, infoAliado.porcentaje]);

  // ← ← ← ACTUALIZAR ESTADO cuando cambia el cálculo ← ← ←
  /*useEffect(() => {
    setDescuentoAliadoAutomatico(descuentoAliadoCalculado);
  }, [descuentoAliadoCalculado]);*/

  useEffect(() => {
  // Si hay descuento de aliado, actualizar el descuento automáticamente
  if (infoAliado.es_aliado && infoAliado.porcentaje > 0 && descuentoAliadoCalculado > 0) {
    setDescuento(descuentoAliadoCalculado);
  }
}, [descuentoAliadoCalculado, infoAliado.es_aliado, infoAliado.porcentaje]);

    // ← ← ← PREVENIR CIERRE ACCIDENTAL DEL MODAL ← ← ←
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Solo mostrar advertencia si hay items en el recibo
      if (items.length > 0 && modoEdicion && reciboId) {
        const message = 'Tienes un recibo en edición con items. ¿Seguro que deseas salir?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [items.length, modoEdicion, reciboId]);

  // ← Cargar profesionales para propinas
  useEffect(() => {
    if (isOpen && tipoRecibo === 'venta' && items.length === 0) {
      const cargarProfesionales = async () => {
        try {
          const res = await fetch(`${apiUrl}/profesionales/?activo=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setProfesionales(Array.isArray(data) ? data : (data.results || []));
          }
        } catch (err) {
          console.error('❌ Error cargando profesionales:', err);
        }
      };
      cargarProfesionales();
    }
  }, [isOpen, tipoRecibo, items.length, apiUrl, token]);

  // ← ← ← BUSCAR SERVICIOS/PRODUCTOS (debounce) ← ← ←
  useEffect(() => {
    if (!isOpen || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const endpoint = searchType === 'servicio' 
          ? `${apiUrl}/servicios/?search=${encodeURIComponent(searchTerm)}&disponible=true`
          : `${apiUrl}/productos/buscar/?search=${encodeURIComponent(searchTerm)}&disponibles=true`;
        
        const res = await fetch(endpoint, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error('❌ Error buscando:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchType, isOpen, apiUrl, token]);

  // ← ← ← AGREGAR ITEM AL RECIBO (CON CREACIÓN DE CITA PARA SERVICIOS) ← ← ←
  const agregarItem = async (itemData: Servicio | Producto, tipo: 'servicio' | 'producto') => {
    try {
      // ← ← ← SI ES SERVICIO: CREAR CITA PRIMERO ← ← ←
      if (tipo === 'servicio') {
        const servicio = itemData as Servicio;
        const precio = typeof servicio.precio_min === 'string' 
          ? parseFloat(servicio.precio_min) 
          : servicio.precio_min;

        setLoading(true);
        
        // 1. Crear cita en backend
        const resCita = await fetch(`${apiUrl}/citas/crear-para-recibo/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            servicio_id: servicio.id,
            profesional_id: undefined,              
              // ← ← ← CORREGIDO: Usar timezone Colombia para evitar desfase después de las 7 PM ← ← ←
  fecha_cita: adjustDateForColombia(new Date()),
  hora_inicio: getTimeForColombia(new Date()),
            precio_total: precio,
            cliente_nombre: clienteNombre || 'No proporcionado com',
            cliente_telefono: clienteTelefono || 'No proporcionado com',
            cliente_email: clienteEmail || 'No@proporcionado.com',
            notas: notas || ''
          })
        });

        if (!resCita.ok) {
          const error = await resCita.json();
          throw new Error(error.error || 'Error creando cita');
        }

        const { cita_id, codigo_reserva } = await resCita.json();

        // ← ← ← NUEVO: Marcar cita como "procesada desde caja" para evitar sondeo ← ← ←
        if (typeof window !== 'undefined' && cita_id) {
          try {
            const key = 'citas_procesadas_caja';
            const processed = new Set(
              JSON.parse(localStorage.getItem(key) || '[]')
            );
            
            processed.add(cita_id);
            
            // Mantener solo últimas 200 para no llenar localStorage
            if (processed.size > 200) {
              const arr = Array.from(processed).slice(-200);
              localStorage.setItem(key, JSON.stringify(arr));
            } else {
              localStorage.setItem(key, JSON.stringify(Array.from(processed)));
            }
            
            console.log(`🔖 Cita ${cita_id} marcada como procesada (evitar sondeo)`);
          } catch (e) {
            console.warn('⚠️ No se pudo guardar cita procesada en localStorage:', e);
          }
        }

        
        // 2. Agregar item CON cita ya creada
        const nuevoItem: ReciboItem = {
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ← Prefijo "new-"
          tipo: 'servicio',
          servicioId: servicio.id,
          citaId: cita_id,
          codigoReserva: codigo_reserva,
          descripcion: servicio.nombre,
          categoria: servicio.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          duracion: servicio.duracion,
          profesionalId: undefined,
          profesionalNombre: undefined,
          imagenUrl: servicio.imagen_url,
          productosAsociados: [],
          esNuevo: !reciboId,  // ← ← ← MARCAR COMO NUEVO SI ESTÁ EN MODO EDICIÓN
        };

        setItems(prev => [...prev, nuevoItem]);
        console.log(`✅ Servicio agregado con cita ${codigo_reserva}`);
        
      } 
      // ← ← ← SI ES PRODUCTO: AGREGAR DIRECTAMENTE ← ← ←
      else {
        const producto = itemData as Producto;
        const precio = typeof producto.precio_venta === 'string' 
          ? parseFloat(producto.precio_venta) 
          : producto.precio_venta;

        const nuevoItem: ReciboItem = {
          id: `producto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'producto',
          productoId: producto.id,
          descripcion: producto.nombre,
          categoria: producto.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          imagenUrl: producto.imagen_url,
          stockActual: producto.stock_actual,
          productosAsociados: [],
          esNuevo: modoEdicion  // ← ← ← MARCAR COMO NUEVO SI ESTÁ EN MODO EDICIÓN
        };

        setItems(prev => [...prev, nuevoItem]);
      }

      setSearchTerm('');
      setSearchResults([]);

    } catch (err: any) {
      console.error('❌ Error agregando item:', err);
      alert(`⚠️ No se pudo agregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



// ← ← ← ACTUALIZAR CANTIDAD + SINCRONIZAR CON BACKEND ← ← ←
const actualizarCantidadItem = async (itemId: string, nuevaCantidad: number) => {
  if (nuevaCantidad < 1) return;
  
  // 1. Buscar item actual para obtener precioUnitario
  const currentItem = items.find(i => i.id === itemId);
  if (!currentItem) return;

  const nuevoTotal = nuevaCantidad * currentItem.precioUnitario;

  // 2. Actualizar estado local inmediatamente
  setItems(prev => prev.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        cantidad: nuevaCantidad,
        subtotal: nuevoTotal
      };
    }
    return item;
  }));

  // 3. Sincronizar con BD si el item está vinculado a una cita
  if (currentItem.citaId) {
    try {
      await fetch(`${apiUrl}/citas/${currentItem.citaId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ precio_total: nuevoTotal })
      });
      console.log(`✅ Cita ${currentItem.citaId} actualizada: precio_total = $${nuevoTotal}`);
    } catch (err) {
      console.error('❌ Error actualizando precio de cita:', err);
    }
  }
};

// ← ← ← ACTUALIZAR PRECIO + SINCRONIZAR CON BACKEND ← ← ←
const actualizarPrecioItem = async (itemId: string, nuevoPrecio: number, esServicioConCita: boolean) => {
  if (nuevoPrecio < 0) return;

  // 1. Buscar item actual para obtener cantidad
  const currentItem = items.find(i => i.id === itemId);
  if (!currentItem) return;

  const nuevoTotal = currentItem.cantidad * nuevoPrecio;

  // 2. Actualizar estado local inmediatamente
  setItems(prev => prev.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        precioUnitario: nuevoPrecio,
        subtotal: nuevoTotal
      };
    }
    return item;
  }));

  // 3. Sincronizar con BD si es servicio vinculado a cita
  if (esServicioConCita && currentItem.citaId) {
    try {
      await fetch(`${apiUrl}/citas/${currentItem.citaId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ precio_total: nuevoTotal })
      });
      console.log(`✅ Cita ${currentItem.citaId} actualizada: precio_total = $${nuevoTotal}`);
    } catch (err) {
      console.error('❌ Error actualizando precio de cita:', err);
    }
  }
};

// ← ← ← FUNCIÓN REMOVER ITEM CORREGIDA ← ← ←
const removerItem = async (itemId: string) => {
  const item = items.find(i => i.id === itemId);
  
  if (!item) return;
  
  // Si es modo edición y el item tiene cita asociada, confirmar eliminación
  if (modoEdicion && item.tipo === 'servicio' && item.citaId) {
    const confirmar = window.confirm(
      `⚠️ ¿Estás seguro de eliminar este servicio?\n\n` +
      `• Servicio: ${item.descripcion}\n` +
      `• Cita: ${item.codigoReserva || `#${item.citaId}`}\n\n` +
      `Esta acción eliminará permanentemente la cita del sistema.`
    );
    
    if (!confirmar) return;
    
    try {
      setLoading(true);
      
      // ← ← ← ELIMINAR CITA DEL BACKEND ← ← ←
      const resCita = await fetch(`${apiUrl}/citas/${item.citaId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!resCita.ok && resCita.status !== 404) {
        const errorText = await resCita.text();
        console.warn('⚠️ No se pudo eliminar la cita:', errorText);
      }
      
      // ← ← ← ELIMINAR ITEM DEL RECIBO EN BACKEND ← ← ←
      if (item.id && !isNaN(parseInt(item.id))) {
        try {
          await fetch(`${apiUrl}/caja/recibos/${reciboId}/items/${item.id}/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
        } catch (err) {
          console.warn('⚠️ No se pudo eliminar el item del recibo en backend');
        }
      }
      
    } catch (err: any) {
      console.error('❌ Error eliminando item/cita:', err);
      alert(`⚠️ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  } else {
    // Modo nuevo recibo o item sin cita: solo eliminar localmente
    if (!modoEdicion || !confirm('¿Eliminar este item del recibo?')) {
      if (!modoEdicion) return;
    }
  }
  
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← CORRECCIÓN CLAVE: Agregar a itemsQuitados en modo edición ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  if (modoEdicion) {
    const itemIdNum = Number(itemId);
    const esIdNumerico = !isNaN(itemIdNum) && itemIdNum > 0;
    
    if (esIdNumerico) {
      // ID de BD: agregar para eliminación en backend (evitar duplicados)
      setItemsQuitados(prev => {
        if (!prev.includes(itemId)) {
          console.log(`🗑️ [removerItem] Agregando ${itemId} a itemsQuitados`);
          return [...prev, itemId];
        }
        return prev;
      });
    }
  }
  
  // ← ← ← ELIMINAR DEL ESTADO LOCAL ← ← ←
  setItems(prev => prev.filter(i => i.id !== itemId));
  
  // ← ← ← ACTUALIZAR DISTRIBUCIÓN DE PROPINA SI APLICA ← ← ←
  if (propinaTotal > 0 && item.tipo === 'servicio' && item.profesionalId) {
    setPropinaDistribucion(calcularDistribucionPropina);
  }
  
  console.log(`✅ Item eliminado: ${item.descripcion}${item.citaId ? ` + Cita #${item.citaId}` : ''} | itemsQuitados:`, itemsQuitados);
};
   

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← NUEVAS FUNCIONES PARA PROPINA Y DISTRIBUCIÓN ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←

  const calcularDistribucionPropina = useMemo(() => {
    if (propinaTotal <= 0) return [];
    
     // ← ← ← CLAVE: Incluir TODOS los items de servicio con profesional, sin filtrar por esNuevo
      const profesionalesConServicios = Array.from(
        new Set(
          items
            .filter(item => item.tipo === 'servicio' && item.profesionalId)  // ← Sin filtro esNuevo
            .map(item => item.profesionalId)
        )
      ).map(id => profesionales.find(p => p.id === id)).filter(Boolean) as Profesional[];
      
      if (profesionalesConServicios.length === 0) return [];
    
    if (propinaMetodo === 'equitativa') {
      const montoPorPersona = propinaTotal / profesionalesConServicios.length;
      const residuo = propinaTotal - (montoPorPersona * profesionalesConServicios.length);
      
      return profesionalesConServicios.map((p, index) => ({
        profesionalId: p.id,
        nombre: p.nombre,
        monto: index === profesionalesConServicios.length - 1 
          ? Math.round(montoPorPersona + residuo) 
          : Math.round(montoPorPersona),
        porcentaje: Math.round(100 / profesionalesConServicios.length)
      }));
    }
    
    if (propinaMetodo === 'proporcional') {
      const subtotalesPorProfesional = new Map<number, number>();
      
      items
        .filter(item => item.tipo === 'servicio' && item.profesionalId)
        .forEach(item => {
          const current = subtotalesPorProfesional.get(item.profesionalId!) || 0;
          subtotalesPorProfesional.set(item.profesionalId!, current + item.subtotal);
        });
      
      const totalServicios = Array.from(subtotalesPorProfesional.values()).reduce((a, b) => a + b, 0);
      
      if (totalServicios === 0) return [];
      
      let montoRestante = propinaTotal;
      
      return Array.from(subtotalesPorProfesional.entries()).map(([profId, subtotal], index, arr) => {
        const profesional = profesionales.find(p => p.id === profId);
        const porcentaje = (subtotal / totalServicios) * 100;
        const monto = index === arr.length - 1 
          ? Math.round(montoRestante)
          : Math.round((porcentaje / 100) * propinaTotal);
        
        montoRestante -= monto;
        
        return {
          profesionalId: profId,
          nombre: profesional?.nombre || 'Desconocido',
          monto,
          porcentaje: Math.round(porcentaje)
        };
      });
    }
    
    if (propinaDistribucion.length > 0) return propinaDistribucion;
    
    return profesionalesConServicios.map(p => ({
      profesionalId: p.id,
      nombre: p.nombre,
      monto: 0,
      porcentaje: 0
    }));
  }, [propinaTotal, propinaMetodo, items, profesionales, propinaDistribucion]);

  const validarServiciosConProfesional = (): { valido: boolean; serviciosSinProfesional: ReciboItem[] } => {
    const serviciosSinProfesional = items.filter(
      item => item.tipo === 'servicio' && !item.profesionalId
    );
    
    return {
      valido: serviciosSinProfesional.length === 0,
      serviciosSinProfesional
    };
  };

  const mostrarAlertaServiciosSinProfesional = (servicios: ReciboItem[]) => {
    const lista = servicios.map(s => `• ${s.descripcion} (Cita: ${s.codigoReserva || 'N/A'})`).join('\n');
    
    alert(
      `⚠️ No se puede publicar el recibo.\n\n` +
      `Hay ${servicios.length} servicio(s) sin profesional asignado:\n${lista}\n\n` +
      `Por favor asigna un profesional a cada servicio antes de publicar.`
    );
  };

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← NUEVO ESTADO: Para rastrear items quitados en modo edición ← ← ←
const [itemsQuitados, setItemsQuitados] = useState<string[]>([]);




// ← ← ← UBICACIÓN: Función quitarItemDelRecibo en CajaReciboModal.tsx
const quitarItemDelRecibo = (itemId: string) => {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  
  if (!confirm(`¿Quitar "${item.descripcion}" del recibo?\n\nLa cita permanecerá en el sistema.`)) {
    return;
  }
  
  // ← ← ← CORRECCIÓN CLAVE: Registrar SIEMPRE en modo edición ← ← ←
  if (modoEdicion) {
    // Verificar si es un ID numérico de BD (para eliminar en backend)
    const itemIdNum = Number(itemId);
    const esIdNumerico = !isNaN(itemIdNum) && itemIdNum > 0;
    
    console.log(`🗑️ [quitarItemDelRecibo] Item: ${itemId} | esNumérico: ${esIdNumerico} | modoEdicion: ${modoEdicion}`);
    
    if (esIdNumerico) {
      // ID de BD: agregar para eliminación en backend
      setItemsQuitados(prev => {
        if (!prev.includes(itemId)) {
          return [...prev, itemId];
        }
        return prev;
      });
    } else {
      // ID temporal: solo eliminación local (no existe en BD aún)
      console.log(`ℹ️ [quitarItemDelRecibo] Item ${itemId} es temporal, solo eliminación local`);
    }
  }
  
  // Eliminar del estado local SIEMPRE
  setItems(prev => prev.filter(i => i.id !== itemId));
  
  // Recalcular propina si aplica
  if (propinaTotal > 0 && item.tipo === 'servicio' && item.profesionalId) {
    const nuevaDistribucion = calcularDistribucionPropina;
    if (nuevaDistribucion.length > 0) {
      setPropinaDistribucion(nuevaDistribucion);
    }
  }
  
  console.log(`✅ Item quitado: ${item.descripcion} | itemsQuitados:`, itemsQuitados);
};
// ← ← ← AGREGAR ESTE useEffect PARA CARGAR ABONOS ← ← ←
useEffect(() => {
  if (isOpen && reciboId && modoEdicion) {
    cargarResumenAbonos(reciboId);
  }
}, [isOpen, reciboId, modoEdicion]);

// ← ← ← NUEVA FUNCIÓN: Auto-Guardado + Abrir Modal de Abono ← ← ←
// ← ← ← FUNCIÓN NUEVA: Auto-Guardado + Abrir Modal ← ← ←
const handleAbrirModalAbono = async () => {
    // 1. Verifica si hay cambios pendientes usando TU useMemo existente
    // Reemplaza 'hayItemsNoSincronizados' por el nombre de tu variable real
    const hayCambios = typeof hayItemsNoSincronizados !== 'undefined' ? hayItemsNoSincronizados : true; 

    if (hayCambios) {
        console.log("🔄 [Auto-Save] Detectados cambios, guardando borrador silenciosamente...");
        try {
            // Preparar payload base (igual que en el botón de Actualizar)
            const payloadBase = {
                tipo: tipoRecibo,
                estado: 'borrador',
                subtotal: subtotal,
                descuento: descuento,
                total: total,
                propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
                propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
                metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
                session_caja: sessionCajaId,
                cliente_nombre: tipoRecibo === 'venta' ? (clienteNombre?.trim() || 'No proporcionado') : (clienteNombre?.trim() || 'Movimiento Operativo'),
                cliente_telefono: tipoRecibo === 'venta' ? (clienteTelefono?.trim() || 'No proporcionado') : '',
                cliente_email: tipoRecibo === 'venta' ? (clienteEmail?.trim() || 'No@proporcionado.com') : '',
                notas: notas || '',
            };

            // Guardar en MODO SILENCIOSO (true)
            await handleActualizarReciboConPayload(payloadBase, true);
            console.log("✅ [Auto-Save] Guardado exitoso, abriendo modal de abono...");
        } catch (error) {
            console.error("❌ [Auto-Save] Falló el guardado automático:", error);
            alert("⚠️ No se pudieron guardar los cambios automáticamente. Por favor guarda manualmente antes de abonar.");
            return; // Detener si falla
        }
    }

    // 2. Precargar valores
  const saldoPendiente = resumenAbonos?.saldo_pendiente || 0;
  setMontoAbono(saldoPendiente.toString());
  setRecibido(saldoPendiente.toString());  // ← ← ← AGREGAR ESTA LÍNEA

    // 2. Abrir el modal de abono
    setShowAbonoModal(true);
};

  const handleActualizarRecibo = async () => {
      if (!reciboId) return;

      // ← ← ← VALIDACIÓN DE PROFESIONALES ← ← ←
      const validacion = validarServiciosConProfesional();
      if (!validacion.valido) {
        mostrarAlertaServiciosSinProfesional(validacion.serviciosSinProfesional);
        return;
      }

      // ← ← ← CORREGIDO: Si es 'pendiente', cambiar automáticamente a 'bold' ← ← ←
      if (metodoPago === 'pendiente') {
        setMetodoPago('bold');
        console.log('🔄 Método de pago cambiado automáticamente: pendiente → bold');
      }
      
      setLoading(true);
      
      try {
        // ← ← ← CLAVE: Usar calcularDistribucionPropina (useMemo) directamente ← ← ←
        const distribucionActual = calcularDistribucionPropina;
        
        // ← ← ← VALIDAR session_caja PARA ACTUALIZACIÓN ← ← ←
        // En modo edición, session_caja puede ser null si el recibo ya existe
        // pero si se está publicando, debe tener sesión
        if (estadoRecibo === 'publicado' && !sessionCajaId) {
          alert('⚠️ No hay sesión de caja activa. Por favor abre una sesión primero.');
          setLoading(false);
          return;
        }
        
        const payload: any = {
          tipo: tipoRecibo,
          estado: 'publicado',
          subtotal: subtotal,
          descuento: descuento,
          total: total,
          propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
          propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
          metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
          // ← ← ← session_caja: puede ser undefined si no hay sesión activa (TypeScript lo acepta)
          session_caja: sessionCajaId,
          cliente_nombre: tipoRecibo === 'venta' 
          ? (clienteNombre?.trim() || 'No proporcionado')   // ← Si es null/undefined/empty → ''
          : '',          
        cliente_telefono: tipoRecibo === 'venta' 
          ? (clienteTelefono?.trim() || 'No proporcionado')  // ← CAMBIO CLAVE: '' en lugar de null
          : '',          
        cliente_email: tipoRecibo === 'venta' 
          ? (clienteEmail?.trim() || 'No@proporcionado.com')     // ← CAMBIO CLAVE: '' en lugar de null
          : '',
          notas: notas || '',
          
          // ← ← ← items_data: lista de items a mantener/actualizar ← ← ←
          items_data: items.map(item => {
            // ← ← ← VALIDACIÓN MEJORADA: Solo incluir id si es numérico válido ← ← ←
            const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
            
            return {
              // Solo incluir id si es válido (para items nuevos, no se incluye)
              ...(itemIdNum && { id: itemIdNum }),
              tipo_item: item.tipo,
              ...(item.servicioId && { 
                cita: item.citaId, 
                profesional: item.profesionalId
              }),
              ...(item.productoId && { producto: item.productoId }),
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precio_unitario: item.precioUnitario,
              //subtotal: item.subtotal,
              propina_item: distribucionActual.find(d => d.profesionalId === item.profesionalId)?.monto || 0
            };
          }),
          
          // ← ← ← items_a_eliminar: lista de IDs a eliminar (SEPARADO) ← ← ←
          
          ...(modoEdicion && itemsQuitados.length > 0 && {
            items_a_eliminar: itemsQuitados
              .map(id => {
                const numId = Number(id);
                return !isNaN(numId) && numId > 0 ? numId : null;
              })
              .filter((id): id is number => id !== null)  // ← ← ← Filtrar nulls
          })
        };

        console.log('📦 [CajaReciboModal] Actualizando recibo:', payload);

        const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
       // ← ← ← LOGUEAR RESPUESTA (CORREGIDO) ← ← ←
        const responseText = await res.clone().text();
        console.log('📦 [DEBUG] Response status:', res.status);
        console.log('📦 [DEBUG] Response body:', responseText);

        if (!res.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { detail: responseText };
          }
          const mensajeError = errorData.detail || errorData.error || 'Error desconocido';
          const traceback = errorData.traceback || '';
          alert(`❌ Error al actualizar recibo:\n${mensajeError}${traceback ? '\n\nTraceback:\n' + traceback : ''}`);
          throw new Error(mensajeError);
        }

        const reciboActualizado = await res.json();
        console.log('✅ Recibo actualizado:', reciboActualizado);

        // ← ← ← DISTRIBUIR PROPINA: USAR useMemo DIRECTAMENTE ← ← ←
        if (propinaTotal > 0 && distribucionActual.length > 0) {
          const payloadPropina = sanitizeForJSON({
              monto_propina: Math.round(propinaTotal * 100) / 100,
              metodo: propinaMetodo,
              distribucion: distribucionActual.map(d => ({
                  profesional: Number(d.profesionalId),  // ← ← ← FORZAR A NUMBER
                  monto: Math.round(d.monto * 100) / 100,
                  porcentaje: Math.round(d.porcentaje)
              }))
          });
          
          console.log('💰 [CajaReciboModal] Payload para distribuir-propina:', payloadPropina);
          
          const resDist = await fetch(`${apiUrl}/caja/recibos/${reciboId}/distribuir_propina/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payloadPropina)
          });
          
          const responseText = await resDist.text();
          console.log(`📡 Respuesta distribuir-propina [${resDist.status}]:`, responseText);
          
          if (!resDist.ok) {
            console.error('❌ Error distribuyendo propina:', responseText);
            try {
              const errorData = JSON.parse(responseText);
              alert(`⚠️ Error: ${errorData.detail || JSON.stringify(errorData)}`);
            } catch {
              alert(`⚠️ Error: ${responseText.substring(0, 200)}`);
            }
          } else {
            try {
              const distResult = JSON.parse(responseText);
              console.log('✅ Propina distribuida:', distResult);
              alert(`✅ Propina de ${formatMoney(propinaTotal)} distribuida a ${distribucionActual.length} profesional(es)`);
            } catch {
              console.log('✅ Propina distribuida (respuesta no JSON)');
            }
          }
        }
          
        alert(`✅ Recibo ${reciboActualizado.codigo_recibo} publicado exitosamente`);
        
        onReciboActualizado?.(reciboActualizado);
        handleClose();
        
      } catch (err: any) {
        console.error('❌ Error actualizando recibo:', err);
        alert(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

  // ← ← ← NUEVA FUNCIÓN: Manejar abono parcial (NO toca handleActualizarRecibo) ← ← ←
  const handleAbonar = async () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      alert('⚠️ Ingresa un monto válido mayor a 0');
      return;
    }
    if (monto > total) {
      alert(`⚠️ El monto excede el total del recibo (${formatMoney(total)})`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/abonar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          monto_abono: monto,
          metodo_pago: metodoPagoAbono
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.detail || 'Error al registrar abono');
      }

      const resultado = await res.json();
      alert(`✅ Abono registrado exitosamente\nRecibo: ${resultado.recibo_abono.codigo_recibo}\nSaldo restante: ${formatMoney(resultado.recibo_saldo_actualizado.total)}`);
      
      // Recargar datos del recibo actualizado
      setMontoAbono('');
      setShowAbonoModal(false);
      await cargarReciboParaEditar(); 
      if (onReciboActualizado) onReciboActualizado(resultado.recibo_saldo_actualizado);
      
    } catch (err: any) {
      console.error('❌ Error abonando:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
// ← ← ← NUEVA FUNCIÓN: Eliminar abono existente ← ← ←
const handleEliminarAbono = async (abonoId: number) => {
  // Confirmación antes de eliminar
  const confirmar = window.confirm(
    '⚠️ ¿Estás seguro de eliminar este abono?\n\n' +
    'Esta acción no se puede deshacer y el saldo pendiente del recibo aumentará.'
  );
  
  if (!confirmar) return;
  
  setLoading(true);
  try {
    const res = await fetch(`${apiUrl}/caja/abonos/${abonoId}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    if (res.ok) {
      alert('✅ Abono eliminado exitosamente');
      // ← ← ← Recargar resumen de abonos para actualizar saldos ← ← ←
      if (reciboId) {
        await cargarResumenAbonos(reciboId);
      }
    } else {
      const error = await res.json();
      alert(`❌ Error: ${error.detail || error.error || 'No se pudo eliminar el abono'}`);
    }
  } catch (err: any) {
    console.error('❌ Error eliminando abono:', err);
    alert(`❌ Error de conexión: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
const handleRegistrarAbono = async () => {
  if (!reciboId || !montoAbono) return;
  
  const montoNum = parseFloat(montoAbono);
  
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← CORRECCIÓN: Calcular saldo disponible excluyendo abono en edición ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  
  const totalAbonado = resumenAbonos?.total_abonado || 0;
  
  // Buscar el abono que se está editando (con comparación flexible de tipos)
  const abonoEditando = abonoEditandoId 
    ? abonos.find(a => String(a.id) === String(abonoEditandoId)) 
    : null;
  
  const montoAbonoEditando = abonoEditando ? parseFloat(abonoEditando.monto.toString()) : 0;
  
  // Calcular total de OTROS abonos (excluyendo el que se está editando)
  const otrosAbonos = totalAbonado - montoAbonoEditando;
  
  // Calcular máximo permitido: total recibo - otros abonos
  const maxAbono = total - otrosAbonos;
  
  // ← ← ← VALIDACIÓN UNIFICADA (funciona para creación y edición) ← ← ←
  if (montoNum + otrosAbonos > total) {
    const disponible = total - otrosAbonos;
    alert(`⚠️ El monto excede el saldo pendiente. Disponible: ${formatMoney(disponible)}`);
    return;
  }
  
  // ← ← ← RESTO DE LA FUNCIÓN (sin cambios) ← ← ←
  setLoading(true);
  try {
    const isEditing = abonoEditandoId !== null;
    const method = isEditing ? 'PATCH' : 'POST';
    const url = isEditing
      ? `${apiUrl}/caja/abonos/${abonoEditandoId}/`
      : `${apiUrl}/caja/abonos/`;
    
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        recibo: reciboId,
        monto: montoNum,
        metodo_pago: metodoPagoAbono,
        referencia_externa: referenciaExterna || undefined
      })
    });
    
    if (res.ok) {
      alert(`✅ Abono ${isEditing ? 'actualizado' : 'registrado'} exitosamente`);
      // ← ← ← Limpiar estado de edición y recargar ← ← ←
      setAbonoEditandoId(null);
      await cargarResumenAbonos(reciboId);
      setMontoAbono('');
      setReferenciaExterna('');
      setShowAbonoModal(false);
    } else {
      const error = await res.json();
      alert(`❌ Error: ${error.detail || error.error || 'Error al guardar abono'}`);
    }
  } catch (err: any) {
    console.error('❌ Error en handleRegistrarAbono:', err);
    alert(`❌ Error de conexión: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
  const handleGuardar = async () => {
    if (items.length === 0 && tipoRecibo !== 'entrada') {
      alert('⚠️ Agrega al menos un item al recibo');
      return;
    }
    // ← ← ← CORREGIDO: Si es 'pendiente', cambiar automáticamente a 'bold' ← ← ←
if (metodoPago === 'pendiente') {
  setMetodoPago('bold');
  console.log('🔄 Método de pago cambiado automáticamente: pendiente → bold');
}
    // ← ← ← VALIDAR session_caja PARA NUEVOS RECIBOS ← ← ←
    // Para creación de nuevos recibos, session_caja es requerido
    if (!sessionCajaId) {
      alert('⚠️ No hay sesión de caja activa. Por favor abre una sesión primero.');
      return;
    }

    if (estadoRecibo === 'publicado' && tipoRecibo === 'venta') {
      const validacion = validarServiciosConProfesional();
      if (!validacion.valido) {
        mostrarAlertaServiciosSinProfesional(validacion.serviciosSinProfesional);
        return;
      }
    }

    setLoading(true);
    
    try {
      const payload: any = {
        tipo: tipoRecibo,
        estado: estadoRecibo,
        //fecha: getColombiaDateTime(),  // Ej: "2026-05-19T19:30:00"
        subtotal: subtotal,

        // ← ← ← CLAVE: Sumar descuento manual + descuento aliado automático ← ← ←
        descuento: Math.round((Number(descuento) || 0) * 100) / 100,
        total: total,
        propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
        propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
        metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
        // ← ← ← session_caja: requerido para creación, TypeScript acepta el valor
        session_caja: sessionCajaId,
        cliente_nombre: tipoRecibo === 'venta' 
          ? (clienteNombre?.trim() || 'No proporcionado')   // ← Si es null/undefined/empty → ''
          : '',          
        cliente_telefono: tipoRecibo === 'venta' 
          ? (clienteTelefono?.trim() || 'No proporcionado')  // ← CAMBIO CLAVE: '' en lugar de null
          : '',          
        cliente_email: tipoRecibo === 'venta' 
          ? (clienteEmail?.trim() || 'No@proporcionado.com')     // ← CAMBIO CLAVE: '' en lugar de null
          : '',
        // ← ← ← AGREGAR: Información del aliado para trazabilidad ← ← ←
          ...(infoAliado.es_aliado && {
            cliente_aliado_id: infoAliado.cliente_aliado_id,
            convenio_id: infoAliado.convenio_id,
            notas: `${notas || ''}\n[ALIADO] ${infoAliado.aliado_nombre} - ${infoAliado.porcentaje}% descuento`.trim()
          }),
        items_data: items.map(item => {
          // ← ← ← VALIDACIÓN MEJORADA DE ID ← ← ←
          const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
          return {
            // Solo incluir id si es válido
            ...(itemIdNum && { id: itemIdNum }),
            tipo_item: item.tipo,
            // ← ← ← CORREGIDO: Usar sufijo _id para FKs (coincidir con backend) ← ← ←
            ...(item.tipo !== 'otro' && item.servicioId && item.citaId && /^\d+$/.test(String(item.citaId)) && { cita_id: Number(item.citaId) }),
            ...(item.tipo !== 'otro' && item.servicioId && item.profesionalId && /^\d+$/.test(String(item.profesionalId)) && { profesional_id: Number(item.profesionalId) }),
            ...(item.tipo !== 'otro' && item.productoId && /^\d+$/.test(String(item.productoId)) && { producto_id: Number(item.productoId) }),
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            subtotal: item.subtotal,
            propina_item: propinaDistribucion.find(d => d.profesionalId === item.profesionalId)?.monto || 0
          };
        })
      };

      const res = await fetch(`${apiUrl}/caja/recibos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || JSON.stringify(error));
      }

      const reciboCreado = await res.json();
      // ← ← ← PEGA AQUÍ ESTE LOG ← ← ←
        console.log('🔍 [handleGuardar] Items EN MEMORIA después de POST:', items.map(i => ({
            id: i.id, desc: i.descripcion, esNuevo: i.esNuevo, citaId: i.citaId
        })));

      if (propinaTotal > 0) {
        const distribucionActual = calcularDistribucionPropina;  // ← Usar useMemo
        
        if (distribucionActual.length > 0) {
          await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/distribuir_propina/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              monto_propina: propinaTotal,
              metodo: propinaMetodo,
              distribucion: distribucionActual.map(d => ({
                profesional: d.profesionalId,
                monto: d.monto,
                porcentaje: d.porcentaje
              }))
            })
          });
        }
      }

      if (estadoRecibo === 'publicado') {
        await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/publicar/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
      }

            // 🔍 EN handleGuardar (al final, antes de handleClose):
      alert(`✅ Recibo ${reciboCreado.codigo_recibo} guardado como borrador`);
      onReciboCreado?.(reciboCreado);

      // ← ← ← NUEVO: Forzar refresco en el padre con caché deshabilitado
      window.dispatchEvent(new CustomEvent('reciboCreado', { 
        detail: { id: reciboCreado.id, codigo_recibo: reciboCreado.codigo_recibo } 
      }));

      
     
      handleClose();
      
    } catch (err: any) {
      console.error('❌ Error guardando recibo:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



  // ← ← ← AGREGAR ESTAS FUNCIONES AUXILIARES ← ← ←

const handleGuardarConPayload = async (payloadBase: any) => {
  setLoading(true);
  try {
    const payload = {
      ...payloadBase,
      items_data: items.map(item => {
        const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
        return {
          ...(itemIdNum && { id: itemIdNum }),
          tipo_item: item.tipo,
          ...(item.servicioId && { cita: item.citaId, profesional: item.profesionalId }),
          ...(item.productoId && { producto: item.productoId }),
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          //subtotal: item.subtotal,
          propina_item: propinaDistribucion.find(d => d.profesionalId === item.profesionalId)?.monto || 0
        };
      })
    };

    const res = await fetch(`${apiUrl}/caja/recibos/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || JSON.stringify(error));
    }

    const reciboCreado = await res.json();
    
    // ← ← ← MANEJAR RESPUESTA DE ABONO PARCIAL ← ← ←
    if (reciboCreado.nuevo_borrador_id) {
      alert(`✅ Abono registrado\nSaldo restante: ${formatMoney(parseFloat(reciboCreado.saldo_restante))}`);
      // Cargar el nuevo borrador para continuar
      setReciboId(reciboCreado.nuevo_borrador_id);
      await cargarReciboParaEditar();
      return;
    }
    
    // Distribuir propina si aplica
    if (propinaTotal > 0) {
      const distribucionActual = calcularDistribucionPropina;
      if (distribucionActual.length > 0) {
        await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/distribuir_propina/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            monto_propina: propinaTotal,
            metodo: propinaMetodo,
            distribucion: distribucionActual.map(d => ({ profesional: d.profesionalId, monto: d.monto, porcentaje: d.porcentaje }))
          })
        });
      }
    }

    alert(`✅ Recibo ${reciboCreado.codigo_recibo} publicado`);
    onReciboCreado?.(reciboCreado);
    handleClose();
    
  } catch (err: any) {
    console.error('❌ Error guardando:', err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

// ← ← ← AGREGAR ESTA FUNCIÓN DENTRO DEL COMPONENTE CajaReciboModal ← ← ←
// Ubicación recomendada: después de los hooks, antes de los useEffect

const sanitizeForJSON = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return 0;
    return Math.round(value * 100) / 100; // 2 decimales máx
  }
  if (typeof value === 'string') {
    return String(value).trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForJSON);
  }
  if (typeof value === 'object') {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeForJSON(val);
    }
    return sanitized;
  }
  return value;
};

// ... dentro de CajaReciboModal.tsx

// ← ← ← AGREGAR 'silentMode' como segundo parámetro opcional
const handleActualizarReciboConPayload = async (payloadBase: any, silentMode: boolean = false) => {
    
      // ← ← ← PREVENIR EJECUCIÓN DUPLICADA EN STRICT MODE ← ← ←
    if (loading) {
        console.log('⏭️ [handleActualizarReciboConPayload] Ya hay una operación en curso, saltando');
        return;
    }

    if (!reciboId) return;
    setLoading(true);
    
    try {
        // 1. CONSTRUIR items_data CON VALIDACIÓN ESTRICTA
        const itemsData = items.map(item => {
            const idRaw = item.id;
            const idEsNumerico = typeof idRaw === 'number' || (typeof idRaw === 'string' && /^\d+$/.test(idRaw.trim()));
            
            const itemData: any = {
                tipo_item: item.tipo || 'servicio',
                descripcion: (item.descripcion || '').trim() || 'Sin descripción',
                cantidad: Math.max(1, Number(item.cantidad) || 1),
                precio_unitario: Math.round((Number(item.precioUnitario) || 0) * 100) / 100,
                subtotal: Math.round((Number(item.subtotal) || 0) * 100) / 100,
                propina_item: Math.round((Number(item.propinaItem) || 0) * 100) / 100,
            };

            // ← ← ← SOLO incluir ID si es numérico (item existente en BD)
            if (idEsNumerico) {
                itemData.id = Number(idRaw);
            }

            if (item.tipo === 'servicio') {
                // ← ← ← CLAVE: Incluir cita_id SIEMPRE que exista, incluso en actualización
                if (item.citaId && /^\d+$/.test(String(item.citaId))) {
                    itemData.cita_id = Number(item.citaId);
                    console.debug(`🔗 [payload] cita_id=${itemData.cita_id} para item ${item.id}`);
                }
                if (item.profesionalId && /^\d+$/.test(String(item.profesionalId))) {
                    itemData.profesional_id = Number(item.profesionalId);
                }
            } else if (item.tipo === 'producto') {
                if (item.productoId && /^\d+$/.test(String(item.productoId))) {
                    itemData.producto_id = Number(item.productoId);
                    console.debug(`🔗 [payload] producto_id=${itemData.producto_id} para item ${item.id}`);
                }
            }
            return itemData;
        });
        // ← ← ← LOGGING PARA DEBUG: Ver qué se envía al backend ← ← ←
          console.log('🔍 [handleActualizar] itemsData enviado al backend:', itemsData.map(i => ({
              id: i.id, 
              desc: i.descripcion, 
              tipo: i.tipo_item, 
              cita_id: i.cita_id, 
              profesional_id: i.profesional_id, 
              producto_id: i.producto_id
          })));


        // 2. PAYLOAD BASE
        const payloadToSanitize = {
            tipo: payloadBase.tipo,
            estado: payloadBase.estado,
            subtotal: Math.round(subtotal * 100) / 100,
            descuento: Math.round((Number(descuento) || 0) * 100) / 100,
            total: Math.round(total * 100) / 100,
            propina_total: Math.round(propinaTotal * 100) / 100,
            propina_metodo_distribucion: propinaTotal > 0 ? propinaMetodo : null,
            metodo_pago: payloadBase.metodo_pago,
            session_caja: sessionCajaId,
            cliente_nombre: tipoRecibo === 'venta' ? (clienteNombre?.trim() || 'No proporcionado') : (clienteNombre?.trim() || 'Movimiento Operativo'),
            cliente_telefono: tipoRecibo === 'venta' ? (clienteTelefono?.trim() || 'No proporcionado') : '',
            cliente_email: tipoRecibo === 'venta' ? (clienteEmail?.trim() || 'No@proporcionado.com') : '',
            notas: notas?.trim() || '',
            items_data: itemsData,
            ...(modoEdicion && itemsQuitados.length > 0 && {
                items_a_eliminar: itemsQuitados.map(id => Number(id)).filter(id => !isNaN(id) && id > 0)
            })
        };

        // 3. SANITIZACIÓN INLINE (Evita ReferenceError con funciones externas)
        const sanitize = (val: any): any => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : Math.round(val * 100) / 100;
            if (typeof val === 'string') return String(val).trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            if (Array.isArray(val)) return val.map(sanitize);
            if (typeof val === 'object') {
                const clean: any = {};
                for (const [k, v] of Object.entries(val)) clean[k] = sanitize(v);
                return clean;
            }
            return val;
        };
        console.log('📦 [DEBUG PAYLOAD] items_data enviados:', JSON.stringify(itemsData, null, 2));

        const payloadSanitized = sanitize(payloadToSanitize);
        console.log('📦 Payload sanitizado listo:', payloadSanitized);

        // 4. ENVIAR PATCH
          const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(payloadSanitized)
          });
          // ← ← ← CRÍTICO: Esta línea DEBE existir aquí ← ← ←
        const responseText = await res.text();

        console.log('📡 Response status:', res.status);
        console.log('📡 Response body:', responseText);

        // 5. ÉXITO
        const reciboActualizado = JSON.parse(responseText);
                 
          if (reciboActualizado.items && Array.isArray(reciboActualizado.items)) {
              const itemsConIdsReales = reciboActualizado.items.map((item: any) => ({
                  id: String(item.id),  // ID real del backend como string
                  tipo: item.tipo_item,
                  servicioId: item.tipo_item === 'servicio' ? (item.servicio_id || item.cita?.servicio) : undefined,
                  // ← ← ← CORREGIDO: Validar explícitamente contra null antes de acceder a .id
                  productoId: item.tipo_item === 'producto'
                      ? (item.producto_id || (item.producto && typeof item.producto === 'object' && item.producto !== null ? item.producto.id : item.producto) || undefined)
                      : undefined,
                  descripcion: item.descripcion,
                  cantidad: item.cantidad,
                  precioUnitario: parseFloat(item.precio_unitario) || 0,
                  subtotal: parseFloat(item.subtotal) || 0,                 
                  profesionalNombre: item.profesional_nombre || undefined,
                  // ← ← ← CORREGIDO: Manejar ambos formatos de respuesta del backend ← ← ←
                  citaId: item.tipo_item === 'servicio'
                      ? (item.cita_id || (item.cita && typeof item.cita === 'object' && item.cita !== null ? item.cita.id : item.cita) || undefined)
                      : undefined,

                  profesionalId: item.profesional_id || (item.profesional && typeof item.profesional === 'object' && item.profesional !== null ? item.profesional.id : item.profesional) || undefined,
                  codigoReserva: item.tipo_item === 'servicio' 
                      ? (item.codigo_reserva_cita || item.codigo_reserva || (item.cita?.codigo_reserva) || undefined) 
                      : undefined,
                  esNuevo: false,  // ← ← ← CLAVE: marcar como existente
                  imagenUrl: item.imagen_url || null,
                  propinaItem: parseFloat(item.propina_item) || 0,
              }));
              setItems(itemsConIdsReales);  // ← ← ← ACTUALIZAR ESTADO LOCAL
              
          }
         
          console.log('✅ Recibo actualizado exitosamente:', reciboActualizado.codigo_recibo);
          // ... código de setItems(itemsConIdsReales) ...

           // ← ← ← NUEVO: Solo mostrar alertas y disparar eventos si NO es modo silencioso
            if (!silentMode) {
                alert(`✅ Recibo ${reciboActualizado.codigo_recibo} actualizado`);
                if (onReciboActualizado) {
                    onReciboActualizado(reciboActualizado);
                }
                window.dispatchEvent(new CustomEvent('cajaReciboActualizado', {
                    detail: reciboActualizado
                }));
            }
        } catch (err: any) {
            console.error('❌ Error actualizando recibo:', err);
            // ← ← ← NUEVO: Si es modo silencioso y falla, lanzamos el error para que lo capture quien llamó
            if (silentMode) {
                throw err; 
            } else {
                alert(`❌ Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
        };

 const handleClose = async () => {
  console.log('🔒 [handleClose] Cerrando modal...');

  // ← ← ← NUEVO: Si el movimiento operativo ya fue registrado, limpiar y cerrar sin lógica adicional ← ← ←
  if (movimientoOperativoRegistrado) {
    console.log('⏭️ [handleClose] Movimiento operativo ya registrado, limpiando estados y cerrando...');
    setMovimientoOperativoRegistrado(false); // Resetear bandera
    
    // Limpiar estados
    setItems([]);
    setDescuento(0);
    setPropinaTotal(0);
    setPropinaEditable('0');
    setPropinaDistribucion([]);
    setClienteNombre('');
    setNotas('');
    setSearchTerm('');
    setModoEdicion(false);
    setReciboEditando(null);
    setReciboId(null);
    setTipoRecibo('venta');
    setMetodoPago('bold');
    setEstadoRecibo('borrador');
    setPropinaMetodo('proporcional');
    setShowProfessionalModal(false);
    setItemParaProfesional(null);
    setItemsQuitados([]);

    // ← ← ← NUEVO: Resetear bandera de movimiento operativo ← ← ←
    setMovimientoOperativoRegistrado(false);
    
    console.log('🚪 [handleClose] Llamando a onClose()');
    onClose();
    return;
  }
  
  
  // ← ← ← VALIDACIÓN: Si es modo edición y hay reciboId ← ← ←
  if (modoEdicion && reciboId) {
    console.log('🔍 [handleClose] Modo edición detectado, verificando items...');
    
    // Si NO hay items → Eliminar recibo AUTOMÁTICAMENTE sin preguntar
    if (items.length === 0) {
      console.log('🗑️ [handleClose] Recibo sin items, eliminando automáticamente...');
      try {
        const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        if (res.ok) {
          console.log('✅ [handleClose] Recibo eliminado exitosamente');
          
          // ← ← ← CLAVE: Disparar evento CON reciboId en el detail ← ← ←
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('reciboEliminado', {
              detail: { reciboId }
            }));
          }
        } else {
          console.warn('⚠️ [handleClose] No se pudo eliminar el recibo:', await res.text());
        }
      } catch (err) {
        console.error('❌ [handleClose] Error eliminando recibo:', err);
      }
    }
    // Si HAY items → Preguntar qué hacer
    else {
      console.log('💾 [handleClose] Recibo con items, preguntando al usuario...');
      const opcion = window.confirm(
        `⚠️ Este recibo tiene ${items.length} item(s).\n\n` +
        '¿Qué deseas hacer?\n\n' +
        '• "Aceptar": Guardar como borrador (actualizar con items)\n' +
        '• "Cancelar": Eliminar recibo y todos sus items'
      );
      
      if (!opcion) {
        // Usuario eligió eliminar
        console.log('🗑️ [handleClose] Usuario eligió eliminar recibo');
        try {
          const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          
          if (res.ok) {
            console.log('✅ [handleClose] Recibo con items eliminado');
            
            // ← ← ← CLAVE: Disparar evento CON reciboId en el detail ← ← ←
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('reciboEliminado', {
                detail: { reciboId }
              }));
            }
          }
        } catch (err) {
          console.error('❌ [handleClose] Error eliminando recibo:', err);
        }
      } else {
        // ← ← ← USUARIO ELIGIÓ GUARDAR → ACTUALIZAR BORRADOR CON ITEMS ← ← ←
        console.log('💾 [handleClose] Usuario eligió guardar borrador - ACTUALIZANDO...');
        
        try {
          // ← ← ← PREPARAR PAYLOAD IGUAL QUE "ACTUALIZAR BORRADOR" ← ← ←
          const payloadBase = {
            tipo: tipoRecibo,
            estado: 'borrador',
            subtotal: subtotal,
            descuento: descuento,
            total: total,
            propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
            propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
            metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
            session_caja: sessionCajaId,
            cliente_nombre: tipoRecibo === 'venta'
              ? (clienteNombre?.trim() || 'No proporcionado')
              : '',
            cliente_telefono: tipoRecibo === 'venta'
              ? (clienteTelefono?.trim() || 'No proporcionado')
              : '',
            cliente_email: tipoRecibo === 'venta'
              ? (clienteEmail?.trim() || 'No@proporcionado.com')
              : '',
            notas: notas || '',
          };
          
          console.log('📦 [handleClose] Actualizando borrador con payload:', payloadBase);
          console.log('📦 [handleClose] Items a guardar:', items.length);
          
          // ← ← ← LLAMAR handleActualizarReciboConPayload (igual que botón Actualizar) ← ← ←
          await handleActualizarReciboConPayload(payloadBase, false);
          
          console.log('✅ [handleClose] Borrador actualizado exitosamente con items');
          
        } catch (err: any) {
          console.error('❌ [handleClose] Error actualizando borrador:', err);
          alert('⚠️ No se pudo guardar el recibo con los items. Error: ' + err.message);
        }
      }
    }
  }
  // Si es modo creación nuevo (no hay reciboId) → Simplemente cerrar
  else {
    console.log('ℹ️ [handleClose] Modo creación nuevo, cerrando sin acciones');
  }
  
  // ← ← ← LIMPIAR ESTADOS ← ← ←
  setItems([]);
  setDescuento(0);
  setPropinaTotal(0);
  setPropinaEditable('0');
  setPropinaDistribucion([]);
  setClienteNombre('');
  setNotas('');
  setSearchTerm('');
  setModoEdicion(false);
  setReciboEditando(null);
  setReciboId(null);
  setTipoRecibo('venta');
  setMetodoPago('bold');
  setEstadoRecibo('borrador');
  setPropinaMetodo('proporcional');
  setShowProfessionalModal(false);
  setItemParaProfesional(null);
  setItemsQuitados([]);

  // ← ← ← NUEVO: Resetear bandera de movimiento operativo ← ← ←
  setMovimientoOperativoRegistrado(false);
  
  // ← ← ← CLAVE: Llamar onClose() DESPUÉS de todo ← ← ←
  console.log('🚪 [handleClose] Llamando a onClose()');
  onClose();
};

  if (!isOpen) return null;

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← RENDERIZADO DE ITEMS MEJORADO ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const renderizarItemCompacto = (item: ReciboItem) => {
  const tieneProfesional = item.tipo === 'servicio' && item.profesionalId;
  const tieneCita = item.tipo === 'servicio' && item.citaId;
  
  return (
    <div 
      key={item.id} 
      className={`bg-gray-800 rounded-lg p-2 border transition-colors ${
        item.tipo === 'servicio' 
          ? (tieneProfesional ? 'border-gray-700 cursor-pointer hover:border-blue-500' : 'border-red-500/50 cursor-pointer hover:border-red-500')
          : 'border-gray-700'
      }`}
      onClick={() => item.tipo === 'servicio' && handleOpenProfessionalModal(item)} 
    >
      {/* ← ← ← FILA ÚNICA CON TODA LA INFORMACIÓN ← ← ← */}
      <div className="flex items-center justify-between gap-2 text-xs">
        
        {/* Código de Reserva */}
        {item.tipo === 'servicio' && item.codigoReserva && (
          <span className="font-mono text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded" title={`Cita: ${item.codigoReserva}`}>
            {item.codigoReserva}
          </span>
        )}
        
        {item.tipo === 'servicio' && !item.codigoReserva && item.citaId && (
          <span className="font-mono text-[10px] text-gray-500 bg-gray-900/30 px-1.5 py-0.5 rounded" title="Cita sin código disponible">
            Cita #{item.citaId}
          </span>
        )}
        
        {/* ← ← ← ETIQUETA "NUEVO" PARA ITEMS AGREGADOS EN EDICIÓN ← ← ← */}
        {item.esNuevo && (
          <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
            ✨ Nuevo
          </span>
        )}
        
        {/* Descripción del item */}
        <span className="font-medium text-white truncate flex-1" title={item.descripcion}>
          {item.descripcion}
        </span>
        
        {/* Profesional con indicador visual (solo servicios) */}
        {item.tipo === 'servicio' && (
            <span
              className={`text-[10px] truncate max-w-24 flex items-center gap-1 ${
              item.profesionalNombre ? 'text-blue-400' : 'text-red-400'
            }`}
            title={item.profesionalNombre || 'Click para asignar profesional'}
          >
            {item.profesionalNombre ? '👨' : '⚠️'} 
            <span className="truncate">{item.profesionalNombre || 'Asignar'}</span>
          </span>
        )}
        
        {/* Cantidad × Precio = Subtotal */}
          <div className="flex items-center gap-2 text-right shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Input Cantidad */}
            <input
              type="number"
              min="1"
              max="99"
              value={item.cantidad}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 1);
                actualizarCantidadItem(item.id, val);
              }}
              className="w-12 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs text-center focus:border-blue-500 focus:outline-none"
              title="Cantidad"
            />
            
            <span className="text-gray-500">×</span>
            
            {/* Input Precio Unitario */}
            <input
              type="number"
              min="0"
              step="100"
              value={item.precioUnitario}
              onChange={(e) => {
                const val = Math.max(0, parseFloat(e.target.value) || 0);                
                actualizarPrecioItem(item.id, val, !!(item.tipo === 'servicio' && item.citaId));
              }}
              className="w-20 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right focus:border-green-500 focus:outline-none"
              title="Precio Unitario"
            />
            
            <span className="text-gray-500">=</span>
            <span className="font-semibold text-green-400 text-xs">
              {formatMoney(item.subtotal)}
            </span>
          </div>
        
        {/* ← ← ← BOTÓN ELIMINAR (PARA SERVICIOS Y PRODUCTOS) ← ← ← 
        <button
          onClick={(e) => {
            e.stopPropagation();  // ← Evitar que se abra el modal de profesional
            if (tieneCita) {
              // Confirmar si tiene cita asociada
              if (window.confirm('⚠️ Este servicio tiene una cita asociada. ¿Estás seguro de eliminarlo? La cita también será eliminada.')) {
                removerItem(item.id);
              }
            } else {
              removerItem(item.id);
            }
          }}
          className="text-red-400 hover:text-red-300 p-1 shrink-0 transition-colors"
          title={tieneCita ? "Eliminar item y cita asociada" : "Remover item"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>*/}
      

      {/* ← ← ← BOTONES DE ACCIÓN: Quitar (X) y Eliminar (🗑️) ← ← ← */}
      <div className="flex items-center gap-1 shrink-0">
        
        {/* ← ← ← BOTÓN X ROJA: Quitar del recibo SIN borrar cita ← ← ← */}
       {/* <button
          onClick={(e) => {
            e.stopPropagation();  // Evitar que se abra el modal de profesional
            quitarItemDelRecibo(item.id);
          }}
          className="text-red-500 hover:text-red-300 p-1 transition-colors"
          title="Quitar del recibo (la cita se mantiene en el sistema)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>*/}
        
        {/* ← ← ← BOTÓN BASURA: Eliminar item Y cita del sistema ← ← ← */}
        {/*<button
          onClick={(e) => {
            e.stopPropagation();
            if (tieneCita) {
              if (window.confirm('⚠️ ¿Eliminar este servicio Y su cita del sistema? Esta acción es irreversible.')) {
                removerItem(item.id);
              }
            } else {
              removerItem(item.id);
            }
          }}
          className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
          title={tieneCita ? "Eliminar item y cita del sistema" : "Remover item"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>*/}
        {/* ← ← ← BOTÓN ÚNICO DE ELIMINACIÓN ← ← ← */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setItemToDelete(item);
          }}
          className="text-red-500 hover:text-red-300 p-1 transition-colors"
          title={item.tipo === 'servicio' && item.citaId ? "Eliminar item y/o cita" : "Eliminar item"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
      </div>
</div>

      
      {/* Segunda fila: Info adicional */}
      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
        {item.tipo === 'servicio' && !item.citaId && (
          <span className="text-yellow-400">⚠️ Sin cita</span>
        )}
        {item.tipo === 'servicio' && item.citaId && !item.codigoReserva && (
          <span className="text-gray-400">Cargando código...</span>
        )}
        {item.tipo === 'producto' && (
          <span>📦 Producto</span>
        )}
        {/* ← ← ← INDICADOR VISUAL SI TIENE CITA ← ← ← */}
        {tieneCita && (
          <span className="text-[10px] text-orange-400 bg-orange-900/30 px-1 rounded flex items-center gap-1">
            📅 Cita vinculada
          </span>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
        
        {/* ← Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              📝 {modoEdicion ? `Editar Recibo ${reciboEditando?.codigo_recibo}` : (estadoRecibo === 'borrador' ? 'Nuevo Recibo (Borrador)' : 'Nuevo Recibo')}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              Tipo: {tipoRecibo === 'entrada' ? '💰 Entrada' : tipoRecibo === 'salida' ? '💸 Salida' : '🛒 Venta'}
              {modoEdicion && <span className="ml-2 text-yellow-300">• Modo Edición</span>}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← Body con scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ← Columna Izquierda: Configuración y Búsqueda */}
            <div className="lg:col-span-1 space-y-5">
              
              {/* Tipo de Recibo 
             
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    📋 Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['venta', 'entrada', 'salida'] as const).map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => {
                          // Limpiar items al cambiar de tipo para evitar basura
                          if (tipo !== tipoRecibo && items.length > 0) {
                            if (window.confirm('⚠️ Al cambiar el tipo se limpiarán los items actuales. ¿Continuar?')) {
                              setItems([]);
                              setTipoRecibo(tipo);
                            }
                          } else {
                            setTipoRecibo(tipo);
                          }
                        }}
                        className={`px-3 py-3 rounded-lg text-xs font-medium transition-all border-2 ${
                          tipoRecibo === tipo
                            ? tipo === 'entrada' 
                              ? 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-500/30'
                              : tipo === 'salida' 
                                ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30'
                                : 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {tipo === 'entrada' ? '💰' : tipo === 'salida' ? '💸' : '🛒'}
                        </div>
                        <div className="font-bold">
                          {tipo === 'entrada' ? 'Ingreso' : tipo === 'salida' ? 'Gasto' : 'Venta'}
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {tipo === 'entrada' ? 'Ej: Venta activo' : tipo === 'salida' ? 'Ej: Arriendo' : 'Servicios/Productos'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>*/}
             

               {/* ← ← ← DATOS DEL CLIENTE: GRID COMPACTO EN UNA FILA ← ← ← */}
              {tipoRecibo === 'venta' && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center justify-between">
                    <span>👤 Datos del Cliente</span>
                    <button
                      type="button"
                      onClick={() => setShowClientModal(true)}
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Buscar
                    </button>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        placeholder="👤 Nombre del cliente"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none pr-8"
                      />
                      {clienteSeleccionadoId && (
                        <button
                          onClick={() => {
                            setClienteSeleccionadoId(null);
                            setClienteNombre('');
                            setClienteTelefono('');
                            setClienteEmail('');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>


                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="📱 Teléfono"
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="✉️ Email"
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Búsqueda de Items - CONDICIONAL PARA VENTAS VS MOVIMIENTOS */}
              {tipoRecibo === 'venta' ? (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    🔍 Agregar Items {modoEdicion && <span className="text-green-400">(✨ Nuevos)</span>}
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSearchType('servicio')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'servicio'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Servicios
                    </button>
                    <button
                      onClick={() => setSearchType('producto')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'producto'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Productos
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Buscar ${searchType === 'servicio' ? 'servicios' : 'productos'}...`}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    {loadingSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>



                  {/*<div className="mt-3">
                    <button
                      onClick={() => setShowCitasModal(true)}
                      className="w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700 rounded-lg text-blue-300 hover:text-blue-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      📅 Agregar Cita Existente
                    </button>
                  </div>*/}
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto border border-gray-700 rounded-lg">
                      {searchResults.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => agregarItem(item, searchType)}
                          className="w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                        >
                          <p className="font-medium text-white text-sm">{item.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {item.categoria_nombre || item.marca} • {formatMoney(
                              typeof item.precio_min === 'string' ? parseFloat(item.precio_min) : 
                              typeof item.precio_venta === 'string' ? parseFloat(item.precio_venta) : 
                              (item.precio_min || item.precio_venta || 0)
                            )}
                          </p>
                          {item.stock_actual !== undefined && (
                            <p className={`text-xs ${item.stock_actual > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Stock: {item.stock_actual}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (              
              // ← ← ← NUEVO: UI SIMPLIFICADA PARA ENTRADAS Y SALIDAS ← ← ←
              <div className="bg-gray-900 rounded-xl p-4 border border-orange-700/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  {tipoRecibo === 'entrada' ? '💰 Detalle del Ingreso' : '💸 Detalle del Gasto'}
                </h3>
                <div className="space-y-3">
                  {/* ← ← ← LÍNEA 1: DESCRIPCIÓN (ancho completo) ← ← ← */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Descripción / Concepto</label>
                    <input
                      type="text"
                      value={movimientoDescripcion}
                      onChange={(e) => setMovimientoDescripcion(e.target.value)}
                      onFocus={(e) => e.target.select()}  // ← ← ← AUTO-SELECT AL FOCUS
                      placeholder="Ej: Pago arriendo mayo, Venta silla..."
                      className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  
                  {/* ← ← ← LÍNEA 2: CANTIDAD Y MONTO/PRECIO ← ← ← */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="0"  // ← ← ← CAMBIADO: De 1 a 0 para permitir borrar
                        value={movimientoCantidad}
                        onChange={(e) => {
                          const val = e.target.value;
                          // ← ← ← PERMITIR VACÍO: Si está vacío, dejar vacío, sino parsear
                          if (val === '') {
                            setMovimientoCantidad(0);
                          } else {
                            const parsed = parseInt(val);
                            setMovimientoCantidad(isNaN(parsed) ? 0 : parsed);
                          }
                        }}
                        onFocus={(e) => e.target.select()}  // ← ← ← AUTO-SELECT AL FOCUS
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Monto / Precio</label>
                      <input
                        type="number"
                        min="0"  // ← ← ← CAMBIADO: De 0 a permitir vacío
                        step="0.01"  // ← ← ← AGREGADO: Permitir decimales
                        value={movimientoPrecio}
                        onChange={(e) => {
                          const val = e.target.value;
                          // ← ← ← PERMITIR VACÍO: Si está vacío, dejar vacío, sino parsear
                          if (val === '') {
                            setMovimientoPrecio(0);
                          } else {
                            const parsed = parseFloat(val);
                            setMovimientoPrecio(isNaN(parsed) ? 0 : parsed);
                          }
                        }}
                        onFocus={(e) => e.target.select()}  // ← ← ← AUTO-SELECT AL FOCUS
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* ← ← ← LÍNEA 3: BOTÓN AGREGAR ← ← ← */}
                  <button
                    onClick={handleAgregarMovimiento}
                    className={`w-full ${
                      tipoRecibo === 'entrada' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    } text-white font-bold py-2 px-4 rounded-lg transition-colors`}
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            )}

             

              {/* ← ← ← MÉTODO DE PAGO: SOLO PARA ENTRADAS Y SALIDAS ← ← ← */}
              {(tipoRecibo === 'entrada' || tipoRecibo === 'salida') && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    💳 Método de {tipoRecibo === 'entrada' ? 'Recepción' : 'Pago'}
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="nequi">📱 Nequi</option>
                    <option value="daviplata">📱 Daviplata</option>
                    <option value="bold">💳 Bold</option>
                    <option value="tarjeta">💳 Tarjeta en sitio</option>
                  </select>
                </div>
              )}

              {/* ← ← ← SECCIÓN DE ABONOS REGISTRADOS (CORREGIDA) ← ← ← */}
        {modoEdicion && reciboId && estadoRecibo === 'borrador' && tipoRecibo === 'venta' && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              💰 Pagos Registrados
            </label>
            
            {/* ← ← ← MOSTRAR RESUMEN DE ABONOS ← ← ← */}
            {resumenAbonos ? (
              <div className="space-y-3 mb-4">
               {/* ← ← ← BARRA DE PROGRESO (cambia a rojo si excede) ← ← ← */}
    <div className="w-full bg-gray-700 rounded-full h-3">
        <div
            className={`h-3 rounded-full transition-all duration-300 ${
                resumenAbonos.excede_total ? 'bg-red-500 animate-pulse' :
                resumenAbonos.puede_publicar ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(100, resumenAbonos.porcentaje_abonado)}%` }}
        />
    </div>

    {/* ← ← ← ALERTA ROJA: Exceso de pago ← ← ← */}
    {resumenAbonos.excede_total && (
        <div className="text-xs text-red-300 bg-red-900/40 px-3 py-2 rounded border border-red-700">
            ⚠️ <strong>Abonos exceden el total:</strong> Has abonado {formatMoney(resumenAbonos.total_abonado)} pero el recibo es {formatMoney(total)}.
            <br/>Elimina o ajusta abonos para habilitar la publicación.
        </div>
    )}
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-800 rounded p-2 text-center">
                    <p className="text-gray-500 text-xs">Abonado</p>
                    <p className="text-green-400 font-bold">{formatMoney(resumenAbonos.total_abonado)}</p>
                  </div>
                  
                  {/* ← ← ← MODIFICAR ESTE BLOQUE: Agregar onClick y estilos de interacción ← ← ← */}
                  <div
                      onClick={() => {
                        // ← ← ← VALIDAR: No abrir modal si hay items no sincronizados
                        if (hayItemsNoSincronizados) {
                          alert('⚠️ Primero guarda los cambios del recibo antes de registrar abonos.');
                          return;
                        }
                        if (resumenAbonos.saldo_pendiente > 0) {
                          setMontoAbono(resumenAbonos.saldo_pendiente.toString());
                          setAbonoEditandoId(null);
                          handleAbrirModalAbono();
                        }
                      }}
                      className={`bg-gray-800 rounded p-2 text-center transition-all ${
                        hayItemsNoSincronizados
                          ? 'opacity-50 cursor-not-allowed'  // ← Desactivado visualmente
                          : resumenAbonos.saldo_pendiente > 0 
                            ? 'cursor-pointer hover:bg-gray-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/20' 
                            : 'opacity-50 cursor-default'
                      }`}
                      title={
                        hayItemsNoSincronizados 
                          ? 'Guarda los cambios del recibo primero' 
                          : resumenAbonos.saldo_pendiente > 0 
                            ? "Clic para abonar el saldo pendiente" 
                            : "Saldo saldado"
                      }
                    >
                    <p className="text-gray-500 text-xs">Pendiente</p>
                    <p className={`font-bold flex items-center justify-center gap-1 ${
                      resumenAbonos.saldo_pendiente > 0 ? 'text-orange-400' : 'text-green-400'
                    }`}>
                      {formatMoney(resumenAbonos.saldo_pendiente)}
                      {resumenAbonos.saldo_pendiente > 0 && (
                        <span className="text-xs animate-pulse">👆</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Porcentaje */}
                <p className={`text-xs text-center font-medium ${
                  resumenAbonos.puede_publicar ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {resumenAbonos.puede_publicar 
                    ? '✅ 100% abonado - Listo para publicar' 
                    : `⏳ ${resumenAbonos.porcentaje_abonado.toFixed(1)}% completado`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-3 text-center">
                Cargando información de abonos...
              </p>
            )}
            
            {/* ← ← ← LISTA DE ABONOS REGISTRADOS (CON BOTÓN ELIMINAR) ← ← ← */}
              {/* ← ← ← LISTA DE ABONOS REGISTRADOS (CON BADGE DE ORIGEN WEB) ← ← ← */}
{abonos.length > 0 && (
  <div className="mb-4">
    <p className="text-xs text-gray-500 mb-2 font-medium">
      Historial de abonos (clic en 💰 para editar, 🗑️ para eliminar):
    </p>
    <div className="max-h-32 overflow-y-auto space-y-1">
      {abonos.map(abono => {
        // ← ← ← DETECTAR SI ES ABONO MIGRADO DESDE PAGO WEB ← ← ←
        const esMigradoWeb = abono.notas?.includes('pago_web') || 
                            abono.referencia_externa?.toLowerCase().includes('bold');
        
        return (
          <div
            key={abono.id}
            className="flex justify-between items-center text-xs py-1.5 px-2 bg-gray-800 rounded border border-gray-700 hover:border-gray-600 transition-colors"
          >
            {/* ← ← ← INFO DEL ABONO (clickable para editar) ← ← ← */}
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => {
                setAbonoEditandoId(abono.id);
                setMontoAbono(abono.monto.toString());
                setMetodoPagoAbono(abono.metodo_pago);
                setReferenciaExterna(abono.referencia_externa || '');
                setShowAbonoModal(true);
              }}
              title={esMigradoWeb ? "Abono migrado desde pago web" : "Clic para editar este abono"}
            >
              {/* ← ← ← BADGE DE ORIGEN WEB ← ← ← */}
              {esMigradoWeb && (
                <span 
                  className="px-1.5 py-0.5 bg-blue-900/40 text-blue-300 text-[10px] rounded border border-blue-700/50 flex items-center gap-1"
                  title="Migrado desde pago web"
                >
                  🌐 Web
                </span>
              )}
              
              <span className="text-gray-400">{abono.metodo_pago_display}</span>
              
              {/* ← ← ← MOSTRAR REFERENCIA EXTERNA CON TRUNCADO ← ← ← */}
              {abono.referencia_externa && (
                <span 
                  className="text-gray-600 text-[10px] max-w-24 truncate" 
                  title={abono.referencia_externa}
                >
                  • {abono.referencia_externa.substring(0, 15)}...
                </span>
              )}
              
              {/* ← ← ← MOSTRAR ID DEL PAGO ORIGINAL SI ESTÁ EN NOTAS ← ← ← */}
              {esMigradoWeb && abono.notas?.match(/pago_id:(\d+)/) && (
                <span 
                  className="text-gray-500 text-[9px] font-mono"
                  title={`Pago original ID: ${abono.notas.match(/pago_id:(\d+)/)?.[1]}`}
                >
                  #{abono.notas.match(/pago_id:(\d+)/)?.[1]}
                </span>
              )}
              
              <span className="text-green-400 font-medium ml-auto">
                {formatMoney(abono.monto)}
              </span>
            </div>
            
            {/* ← ← ← BOTÓN ELIMINAR (🗑️) ← ← ← */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEliminarAbono(abono.id);
              }}
              className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
              title="Eliminar este abono"
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  </div>
)}
            
            
            {/* ← ← ← BOTÓN PARA REGISTRAR NUEVO ABONO (CON VALIDACIÓN) ← ← ← */}
            {/* Antes: onClick={() => setShowAbonoModal(true)} */}
            {/* Ahora: */}
            <button
                onClick={handleAbrirModalAbono}
                className="w-full px-4 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                💰 Registrar Pago(s)
            </button>
            {/* ← ← ← MENSAJE INFORMATIVO CUANDO ESTÁ DESACTIVADO ← ← ← 
              {hayItemsNoSincronizados && (
                <p className="text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded mt-2 border border-yellow-700/50 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>
                    Hay <strong>{items.filter(i => 
                      i.id.startsWith('new-') || i.id.startsWith('cita-') || i.id.startsWith('producto-') || (modoEdicion && i.esNuevo)
                    ).length} item(s) nuevo(s)</strong> que deben guardarse primero.
                    <br />
                    <button 
                      onClick={() => {
                        // Si está en modo edición, guardar; si no, publicar
                        if (modoEdicion && reciboId) {
                          handleActualizarReciboConPayload({
                            tipo: tipoRecibo,
                            estado: 'borrador',
                            subtotal, descuento, total, propina_total: propinaTotal,
                            propina_metodo_distribucion: propinaTotal > 0 ? propinaMetodo : null,
                            metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
                            session_caja: sessionCajaId,
                            cliente_nombre: clienteNombre?.trim() || 'No proporcionado',
                            cliente_telefono: clienteTelefono?.trim() || 'No proporcionado',
                            cliente_email: clienteEmail?.trim() || 'No@proporcionado.com',
                            notas: notas || '',
                          });
                        } else {
                          handleGuardar();
                        }
                      }}
                      className="text-yellow-300 hover:text-yellow-200 underline mt-1"
                    >
                      Guardar cambios ahora →
                    </button>
                  </span>
                </p>
              )}*/}
          </div>
        )}

            </div>

            {/* ← Columna Central: Items del Recibo */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-xl border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    📦 Items del Recibo ({items.length})
                  </h3>
                   ← ← ← PROPINA: UNIFICADA Y CLICKEABLE ← ← ← 
                  {tipoRecibo === 'venta' && items.length > 0 && (
                    <button
                      onClick={() => {
                        setPropinaEditable(String(propinaTotal));
                        setShowPropinaModal(true);
                      }}
                      className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1"
                      title="Click para editar propina"
                    >
                      💎 Propina: {propinaMetodo} - {formatMoney(propinaTotal)}
                    </button>
                  )}
                </div>

                <div className="p-4 max-h-80 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      {modoEdicion 
                        ? 'Este recibo no tiene items asignados' 
                        : tipoRecibo === 'entrada' 
                          ? 'Los recibos de entrada no requieren items' 
                          : 'Busca y agrega servicios o productos arriba'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => renderizarItemCompacto(item))}
                    </div>
                  )}
                </div>

                {/* Totales */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">{formatMoney(subtotal)}</span>
                    </div>
                    {/* ← ← ← AGREGAR ESTE BLOQUE en la sección de totales ← ← ← */}
                      {infoAliado.es_aliado && infoAliado.porcentaje > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium text-green-800">
                                Descuento Aliado: {infoAliado.aliado_nombre} ({infoAliado.porcentaje}%)
                              </span>
                            </div>
                             {descuentoAliadoCalculado > 0 && (
                            <span className="font-semibold text-green-700">
                              {formatMoney(descuentoAliadoCalculado)} 
                            </span>
                            )}
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Aplica solo sobre servicios. Productos sin descuento.
                          </p>

                        </div>
                      )}                                      
                    

                      {Number(descuento) > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Descuento Manual:</span>
                          <span>-{formatMoney(descuento)}</span>
                        </div>
                      )}
                    {/* ← ← ← PROPINA: FORMATO UNIFICADO (SOLO VENTAS) ← ← ← */}
                    {tipoRecibo === 'venta' && propinaTotal > 0 && (
                      <div className="flex justify-between">
                        <button
                          onClick={() => {
                            setPropinaEditable(String(propinaTotal));
                            setShowPropinaModal(true);
                          }}
                          className="text-left text-purple-400 hover:text-purple-300 cursor-pointer"
                          title="Click para editar propina"
                        >
                          💎 Propina: {propinaMetodo} 
                        </button>
                        <button
                          onClick={() => {
                            setPropinaEditable(String(propinaTotal));
                            setShowPropinaModal(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 cursor-pointer"
                          title="Click para editar propina"
                        >
                          {formatMoney(propinaTotal)} 
                        </button>
                        
                      </div>
                    )}
                    
                    {/* ← ← ← TOTAL CORREGIDO (incluye propina) ← ← ← */}
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-gray-300">TOTAL:</span>
                        <span className="text-green-400">{formatMoney(total)}</span>
                      </div>
                      
                      {/* ← ← ← INDICADOR DE ESTADO DE ABONOS ← ← ← */}
                      {resumenAbonos && (
                        <div className={`text-xs mt-2 p-2 rounded ${
                          resumenAbonos.puede_publicar 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-orange-900/30 text-orange-400'
                        }`}>
                          {resumenAbonos.puede_publicar 
                            ? '✅ 100% abonado - Listo para publicar' 
                            : `⏳ ${resumenAbonos.porcentaje_abonado.toFixed(1)}% (${formatMoney(resumenAbonos.total_abonado)} / ${formatMoney(total)})`}
                        </div>
                      )}
                    </div>                  </div>

                  {/* Inputs de Descuento y Propina */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Descuento ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={descuento}
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value);
                          setDescuento(!isNaN(valor) && valor >= 0 ? valor : 0);
                        }}
                        //disabled={modoEdicion}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                        placeholder="0"
                      />
                    </div>
                    {tipoRecibo === 'venta' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">💎 Propina ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={propinaEditable}
                          onChange={(e) => {
                            setPropinaEditable(e.target.value);
                            const valor = parseFloat(e.target.value) || 0;
                            setPropinaTotal(valor);
                            if (propinaDistribucion.length > 0) {
                              setPropinaDistribucion(calcularDistribucionPropina);
                            }
                          }}
                          //disabled={modoEdicion}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                </div>




              </div>
               
               {/* Notas */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    📝 Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-9 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Notas adicionales para este recibo..."
                  />
                </div>

              </div>
            </div>
          </div>

         

        
        {/*{tipoRecibo === 'venta' && estadoRecibo === 'borrador' && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  💰 Monto a Pagar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={montoPagar}
                    onChange={(e) => {
                        
                        const valor = parseFloat(e.target.value) || 0;
                        setMontoPagar(valor);
                        
                        // ← ← ← CLAVE: Marcar que el usuario editó manualmente ← ← ←
                        montoPagarEditedRef.current = true;
                        // Dentro del onChange del input de montoPagar:
                        console.log('🔍 montoPagar:', valor, '| editedRef:', montoPagarEditedRef.current, '| total:', total);
                        // Validación visual (opcional)
                        if (valor > total) {
                          e.target.classList.add('border-red-500');
                        } else {
                          e.target.classList.remove('border-red-500');
                        }
                      }}
                    className="w-full px-3 py-2 pl-8 bg-gray-800 border border-gray-600 rounded-lg text-white text-lg font-bold focus:border-green-500 focus:outline-none"
                  />
                </div>
                {montoPagar > total && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ El monto excede el total ({formatMoney(total)})
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total recibo</p>
                <p className="text-lg font-bold text-green-400">{formatMoney(total)}</p>
              </div>
            </div>
          </div>
        )}*/}

        {/* ← ← ← FOOTER CON BOTONES CONDICIONALES ← ← ← */}
        <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl flex gap-3">
          {/* ← ← ← BOTÓN CANCELAR ← ← ← */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          {/* ← ← ← BOTONES PARA VENTAS (lógica existente con abonos) ← ← ← */}
          {tipoRecibo === 'venta' && (
            <>
              {/* Botón Borrador para ventas nuevas */}
              {estadoRecibo === 'borrador' && !reciboId && !modoEdicion && (
                <button
                  onClick={() => {
                    setEstadoRecibo('borrador');
                    handleGuardar();
                  }}
                  disabled={loading || items.length === 0}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : ' Guardar Borrador'}
                </button>
              )}
              
              {/* Botón Actualizar para ventas en edición */}
              {estadoRecibo === 'borrador' && modoEdicion && reciboId && (
                <button
                  onClick={() => {
                    setEstadoRecibo('borrador');
                    const payloadBase = {
                      tipo: tipoRecibo,
                      estado: 'borrador',
                      subtotal: subtotal,
                      descuento: descuento,
                      total: total,
                      propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
                      propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
                      metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
                      session_caja: sessionCajaId,
                      cliente_nombre: tipoRecibo === 'venta' ? (clienteNombre?.trim() || 'No proporcionado') : '',
                      cliente_telefono: tipoRecibo === 'venta' ? (clienteTelefono?.trim() || 'No proporcionado') : '',
                      cliente_email: tipoRecibo === 'venta' ? (clienteEmail?.trim() || 'No@proporcionado.com') : '',
                      notas: notas || '',
                    };
                    handleActualizarReciboConPayload(payloadBase);
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Actualizando...' : '✏️ Actualizar Borrador'}
                </button>
              )}
              
              {/* Botón Publicar para ventas (con validación de abonos) */}
              <button
                onClick={async () => {
                  if (!resumenAbonos?.puede_publicar) {
                    alert(`⚠️ El recibo debe estar 100% abonado para publicar.\nActual: ${resumenAbonos?.porcentaje_abonado.toFixed(1)}%`);
                    return;
                  }
                  const validacion = validarServiciosConProfesional();
                  if (!validacion.valido) {
                    mostrarAlertaServiciosSinProfesional(validacion.serviciosSinProfesional);
                    return;
                  }
                  setEstadoRecibo('publicado');
                  const payloadBase = {
                    tipo: tipoRecibo,
                    estado: 'publicado',
                    subtotal: subtotal,
                    descuento: descuento,
                    total: total,
                    propina_total: tipoRecibo === 'venta' ? propinaTotal : 0,
                    propina_metodo_distribucion: tipoRecibo === 'venta' && propinaTotal > 0 ? propinaMetodo : null,
                    metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
                    session_caja: sessionCajaId,
                    cliente_nombre: tipoRecibo === 'venta' ? (clienteNombre?.trim() || 'No proporcionado') : '',
                    cliente_telefono: tipoRecibo === 'venta' ? (clienteTelefono?.trim() || 'No proporcionado') : '',
                    cliente_email: tipoRecibo === 'venta' ? (clienteEmail?.trim() || 'No@proporcionado.com') : '',
                    notas: notas || '',
                  };
                  if (modoEdicion && reciboId) {
                    await handleActualizarReciboConPayload(payloadBase);
                  } else {
                    await handleGuardarConPayload(payloadBase);
                  }
                }}
                disabled={
                  loading ||
                  items.length === 0 ||
                  !resumenAbonos?.puede_publicar
                }
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  !resumenAbonos?.puede_publicar
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : !resumenAbonos ? (
                  ' Cargando abonos...'
                ) : !resumenAbonos.puede_publicar ? (
                  `⏳ ${resumenAbonos.porcentaje_abonado.toFixed(1)}% - Faltan ${formatMoney(resumenAbonos.saldo_pendiente)}`
                ) : (
                  '✅ Publicar Recibo'
                )}
              </button>
            </>
          )}
          
          {/* ← ← ← BOTÓN REGISTRAR MOVIMIENTO: Exclusivo para Entradas/Salidas ← ← ← */}
          {(tipoRecibo === 'entrada' || tipoRecibo === 'salida') && (
            <button
              onClick={handleRegistrarMovimientoOperativo}
              disabled={loading || items.length === 0 || !metodoPago}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                tipoRecibo === 'entrada'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </>
              ) : (
                <>
                  {tipoRecibo === 'entrada' ? '💰 Registrar Ingreso' : '💸 Registrar Gasto'}
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* ← ← ← NUEVO: Modal interno para registrar abono ← ← ← */}
      {/* ← ← ← MODAL DE ABONO: CORREGIDO ← ← ← */}

      {showAbonoModal && reciboId && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-green-700 max-h-[90vh] flex flex-col">
            
            {/* ← ← ← HEADER CON BOTÓN X ← ← ← */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {abonoEditandoId ? '✏️ Editar Abono' : '💰 Registrar Abono'}
                  {abonoEditandoId && <span className="text-xs text-gray-400 font-normal">(Modo edición)</span>}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Registra un pago parcial del total pendiente
                </p>
              </div>
              
              {/* ← ← ← BOTÓN X PARA CERRAR SIN GUARDAR ← ← ← */}
              <button
                // En el botón "Cancelar" del modal de abono:
                onClick={() => {
                  setShowAbonoModal(false);
                  setAbonoEditandoId(null);  // ← ← ← AGREGAR ESTA LÍNEA
                  setMontoAbono('');
                  setReferenciaExterna('');
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                title="Cerrar sin guardar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ← ← ← BODY CON SCROLL ← ← ← */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* ← ← ← RESUMEN DEL SALDO (CORREGIDO: INCLUYE PROPINA) ← ← ← */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal servicios:</span>
                  <span className="text-white">{formatMoney(subtotal)}</span>
                </div>
                
                {propinaTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">💎 Propina:</span>
                    <span className="text-purple-400">{formatMoney(propinaTotal)}</span>
                  </div>
                )}
                
                {descuento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Descuento:</span>
                    <span className="text-orange-400">-{formatMoney(descuento)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">TOTAL A PAGAR:</span>
                    <span className="text-green-400">{formatMoney(total)}</span>
                  </div>
                </div>
                
                {/* Saldo restante para abono */}
                {resumenAbonos && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>Abonado:</span>
                      <span>{formatMoney(resumenAbonos.total_abonado)} / {formatMoney(total)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          resumenAbonos.puede_publicar ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, resumenAbonos.porcentaje_abonado)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      {resumenAbonos.porcentaje_abonado}% completado
                    </p>
                  </>
                )}
              </div>

              {/* ← ← ← CAMPOS DE MONTO Y RECIBIDO ← ← ← */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Campo Monto del Abono (solo lectura) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      💰 Monto del Abono
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={montoAbono}
                        readOnly
                        className="w-full px-4 py-3 pl-8 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg font-bold cursor-not-allowed"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Valor a registrar (automático)
                    </p>
                  </div>

                  {/* Campo Recibido (editable) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      💵 Recibido
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={recibido}
                        onChange={(e) => {
                          const valorRecibido = parseFloat(e.target.value) || 0;
                          setRecibido(e.target.value);
                          
                          // Lógica de actualización del monto de abono
                          const saldoPendiente = resumenAbonos?.saldo_pendiente || 0;
                          
                          if (valorRecibido >= saldoPendiente) {
                            // Si recibe más o igual al saldo, el abono es el saldo completo
                            setMontoAbono(saldoPendiente.toString());
                          } else {
                            // Si recibe menos, el abono es lo recibido
                            setMontoAbono(valorRecibido.toString());
                          }
                        }}
                        className="w-full px-4 py-3 pl-8 bg-gray-900 border border-green-600 rounded-lg text-white text-lg font-bold focus:border-green-500 focus:outline-none"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Valor recibido del cliente
                    </p>
                  </div>
                </div>

                {/* ← ← ← MOSTRAR SALDO RESTANTE (resaltado) ← ← ← */}
                {recibido && parseFloat(recibido) > 0 && (
                  <div className={`mt-3 p-3 rounded-lg border-2 ${
                    parseFloat(recibido) >= (resumenAbonos?.saldo_pendiente || 0)
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-orange-900/30 border-orange-500'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-300">
                        {parseFloat(recibido) >= (resumenAbonos?.saldo_pendiente || 0) 
                          ? '✅ Saldo a favor del cliente:' 
                          : '⚠️ Saldo pendiente restante:'}
                      </span>
                      <span className={`text-lg font-bold ${
                        parseFloat(recibido) >= (resumenAbonos?.saldo_pendiente || 0)
                          ? 'text-green-400'
                          : 'text-orange-400'
                      }`}>
                        $ {Math.abs(
                          parseFloat(recibido) - (resumenAbonos?.saldo_pendiente || 0)
                        ).toLocaleString('es-CO')}
                      </span>
                    </div>
                    {parseFloat(recibido) >= (resumenAbonos?.saldo_pendiente || 0) && (
                      <p className="text-xs text-green-300 mt-1">
                        El cliente recibió cambio o pago en exceso
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ← ← ← MÉTODO DE PAGO DEL ABONO ← ← ← */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Método de pago del abono
                </label>
                {/* ← ← ← AGREGAR autoFocus AQUÍ ← ← ← */}
                <select
                  value={metodoPagoAbono}
                  onChange={(e) => setMetodoPagoAbono(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  autoFocus  // ← ← ← ESTO HACE QUE EL SELECT TENGA EL FOCO AL ABRIR
                >
                  <option value="bold">💳 Bold</option>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="nequi">📱 Nequi</option>
                  <option value="daviplata">📱 Daviplata</option>
                  <option value="tarjeta">💳 Tarjeta en sitio</option>
                </select>
              </div>

              {/* ← ← ← REFERENCIA EXTERNA (OPCIONAL) ← ← ← */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Referencia externa (opcional)
                </label>
                <input
                  type="text"
                  value={referenciaExterna}
                  onChange={(e) => setReferenciaExterna(e.target.value)}
                  placeholder="Ej: ID transacción, número de transferencia..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  // NO agregar autoFocus aquí
                />
              </div>

            </div>

            {/* ← ← ← FOOTER CON ACCIONES ← ← ← */}
            <div className="p-6 border-t border-gray-700 flex gap-3">
              
              {/* ← ← ← BOTÓN CANCELAR: Cierra modal SIN registrar nada ← ← ← */}
              <button
                onClick={() => {
                  setShowAbonoModal(false);
                  setMontoAbono('');
                  setRecibido('');
                  setReferenciaExterna('');
                  // NO llamar a handleRegistrarAbono
                  // NO cambiar estado del recibo
                }}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                ❌ Cancelar
              </button>
              
              {/* ← ← ← BOTÓN REGISTRAR: SOLO registra abono, NO publica ← ← ← */}
           <button
            onClick={async () => {
              
              const montoNum = parseFloat(montoAbono);
              
              // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
              // ← ← ← CORRECCIÓN: Calcular saldo disponible excluyendo abono en edición ← ← ←
              // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
              
              const totalAbonado = resumenAbonos?.total_abonado || 0;
              
              // Buscar el abono que se está editando
              const abonoEditando = abonoEditandoId 
                ? abonos.find(a => String(a.id) === String(abonoEditandoId)) 
                : null;
              
              const montoAbonoEditando = abonoEditando ? parseFloat(abonoEditando.monto.toString()) : 0;
              
              // Calcular total de OTROS abonos (excluyendo el que se está editando)
              const otrosAbonos = totalAbonado - montoAbonoEditando;
              
              // Calcular máximo permitido: total recibo - otros abonos
              const maxAbono = total - otrosAbonos;
              
              // Validaciones
              if (isNaN(montoNum) || montoNum <= 0) {
                alert('⚠️ Ingresa un monto válido mayor a 0');
                return;
              }
              if (montoNum < 1000) {
                alert('⚠️ El monto mínimo es $1.000');
                return;
              }
              // ← ← ← VALIDACIÓN CORREGIDA: Usar maxAbono calculado correctamente ← ← ←
              if (montoNum > maxAbono) {
                alert(`⚠️ El monto excede el saldo pendiente (${formatMoney(maxAbono)})`);
                return;
              }
              
              setLoading(true);
              setMontoAbono('');
                  setRecibido('');
                  setReferenciaExterna('');
              try {
                // ← ← ← SOLO REGISTRAR ABONO ← ← ←
                await handleRegistrarAbono();
                
              } catch (err: any) {
                console.error('❌ Error registrando abono:', err);
                alert(`❌ Error: ${err.message}`);
              } finally {
                setLoading(false);
              }
            }}
            disabled={
              loading ||
              !montoAbono ||
              parseFloat(montoAbono) < 1000 ||
              // ← ← ← CORRECCIÓN: Calcular límite correcto en disabled ← ← ←
              parseFloat(montoAbono) > (() => {
                const totalAbonado = resumenAbonos?.total_abonado || 0;
                const abonoEditando = abonoEditandoId 
                  ? abonos.find(a => String(a.id) === String(abonoEditandoId)) 
                  : null;
                const montoAbonoEditando = abonoEditando ? parseFloat(abonoEditando.monto.toString()) : 0;
                const otrosAbonos = totalAbonado - montoAbonoEditando;
                return total - otrosAbonos;
              })()
            }
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              abonoEditandoId ? '✅ Actualizar Abono' : '✅ Registrar Abono'
            )}
          </button>
            </div>
            
          </div>
        </div>
      )}
      {/* ← ← ← MODAL DE PROPINA ← ← ← */}
      {showPropinaModal && tipoRecibo === 'venta' && (
        <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">💎 Distribuir Propina</h3>
              <p className="text-sm text-gray-400 mt-1">
                Total propina: {formatMoney(propinaTotal)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Monto de propina ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={propinaEditable}
                  onChange={(e) => {
                    setPropinaEditable(e.target.value);
                    const valor = parseFloat(e.target.value) || 0;
                    setPropinaTotal(valor);
                  }}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-lg font-bold focus:border-purple-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Método de distribución
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'equitativa', label: '⚖️ Equitativa (igual para todos)', desc: 'Divide el monto igualmente entre profesionales' },
                    { value: 'proporcional', label: '📊 Proporcional (según servicio)', desc: 'Distribuye según el valor de cada servicio' },
                    { value: 'manual', label: '✏️ Manual (asignar montos)', desc: 'Ingresa el monto para cada profesional' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-700 transition-colors">
                      <input
                        type="radio"
                        name="propinaMetodo"
                        value={option.value}
                        checked={propinaMetodo === option.value}
                        onChange={(e) => {
                          setPropinaMetodo(e.target.value as any);
                          setPropinaDistribucion(calcularDistribucionPropina);
                        }}
                        className="text-purple-600 mt-1"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">{option.label}</span>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-300 mb-3">
                  {propinaMetodo === 'manual' ? 'Asignar montos:' : 'Vista previa:'}
                </p>
                
                {calcularDistribucionPropina.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay profesionales con servicios para distribuir propina
                  </p>
                ) : (
                  <div className="space-y-2">
                    {calcularDistribucionPropina.map((dist, index) => (
                      <div key={dist.profesionalId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{dist.nombre}</span>
                        
                        {propinaMetodo === 'manual' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              value={dist.monto}
                              onChange={(e) => {
                                const nuevoMonto = parseFloat(e.target.value) || 0;
                                const nuevaDistribucion = [...propinaDistribucion];
                                const idx = nuevaDistribucion.findIndex(d => d.profesionalId === dist.profesionalId);
                                if (idx !== -1) {
                                  nuevaDistribucion[idx] = { ...nuevaDistribucion[idx], monto: nuevoMonto };
                                  const totalAsignado = nuevaDistribucion.reduce((s, d) => s + d.monto, 0);
                                  nuevaDistribucion.forEach(d => {
                                    d.porcentaje = totalAsignado > 0 ? Math.round((d.monto / totalAsignado) * 100) : 0;
                                  });
                                  setPropinaDistribucion(nuevaDistribucion);
                                }
                              }}
                              className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-right"
                            />
                            <span className="text-xs text-gray-500 w-8 text-right">
                              ({dist.porcentaje}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-purple-400 font-medium">
                            {formatMoney(dist.monto)} ({dist.porcentaje}%)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {propinaMetodo === 'manual' && propinaDistribucion.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                    <span>Total asignado:</span>
                    <span className={
                      Math.abs(propinaDistribucion.reduce((s, d) => s + d.monto, 0) - propinaTotal) <= 0.01
                        ? 'text-green-400' 
                        : 'text-orange-400'
                    }>
                      {formatMoney(propinaDistribucion.reduce((s, d) => s + d.monto, 0))} 
                      {Math.abs(propinaDistribucion.reduce((s, d) => s + d.monto, 0) - propinaTotal) > 0.01 && 
                        ` (Faltan ${formatMoney(propinaTotal - propinaDistribucion.reduce((s, d) => s + d.monto, 0))})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowPropinaModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (propinaMetodo === 'manual') {
                    const totalAsignado = propinaDistribucion.reduce((s, d) => s + d.monto, 0);
                    if (Math.abs(totalAsignado - propinaTotal) > 0.01) {
                      alert(`⚠️ La suma de los montos (${formatMoney(totalAsignado)}) no coincide con el total de propina (${formatMoney(propinaTotal)}). Ajusta los valores antes de confirmar.`);
                      return;
                    }
                  }
                  setPropinaDistribucion(calcularDistribucionPropina);
                  setShowPropinaModal(false);
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCitasModal && (
        <CitasPendientesModal
          isOpen={showCitasModal}
          onClose={() => setShowCitasModal(false)}
          onSelect={handleCitaSeleccionada}
          apiUrl={apiUrl}
          token={token}
        />
      )}
     
      {/* ← ← ← MODAL: Calcular y Pagar Comisiones ← ← ← */}
      {modalComisionesOpen && (  // ← ← ← USAR LA PROP, NO UNA VARIABLE LOCAL
        <CalcularComisionesModal
          isOpen={true}  // ← ← ← Siempre true porque el padre controla la visibilidad
          onClose={() => {
            // Llamar callback del padre si existe
            if (onModalComisionesClose) {
              onModalComisionesClose();
            }
            
          }}
          onPagoExitoso={(reciboCodigo: string) => {  // ← ← ← parámetro correcto
            console.log('✅ Comisiones pagadas:', reciboCodigo);
            
            // Recargar datos de caja
            if (typeof onComisionesPagadas === 'function') {
              onComisionesPagadas();
            }
            
            // Mostrar confirmación
            alert(`✅ Pago procesado. Recibo: ${reciboCodigo}`);
            
            // Cerrar modal de comisiones
            if (onModalComisionesClose) {
              onModalComisionesClose();
            }
            
          }}
          apiUrl={apiUrl}
          token={token}
        />
      )}
      {/* ← ← ← MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (UNIFICADO) ← ← ← */}
{itemToDelete && (
  <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-red-700/50 p-6">
      {/* Icono y título */}
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white">¿Cómo deseas eliminar este item?</h3>
        <p className="text-sm text-gray-400 mt-1">
          <span className="text-white font-medium">{itemToDelete.descripcion}</span>
        </p>
      </div>

      {/* Opciones */}
      <div className="space-y-3 mb-6">
        {itemToDelete.tipo === 'servicio' && itemToDelete.citaId ? (
          <>
            <button
              onClick={() => {
                quitarItemDelRecibo(itemToDelete.id);
                setItemToDelete(null);
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              📋 Solo quitar del recibo
              <span className="text-xs text-blue-200">(La cita se mantiene)</span>
            </button>
            <button
              onClick={() => {
                removerItem(itemToDelete.id);
                setItemToDelete(null);
              }}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              🗑️ Eliminar item + cita
              <span className="text-xs text-red-200">(Acción irreversible)</span>
            </button>
          </>
        ) : (
          // Si es producto o servicio sin cita, solo una opción clara
          <button
            onClick={() => {
              quitarItemDelRecibo(itemToDelete.id);
              setItemToDelete(null);
            }}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            ✅ Confirmar eliminación
          </button>
        )}
      </div>

      {/* Cancelar */}
      <button
        onClick={() => setItemToDelete(null)}
        className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
      >
        Cancelar
      </button>
    </div>
  </div>
)}
      {/* ← ← ← MODAL DE BÚSQUEDA DE CLIENTES ← ← ← */}
{showClientModal && (
  <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowClientModal(false)}>
    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white">👥 Seleccionar Cliente</h3>
        <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, teléfono o email..."
          value={clienteSearchTerm}
          onChange={(e) => setClienteSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
      </div>
      <div className="overflow-y-auto max-h-96 p-2">
        <button
          onClick={handleNuevoCliente}
          className="w-full p-4 mb-2 bg-green-900/50 border-2 border-green-700 rounded-xl text-left hover:bg-green-800/50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-white">➕ Nuevo Cliente</p>
            <p className="text-xs text-gray-400">Registrar cliente nuevo</p>
          </div>
        </button>
        {clientesFiltrados.map((cliente) => (
          <button
            key={`${cliente.esRegistrado ? 'reg' : 'no'}-${cliente.id}`}
            onClick={() => handleClienteSelect(cliente)}
            className="w-full p-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl text-left hover:bg-gray-700 hover:border-blue-500 transition-all flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${cliente.esRegistrado ? 'bg-blue-900' : 'bg-gray-700'}`}>
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {cliente.nombre} {cliente.esRegistrado && cliente.userId && `(${cliente.userId})`}
              </p>
              <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
              {cliente.email && <p className="text-xs text-gray-500 truncate">{cliente.email}</p>}
            </div>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  </div>
)}

{/* ← ← ← MODAL DE NUEVO CLIENTE ← ← ← */}
{showRegisterModal && (
  <div className="fixed inset-0 z-[96] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRegisterModal(false)}>
    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white">➕ Nuevo Cliente</h3>
        <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre completo *</label>
          <input
            type="text"
            value={nuevoClienteData.nombre}
            onChange={(e) => setNuevoClienteData(prev => ({ ...prev, nombre: e.target.value }))}
            className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            placeholder="Ej: Wilmer Quijano"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Teléfono</label>
          <input
            type="tel"
            value={nuevoClienteData.telefono}
            onChange={(e) => setNuevoClienteData(prev => ({ ...prev, telefono: e.target.value }))}
            className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            placeholder="Ej: 300 123 4567"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={nuevoClienteData.email}
            onChange={(e) => setNuevoClienteData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            placeholder="Ej: cliente@email.com"
          />
        </div>
      </div>
      <div className="p-4 border-t border-gray-700 flex gap-3">
        <button onClick={() => setShowRegisterModal(false)} className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">
          Cancelar
        </button>
        <button onClick={handleGuardarNuevoCliente} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
          ✅ Agregar
        </button>
      </div>
    </div>
  </div>
)}
      {/* ← ← ← MODAL DE PROFESIONAL ← ← ← NUEVO ← ← ← */}
      {showProfessionalModal && itemParaProfesional && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => {
            setShowProfessionalModal(false);
            setItemParaProfesional(null);
          }}
          onSelect={handleProfesionalSelected}
          servicioId={itemParaProfesional.tipo === 'servicio' ? (itemParaProfesional.servicioId || undefined) : undefined}
          profesionalSeleccionadoId={itemParaProfesional.profesionalId || undefined}
        />
      )}
    </div>
  );
}