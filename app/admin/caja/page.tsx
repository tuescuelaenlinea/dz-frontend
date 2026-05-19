// app/admin/caja/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CajaReciboModal from '@/components/admin/CajaReciboModal';
import CalcularComisionesModal from '@/components/admin/CalcularComisionesModal';

// ← ← ← INTERFACES ← ← ←

interface CajaSession {
  id: number;
  usuario: number;
  usuario_username: string;
  fecha: string;
  turno: 'manana' | 'tarde' | 'noche';
  hora_apertura: string;
  hora_cierre: string | null;
  saldo_inicial: string;
  saldo_final: string | null;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  observaciones_apertura: string;
  observaciones_cierre: string;
  total_entradas: string;
  total_salidas: string;
  total_ventas: string;
  saldo_esperado: string;
  creado: string;
}

interface ReciboCaja {
  id: number;
  codigo_recibo: string;
  tipo: 'entrada' | 'salida' | 'venta';
  estado: 'borrador' | 'publicado' | 'anulado';
  subtotal: string;
  descuento: string;
  total: string;
  propina_total: string;
  metodo_pago: string;
  cliente_nombre: string;
  fecha: string;
  session_caja_turno: string;
  items?: Array<{
    id: number;
    tipo_item: string;
    profesional: number | null;
    descripcion: string;
    cantidad: number;
    subtotal: string;
  }>;
}

interface ValeEmpleado {
  id: number;
  codigo_vale: string;
  profesional: number;
  profesional_nombre: string;
  monto: string;
  fecha: string;
  estado: 'registrado' | 'pagado' | 'cancelado';
  notificacion_whatsapp_enviada: boolean;
  // ← ← ← NUEVOS CAMPOS PARA MÉTODO DE PAGO ← ← ←
  metodo_pago?: string;
  metodo_pago_display?: string;
  session_caja?: number | null;  // ← ← ← AGREGAR ESTA LÍNEA
}

interface CajaCategoria {
  id: number;
  nombre: string;
  tipo: 'entrada' | 'salida' | 'ambos';
  color: string;
}

// ← ← ← NUEVA INTERFAZ PARA PROFESIONALES (para select de vales) ← ← ←
interface Profesional {
  id: number;
  nombre: string;
  telefono_whatsapp?: string;
  activo: boolean;
}

// ← ← ← NUEVA INTERFAZ para recibos sueltos
interface ReciboSueltosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recibosIds: number[], asignarTodos: boolean) => Promise<void>;
  recibosSueltos: ReciboCaja[];
  sessionActiva: CajaSession | null;
}

interface CitaHuerfana {
  id: number;
  codigo_reserva: string;
  servicio_nombre: string;
  cliente_nombre: string;
  precio_total: string;
  pago_acumulado: string;  // ← ← ← AGREGAR: Para calcular saldo
  estado: string;
  fecha?: string;       // ← NUEVO: Fecha de la cita
  hora_inicio?: string; // ← NUEVO: Hora de la cita
}


// ← ← ← COMPONENTE PRINCIPAL ← ← ←

export default function CajaPage() {
  const router = useRouter();
  
  // ← Estados
  const [sessionActiva, setSessionActiva] = useState<CajaSession | null>(null);
  const [recibosRecientes, setRecibosRecientes] = useState<ReciboCaja[]>([]);
  
  const [categorias, setCategorias] = useState<CajaCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ← Modales
  const [modalAbrirCajaOpen, setModalAbrirCajaOpen] = useState(false);
  const [modalCerrarCajaOpen, setModalCerrarCajaOpen] = useState(false);
  const [modalNuevoReciboOpen, setModalNuevoReciboOpen] = useState(false);
  const [modalNuevoValeOpen, setModalNuevoValeOpen] = useState(false);
  const [modalEditarReciboOpen, setModalEditarReciboOpen] = useState(false);
  const [reciboEditarId, setReciboEditarId] = useState<number | null>(null);

  // ← ← ← NUEVO: Estado para modal de comisiones ← ← ←
  const [modalComisionesOpen, setModalComisionesOpen] = useState(false);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<number | null>(null);

  // ← ← ← NUEVOS ESTADOS PARA ACORDEÓN DE DETALLE ← ← ←
  const [reciboExpandido, setReciboExpandido] = useState<number | null>(null);
  const [detalleRecibo, setDetalleRecibo] = useState<ReciboCaja | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ← ← ← AGREGAR ESTOS ESTADOS JUNTO A LOS DEMÁS (línea ~40) ← ← ←
  const [recibosVentas, setRecibosVentas] = useState<ReciboCaja[]>([]);
  const [recibosComisiones, setRecibosComisiones] = useState<ReciboCaja[]>([]);
  const [hayBorradoresPendientes, setHayBorradoresPendientes] = useState(false);

  // ← ← ← NUEVOS ESTADOS PARA HISTORIAL DE SESIONES ← ← ←
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [sesionesHistorial, setSesionesHistorial] = useState<CajaSession[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<CajaSession | null>(null);
  const [filtroFechaHistorial, setFiltroFechaHistorial] = useState<string>('');

  // ← ← ← NUEVOS ESTADOS PARA VALES ← ← ←
  const [valesPendientes, setValesPendientes] = useState<ValeEmpleado[]>([]);
  const [valesSesion, setValesSesion] = useState<ValeEmpleado[]>([]);  // ← ← ← NUEVO
  const [loadingVales, setLoadingVales] = useState(false);

  // ← ← ← NUEVOS ESTADOS agregar recibos sueltos a session)
  const [modalAsignarSueltosOpen, setModalAsignarSueltosOpen] = useState(false);
  const [recibosSueltos, setRecibosSueltos] = useState<ReciboCaja[]>([]);
  const [recibosSeleccionados, setRecibosSeleccionados] = useState<Set<number>>(new Set());
  const [asignarTodos, setAsignarTodos] = useState(true);
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);

  const [citasHuerfanas, setCitasHuerfanas] = useState<CitaHuerfana[]>([]);
  const [modalHuerfanasOpen, setModalHuerfanasOpen] = useState(false);
  const citasProcesadasRef = useRef<Set<number>>(new Set());
  const audioNotifRef = useRef<HTMLAudioElement | null>(null);

  // ← ← ← AGREGAR ESTOS ESTADOS para edición inline de método de pago
  const [editandoMetodo, setEditandoMetodo] = useState(false);
  const [metodoTemporal, setMetodoTemporal] = useState(detalleRecibo?.metodo_pago || '');

  const [citasSeleccionadas, setCitasSeleccionadas] = useState<Set<number>>(new Set());
  const [citasParaCancelar, setCitasParaCancelar] = useState<Set<number>>(new Set());

  // ← ← ← CONSTANTE: Opciones de método de pago para vales ← ← ←
  const METODOS_PAGO_VALE = [
    { value: 'efectivo', label: '💵 Efectivo' },
    { value: 'transferencia', label: '🏦 Transferencia' },
    { value: 'nequi', label: '📱 Nequi' },
    { value: 'daviplata', label: '📱 Daviplata' },
    { value: 'bold', label: '💳 Bold' },
    { value: 'tarjeta', label: '💳 Tarjeta en sitio' },
    { value: 'caja_menor', label: '📦 Caja menor' },
  ] as const;
  // ← ← ← OPCIONES DE MÉTODO DE PAGO
  const OPCIONES_METODO = [
    { value: 'efectivo', label: '💵 Efectivo' },
    { value: 'transferencia', label: '🏦 Transferencia' },
    { value: 'nequi', label: '📱 Nequi' },
    { value: 'daviplata', label: '📱 Daviplata' },
    { value: 'bold', label: '💳 Bold' },
    { value: 'tarjeta', label: '💳 Tarjeta' },
    { value: 'pendiente', label: '⏳ Pendiente' },
  ];

  // ← ← ← FUNCIÓN: Guardar método de pago (USANDO ENDPOINT ESPECÍFICO) ← ← ←
const handleGuardarMetodo = async (reciboId: number, nuevoMetodo: string) => {
  // ← ← ← VALIDACIÓN: Verificar que tengamos un ID válido ← ← ←
  if (!reciboId) {
    console.error('❌ No se proporcionó reciboId');
    setEditandoMetodo(false);
    return;
  }
  
  if (!nuevoMetodo || nuevoMetodo === detalleRecibo?.metodo_pago) {
    setEditandoMetodo(false);
    return;
  }
  
  try {
    const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/actualizar-metodo-pago/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ metodo_pago: nuevoMetodo })
    });
    
    if (res.ok) {
      // Actualizar estado local para reflejar cambio inmediato
      setDetalleRecibo(prev => prev ? { ...prev, metodo_pago: nuevoMetodo } : null);
      console.log(`✅ Método actualizado: ${nuevoMetodo}`);
      
      // ← ← ← ACTUALIZAR TAMBIÉN LA LISTA DE RECIBOS ← ← ←
      setRecibosRecientes(prev => prev.map(r => 
        r.id === reciboId ? { ...r, metodo_pago: nuevoMetodo } : r
      ));
    } else {
      console.error('❌ Error actualizando método de pago');
      // Revertir al valor original si falla
      setMetodoTemporal(detalleRecibo?.metodo_pago || '');
    }
  } catch (err) {
    console.error('❌ Error de red:', err);
    setMetodoTemporal(detalleRecibo?.metodo_pago || '');
  } finally {
    setEditandoMetodo(false);
  }
};

  // ← Formulario abrir caja
  const [formDataAbrir, setFormDataAbrir] = useState({
    fecha: new Date().toISOString().split('T')[0],
    turno: 'manana' as const,
    saldo_inicial: '',
    observaciones_apertura: ''
  });

  // ← Formulario cerrar caja
  const [formDataCerrar, setFormDataCerrar] = useState({
    saldo_final: '',
    observaciones_cierre: ''
  });
  
  // ← ← ← NUEVOS ESTADOS PARA MÓDULO DE VALES ← ← ←
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [nuevoVale, setNuevoVale] = useState({
    profesional: '',
    monto: '',
    session_caja: '',
    metodo_pago: 'bold',  // ← ← ← NUEVO: default efectivo
    notas: '',
    notificar_whatsapp: false
  });
 // ← ← ← ESTADO PARA VALIDACIÓN DE SALDO ← ← ←
const [validacionSaldo, setValidacionSaldo] = useState<{
  disponible: number | null;
  limite: number | null;
  excedido: boolean;  // ← ← ← ASEGURAR QUE ESTÉ DEFINIDO
} | null>(null);
  const [loadingVale, setLoadingVale] = useState(false);
  
  // ← ← ← AGREGAR ESTA FUNCIÓN EN CajaPage ← ← ←
  const handleEditarRecibo = (recibo: any) => {
    console.log('✏️ [CajaPage] Editar recibo:', recibo.codigo_recibo);
    
    // Disparar evento para abrir modal en CajaReciboModal
    window.dispatchEvent(new CustomEvent('abrirReciboBorrador', {
      detail: { reciboId: recibo.id }
    }));
  };
  
  // ← ← ← NUEVAS FUNCIONES PARA VALIDACIÓN Y REDIRECCIÓN ← ← ←
  
  // Validar servicios con profesional (solo informativa)
  const validarServiciosParaPublicar = (items: any[]) => {
    return items.filter((item: any) => 
      item.tipo_item === 'servicio' && !item.profesional
    );
  };

  // Mostrar alerta informativa con opción de redirigir
  const mostrarAlertaAsignarProfesionales = (servicios: any[], reciboId: number) => {
    const lista = servicios.map((s: any) => `• ${s.descripcion} (${s.cantidad}x)`).join('\n');
    
    const confirmar = window.confirm(
      `ℹ️ Información para publicar\n\n` +
      `Hay ${servicios.length} servicio(s) que requieren profesional asignado:\n${lista}\n\n` +
      `¿Deseas ir a "Control de Citas" para asignar los profesionales ahora?\n\n` +
      `• "Aceptar": Ir a asignar profesionales\n` +
      `• "Cancelar": Seguir en Caja (podrás publicar después)`
    );
    
    if (confirmar) {
      // Redirigir a Control de Citas usando CustomEvent
      // AdminPage debe escuchar este evento y hacer setActiveTab('control')
      window.dispatchEvent(new CustomEvent('redirigirAsignarProfesionales', {
        detail: { reciboId, origen: 'caja' }
      }));
    }
    // Si cancela, simplemente cierra la alerta y permite continuar
  };

  // Calcular distribución manual para propina
  const calcularDistribucionManualCaja = (items: any[], propinaTotal: number) => {
    const profesionalesUnicos = Array.from(
      new Set(
        items
          .filter((item: any) => item.tipo_item === 'servicio' && item.profesional)
          .map((item: any) => item.profesional)
      )
    );
    
    if (profesionalesUnicos.length === 0 || propinaTotal === 0) return [];
    
    const distribucion: Array<{
      profesional: number;
      monto: number;
      porcentaje: number;
    }> = [];
    let montoRestante = propinaTotal;
    
    profesionalesUnicos.forEach((profId: number, index: number) => {
      if (index === profesionalesUnicos.length - 1) {
        // Último profesional recibe el residuo para evitar errores de redondeo
        distribucion.push({
          profesional: profId,
          monto: Math.round(montoRestante),
          porcentaje: Math.round((montoRestante / propinaTotal) * 100)
        });
      } else {
        // Calcular proporción basada en subtotal del profesional
        const subtotalProfesional = items
          .filter((item: any) => item.tipo_item === 'servicio' && item.profesional === profId)
          .reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
        
        const subtotalTotal = items
          .filter((item: any) => item.tipo_item === 'servicio')
          .reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
        
        const porcentaje = subtotalTotal > 0 ? (subtotalProfesional / subtotalTotal) * 100 : 0;
        const monto = Math.round((porcentaje / 100) * propinaTotal);
        
        distribucion.push({
          profesional: profId,
          monto: monto,
          porcentaje: Math.round(porcentaje)
        });
        
        montoRestante -= monto;
      }
    });
    
    return distribucion;
  };


  // ← ← ← NUEVOS ESTADOS PARA CONTADOR DE CITAS HUÉRFANAS ← ← ←
const [citasHuerfanasCount, setCitasHuerfanasCount] = useState<{
  total: number;
  pendientes: number;
  confirmadas: number;
  completadas: number;
}>({ total: 0, pendientes: 0, confirmadas: 0, completadas: 0 });
const [loadingCitasCount, setLoadingCitasCount] = useState(false);

// ← ← ← FUNCIÓN: Cargar contador de citas sin recibo ← ← ←
const cargarContadorCitasHuerfanas = async () => {
  try {
    setLoadingCitasCount(true);
    const res = await fetch(`${apiUrl}/citas/sin-recibo-para-caja/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      const citas: CitaHuerfana[] = Array.isArray(data) ? data : [];
      
      // Contar por estado
      const conteo = {
        total: citas.length,
        pendientes: citas.filter(c => c.estado === 'pendiente').length,
        confirmadas: citas.filter(c => c.estado === 'confirmada').length,
        completadas: citas.filter(c => c.estado === 'completada').length,
      };
      setCitasHuerfanasCount(conteo);
    }
  } catch (err) {
    console.error('❌ Error cargando contador de citas:', err);
  } finally {
    setLoadingCitasCount(false);
  }
};

// ← ← ← EFECTO: Cargar contador al montar componente y cuando cambie la sesión ← ← ←
useEffect(() => {
  if (sessionActiva?.id || !sessionActiva) {
    cargarContadorCitasHuerfanas();
  }
}, [sessionActiva?.id]);

// ← ← ← FUNCIÓN: Abrir modal de citas huérfanas manualmente ← ← ←
const handleAbrirModalCitasHuerfanas = async () => {
  // Recargar lista actualizada antes de abrir
  try {
    const res = await fetch(`${apiUrl}/citas/sin-recibo-para-caja/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      const citas: CitaHuerfana[] = Array.isArray(data) ? data : [];
      setCitasHuerfanas(citas);
      setModalHuerfanasOpen(true);
    }
  } catch (err) {
    console.error('❌ Error cargando citas:', err);
    alert('⚠️ No se pudieron cargar las citas');
  }
};




  // ← ← ← FUNCIÓN: Reabrir sesión cerrada ← ← ←
const reabrirSesion = async (sesion: CajaSession) => {
  // Confirmación antes de reabrir
  const confirmar = window.confirm(
    `⚠️ ¿Estás seguro de reabrir la sesión #${sesion.id}?
    
    Fecha: ${formatDate(sesion.fecha)}
    Turno: ${sesion.turno}
    Usuario: ${sesion.usuario_username}
    
    Esto cambiará el estado de "cerrada" a "abierta" y permitirá agregar más recibos.`
  );
  
  if (!confirmar) return;
  
  try {
    const res = await fetch(`${apiUrl}/caja/sesiones/${sesion.id}/reabrir/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al reabrir sesión');
    }
    
    alert('✅ Sesión reabierta exitosamente');
    
    // Cerrar modal de historial
    setModalHistorialOpen(false);
    setSesionSeleccionada(null);
    
    // Recargar datos de caja
    cargarDatosCaja();
    
  } catch (err: any) {
    console.error('❌ Error reabriendo sesión:', err);
    alert(`❌ Error: ${err.message}`);
  }
};

useEffect(() => {
  if (modalHuerfanasOpen && citasHuerfanas.length > 0) {
    const seleccionInicial = new Set<number>();
    citasHuerfanas.forEach(cita => {
      // ✅ confirmada y completada → MARCADAS por defecto
      if (cita.estado === 'confirmada' || cita.estado === 'completada') {
        seleccionInicial.add(cita.id);
      }
      // ⏳ pendiente y ❌ cancelada → DESMARCADAS por defecto
    });
    setCitasSeleccionadas(seleccionInicial);
  }
}, [modalHuerfanasOpen, citasHuerfanas]);

// ← ← ← Toggle selección de cita individual
const toggleCitaSeleccionada = (citaId: number) => {
  const nuevas = new Set(citasSeleccionadas);
  if (nuevas.has(citaId)) {
    nuevas.delete(citaId);
  } else {
    nuevas.add(citaId);
    // Si se marca para recibo, quitar de cancelación
    const paraCancelar = new Set(citasParaCancelar);
    paraCancelar.delete(citaId);
    setCitasParaCancelar(paraCancelar);
  }
  setCitasSeleccionadas(nuevas);
};
// ← ← ← NUEVO: Toggle para cancelar cita
const toggleCitaParaCancelar = (citaId: number) => {
  const nuevas = new Set(citasParaCancelar);
  if (nuevas.has(citaId)) {
    nuevas.delete(citaId);
  } else {
    nuevas.add(citaId);
    // Si se marca para cancelar, quitar de recibo
    const seleccionadas = new Set(citasSeleccionadas);
    seleccionadas.delete(citaId);
    setCitasSeleccionadas(seleccionadas);
  }
  setCitasParaCancelar(nuevas);
};
// ← ← ← NUEVO: Función para cancelar las citas marcadas
const cancelarCitasHuerfanas = async () => {
  if (citasParaCancelar.size === 0) return;
  if (!confirm(`¿Estás seguro de cancelar ${citasParaCancelar.size} cita(s)? Esta acción no se puede deshacer.`)) return;

  const idsACancelar = Array.from(citasParaCancelar);
  let exitosas = 0;

  for (const citaId of idsACancelar) {
    try {
      // Actualizamos el estado a 'cancelada'
      const res = await fetch(`${apiUrl}/citas/${citaId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ estado: 'cancelada' })
      });
      if (res.ok) exitosas++;
    } catch (err) {
      console.error(`❌ Error cancelando cita ${citaId}:`, err);
    }
  }

  if (exitosas > 0) {
    alert(`✅ Se cancelaron ${exitosas} cita(s) exitosamente.`);
    // Limpiar de la lista visual
    setCitasHuerfanas(prev => prev.filter(c => !citasParaCancelar.has(c.id)));
    setCitasParaCancelar(new Set());
    
    // Si no quedan citas, cerrar modal
    if (citasHuerfanas.filter(c => !citasParaCancelar.has(c.id)).length === 0) {
       setModalHuerfanasOpen(false);
    }
  }
};

// ← ← ← Mapeo de colores por estado (según tu requerimiento)
const getEstadoBadgeClass = (estado: string) => {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-100 text-yellow-800';
    case 'confirmada': return 'bg-blue-100 text-blue-800';
    case 'completada': return 'bg-green-100 text-green-800';
    case 'cancelada': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
// ← ← ← ESCUCHAR ACTUALIZACIONES DE RECIBO (CORREGIDO)
useEffect(() => {
  const handleReciboActualizado = (event: CustomEvent) => {
    const { id, metodo_pago, subtotal, total, propina_total, items, distribuciones_propina, ...datosCompletos } = event.detail;
    console.log(`🔄 Actualizando recibo ${id} | subtotal: ${subtotal} | total: ${total}`);
    
    // ← ← ← 1. Actualizar en listas principales
    const actualizarLista = (prev: ReciboCaja[]) => prev.map(r =>
      r.id === id ? { ...r, metodo_pago, subtotal, total, propina_total, items, ...datosCompletos } : r
    );
    
    setRecibosVentas(actualizarLista);
    setRecibosComisiones(actualizarLista);
    setRecibosRecientes(actualizarLista);
    
    // ← ← ← 2. CLAVE: Actualizar detalleRecibo si está expandido ← ← ←
    if (reciboExpandido === id) {
      setDetalleRecibo(prev => {
        if (prev?.id === id) {
          console.log(`🔄 [page.tsx] ✅ Actualizando detalleRecibo ID=${id} | total=${total}`);
          return { 
            ...prev, 
            metodo_pago, 
            subtotal, 
            total, 
            propina_total, 
            items, 
            distribuciones_propina,
            ...datosCompletos 
          };
        }
        return prev;
      });
    }
  };
  
  window.addEventListener('reciboActualizado', handleReciboActualizado as EventListener);
  return () => {
    window.removeEventListener('reciboActualizado', handleReciboActualizado as EventListener);
  };
}, [reciboExpandido]);  // ← ← ← AGREGAR esta dependencia CRÍTICA
// ← ← ← INICIALIZAR NOTIFICACIÓN DE SONIDO ← ← ←
useEffect(() => {
  // Puedes usar un archivo local: '/sounds/alert.mp3' 
  // o una URL externa para pruebas rápidas:
  audioNotifRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audioNotifRef.current.volume = 0.6; // Volumen al 60%
  return () => { audioNotifRef.current = null; };
}, []);

// ← ← ← SONDEO AUTOMÁTICO: CITAS SIN RECIBO ← ← ←
useEffect(() => {
  if (!sessionActiva || sessionActiva.estado !== 'abierta') return;

  const verificarCitasHuerfanas = async () => {
    // Evitar interrumpir al usuario si ya tiene otro modal abierto
    if (
      modalNuevoReciboOpen || 
      modalCerrarCajaOpen || 
      modalHistorialOpen || 
      modalHuerfanasOpen || 
      modalEditarReciboOpen ||  // ← ← ← NUEVO: modal de edición
      modalAsignarSueltosOpen   // ← ← ← NUEVO: modal de asignación
    ) {
      console.log('⏭️ [Sondeo] Saltando: hay modales abiertos');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/citas/sin-recibo-para-caja/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const citas: CitaHuerfana[] = Array.isArray(data) ? data : [];
        
        // Filtrar solo las que NO hemos mostrado ya en este ciclo de sesión
        const nuevas = citas.filter(c => !citasProcesadasRef.current.has(c.id));
        
        if (nuevas.length > 0) {
          console.log(`🚨 [Sondeo] ${nuevas.length} cita(s) huérfana(s) detectadas`);
          setCitasHuerfanas(nuevas);
          setModalHuerfanasOpen(true);

           // 🔊 REPRODUCIR SONIDO
            if (audioNotifRef.current) {
              audioNotifRef.current.currentTime = 0; // Reiniciar si ya sonó
              audioNotifRef.current.play().catch(() => console.log('🔇 Audio bloqueado por política del navegador'));
            }
          
          // Marcar como procesadas para no volver a mostrarlas inmediatamente
          nuevas.forEach(c => citasProcesadasRef.current.add(c.id));
        }
      }
    } catch (err) {
      console.error('❌ Error sondeando citas huérfanas:', err);
    }
  };

  verificarCitasHuerfanas(); // Ejecutar inmediatamente al montar/cambiar sesión
  const interval = setInterval(verificarCitasHuerfanas, 45000); // Cada 45 segundos

  return () => clearInterval(interval);
}, [sessionActiva?.id, sessionActiva?.estado]);

  // ← ← ← AGREGAR ESTE EFECTO para verificar borradores cuando cambia la sesión ← ← ←
useEffect(() => {
  if (sessionActiva?.id) {
    verificarBorradoresEnSesion(sessionActiva.id).then((tieneBorradores) => {
      setHayBorradoresPendientes(tieneBorradores);
    });
  } else {
    setHayBorradoresPendientes(false);
  }
}, [sessionActiva?.id]);

  // ← ← ← FUNCIÓN: Cargar detalle completo de un recibo con sus items ← ← ←
const cargarDetalleRecibo = async (reciboId: number) => {
  if (reciboExpandido === reciboId) {
    setReciboExpandido(null);
    setDetalleRecibo(null);
    return;
  }
  
  setLoadingDetalle(true);
  try {
    const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    // ← ← ← MANEJAR 404 EXPLÍCITAMENTE ← ← ←
    if (res.status === 404) {
      console.warn(`⚠️ Recibo ${reciboId} no encontrado (posiblemente eliminado o sin permisos)`);
      alert('⚠️ Este recibo ya no está disponible');
      setReciboExpandido(null);
      return;
    }
    
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    
    const data = await res.json();
    setDetalleRecibo(data);
    setReciboExpandido(reciboId);
  } catch (err: any) {
    console.error('❌ Error cargando detalle:', err);
    // No mostrar alerta genérica para errores de red/404
    if (err.message && !err.message.includes('404')) {
      alert('⚠️ No se pudo cargar el detalle del recibo');
    }
  } finally {
    setLoadingDetalle(false);
  }
};
// ← ← ← FUNCIÓN: Cargar historial de sesiones de caja ← ← ←
const cargarHistorialSesiones = async (fecha?: string) => {
  setLoadingHistorial(true);
  try {
    // ← ← ← CAMBIO: ordering=id para orden ascendente por ID
    // ← ← ← También incluimos cerrada,cancelada para ver todo el historial
    let url = `${apiUrl}/caja/sesiones/?estado=cerrada,cancelada&ordering=session_caja_id&limit=100`;
    //let url = `${apiUrl}/caja/recibos/?ordering=-session_caja_id,-fecha,-id&limit=50`;
    if (fecha) {
      url += `&fecha=${fecha}`;
    }
    
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!res.ok) {
      console.error('❌ Error cargando historial:', res.status);
      return;
    }
    
    const data = await res.json();
    const sesiones = Array.isArray(data) ? data : (data.results || []);
    
    console.log('📋 Sesiones históricas cargadas:', sesiones.length);
    setSesionesHistorial(sesiones);
    
  } catch (err) {
    console.error('❌ Error cargando historial:', err);
  } finally {
    setLoadingHistorial(false);
  }
};

// ← ← ← FUNCIÓN: Abrir sesión anterior en modo solo lectura ← ← ←
const abrirSesionParaVer = async (sesion: CajaSession) => {
  console.log('👁️ Abriendo sesión histórica:', sesion.id);
  
  try {
    const res = await fetch(`${apiUrl}/caja/sesiones/${sesion.id}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (res.ok) {
      const sesionCompleta = await res.json();
      setSesionSeleccionada(sesionCompleta);
    } else {
      setSesionSeleccionada(sesion);
    }
    
    // ← ← ← CLAVE: Para sesión histórica, NO incluir borradores (esSesionActiva=false)
    await cargarRecibosRecientes(sesion.id, false);
    
    setModalHistorialOpen(false);
    
    alert(`📋 Viendo sesión #${sesion.id} del ${formatDate(sesion.fecha)}
⚠️ Modo solo lectura: No puedes modificar esta sesión.`);
    
  } catch (err) {
    console.error('❌ Error cargando sesión histórica:', err);
    setSesionSeleccionada(sesion);
    setModalHistorialOpen(false);
  }
};

// ← ← ← FUNCIÓN AUXILIAR: Renderizar badge de tipo de item ← ← ←
const getTipoItemBadge = (tipo: string, profesional?: string | null) => {
  const base = "px-2 py-0.5 rounded text-xs font-medium";
  
  if (tipo === 'servicio') {
    return `${base} ${profesional 
      ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
      : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'}`;
  }
  if (tipo === 'producto') {
    return `${base} bg-purple-900/50 text-purple-300 border border-purple-700`;
  }
  return `${base} bg-gray-700 text-gray-300`;
};
  
  // ← ← ← FUNCIÓN: Verificar si hay borradores (USANDO ENDPOINT DEDICADO) ← ← ←
const verificarBorradoresEnSesion = async (sessionId: number): Promise<boolean> => {
  try {
    console.log('🔍 Verificando borradores para sesión:', sessionId);
    
    const res = await fetch(
      `${apiUrl}/caja/recibos/verificar-borradores/?session_caja=${sessionId}`,
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      }
    );
    
    if (!res.ok) {
      console.error('❌ Error verificando borradores:', res.status);
      return false;
    }
    
    const data = await res.json();
    console.log('📋 Resultado verificación:', data);
    
    return data.tiene_borradores;
    
  } catch (err) {
    console.error('❌ Error verificando borradores:', err);
    return false;
  }
};

// ← ← ← EFECTO: Recargar recibos cuando sessionActiva cambie ← ← ←
useEffect(() => {
  if (sessionActiva?.id) {
    console.log('🔄 Session activa cambiada a ID:', sessionActiva.id);
    // ← ← ← PASAR esSesionActiva=true para incluir borradores
    cargarRecibosRecientes(sessionActiva.id, true);
    verificarBorradoresEnSesion(sessionActiva.id).then((tieneBorradores) => {
      setHayBorradoresPendientes(tieneBorradores);
    });
  } else {
    console.log('🔄 No hay sesión activa, cargando solo borradores');
    // ← ← ← Sin sesión: solo borradores
    cargarRecibosRecientes(null, false);
    setHayBorradoresPendientes(false);
  }
}, [sessionActiva?.id]);

 // ← ← ← CREAR RECIBOS PARA CITAS HUÉRFANAS - VERSIÓN SECUENCIAL ← ← ←
// ← ← ← EN page.tsx - función crearRecibosParaHuerfanas ← ← ←
// ← ← ← EN page.tsx - función crearRecibosParaHuerfanas ACTUALIZADA ← ← ←
const crearRecibosParaHuerfanas = async () => {
  setModalHuerfanasOpen(false);
  const resultados: Array<{cita: CitaHuerfana, exito: boolean, error?: string}> = [];

  // Filtrar SOLO las citas marcadas por el usuario
  const citasAProcesar = citasHuerfanas.filter(c => citasSeleccionadas.has(c.id));

  if (citasAProcesar.length === 0) {
    alert('⚠️ Debes seleccionar al menos una cita para generar recibos.');
    setModalHuerfanasOpen(true);
    return;
  }

  try {
    const sessionCajaId = sessionActiva?.id || null;
    
    // ← ← ← CAMBIO CLAVE: Usar nuevo endpoint 'vincular-recibo-sin-pago' ← ← ←
    for (const cita of citasAProcesar) {
      try {
        const res = await fetch(`${apiUrl}/citas/${cita.id}/vincular-recibo-sin-pago/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ 
            session_caja_id: sessionActiva?.id || null,  // ← ← ← Pasar sesión si existe
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.warn(`⚠️ Cita ${cita.codigo_reserva}: ${errorData.error || res.statusText}`);
          resultados.push({ cita, exito: false, error: errorData.error });
          continue;
        }

        const data = await res.json();
        console.log(`✅ Cita ${cita.codigo_reserva} vinculada:`, data);
        resultados.push({ cita, exito: true });
        
      } catch (err: any) {
        console.error(`❌ Error para ${cita.codigo_reserva}:`, err);
        resultados.push({ cita, exito: false, error: err.message });
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const exitosas = resultados.filter(r => r.exito).length;
    const fallidas = resultados.filter(r => !r.exito).length;

    if (exitosas > 0) {
      alert(`✅ Se vincularon ${exitosas} cita(s) exitosamente (sin generar pagos duplicados).`);
      await cargarRecibosRecientes(sessionActiva?.id || null, true, Date.now());
      await cargarVales();
    }
    if (fallidas > 0) {
      console.warn(`⚠️ ${fallidas} cita(s) fallaron. Revisa consola.`);
    }
  } catch (err) {
    console.error('❌ Error crítico:', err);
    alert('❌ Error de red al procesar citas.');
  } finally {
    setCitasHuerfanas([]);
    setCitasSeleccionadas(new Set());
  }
};

  // ← ← ← NUEVA FUNCIÓN: Publicar recibo con validaciones ← ← ←
  const handlePublicarRecibo = async (reciboId: number) => {
    try {
      // 1. Obtener detalles actuales del recibo
      const resDetalle = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!resDetalle.ok) throw new Error('Error cargando recibo');
      const recibo = await resDetalle.json();
      
      // 2. Validación INFORMATIVA: servicios sin profesional
      const serviciosSinProfesional = validarServiciosParaPublicar(recibo.items || []);
      
      if (serviciosSinProfesional.length > 0) {
        mostrarAlertaAsignarProfesionales(serviciosSinProfesional, reciboId);
        // No retornar: permitir que el usuario decida continuar o no
        // Si cancela la alerta, puede intentar publicar igual
      }
      
      // 3. Preparar payload para método manual
      const payload: any = {};
      if (recibo.propina_metodo_distribucion === 'manual' && recibo.propina_total > 0) {
        payload.distribucion = calcularDistribucionManualCaja(
          recibo.items, 
          parseFloat(recibo.propina_total)
        );
      }
      
      // 4. Llamar endpoint publicar
      const resPublicar = await fetch(`${apiUrl}/caja/recibos/${reciboId}/publicar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (!resPublicar.ok) {
        const errorData = await resPublicar.json();
        
        // Manejar error backend: servicios sin profesional
        if (errorData.servicios_sin_profesional) {
          mostrarAlertaAsignarProfesionales(errorData.servicios_sin_profesional, reciboId);
          return;
        }
        
        throw new Error(errorData.detail || 'Error al publicar');
      }
      
      const resultado = await resPublicar.json();
      
      // 5. Éxito: mostrar confirmación
      alert(`✅ Recibo ${resultado.recibo.codigo_recibo} publicado exitosamente`);
      
      // 6. Actualizar UI: recargar lista de recibos
      await cargarRecibosRecientes();
      
          // 6. Éxito: mostrar confirmación
      alert(`✅ Recibo ${resultado.recibo.codigo_recibo} publicado exitosamente`);
      
      // ← ← ← CLAVE: Forzar recarga EXPLÍCITA con sesión actual
      // No confiar en el useEffect, pasar sessionId directamente
      const sessionIdActual = sessionActiva?.id || null;
      await cargarRecibosRecientes(sessionIdActual, true, Date.now());  // ← ← ← esSesionActiva=true + cacheBuster
      
      // ← ← ← También recargar vales para consistencia
      await cargarVales();
      
    } catch (err: any) {
      console.error('❌ Error publicando recibo:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };
  
  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← ← ← AGREGAR: Escuchar evento para abrir recibo borrador ← ← ←
    useEffect(() => {
      const handleAbrirReciboBorrador = (event: CustomEvent) => {
        const { reciboId } = event.detail;
        console.log('📦 [CajaPage] Abriendo recibo borrador ID:', reciboId);
        
        // Aquí podrías:
        // 1. Abrir el modal CajaReciboModal con reciboId
        // 2. O redirigir a una ruta de edición específica
        
        // Por ahora, abrimos el modal existente pasando el ID
        setModalEditarReciboOpen(true);
        setReciboEditarId(reciboId);
      };

      window.addEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
      
      return () => {
        window.removeEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
      };
    }, []);

  // ← Cargar datos al montar
  useEffect(() => {
    cargarDatosCaja();
  }, []);

// ← Cargar datos principales
const cargarDatosCaja = async (cacheBuster?: number) => {
  setLoading(true);
  try {
    const session = await cargarSessionActiva();
    
    await Promise.all([
      cargarRecibosRecientes(session?.id || null, !!session, cacheBuster),  // ← ← ← Pasar cacheBuster
      cargarVales(),
      cargarCategorias(),
      cargarProfesionalesParaVales()
    ]);
  } catch (err) {
    console.error('❌ Error cargando datos de caja:', err);
  } finally {
    setLoading(false);
  }
};
// ← ← ← EFECTO: Recargar vales cuando cambia sesión activa o seleccionada ← ← ←
useEffect(() => {
  // Usar un flag para evitar ejecutar en el primer render
  let isMounted = true;
  
  const loadVales = async () => {
    // Esperar un tick para asegurar que sessionActiva/sesionSeleccionada estén actualizados
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (isMounted && (sessionActiva?.id || sesionSeleccionada?.id)) {
      await cargarVales();
    }
  };
  
  loadVales();
  
  return () => {
    isMounted = false;
  };
}, [sessionActiva?.id, sesionSeleccionada?.id]);

  // ← ← ← ESCUCHAR EVENTO DE COMISIONES PAGADAS (RESPALDO) ← ← ←
useEffect(() => {
const handleReciboComisionesPagado = (event: CustomEvent) => {
console.log('🔄 [CajaPage] Evento recibido:', event.detail);
cargarDatosCaja(); // Recargar toda la información
};

window.addEventListener('reciboComisionesPagado', handleReciboComisionesPagado as EventListener);

return () => {
window.removeEventListener('reciboComisionesPagado', handleReciboComisionesPagado as EventListener);
};
}, []);

  // ← ← ← NUEVA FUNCIÓN: Cargar profesionales para el select de vales ← ← ←
  const cargarProfesionalesParaVales = async () => {
    try {
      const res = await fetch(`${apiUrl}/profesionales/?activo=true&ordering=nombre`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfesionales(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando profesionales para vales:', err);
    }
  };

// ← Cargar sesión activa
const cargarSessionActiva = async (): Promise<CajaSession | null> => {
  try {
    const res = await fetch(`${apiUrl}/caja/sesiones/activa/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (res.ok) {
      const data = await res.json();
      setSessionActiva(data);
      // ← ← ← ACTUALIZAR session_caja en nuevoVale cuando hay sesión activa
      if (data?.id) {
        setNuevoVale(prev => ({ ...prev, session_caja: data.id.toString() }));
      }
      return data;  // ← ← ← RETORNAR la sesión para usarla inmediatamente
    }
    return null;
  } catch (err) {
    console.error('❌ Error cargando sesión activa:', err);
    return null;
  }
};



// ← ← ← FUNCIÓN: Cargar recibos recientes (CORREGIDA) ← ← ←
// ← ← ← FUNCIÓN: Cargar recibos recientes (CORREGIDA CON CACHE-BUSTER) ← ← ←
const cargarRecibosRecientes = async (
  sessionId?: number | null,
  esSesionActiva: boolean = false,
  cacheBuster?: string | number
) => {
  try {
    let url: string;
    
    // ← ← ← 1. CONSTRUIR URL BASE SEGÚN CONDICIONES ← ← ←
    if (esSesionActiva && sessionId) {
      // Endpoint que incluye borradores + recibos de sesión
      url = `${apiUrl}/caja/recibos/para-sesion-activa/?session_id=${sessionId}&ordering=-fecha&limit=50`;
      console.log('📦 Cargando recibos: sesión activa + borradores');
    } else if (sessionId) {
      // Sesión histórica (solo lectura)
      url = `${apiUrl}/caja/recibos/?ordering=-fecha&limit=50&session_caja=${sessionId}`;
      console.log('📦 Cargando recibos de sesión histórica:', sessionId);
    } else {
      // Sin sesión → solo borradores
      url = `${apiUrl}/caja/recibos/?ordering=-fecha&limit=50&session_caja=`;
      console.log('📦 Cargando solo borradores sin sesión');
    }
    
    // ← ← ← 2. AGREGAR CACHE-BUSTER AL FINAL (SIEMPRE) ← ← ←
    if (cacheBuster) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}_t=${cacheBuster}`;
      console.log(`🔄 Cache-buster aplicado: ${cacheBuster}`);
    }
    
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!res.ok) {
      console.error('❌ Error cargando recibos:', res.status);
      return;
    }
    
    const data = await res.json();
    const todosRecibos = Array.isArray(data) ? data : (data.results || []);
    console.log('📦 Total recibos cargados:', todosRecibos.length);
    
    // Separar por tipo
    const ventas = todosRecibos
      .filter((r: ReciboCaja) => r.tipo === 'venta' && r.estado !== 'anulado')
      .slice(0, 10);
    const comisiones = todosRecibos
      .filter((r: ReciboCaja) =>
        (r.tipo === 'salida' || r.tipo === 'entrada') && r.estado !== 'anulado'
      )
      .slice(0, 10);
    
    setRecibosVentas(ventas);
    setRecibosComisiones(comisiones);
    setRecibosRecientes(todosRecibos.slice(0, 10));
    
  } catch (err) {
    console.error('❌ Error cargando recibos:', err);
  }
};
// ← ← ← FUNCIÓN: Cargar vales (sesión + pendientes) ← ← ←
// ← ← ← FUNCIÓN: Cargar vales (sesión + pendientes) ← ← ←
const cargarVales = async () => {
  console.log('🔄 [cargarVales] Estado actual:', {
    sessionActiva: sessionActiva?.id,
    sesionSeleccionada: sesionSeleccionada?.id,
    valesSesion: valesSesion.length,
    valesPendientes: valesPendientes.length
  });
  
  setLoadingVales(true);
  try {
    // Determinar ID de sesión a usar (prioridad: seleccionada > activa)
    const sessionId = sesionSeleccionada?.id || sessionActiva?.id;
    
    console.log('🔍 [cargarVales] sessionId:', sessionId, '| sessionActiva:', sessionActiva?.id, '| sesionSeleccionada:', sesionSeleccionada?.id);
    
    // ← ← ← CARGAR VALES DE LA SESIÓN (si hay sesión) ← ← ←
    if (sessionId) {
      const url = `${apiUrl}/caja/vales/?session_caja=${sessionId}&ordering=-fecha&limit=50`;
      console.log('📡 Fetch vales de sesión:', url);
      
      const resSesion = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (resSesion.ok) {
        const data = await resSesion.json();
        const valesDeSesion = Array.isArray(data) ? data : (data.results || []);
        console.log('✅ Vales de sesión cargados:', valesDeSesion.length, 'para sessionId:', sessionId);
        console.log('📋 Vales de sesión:', valesDeSesion); // ← ← ← AGREGAR ESTO
        setValesSesion(valesDeSesion);
      } else {
        const errorText = await resSesion.text().catch(() => 'N/A');
        console.error('❌ Error cargando vales de sesión:', resSesion.status, errorText);
        setValesSesion([]);
      }
    } else {
      console.log('ℹ️ No hay sessionId, limpiando valesSesion');
      setValesSesion([]);
    }
    
    // ← ← ← CARGAR VALES PENDIENTES GLOBALES (sin sesión) ← ← ←
    // ← ← ← CAMBIO: Usar un enfoque diferente ← ← ←
    const urlPendientes = `${apiUrl}/caja/vales/?estado=registrado&ordering=-fecha&limit=50`;
    console.log('📡 Fetch vales pendientes:', urlPendientes);
    
    const resPendientes = await fetch(urlPendientes, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (resPendientes.ok) {
      const data = await resPendientes.json();
      const todosVales = Array.isArray(data) ? data : (data.results || []);
      console.log('📥 Todos los vales registrados:', todosVales.length);
      console.log('📋 Vales recibidos:', todosVales); // ← ← ← AGREGAR ESTO
      
      /// ← ← ← FILTRAR EN FRONTEND: Solo vales sin sesión ← ← ←
      // ← ← ← CORRECCIÓN: Manejar null explícitamente ← ← ←
      const valesGlobales = todosVales.filter((v: ValeEmpleado) => 
          v.session_caja === null || v.session_caja === undefined || v.session_caja === 0
      );
      console.log('✅ Vales pendientes globales (filtrados):', valesGlobales.length);
      setValesPendientes(valesGlobales);
    } else {
      const errorText = await resPendientes.text().catch(() => 'N/A');
      console.error('❌ Error cargando vales pendientes:', resPendientes.status, errorText);
      setValesPendientes([]);
    }
    
  } catch (err) {
    console.error('❌ Error cargando vales:', err);
    setValesSesion([]);
    setValesPendientes([]);
  } finally {
    setLoadingVales(false);
  }
};

  // ← Cargar categorías
  const cargarCategorias = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/caja/categorias/?activo=true`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando categorías:', err);
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Validar saldo disponible del profesional ← ← ← 
  const validarSaldoProfesional = async (profesionalId: string, montoIntento: number) => {
    if (!profesionalId || !montoIntento) {
      setValidacionSaldo(null);
      return { valido: true, disponible: null, limite: null, excedido: false };  // ← ← ← CONSISTENTE
    }
    
    try {
      const res = await fetch(`${apiUrl}/caja/vales/?profesional=${profesionalId}&limit=1`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const primerVale = Array.isArray(data) ? data[0] : (data.results?.[0]);
        
        if (primerVale?.saldo_disponible_vales !== undefined) {
          const disponible = primerVale.saldo_disponible_vales;
          const limite = primerVale.saldo_ganado_mes * 0.50;
          const excedido = disponible !== null && montoIntento > disponible;
          
          // ← ← ← ACTUALIZAR STATE CON OBJETO COMPLETO ← ← ←
          setValidacionSaldo({
            disponible,
            limite,
            excedido  // ← ← ← Siempre incluir excedido
          });
          
          // ← ← ← RETORNAR SIEMPRE EL MISMO TIPO ← ← ←
          return { valido: !excedido, disponible, limite, excedido };
        }
      }
      // ← ← ← RETORNO POR DEFECTO CONSISTENTE ← ← ←
      return { valido: true, disponible: null, limite: null, excedido: false };
    } catch (err) {
      console.warn('⚠️ No se pudo validar saldo:', err);
      return { valido: true, disponible: null, limite: null, excedido: false };  // ← ← ← CONSISTENTE
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Crear nuevo vale ← ← ←
  const handleCrearVale = async () => {
    // Validaciones básicas
    if (!nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja) {
      alert('⚠️ Completa todos los campos obligatorios');
      return;
    }
    
    const montoNum = parseFloat(nuevoVale.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('⚠️ Ingresa un monto válido mayor a 0');
      return;
    }
    
    // Validar saldo disponible
    const validacion = await validarSaldoProfesional(nuevoVale.profesional, montoNum);
    

      // ← ← ← AGREGAR: Validar que la respuesta exista ← ← ←
      if (!validacion) {
        console.error('❌ Error validando saldo del profesional');
        alert('⚠️ No se pudo validar el saldo. Intenta nuevamente.');
        return;
      }

      if (validacion.excedido) {
        alert(`⚠️ El monto excede el saldo disponible ($${validacion.disponible?.toLocaleString('es-CO') || 'N/A'})`);
        return;
      }
    
    setLoadingVale(true);
    
    try {
      const payload = {
        profesional: parseInt(nuevoVale.profesional),
        monto: montoNum,
        session_caja: parseInt(nuevoVale.session_caja),
        // ← ← ← NUEVO: incluir método de pago ← ← ←
        metodo_pago: nuevoVale.metodo_pago,
        notas: nuevoVale.notas || '',
        notificacion_whatsapp_enviada: nuevoVale.notificar_whatsapp
      };
      
      const res = await fetch(`${apiUrl}/caja/vales/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.monto?.[0] || error.detail || 'Error creando vale');
      }
      
      const valeCreado = await res.json();
      
      // ← ← ← ENVIAR NOTIFICACIÓN WHATSAPP SI SE SOLICITÓ ← ← ←
      if (nuevoVale.notificar_whatsapp) {
        try {
          await fetch(`${apiUrl}/caja/vales/${valeCreado.id}/notificar/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
        } catch (err) {
          console.warn('⚠️ No se pudo enviar notificación WhatsApp');
        }
      }
      
      alert(`✅ Vale ${valeCreado.codigo_vale} creado exitosamente`);
      setModalNuevoValeOpen(false);
      setNuevoVale({ 
        profesional: '', 
        monto: '', 
        session_caja: sessionActiva?.id?.toString() || '', 
        metodo_pago: 'bold',  // ← ← ← NUEVO: reset a default
        notas: '', 
        notificar_whatsapp: false 
      });
      setValidacionSaldo(null);
      cargarVales(); // Recargar lista
      
    } catch (err: any) {
      console.error('❌ Error creando vale:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoadingVale(false);
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Cancelar vale ← ← ←
  const handleCancelarVale = async (vale: ValeEmpleado) => {
    if (!confirm(`¿Estás seguro de cancelar el vale ${vale.codigo_vale}?\n\nEsta acción no se puede deshacer.`)) return;
    
    const motivo = prompt('Motivo de cancelación (opcional):') || '';
    
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/cancelar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ motivo })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || 'Error cancelando vale');
      }
      
      alert(`✅ Vale ${vale.codigo_vale} cancelado`);
      cargarVales();
      
    } catch (err: any) {
      console.error('❌ Error cancelando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Marcar vale como pagado ← ← ←
  const handlePagarVale = async (vale: ValeEmpleado) => {
    if (!confirm(`¿Marcar vale ${vale.codigo_vale} como pagado?\n\nEsto registrará el descuento en nómina.`)) return;
    
    const metodoPago = prompt('Método de pago (nomina/efectivo/transferencia):', 'nomina') || 'nomina';
    
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/pagar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ metodo_pago: metodoPago })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || 'Error pagando vale');
      }
      
      alert(`✅ Vale ${vale.codigo_vale} marcado como pagado`);
      cargarVales();
      
    } catch (err: any) {
      console.error('❌ Error pagando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Enviar notificación WhatsApp ← ← ←
  const handleNotificarVale = async (vale: ValeEmpleado) => {
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/notificar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (res.ok) {
        alert('📱 Notificación WhatsApp enviada');
        cargarVales();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error enviando notificación');
      }
    } catch (err: any) {
      console.error('❌ Error notificando:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Abrir nueva sesión de caja
  const handleAbrirCaja = async () => {
    if (!formDataAbrir.saldo_inicial) {
      alert('⚠️ Ingresa el saldo inicial');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/abrir/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formDataAbrir,
          saldo_inicial: parseFloat(formDataAbrir.saldo_inicial)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSessionActiva(data);
        setModalAbrirCajaOpen(false);
        alert('✅ Caja abierta exitosamente');
        cargarDatosCaja();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.detail || 'No se pudo abrir la caja'}`);
      }
    } catch (err: any) {
      console.error('❌ Error abriendo caja:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← AGREGAR ESTA FUNCIÓN en CajaPage (antes de handleCerrarCaja) ← ← ←
const buscarRecibosSueltos = async (): Promise<ReciboCaja[]> => {
  try {
    console.log('🔍 [buscarRecibosSueltos] Buscando recibos sin sesión...');
    // Buscar recibos publicados que NO tengan sesión asignada
    const res = await fetch(
      `${apiUrl}/caja/recibos/?session_caja=&limit=100`,  // Sin &estado=publicado
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      }
    );
    
    if (!res.ok) {
      console.error('❌ Error buscando recibos sueltos:', res.status);
      return [];
    }
    
    const data = await res.json();
    const recibos = Array.isArray(data) ? data : (data.results || []);
    
    console.log('✅ [buscarRecibosSueltos] Recibos sin sesión encontrados:', recibos.length);
    return recibos;
  } catch (err) {
    console.error('❌ Error en buscarRecibosSueltos:', err);
    return [];
  }
};

const handleCerrarCaja = async () => {
    console.log('🔒 [DEBUG] Iniciando cierre de caja, sesión:', sessionActiva?.id);
    
    if (!sessionActiva || !formDataCerrar.saldo_final) {
        alert('⚠️ Ingresa el saldo final');
        return;
    }

    // Paso 1: Verificar borradores
    console.log('🔍 [DEBUG] Verificando borradores...');
    const hayBorradores = await verificarBorradoresEnSesion(sessionActiva.id);
    console.log('📋 [DEBUG] Borradores encontrados:', hayBorradores);
    
    if (hayBorradores) {
        const confirmar = window.confirm(
            '⚠️ ATENCIÓN: Existen recibos en estado "Borrador"\n' +
            'No se recomienda cerrar la caja con recibos pendientes.\n' +
            '¿Deseas continuar de todas formas?\n' +
            '• "Aceptar": Cerrar caja (los borradores quedarán sin sesión)\n' +
            '• "Cancelar": Volver y publicar/eliminar los borradores primero'
        );
        console.log('✅ [DEBUG] Usuario aceptó continuar con borradores');
        if (!confirmar) {
            console.log('❌ [DEBUG] Usuario canceló el cierre');
            return;
        }
    }

    // Paso 2: Buscar recibos sueltos
    console.log('🔍 [DEBUG] Buscando recibos sueltos...');
    try {
        const sueltos = await buscarRecibosSueltos();
        console.log('📦 [DEBUG] Recibos sueltos encontrados:', sueltos.length);
        
        if (sueltos.length > 0) {
            console.log('📋 [DEBUG] Abriendo modal de asignación...');
            setRecibosSueltos(sueltos);
            setRecibosSeleccionados(new Set(sueltos.map(r => r.id)));
            setAsignarTodos(true);
            setModalAsignarSueltosOpen(true);
            console.log('⏸️ [DEBUG] Esperando decisión del usuario en modal');
            return;
        }
        
        console.log('✅ [DEBUG] No hay recibos sueltos, procediendo al cierre');
        await ejecutarCierreDeCaja();
        
    } catch (error) {
        console.error('❌ [DEBUG] Error buscando recibos sueltos:', error);
        alert('Error al buscar recibos sueltos. Intenta nuevamente.');
    }
};

    // ← ← ← NUEVA FUNCIÓN: Ejecutar el cierre real de caja
    const ejecutarCierreDeCaja = async () => {
      try {
        const res = await fetch(`${apiUrl}/caja/sesiones/${sessionActiva!.id}/cerrar/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            saldo_final: parseFloat(formDataCerrar.saldo_final),
            observaciones_cierre: formDataCerrar.observaciones_cierre
          })
        });

        if (res.ok) {
          const data = await res.json();
          setSessionActiva(null);
          setModalCerrarCajaOpen(false);
          alert(`✅ Caja cerrada. Diferencia: ${data.diferencia}`);
          cargarDatosCaja();
        } else {
          const error = await res.json();
          console.error('❌ Error del backend:', error);
          alert(`❌ Error: ${error.detail || 'No se pudo cerrar la caja'}`);
        }
      } catch (err: any) {
        console.error('❌ Error cerrando caja:', err);
        alert(`❌ Error: ${err.message}`);
      }
    };

   const handleConfirmarAsignarSueltos = async () => {
      if (!sessionActiva) return;
      setLoadingAsignacion(true);
      
      try {
        const idsAAsignar = asignarTodos ? [] : Array.from(recibosSeleccionados);
        
        // ← ← ← LOGS DETALLADOS ← ← ←
        console.log('📤 [asignar] ENVIANDO PETICIÓN:', {
          url: `${apiUrl}/caja/recibos/asignar-a-sesion/`,
          payload: {
            session_caja_id: sessionActiva?.id || null,
            recibos_ids: idsAAsignar,
            solo_borradores: true
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ***' : 'NO TOKEN'
          }
        });
        
        const res = await fetch(`${apiUrl}/caja/recibos/asignar-a-sesion/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            session_caja_id: sessionActiva?.id || null,
            recibos_ids: idsAAsignar,
            solo_borradores: false
          })
        });
        
        console.log('📥 [asignar] Response:', {
          status: res.status,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        
        const resultado = await res.json();
        console.log('✅ [asignar] Resultado backend:', resultado);
        
        if (!res.ok) {
          throw new Error(resultado.error || resultado.detail || 'Error asignando recibos');
        }
        
        // ← ← ← VERIFICAR QUE SE ASIGNARON ← ← ←
        if (resultado.count === 0) {
          console.warn('⚠️ [asignar] Backend reportó 0 recibos asignados');
        }
        
        setModalAsignarSueltosOpen(false);
        await ejecutarCierreDeCaja();
        
         setModalAsignarSueltosOpen(false);
    
      // ← ← ← ESPERAR un tick para asegurar que el backend procesó la asignación
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ← ← ← FORZAR RECARGA EXPLÍCITA: solo borradores (sessionActiva ya es null)
      const timestamp = Date.now();
      await cargarRecibosRecientes(null, false, timestamp);
      
      // ← ← ← También recargar vales para consistencia
      await cargarVales();
      
    } catch (err: any) {
      console.error('❌ [asignar] ERROR CRÍTICO:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoadingAsignacion(false);
    }
  };

    // ← ← ← Toggle para selección individual de recibos
    const toggleReciboSeleccionado = (reciboId: number) => {
      const nuevos = new Set(recibosSeleccionados);
      if (nuevos.has(reciboId)) {
        nuevos.delete(reciboId);
      } else {
        nuevos.add(reciboId);
      }
      setRecibosSeleccionados(nuevos);
      setAsignarTodos(false); // Desmarcar "todos" si se hace selección manual
    };

  // ← Formatear moneda
  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  // ← Formatear fecha - CORREGIDO PARA TIMEZONE COLOMBIA
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // ← ← ← Si es formato YYYY-MM-DD (DateField de Django), parsear como fecha LOCAL
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // new Date(year, month-1, day) crea fecha en timezone local
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    });
  }
  
  // ← ← ← Para datetime completo (ISO string), forzar timezone Colombia
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'  // ← ← ← CLAVE: Forzar timezone correcto
  });
};

  // ← Obtener color por tipo de recibo
  const getReciboColor = (tipo: string, estado: string): string => {
    if (estado === 'anulado') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (estado === 'borrador') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    
    switch (tipo) {
      case 'entrada': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'salida': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'venta': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // ← ← ← VALIDAR SALDO AL CAMBIAR PROFESIONAL O MONTO ← ← ←
  useEffect(() => {
    if (!nuevoVale.profesional || !nuevoVale.monto) {
      setValidacionSaldo(null);
      return;
    }
    
    const montoNum = parseFloat(nuevoVale.monto);
    if (isNaN(montoNum) || montoNum <= 0) return;
    
    // Debounce para no hacer llamadas en cada tecla
    const timer = setTimeout(() => {
      validarSaldoProfesional(nuevoVale.profesional, montoNum);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [nuevoVale.profesional, nuevoVale.monto]);

  // ← Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
      {/* ← Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* ← ← ← BADGE: Identificación de sesión actual (ACTIVA o HISTÓRICA) ← ← ← */}
        {(sessionActiva || sesionSeleccionada) && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badge principal con ID, fecha y turno */}
            <span className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1.5 font-mono ${
              sessionActiva 
                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              TURNO
              <span className="font-bold">#{(sessionActiva || sesionSeleccionada)?.id}</span>
              <span className="text-gray-400">•</span>
              <span>{formatDate((sessionActiva || sesionSeleccionada)?.fecha || '')}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{(sessionActiva || sesionSeleccionada)?.turno}</span>
            </span>
            
            {/* Badge de estado */}
            <span className={`px-2 py-0.5 text-xs rounded border ${
              (sessionActiva || sesionSeleccionada)?.estado === 'abierta'
                ? 'bg-green-900/50 text-green-400 border-green-700'
                : (sessionActiva || sesionSeleccionada)?.estado === 'cerrada'
                  ? 'bg-blue-900/50 text-blue-400 border-blue-700'
                  : 'bg-red-900/50 text-red-400 border-red-700'
            }`}>
              {(sessionActiva || sesionSeleccionada)?.estado === 'abierta' ? '🟢 Abierta' : 
               (sessionActiva || sesionSeleccionada)?.estado === 'cerrada' ? '🔵 Cerrada' : '🔴 Cancelada'}
            </span>
            
            {/* Botón cerrar solo para modo lectura histórica */}
            {sesionSeleccionada && !sessionActiva && (
              <button
                onClick={() => {
                  setSesionSeleccionada(null);
                  setRecibosVentas([]);
                  setRecibosComisiones([]);
                  setRecibosRecientes([]);
                }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors flex items-center gap-1"
                title="Cerrar vista de sesión histórica"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* ← ← ← BADGE DE ADVERTENCIA EN HEADER ← ← ← */}
         
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">🏦 Módulo de Caja</h1>
          <p className="text-gray-400 mt-1">Gestión de sesiones, recibos y vales</p>
        </div>
        <div className="flex gap-3">
          {/*<button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-gray-400 hover:text-white font-medium"
          >
            ← Volver
          </button>*/}
           {/* ← ← ← BADGE DE ADVERTENCIA EN HEADER ← ← ← */}
          {sessionActiva && hayBorradoresPendientes && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/50 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {hayBorradoresPendientes ? '1 borrador pendiente' : ''}
            </span>
          )}         
          {!sessionActiva ? (
            <button
              onClick={() => setModalAbrirCajaOpen(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Abrir Caja
            </button>
          ) : (
            <button
              onClick={() => setModalCerrarCajaOpen(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Caja              
            </button>

          )} 

        </div>
 

      </div>

      {/* ← Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sesión Activa */}
        <div className={`rounded-xl p-4 border ${
          sessionActiva 
            ? 'bg-green-900/30 border-green-700' 
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className="text-sm text-gray-400">Estado de Caja</p>
          <p className={`text-lg font-bold ${sessionActiva ? 'text-green-400' : 'text-gray-500'}`}>
            {sessionActiva ? '🟢 Abierta' : '🔴 Cerrada'}
          </p>
          {sessionActiva && (
            <p className="text-xs text-gray-400 mt-1">
              Turno: {sessionActiva.turno}
            </p>
          )}
        </div>

        {/* Saldo Actual */}
        <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700">
          <p className="text-sm text-blue-300">Saldo Esperado</p>
          <p className="text-lg font-bold text-blue-400">
            {sessionActiva ? formatMoney(sessionActiva.saldo_esperado) : '$0'}
          </p>
        </div>

        {/* Ventas del Turno */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
          <p className="text-sm text-purple-300">Ventas Hoy</p>
          <p className="text-lg font-bold text-purple-400">
            {sessionActiva ? formatMoney(sessionActiva.total_ventas) : '$0'}
          </p>
        </div>

        {/* Vales Pendientes */}
        <div className="bg-orange-900/30 rounded-xl p-4 border border-orange-700">
          <p className="text-sm text-orange-300">Vales Pendientes</p>
          <p className="text-lg font-bold text-orange-400">
            {valesPendientes.length}
          </p>
        </div>
      </div>

      {/* ← Acciones Rápidas */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">⚡ Acciones Rápidas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          
          <button
            onClick={() => router.push('/admin/caja/recibos')}
            disabled={!sessionActiva}
            className="p-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 text-xl">📝</span>
              </div>
              <div>
                <p className="font-medium text-white">Gestion de Recibos</p>
                <p className="text-xs text-gray-400">Venta, entrada o salida</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/caja/vales')}
            className="p-4 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-400 text-xl">🎫</span>
              </div>
              <div>
                <p className="font-medium text-white">Gestión de Vales</p>
                <p className="text-xs text-gray-400">Ver todos los vales</p>
              </div>
            </div>
          </button>

          {/* ← ← ← NUEVO: Botón Pagar Comisiones ← ← ← */}
          <button
            onClick={() => {
              setProfesionalSeleccionado(null); // Resetear selección
              setModalComisionesOpen(true);
            }}
            disabled={!sessionActiva}
            className="p-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                <span className="text-emerald-400 text-xl">💰</span>
              </div>
              <div>
                <p className="font-medium text-white">Pagar Comisiones</p>
                <p className="text-xs text-gray-400">A empleados</p>
              </div>
            </div>
          </button>


          <button
            onClick={() => router.push('/admin/caja/reportes')}
            className="p-4 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-400 text-xl">📊</span>
              </div>
              <div>
                <p className="font-medium text-white">Reportes</p>
                <p className="text-xs text-gray-400">Estadísticas y export</p>
              </div>
            </div>
          </button>


          {/* ← ← ← NUEVO: Botón Citas sin Recibo ← ← ← */}
          <button
            onClick={handleAbrirModalCitasHuerfanas}
            disabled={loadingCitasCount}
            className="p-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 text-left transition-colors relative"
            title="Ver citas confirmadas sin recibo asociado"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <span className="text-yellow-400 text-xl">🔔</span>
              </div>
              <div>
                <p className="font-medium text-white">Citas sin Recibo</p>
                <p className="text-xs text-gray-400">
                  {loadingCitasCount ? (
                    <span className="animate-pulse">Cargando...</span>
                  ) : citasHuerfanasCount.total > 0 ? (
                    <span className="flex items-center gap-1 flex-wrap">
                      <span className="text-yellow-400 font-bold">{citasHuerfanasCount.total} total</span>
                      {citasHuerfanasCount.pendientes > 0 && (
                        <span className="px-1 bg-yellow-900/50 text-[10px] rounded">
                          ⏳{citasHuerfanasCount.pendientes}
                        </span>
                      )}
                      {citasHuerfanasCount.confirmadas > 0 && (
                        <span className="px-1 bg-blue-900/50 text-[10px] rounded">
                          ✅{citasHuerfanasCount.confirmadas}
                        </span>
                      )}
                      {citasHuerfanasCount.completadas > 0 && (
                        <span className="px-1 bg-green-900/50 text-[10px] rounded">
                          🏁{citasHuerfanasCount.completadas}
                        </span>
                      )}
                    </span>
                  ) : (
                    'Sin citas pendientes'
                  )}
                </p>
              </div>
            </div>
            
            {/* ← ← ← BADGE DE NOTIFICACIÓN (si hay citas) ← ← ← */}
            {citasHuerfanasCount.total > 0 && !loadingCitasCount && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-gray-800 animate-pulse">
                {citasHuerfanasCount.total > 9 ? '9+' : citasHuerfanasCount.total}
              </span>
            )}
          </button>

          {/* ← ← ← NUEVO: Botón Ver Historial de Sesiones ← ← ← */}
          <button
            onClick={() => {
              setModalHistorialOpen(true);
              cargarHistorialSesiones(filtroFechaHistorial || undefined);
            }}
            className="p-4 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                <span className="text-cyan-400 text-xl">📜</span>
              </div>
              <div>
                <p className="font-medium text-white">Historial de Sesiones</p>
                <p className="text-xs text-gray-400">Ver sesiones anteriores</p>
              </div>
            </div>
          </button>
        </div>


      </div>

     {/* ← ← ← GRID PRINCIPAL ACTUALIZADO: DOS COLUMNAS PARA RECIBOS ← ← ← */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* ← ← ← COLUMNA IZQUIERDA: RECIBOS DE COMISIONES/SALIDAS ← ← ← */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl border border-gray-700 h-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                💰 Comisiones/Salidas
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                  {recibosComisiones.length}
                </span>
              </h3>
              <button
                onClick={() => {
                  setProfesionalSeleccionado(null);
                  setModalComisionesOpen(true);
                }}
                disabled={!sessionActiva}
                className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva
              </button>
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
              {recibosComisiones.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Sin comisiones recientes
                </p>
              ) : (
                recibosComisiones.map((recibo) => (
                    <ReciboCard
                        key={recibo.id}
                        recibo={recibo}
                        onExpand={cargarDetalleRecibo}
                        isExpanded={reciboExpandido === recibo.id}
                        onEditar={handleEditarRecibo}
                        onPublicar={handlePublicarRecibo}
                        formatMoney={formatMoney}
                        formatDate={formatDate}
                        getReciboColor={getReciboColor}
                        getTipoItemBadge={getTipoItemBadge}
                        loadingDetalle={loadingDetalle && reciboExpandido === recibo.id}
                        detalleRecibo={detalleRecibo?.id === recibo.id ? detalleRecibo : null}
                        sesionSeleccionada={sesionSeleccionada}
                        sessionActiva={sessionActiva}
                        apiUrl={apiUrl}
                        token={token}
                        OPCIONES_METODO={OPCIONES_METODO}
                    />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ← ← ← COLUMNA CENTRAL: RECIBOS DE VENTAS ← ← ← */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl border border-gray-700 h-full">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                🛍️ Ventas
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {recibosVentas.length}
                </span>
              </h3>
              <button
                onClick={() => setModalNuevoReciboOpen(true)}
                disabled={!sessionActiva}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Venta
              </button>
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
              {recibosVentas.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Sin ventas recientes
                </p>
              ) : (
                recibosVentas.map((recibo) => (
                    <ReciboCard
                        key={recibo.id}
                        recibo={recibo}
                        onExpand={cargarDetalleRecibo}
                        isExpanded={reciboExpandido === recibo.id}
                        onEditar={handleEditarRecibo}
                        onPublicar={handlePublicarRecibo}
                        formatMoney={formatMoney}
                        formatDate={formatDate}
                        getReciboColor={getReciboColor}
                        getTipoItemBadge={getTipoItemBadge}
                        loadingDetalle={loadingDetalle && reciboExpandido === recibo.id}
                        detalleRecibo={detalleRecibo?.id === recibo.id ? detalleRecibo : null}
                        sesionSeleccionada={sesionSeleccionada}
                        sessionActiva={sessionActiva}
                        apiUrl={apiUrl}
                        token={token}
                        OPCIONES_METODO={OPCIONES_METODO}
                    />
                ))
              )}
            </div>
          </div>


        </div>

        {/* ← Columna 3: Vales */}
        <div className="lg:col-span-2">
          {/* Vales - VERSIÓN MEJORADA: Sesión + Pendientes ← ← ← */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                🎫 Vales
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                  {valesSesion.length + valesPendientes.length}
                </span>
              </h3>
              <button
                onClick={() => {
                  setNuevoVale(prev => ({ 
                    ...prev, 
                    session_caja: sessionActiva?.id?.toString() || '' 
                  }));
                  setModalNuevoValeOpen(true);
                }}
                disabled={!sessionActiva}
                className="text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50"
              >
                + Nuevo
              </button>
            </div>
            
            <div className="p-4">
              {loadingVales ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                  <span className="ml-2 text-sm text-gray-400">Cargando vales...</span>
                </div>
              ) : (valesSesion.length === 0 && valesPendientes.length === 0) ? (
                <p className="text-center text-gray-400 py-6 text-sm">
                  No hay vales registrados
                </p>
              ) : (
                <div className="space-y-4">
                  
                  {/* ← ← ← SECCIÓN: VALES DE LA SESIÓN ACTUAL ← ← ← */}
                  {valesSesion.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                        De esta sesión ({valesSesion.length})
                      </h4>
                      <div className="space-y-2">
                        {valesSesion.map((vale) => (
                          <ValeCard 
                            key={vale.id} 
                            vale={vale} 
                            onPagar={handlePagarVale}
                            onCancelar={handleCancelarVale}
                            onNotificar={handleNotificarVale}
                            formatMoney={formatMoney}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* ← ← ← SECCIÓN: VALES PENDIENTES GLOBALES ← ← ← */}
                  {valesPendientes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                        Pendientes globales ({valesPendientes.length})
                      </h4>
                      <div className="space-y-2">
                        {valesPendientes.map((vale) => (
                          <ValeCard 
                            key={vale.id} 
                            vale={vale} 
                            onPagar={handlePagarVale}
                            onCancelar={handleCancelarVale}
                            onNotificar={handleNotificarVale}
                            formatMoney={formatMoney}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ← Columna 4 Derecha: Session Info */}
        <div className="lg:col-span-2">
          
          {/* ← ← ← Session Info: Mostrar para sesión ACTIVA O sesión del HISTORIAL ← ← ← */}
          {(sessionActiva || sesionSeleccionada) && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              
              {/* ← ← ← ENCABEZADO CON IDENTIFICACIÓN DE SESIÓN ← ← ← */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  {/*<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    sessionActiva ? 'bg-green-600/20' : 'bg-cyan-600/20'
                  }`}>
                    <span className="text-lg">
                      {sessionActiva ? '🟢' : '👁️'}
                    </span>
                  </div>*/}
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      📊 Resumen del Turno #{(sessionActiva || sesionSeleccionada)?.id}
                      
                    </h3>
                    <p className="text-xs text-gray-400">
                      {formatDate((sessionActiva || sesionSeleccionada)?.fecha || '')} • {(sessionActiva || sesionSeleccionada)?.turno}
                      {sesionSeleccionada && !sessionActiva && ( <span className="text-cyan-400 ml-1">• Solo lectura</span>)}
                    </p>
                     {/* Usuario que abrió la sesión */}
                <span className="text-xs text-gray-400">
                  👤 {(sessionActiva || sesionSeleccionada)?.usuario_username}
                </span>
                  </div>
                </div>
                
               
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Apertura:</span>
                  <span className="text-white">
                    {formatDate(sessionActiva?.hora_apertura || sesionSeleccionada?.hora_apertura || '')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Saldo Inicial:</span>
                  <span className="text-white">
                    {formatMoney(sessionActiva?.saldo_inicial || sesionSeleccionada?.saldo_inicial || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entradas:</span>
                  <span className="text-green-400">
                    +{formatMoney(sessionActiva?.total_entradas || sesionSeleccionada?.total_entradas || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Salidas:</span>
                  <span className="text-orange-400">
                    -{formatMoney(sessionActiva?.total_salidas || sesionSeleccionada?.total_salidas || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ventas:</span>
                  <span className="text-blue-400">
                    +{formatMoney(sessionActiva?.total_ventas || sesionSeleccionada?.total_ventas || 0)}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">Saldo Esperado:</span>
                    <span className="text-blue-400">
                      {formatMoney(sessionActiva?.saldo_esperado || sesionSeleccionada?.saldo_esperado || 0)}
                    </span>
                  </div>
                </div>
                
                {/* ← ← ← SOLO PARA SESIONES CERRADAS: Mostrar Saldo Final ← ← ← */}
                {(sessionActiva?.estado === 'cerrada' || sesionSeleccionada?.estado === 'cerrada') && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-300">Saldo Final:</span>
                      <span className="text-green-400">
                        {formatMoney(sessionActiva?.saldo_final || sesionSeleccionada?.saldo_final || 0)}
                      </span>
                    </div>
                    
                    {/* ← ← ← CORREGIDO: Cálculo de diferencia seguro ← ← ← */}
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-gray-400">Diferencia:</span>
                      {(() => {
                        const sesionActual = sessionActiva || sesionSeleccionada;
                        const final = parseFloat(sesionActual?.saldo_final || '0');
                        const esperado = parseFloat(sesionActual?.saldo_esperado || '0');
                        const diferencia = final - esperado;
                        
                        return (
                          <span className={diferencia >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatMoney(diferencia)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}         
        </div>


      </div>



      {/* ← ← ← MODAL: Abrir Caja ← ← ← */}
      {modalAbrirCajaOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🔓 Abrir Nueva Caja</h3>
              <p className="text-sm text-gray-400 mt-1">
                Registra el inicio de tu turno
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📅 Fecha
                </label>
                <input
                  type="date"
                  value={formDataAbrir.fecha}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  🔄 Turno
                </label>
                <select
                  value={formDataAbrir.turno}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, turno: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="manana">Mañana (6am - 2pm)</option>
                  <option value="tarde">Tarde (2pm - 10pm)</option>
                  <option value="noche">Noche (10pm - 6am)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  💰 Saldo Inicial *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDataAbrir.saldo_inicial}
                    onChange={(e) => setFormDataAbrir(prev => ({ ...prev, saldo_inicial: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dinero en caja al iniciar el turno
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📝 Observaciones
                </label>
                <textarea
                  value={formDataAbrir.observaciones_apertura}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, observaciones_apertura: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalAbrirCajaOpen(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirCaja}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Cerrar Caja ← ← ← */}
      {modalCerrarCajaOpen && sessionActiva && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🔒 Cerrar Caja</h3>
              <p className="text-sm text-gray-400 mt-1">
                Turno: {sessionActiva.turno} • {formatDate(sessionActiva.hora_apertura)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Resumen */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Saldo Inicial:</span>
                  <span>{formatMoney(sessionActiva.saldo_inicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">+ Entradas:</span>
                  <span className="text-green-400">{formatMoney(sessionActiva.total_entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">+ Ventas:</span>
                  <span className="text-blue-400">{formatMoney(sessionActiva.total_ventas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">- Salidas:</span>
                  <span className="text-orange-400">-{formatMoney(sessionActiva.total_salidas)}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">Saldo Esperado:</span>
                    <span className="text-blue-400">{formatMoney(sessionActiva.saldo_esperado)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  💰 Saldo Final Real *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDataCerrar.saldo_final}
                    onChange={(e) => setFormDataCerrar(prev => ({ ...prev, saldo_final: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dinero que contaste físicamente
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📝 Observaciones de Cierre
                </label>
                <textarea
                  value={formDataCerrar.observaciones_cierre}
                  onChange={(e) => setFormDataCerrar(prev => ({ ...prev, observaciones_cierre: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none resize-none"
                  placeholder="Notas del cierre..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalCerrarCajaOpen(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Editar Recibo Borrador ← ← ← */}
      {modalEditarReciboOpen && reciboEditarId && (
        <CajaReciboModal
          isOpen={modalEditarReciboOpen}
          onClose={() => {
            setModalEditarReciboOpen(false);
            setReciboEditarId(null);
          }}
          sessionCajaId={sessionActiva?.id}
          reciboParaEditarId={reciboEditarId}  // ← ← ← PARA EDICIÓN: ID del recibo
          apiUrl={apiUrl}
          token={token}
          onReciboActualizado={(recibo) => {
            console.log('🔄 [CajaPage] Recibo actualizado, recargando datos...', {
              reciboId: recibo.id,
              codigo: recibo.codigo_recibo,
              total: recibo.total,
              timestamp: Date.now()
            });
            const cacheBuster = Date.now();
            cargarDatosCaja(cacheBuster);
            setModalEditarReciboOpen(false);
            setReciboEditarId(null);
          }}
        />
      )}

      {/* ← ← ← MODAL: CREAR/EDITAR VALE - FUNCIONAL ← ← ← */}
      {modalNuevoValeOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🎫 Nuevo Vale</h3>
              <p className="text-sm text-gray-400 mt-1">
                Anticipo a empleado
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Profesional */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  👤 Profesional *
                </label>
                <select
                  value={nuevoVale.profesional}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, profesional: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Seleccionar profesional...</option>
                  {profesionales
                    .filter(p => p.activo)
                    .map(prof => (
                      <option key={prof.id} value={prof.id}>
                        {prof.nombre}
                      </option>
                    ))}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  💰 Monto *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={nuevoVale.monto}
                    onChange={(e) => setNuevoVale(prev => ({ ...prev, monto: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                
                {/* ← ← ← VALIDACIÓN DE SALDO ← ← ← */}
               {validacionSaldo && (
                <div className={`mt-2 text-xs p-2 rounded ${
                  validacionSaldo.excedido 
                    ? 'bg-red-900/30 text-red-400 border border-red-700' 
                    : 'bg-green-900/30 text-green-400 border border-green-700'
                }`}>
                  <p>💡 Límite: 50% del saldo ganado del mes</p>
                  
                  {/* ← ← ← CORREGIDO: Verificar null antes de formatMoney ← ← ← */}
                  <p>
                    Disponible: {
                      validacionSaldo.disponible !== null 
                        ? formatMoney(validacionSaldo.disponible) 
                        : 'Calculando...'
                    }
                  </p>
                  
                  {validacionSaldo.excedido && (
                    <p className="font-semibold mt-1">⚠️ Monto excede el límite</p>
                  )}
                </div>
              )}
              </div>
             
              {/* Sesión de Caja */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  🏦 Sesión de Caja *
                </label>
                <select
                  value={nuevoVale.session_caja}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, session_caja: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  disabled={!sessionActiva}
                >
                  <option value="">Seleccionar sesión...</option>
                  {sessionActiva && (
                    <option value={sessionActiva.id}>
                      {sessionActiva.turno} - {new Date(sessionActiva.fecha).toLocaleDateString('es-CO')}
                    </option>
                  )}
                </select>
                {!sessionActiva && (
                  <p className="text-xs text-orange-400 mt-1">
                    ⚠️ No hay sesión de caja activa. Abre una sesión primero.
                  </p>
                )}
              </div>

              {/* ← ← ← NUEVO: Selector de Método de Pago ← ← ← */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  💳 Método de Pago *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'efectivo', label: '💵 Efectivo' },
                    { value: 'transferencia', label: '🏦 Transferencia' },
                    { value: 'nequi', label: '📱 Nequi' },
                    { value: 'daviplata', label: '📱 Daviplata' },
                    { value: 'bold', label: '💳 Bold' },
                    { value: 'tarjeta', label: '💳 Tarjeta en sitio' },
                    { value: 'caja_menor', label: '📦 Caja menor' },
                  ].map((metodo) => (
                    <button
                      key={metodo.value}
                      type="button"
                      onClick={() => setNuevoVale(prev => ({ ...prev, metodo_pago: metodo.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 border-2 ${
                        nuevoVale.metodo_pago === metodo.value
                          ? 'bg-orange-600 border-white text-white shadow-lg scale-[1.02]'
                          : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                      }`}
                    >
                      {metodo.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Método usado para entregar el anticipo
                </p>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  📝 Notas (opcional)
                </label>
                <textarea
                  value={nuevoVale.notas}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
                  placeholder="Motivo del anticipo..."
                />
              </div>

              {/* Notificación WhatsApp */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevoVale.notificar_whatsapp}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, notificar_whatsapp: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">
                  📱 Enviar notificación WhatsApp al profesional
                </span>
              </label>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setModalNuevoValeOpen(false);
                  setNuevoVale({ 
                    profesional: '', 
                    monto: '', 
                    session_caja: sessionActiva?.id?.toString() || '', 
                    metodo_pago: 'efectivo',  // ← ← ← NUEVO: reset a default
                    notas: '', 
                    notificar_whatsapp: false 
                  });
                  setValidacionSaldo(null);
                }}
                disabled={loadingVale}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearVale}
                disabled={loadingVale || !nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja || validacionSaldo?.excedido}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingVale ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  '✅ Crear Vale'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* ← ← ← MODAL: PAGAR COMISIONES A EMPLEADOS ← ← ← */}
      {modalComisionesOpen && (
        <CalcularComisionesModal
          isOpen={modalComisionesOpen}
          onClose={() => {
            setModalComisionesOpen(false);
            setProfesionalSeleccionado(null);
          }}
          sessionCajaId={sessionActiva?.id}
          profesionalId={profesionalSeleccionado || undefined}
          apiUrl={apiUrl}
          token={token}
          // ✅ Prop recomendada: onPagoExitoso con parámetro resultado
         onPagoExitoso={(reciboCodigo) => {
          console.log('✅ Pago de comisiones exitoso:', reciboCodigo);  // ← ← ← CORREGIDO: usar el parámetro
          // Recargar datos relevantes
          cargarDatosCaja();
          // Mostrar confirmación con datos del recibo
          alert(`✅ Pago procesado. Recibo: ${reciboCodigo || 'N/A'}`);  // ← ← ← CORREGIDO: reciboCodigo es string
          setModalComisionesOpen(false);
          setProfesionalSeleccionado(null);
        }}
        />
      )}
      {/* ← ← ← MODAL: Asignar recibos sueltos al cerrar caja ← ← ← */}
{modalAsignarSueltosOpen && sessionActiva && (
  <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[90vh] flex flex-col">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          📋 Recibos sin sesión asignada
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Se encontraron <span className="text-orange-400 font-semibold">{recibosSueltos.length}</span> recibos 
          que no pertenecen a ninguna sesión. ¿Deseas asignarlos a la sesión actual #{sessionActiva.id}?
        </p>
      </div>
      
      {/* Checkbox "Asignar todos" */}
      <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={asignarTodos}
            onChange={(e) => {
              setAsignarTodos(e.target.checked);
              if (e.target.checked) {
                setRecibosSeleccionados(new Set(recibosSueltos.map(r => r.id)));
              }
            }}
            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
          />
          <span className="text-white font-medium">
            Asignar todos los recibos sueltos ({recibosSueltos.length})
          </span>
        </label>
      </div>
      
      {/* Lista de recibos (scrollable) */}
      <div className="flex-1 overflow-y-auto p-6">
        {!asignarTodos && recibosSueltos.length > 0 ? (
          <div className="space-y-2">
            {recibosSueltos.map((recibo) => (
              <label
                key={recibo.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  recibosSeleccionados.has(recibo.id)
                    ? 'bg-orange-900/30 border-orange-500'
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={recibosSeleccionados.has(recibo.id)}
                  onChange={() => toggleReciboSeleccionado(recibo.id)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-white">
                    {recibo.codigo_recibo}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(recibo.fecha)} • {recibo.cliente_nombre || 'Sin cliente'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{formatMoney(recibo.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    recibo.estado === 'borrador' 
                      ? 'bg-yellow-900/50 text-yellow-400' 
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    {recibo.estado}
                  </span>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-4">
            {asignarTodos 
              ? 'Se asignarán automáticamente todos los recibos listados arriba.' 
              : 'Selecciona los recibos que deseas asignar.'}
          </p>
        )}
      </div>
      
      {/* Footer con acciones */}
      <div className="p-6 border-t border-gray-700 flex gap-3">
        <button
          onClick={() => {
            setModalAsignarSueltosOpen(false);
            // Si el usuario cancela, proceder con cierre SIN asignar
            ejecutarCierreDeCaja();
          }}
          disabled={loadingAsignacion}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          No asignar • Solo cerrar
        </button>
        <button
          onClick={handleConfirmarAsignarSueltos}
          disabled={loadingAsignacion || (!asignarTodos && recibosSeleccionados.size === 0)}
          className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loadingAsignacion ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Asignando...
            </>
          ) : (
            `✅ Asignar y cerrar caja`
          )}
        </button>
      </div>
    </div>
  </div>
)}

{/* ← ← ← MODAL: CITAS HUÉRFANAS DETECTADAS (SONDEO) ← ← ← */}
{modalHuerfanasOpen && citasHuerfanas.length > 0 && (
  <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
<div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-yellow-500/50">
  {/* Header del modal CON DESGLOSE POR ESTADO */}
  <div className="p-5 border-b border-yellow-500/30 bg-yellow-900/20 flex items-start gap-3">
    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
      🚨
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-yellow-400">Citas sin Recibo Detectadas</h3>
      <p className="text-sm text-gray-300 mt-1">
        Se encontraron <span className="font-bold text-white">{citasHuerfanas.length}</span> cita(s) en total.
      </p>

      {/* ← ← ← DESGLOSE AUTOMÁTICO POR ESTADO ← ← ← */}
      <div className="flex flex-wrap gap-1 mt-3">
        {(() => {
          const pendientes = citasHuerfanas.filter(c => c.estado === 'pendiente').length;
          const confirmadas = citasHuerfanas.filter(c => c.estado === 'confirmada').length;
          const completadas = citasHuerfanas.filter(c => c.estado === 'completada').length;

          return (
            <>
              {pendientes > 0 && (
                <span className="px-2 py-1 bg-yellow-900/40 text-yellow-400 text-xs rounded border border-yellow-700/50">
                  ⏳ {pendientes} Pendiente (no requiere recibo)
                </span>
              )}
              {confirmadas > 0 && (
                <span className="px-2 py-1 bg-blue-900/40 text-blue-400 text-xs rounded border border-blue-700/50">
                  ✅ {confirmadas} Confirmada (requiere recibo)
                </span>
              )}
              {completadas > 0 && (
                <span className="px-2 py-1 bg-green-900/40 text-green-400 text-xs rounded border border-green-700/50">
                  🏁 {completadas} Completada (requiere recibo)
                </span>
              )}
            </>
          );
        })()}
      </div>
    </div>
  </div>
      
      {/* Lista de citas con detalle de pago/saldo */}
      <div className="p-4 max-h-60 overflow-y-auto space-y-3 bg-gray-900/50">
        {citasHuerfanas.map((cita) => {
          const total = parseFloat(cita.precio_total) || 0;
          const pagado = parseFloat(cita.pago_acumulado) || 0;
          const saldo = total - pagado;
          const isParaRecibo = citasSeleccionadas.has(cita.id);
          const isParaCancelar = citasParaCancelar.has(cita.id);
          const isDisabled = cita.estado === 'cancelada';

          return (
            <div key={cita.id} className={`p-3 rounded border transition-all ${
              isParaCancelar ? 'bg-red-900/20 border-red-500/50' :
              isParaRecibo ? 'bg-green-900/20 border-green-500/50' :
              'bg-gray-800 border-gray-700'
            }`}>
              <div className="flex items-start gap-3">
                
                {/* ← ← ← OPCIONES DE ACCIÓN (Checkboxes) ← ← ← */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  {/* Opción 1: Crear Recibo */}
                  <input
                    type="checkbox"
                    checked={isParaRecibo}
                    disabled={isDisabled}
                    onChange={() => toggleCitaSeleccionada(cita.id)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer disabled:opacity-30"
                    title="Marcar para crear recibo de pago"
                  />
                  <span className="text-[10px] text-gray-400">Recibo</span>
                </div>

                <div className="flex flex-col items-center gap-2 pt-1 border-l border-gray-700 pl-2">
                  {/* Opción 2: Cancelar Cita */}
                  <input
                    type="checkbox"
                    checked={isParaCancelar}
                    disabled={isDisabled}
                    onChange={() => toggleCitaParaCancelar(cita.id)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer disabled:opacity-30"
                    title="Marcar para cancelar esta cita"
                  />
                  <span className="text-[10px] text-gray-400">Cancelar</span>
                </div>

                {/* Detalle de la cita */}
                <div className="flex-1 min-w-0 ml-2">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-mono text-sm text-white font-bold">{cita.codigo_reserva} </p>
                      <p className="text-xs text-gray-400">{cita.servicio_nombre}</p>
                      <p className="text-xs text-gray-500">{cita.cliente_nombre}</p>
                       {(cita.fecha || cita.hora_inicio) && (
        <div className="flex items-center gap-2 mt-1">
          {cita.fecha && (
            <span className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-800/50 whitespace-nowrap">
              📅 {new Date(cita.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {cita.hora_inicio && (
            <span className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-800/50">
              🕒 {cita.hora_inicio.substring(0, 5)}
            </span>
          )}
        </div>
      )}

                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium border ${getEstadoBadgeClass(cita.estado)}`}>
                      {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                    </span>
                  </div>

                  {/* Detalle financiero */}
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div className="text-center p-2 bg-gray-900 rounded">
                      <p className="text-gray-400">Total</p>
                      <p className="font-bold text-white">{formatMoney(total)}</p>
                    </div>
                    <div className="text-center p-2 bg-green-900/20 rounded border border-green-700/50">
                      <p className="text-green-400">Pagado</p>
                      <p className="font-bold text-green-400">{formatMoney(pagado)}</p>
                    </div>
                    <div className={`text-center p-2 rounded border ${
                      saldo > 0 && !isParaCancelar
                      ? 'bg-orange-900/20 border-orange-700/50'
                      : 'bg-gray-900 border-gray-700'
                    }`}>
                      <p className={saldo > 0 && !isParaCancelar ? 'text-orange-400' : 'text-gray-400'}>Saldo</p>
                      <p className={`font-bold ${saldo > 0 && !isParaCancelar ? 'text-orange-400' : 'text-gray-500'}`}>
                        {saldo > 0 && !isParaCancelar ? formatMoney(saldo) : '$0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer con acciones */}
      <div className="p-4 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => {
            setModalHuerfanasOpen(false);
            setCitasParaCancelar(new Set()); // Limpiar selección al cerrar
          }}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          ⏸️ Omitir por ahora
        </button>
        
        {/* Botón de Cancelar (Solo visible si hay citas seleccionadas para cancelar) */}
        {citasParaCancelar.size > 0 && (
          <button
            onClick={cancelarCitasHuerfanas}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
          >
            🗑️ Cancelar ({citasParaCancelar.size})
          </button>
        )}

        {/* Botón de Crear Recibos (Siempre visible pero muestra contador) */}
        <button
          onClick={crearRecibosParaHuerfanas}
          disabled={citasSeleccionadas.size === 0 && citasParaCancelar.size > 0} // Deshabilitar si solo hay cancelaciones
          className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg ${
            citasSeleccionadas.size > 0
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-900/30'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✅ Crear Recibos ({citasSeleccionadas.size})
        </button>
      </div>
    </div>
  </div>
)}

      {/* ← ← ← MODAL: Nuevo Recibo Compuesto ← ← ← CORREGIDO ← ← ← */}
      {modalNuevoReciboOpen && sessionActiva && (
        <CajaReciboModal
        isOpen={modalNuevoReciboOpen}
        onClose={() => {
        setModalNuevoReciboOpen(false);
        }}
        sessionCajaId={sessionActiva?.id}
        reciboParaEditarId={null}
        apiUrl={apiUrl}
        token={token}
        onReciboCreado={(recibo) => {
        cargarDatosCaja();
        setModalNuevoReciboOpen(false);
        }}
        // ← ← ← AGREGAR ESTE CALLBACK:
        onComisionesPagadas={() => {
        console.log('💰 Comisiones pagadas, actualizando caja...');
        cargarDatosCaja(); // Recargar sesión, recibos, vales
        setModalNuevoReciboOpen(false); // Cerrar modal de recibo también
        }}
        />
        )}

      {/* ← ← ← MODAL: HISTORIAL DE SESIONES DE CAJA ← ← ← */}
                {modalHistorialOpen && (
                  <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700 max-h-[90vh] flex flex-col">
                      
                      {/* Header del modal */}
                      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">📜 Historial de Sesiones</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            Consulta sesiones cerradas o canceladas (solo lectura)
                          </p>
                        </div>
                        <button
                          onClick={() => setModalHistorialOpen(false)}
                          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Filtros */}
                      <div className="p-4 border-b border-gray-700 flex gap-4 items-center">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            📅 Filtrar por fecha
                          </label>
                          <input
                            type="date"
                            value={filtroFechaHistorial}
                            onChange={(e) => setFiltroFechaHistorial(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <button
                            onClick={() => cargarHistorialSesiones(filtroFechaHistorial || undefined)}
                            disabled={loadingHistorial}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {loadingHistorial ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            )}
                            Buscar
                          </button>
                          <button
                            onClick={() => {
                              setFiltroFechaHistorial('');
                              cargarHistorialSesiones();
                            }}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                      
                      {/* Lista de sesiones */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {loadingHistorial ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                            <span className="ml-3 text-gray-400">Cargando historial...</span>
                          </div>
                        ) : sesionesHistorial.length === 0 ? (
                          <p className="text-center text-gray-400 py-8">
                            {filtroFechaHistorial 
                              ? 'No se encontraron sesiones para esta fecha' 
                              : 'No hay sesiones históricas registradas'}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {sesionesHistorial.map((sesion) => (
                              <div
                                key={sesion.id}
                                className="p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
                                onClick={() => abrirSesionParaVer(sesion)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      {/* ← ← ← NUEVO: BADGE CON ID DE SESIÓN ← ← ← */}
                                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded font-mono border border-gray-600">
                                        #{sesion.id}
                                      </span>

                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        sesion.estado === 'cerrada' 
                                          ? 'bg-green-900/50 text-green-400 border border-green-700'
                                          : 'bg-red-900/50 text-red-400 border border-red-700'
                                      }`}>
                                        {sesion.estado === 'cerrada' ? '✅ Cerrada' : '❌ Cancelada'}
                                      </span>
                                      <span className="font-mono text-sm text-cyan-400">
                                        {sesion.usuario_username}
                                      </span>
                                    </div>
                                    
                                    {/* Dentro del map de sesionesHistorial, en la grid de información */}
                                      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-sm">
                                        <div>
                                          <p className="text-gray-400">📅 Fecha</p>
                                          <p className="text-white font-medium">
                                            {(() => {
                                              if (!sesion.fecha) return '';
                                              // ← ← ← Parseo manual: YYYY-MM-DD → Fecha LOCAL (evita desfase UTC)
                                              const [y, m, d] = sesion.fecha.split('-').map(Number);
                                              return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                              });
                                            })()}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">🔄 Turno</p>
                                          <p className="text-white font-medium capitalize">
                                            {sesion.turno}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-400">💰 Saldo Inicial</p>
                                          <p className="text-white font-medium">
                                            {formatMoney(sesion.saldo_inicial)}
                                          </p>
                                        </div>
                                        
                                        {/* ← ← ← NUEVO: Saldo Esperado ← ← ← */}
                                        <div>
                                          <p className="text-gray-400">📊 Saldo Esp.</p>
                                          <p className="text-blue-400 font-medium">
                                            {formatMoney(sesion.saldo_esperado)}
                                          </p>
                                        </div>
                                        
                                        {/* ← ← ← NUEVO: Saldo Final ← ← ← */}
                                        <div>
                                          <p className="text-gray-400">💵 Saldo Final</p>
                                          <p className={`font-medium ${
                                            sesion.saldo_final 
                                              ? (parseFloat(sesion.saldo_final) >= parseFloat(sesion.saldo_esperado || '0') 
                                                  ? 'text-green-400' 
                                                  : 'text-red-400')
                                              : 'text-gray-500'
                                          }`}>
                                            {sesion.saldo_final ? formatMoney(sesion.saldo_final) : '-'}
                                          </p>
                                        </div>
                                        
                                        {/* ← ← ← NUEVO: Diferencia ← ← ← */}
                                        <div>
                                          <p className="text-gray-400">📈 Diferencia</p>
                                          {(() => {
                                            if (!sesion.saldo_final) return <p className="text-gray-500 font-medium">-</p>;
                                            const final = parseFloat(sesion.saldo_final);
                                            const esperado = parseFloat(sesion.saldo_esperado || '0');
                                            const diff = final - esperado;
                                            return (
                                              <p className={`font-bold ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {diff >= 0 ? '+' : ''}{formatMoney(diff)}
                                              </p>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    
                                    {/* Totales resumidos */}
                                    <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-2 text-xs">
                                      <div className="flex items-center gap-1">
                                        <span className="text-green-400">📥</span>
                                        <span className="text-gray-400">Entradas:</span>
                                        <span className="text-green-400 font-medium">{formatMoney(sesion.total_entradas)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-orange-400">📤</span>
                                        <span className="text-gray-400">Salidas:</span>
                                        <span className="text-orange-400 font-medium">{formatMoney(sesion.total_salidas)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-blue-400">🛍️</span>
                                        <span className="text-gray-400">Ventas:</span>
                                        <span className="text-blue-400 font-medium">{formatMoney(sesion.total_ventas)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* ← ← ← BOTONES DE ACCIÓN ← ← ← */}
                                  <div className="flex gap-2">
                                    {/* ← ← ← NUEVO: Botón Reabrir (solo para sesiones cerradas) ← ← ← */}
                                    {sesion.estado === 'cerrada' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          reabrirSesion(sesion);
                                        }}
                                        className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 text-green-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                        title="Reabrir esta sesión"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Reabrir
                                      </button>
                                    )}
                                    
                                    {/* Botón Ver (siempre visible) */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        abrirSesionParaVer(sesion);
                                      }}
                                      className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      👁️ Ver
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                                       
                               
                          </div>
                        )}
                      </div>
                      
                      {/* Footer */}
                      <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-400">
                        {sesionesHistorial.length} sesión{sesionesHistorial.length !== 1 ? 'es' : ''} encontrada{sesionesHistorial.length !== 1 ? 's' : ''}
                        {filtroFechaHistorial && ` para ${new Date(filtroFechaHistorial).toLocaleDateString('es-CO')}`}
                      </div>
                    </div>
                  </div>
                )}


    </div>
  );
}



{/* ← ← ← COMPONENTE REUTILIZABLE: CARD DE RECIBO CON ACORDEÓN ← ← ←*/}
function ReciboCard({
  recibo,
  onExpand,
  isExpanded,
  onEditar,
  onPublicar,
  formatMoney,
  formatDate,
  getReciboColor,
  getTipoItemBadge,
  loadingDetalle,
  detalleRecibo,
  sesionSeleccionada,
  sessionActiva,
  OPCIONES_METODO,
  apiUrl,      // ← ← ← AGREGAR
  token,
}: {
  recibo: ReciboCaja;
  onExpand: (id: number) => void;
  isExpanded: boolean;
  onEditar: (recibo: any) => void;
  onPublicar: (id: number) => void;
  formatMoney: (value: string | number) => string;
  formatDate: (dateStr: string) => string;
  getReciboColor: (tipo: string, estado: string) => string;
  getTipoItemBadge: (tipo: string, profesional?: string | null) => string;
  loadingDetalle: boolean;
  detalleRecibo: ReciboCaja | null;
  sesionSeleccionada: CajaSession | null;
  sessionActiva: CajaSession | null;
  OPCIONES_METODO: Array<{value: string, label: string}>;
  apiUrl: string;        // ← ← ← AGREGAR TIPO
  token: string | null;
}) {

  // Estados locales para editar método de pago
  const [editandoMetodo, setEditandoMetodo] = useState(false);
  const [metodoTemporal, setMetodoTemporal] = useState(recibo.metodo_pago || '');

  
  
 const handleGuardarMetodoLocal = async (nuevoMetodo: string) => {
    if (!nuevoMetodo || nuevoMetodo === recibo.metodo_pago) {
      setEditandoMetodo(false);
      return;
    }
    
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${recibo.id}/actualizar-metodo-pago/`, {
      
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ metodo_pago: nuevoMetodo })
      });
      
      if (res.ok) {
        console.log(`✅ Método actualizado: ${nuevoMetodo}`);
         // ← ← ← ACTUALIZAR EL RECIBO LOCALMENTE
          // Actualizar el detalle si está expandido
          /*if (detalleRecibo && detalleRecibo.id === recibo.id) {
            setDetalleRecibo({ ...detalleRecibo, metodo_pago: nuevoMetodo });
          }*/
          
          // ← ← ← NOTIFICAR AL PADRE PARA ACTUALIZAR LA LISTA
          // Disparar evento personalizado
          /*window.dispatchEvent(new CustomEvent('reciboActualizado', { 
            detail: { id: recibo.id, metodo_pago: nuevoMetodo } 
          }));*/

          // ← ← ← NOTIFICAR AL PADRE VÍA EVENTO (YA FUNCIONA) ← ← ←
      window.dispatchEvent(new CustomEvent('reciboActualizado', {
        detail: { id: recibo.id, metodo_pago: nuevoMetodo }
      }));
          
          setEditandoMetodo(false);
      } else {
        console.error('❌ Error actualizando método');
        setMetodoTemporal(recibo.metodo_pago || '');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setMetodoTemporal(recibo.metodo_pago || '');
    } finally {
      setEditandoMetodo(false);
    }
  };

  // ← ← ← FUNCIÓN: Manejar clic en método de pago (cabecera o detalle) ← ← ←
  const handleClicMetodoPago = (e: React.MouseEvent) => {
      e.stopPropagation(); // Evitar que se cierre/abra el acordeón
      setMetodoTemporal(recibo.metodo_pago || '');
      setEditandoMetodo(true);
  };

  return (
    <div key={recibo.id} className="border border-gray-700 rounded-lg overflow-hidden">
      
      {/* ← ← ← CABECERA DEL RECIBO (Siempre visible) ← ← ← */}
      <div
        onClick={() => onExpand(recibo.id)}
        className={`p-3 ${getReciboColor(recibo.tipo, recibo.estado)} ${
          recibo.estado === 'borrador' ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'
        } transition-all`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ← ← ← ICONO DE EXPANSIÓN ← ← ← */}
            <button 
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-transform"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
              onClick={handleClicMetodoPago}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div>
              <p className="font-mono text-sm font-bold">
                {recibo.codigo_recibo}
              </p>
              {/*{recibo.codigo_recibo.includes('-') && (
                <p className="text-xs text-gray-500 font-mono">
                  Base: {recibo.codigo_recibo.split('-').slice(0, -1).join('-')}
                </p>
              )}*/}
              <p className="text-xs text-gray-400">
                {recibo.cliente_nombre || 'Sin cliente'} • {formatDate(recibo.fecha)}
              </p>
              {/* ← ← ← NUEVO: Mostrar ID de sesión si es histórica ← ← ← */}
              {sesionSeleccionada && !sessionActiva && (
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Sesión #{sesionSeleccionada.id}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
              <p className="font-bold">
                {formatMoney(recibo.total)}
              </p>
              
              {/* Contenedor flexible para alinear tipo y método */}
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-gray-400">{recibo.tipo} •</span>
                
                {/* ← ← ← IMPLEMENTADO: Método de pago editable ← ← ← 
                {editandoMetodo ? (
                  <select
                    value={metodoTemporal}
                    onChange={(e) => setMetodoTemporal(e.target.value)}
                    onBlur={() => handleGuardarMetodoLocal(metodoTemporal)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="bg-gray-800 border border-blue-500 text-blue-400 text-xs rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize min-w-[100px]"
                  >
                    {OPCIONES_METODO.map(opcion => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    onClick={handleClicMetodoPago}
                    className="text-xs text-blue-400 font-bold capitalize cursor-pointer hover:text-blue-300 hover:underline transition-colors px-1 py-0.5 rounded hover:bg-white/10"
                    title="Clic para editar método de pago"
                  >
                    {recibo.metodo_pago ?
                      OPCIONES_METODO.find(o => o.value === recibo.metodo_pago)?.label || recibo.metodo_pago
                      : 'N/A'}
                  </span>
                )}*/}
              </div>
            </div>
        </div>
        
        {recibo.propina_total && parseFloat(recibo.propina_total) > 0 && (
          <p className="text-xs text-purple-400 mt-1 ml-9">
            💎 Propina: {formatMoney(recibo.propina_total)}
          </p>
        )}
      </div>
      
      {/* ← ← ← DETALLE EXPANDIBLE (ACORDEÓN) ← ← ← */}
      {isExpanded && (
        <div className="bg-gray-900 border-t border-gray-700">
          {loadingDetalle ? (
            <div className="p-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-400">Cargando detalle...</span>
            </div>
          ) : detalleRecibo ? (
            <div className="p-4 space-y-3">
              
              {/* ← ← ← LISTA DE ITEMS ← ← ← */}
              {detalleRecibo.items && detalleRecibo.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <span>📦</span> Items ({detalleRecibo.items.length})
                  </p>
                  <div className="space-y-2">
                    {detalleRecibo.items.map((item: any) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Badge de tipo */}
                          <span className={getTipoItemBadge(item.tipo_item, item.profesional_nombre)}>
                            {item.tipo_item === 'servicio' ? '🔧' : '📦'}
                          </span>
                          
                          {/* Descripción */}
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate" title={item.descripcion}>
                              {item.descripcion}
                            </p>
                            {item.profesional_nombre && (
                              <p className="text-xs text-blue-400">
                                👨 {item.profesional_nombre}
                              </p>
                            )}
                            {/* ← ← ← CÓDIGO DE RESERVA DE LA CITA ← ← ← */}
                            {item.tipo_item === 'servicio' && item.cita && (
                              <p className="text-xs text-purple-400 font-mono">
                                📅 {item.codigo_reserva_cita || `Cita #${item.cita}`}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Cantidad y subtotal */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {item.cantidad}x {formatMoney(item.precio_unitario)}
                          </p>
                          <p className="text-sm font-bold text-green-400">
                            {formatMoney(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* ← ← ← TOTAL DESTACADO CON TODA LA INFORMACIÓN ← ← ← */}
              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-700/50 space-y-2">
                {/* Fila 1: Subtotal y Descuento */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">💰 Subtotal:</span>
                    <span className="text-white font-semibold">{formatMoney(detalleRecibo.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">🏷️ Descuento:</span>
                    <span className="text-orange-400 font-semibold">
                      {parseFloat(detalleRecibo.descuento) > 0 
                        ? `-${formatMoney(detalleRecibo.descuento)}` 
                        : '$ 0'}
                    </span>
                  </div>
                </div>
                
                {/* Fila 2: Propina y Método de Pago (EDITABLE) */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">💳 Método:</span>
                      
                      {editandoMetodo ? (
                        // ← ← ← MODO EDICIÓN: Select desplegable
                        <select
                          value={metodoTemporal}
                          onChange={(e) => setMetodoTemporal(e.target.value)}
                          onBlur={() => handleGuardarMetodoLocal(metodoTemporal)}
                          autoFocus
                          className="bg-gray-800 border border-blue-500 text-blue-400 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
                        >
                          {OPCIONES_METODO.map(opcion => (
                            <option key={opcion.value} value={opcion.value}>
                              {opcion.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // ← ← ← MODO LECTURA: Click para editar
                        <button
                          onClick={handleClicMetodoPago}
                          className="text-blue-400 font-semibold capitalize hover:text-blue-300 hover:underline transition-colors text-left"
                          title="Click para cambiar método de pago"
                        >
                          {detalleRecibo.metodo_pago ? 
                            OPCIONES_METODO.find(o => o.value === detalleRecibo.metodo_pago)?.label || detalleRecibo.metodo_pago 
                            : 'N/A'}
                        </button>
                      )}
                    </div>
                    
                    {/* Propina (sin cambios) */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">💎 Propina:</span>
                      <span className="text-purple-400 font-semibold">
                        {parseFloat(detalleRecibo.propina_total) > 0
                          ? `+${formatMoney(detalleRecibo.propina_total)}`
                          : '$ 0'}
                      </span>
                    </div>
                  </div>
                
                {/* Fila 3: TOTAL (grande y destacado) */}
                <div className="border-t border-gray-700 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-gray-300">TOTAL:</span>
                    <span className="text-2xl font-bold text-green-400">
                      {formatMoney(detalleRecibo.total)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* ← ← ← ACCIONES PARA BORRADOR ← ← ← */}
              {detalleRecibo.estado === 'borrador' && (
                <div className="mt-4 pt-3 border-t border-gray-700 flex gap-2">
                  <button
                    onClick={() => onEditar(detalleRecibo)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  {/*<button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublicar(detalleRecibo.id);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📤 Publicar
                  </button>*/}
                </div>
              )}

              
              
              {/* ← ← ← ACCIONES PARA PUBLICADO ← ← ← */}
              {detalleRecibo.estado === 'publicado' && (
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-center text-sm text-green-400 font-medium">
                    ✅ Recibo publicado - No se pueden editar items
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              Error cargando detalle
            </div>
          )}
        </div>
      )}
    </div>
  );
}

{/* ← ← ← COMPONENTE REUTILIZABLE: CARD DE VALE ← ← ← */}
function ValeCard({
  vale,
  onPagar,
  onCancelar,
  onNotificar,
  formatMoney,
}: {
  vale: ValeEmpleado;
  onPagar: (vale: ValeEmpleado) => void;
  onCancelar: (vale: ValeEmpleado) => void;
  onNotificar: (vale: ValeEmpleado) => void;
  formatMoney: (value: string | number) => string;
}) {
  return (
    <div className="p-3 bg-gray-900 rounded-lg border border-orange-500/30">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono text-xs text-orange-400">
            {vale.codigo_vale}
          </span>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(vale.fecha).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded border border-yellow-700">
          {vale.estado === 'registrado' ? 'Registrado' : 
           vale.estado === 'pagado' ? '✅ Pagado' : '❌ Cancelado'}
        </span>
      </div>
      
      <p className="font-medium text-white text-sm mb-1">
        {vale.profesional_nombre}
      </p>
      <p className="text-lg font-bold text-orange-400 mb-1">
        {formatMoney(vale.monto)}
      </p>
      
      {/* Método de pago */}
      {vale.metodo_pago && (
        <p className="text-xs text-gray-400 mb-2">
          💳 {vale.metodo_pago_display || vale.metodo_pago}
        </p>
      )}
      
      {/* Session info si está disponible */}
      {vale.session_caja && (
        <p className="text-xs text-cyan-400 mb-2 font-mono">
          🏦 Sesión #{vale.session_caja}
        </p>
      )}

      {/* Acciones - solo si está registrado */}
      {vale.estado === 'registrado' && (
        <div className="flex items-center gap-2">
          {/* Notificar WhatsApp */}
          {!vale.notificacion_whatsapp_enviada && (
            <button
              onClick={() => onNotificar(vale)}
              className="flex-1 px-2 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700 rounded text-xs text-blue-300 transition-colors flex items-center justify-center gap-1"
              title="Enviar notificación WhatsApp"
            >
              📱
            </button>
          )}
          
          {/* Pagar 
          <button
            onClick={() => onPagar(vale)}
            className="flex-1 px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-700 rounded text-xs text-green-300 transition-colors flex items-center justify-center gap-1"
            title="Marcar como pagado"
          >
            💰
          </button>*/}
          
          {/* Cancelar */}
          <button
            onClick={() => onCancelar(vale)}
            className="flex-1 px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded text-xs text-red-300 transition-colors flex items-center justify-center gap-1"
            title="Cancelar vale"
          >
            🚫
          </button>
        </div>
      )}
      
      {/* Estado final si ya fue procesado */}
      {vale.estado !== 'registrado' && (
        <p className="text-xs text-gray-500 mt-2 italic">
          {vale.estado === 'pagado' ? '✓ Pagado' : '✗ Cancelado'}
        </p>
      )}
    </div>
  );
}