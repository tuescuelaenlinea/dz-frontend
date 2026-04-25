'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProfessionalModal from '@/components/booking/ProfessionalModal';
import PaymentMethodModal from '@/components/booking/PaymentMethodModal';
import CitasTab from '@/components/admin/CitasTab';
import ProfesionalesTab from '@/components/admin/ProfesionalesTab';  // ← NUEVO IMPORT

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  foto: string | null;
  foto_url: string | null;
  activo: boolean;
}

// ← Interface para Cliente (mezcla de registrados y no registrados)
interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  esRegistrado: boolean;  // ← Para saber si viene de auth_user o de citas
  userId?: number;        // ← ID del User si está registrado
}

// ← Interface para nuevo cliente (registro)
interface NuevoClienteData {
  nombre: string;
  telefono: string;
  email: string;
}

type TabType = 'control' | 'citas' | 'profesionales';  // ← CAMBIO: 'clientes' → 'profesionales'

// ← FUNCIÓN AUXILIAR: Obtener fecha local YYYY-MM-DD (sin conversión UTC)
const getFechaLocal = (): string => {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ← FUNCIÓN AUXILIAR: Obtener hora local HH:MM
const getHoraLocal = (): string => {
  const ahora = new Date();
  const hours = String(ahora.getHours()).padStart(2, '0');
  const minutes = String(ahora.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('control');
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ← Estados para modal de clientes
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);

    // ← NUEVO: Estados para modal de profesionales
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [profesionalSeleccionadoData, setProfesionalSeleccionadoData] = useState<Profesional | null>(null);

    // ← NUEVO: Estados para modal de métodos de pago
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionadoId] = useState<number | null>(null);
  
  // ← Estados para modal de registro de cliente
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState<NuevoClienteData>({
    nombre: '',
    telefono: '',
    email: ''
  });
  const [datosAdicionalesOpen, setDatosAdicionalesOpen] = useState(false);
  
  const [citaEnCreacion, setCitaEnCreacion] = useState<{
    servicio: Servicio | null;
    profesional: number | null;
    profesionalData: Profesional | null;  // ← Datos completos del profesional
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    duracion_minutos: number;  // ← NUEVO: Duración en minutos (editable)
    precio_total: number;
    metodo_pago: string;
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
  }>({
    servicio: null,
    profesional: null,
    profesionalData: null,  // ← Agregar este campo
    fecha: getFechaLocal(),
    hora_inicio: getHoraLocal(),
    hora_fin: '',
    duracion_minutos: 60,  // ← NUEVO: Default 1 hora
    precio_total: 0,
    metodo_pago: '',
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
  });

  // ← NUEVO: Cargar clientes combinados (usuarios registrados + clientes de citas)
  useEffect(() => {
    if (showClientModal) {
      async function loadClientes() {
        console.log('🔍 [AdminPage] === INICIO CARGA CLIENTES ===');
        try {
          const token = localStorage.getItem('admin_token');
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
          
          // 1. Fetch a /api/usuarios/ → TODOS los usuarios registrados
          console.log('📡 [AdminPage] Fetching /api/usuarios/ (usuarios registrados)...');
          const usuariosRes = await fetch(`${apiUrl}/usuarios/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          let usuariosRegistrados: Cliente[] = [];
          if (usuariosRes.ok) {
            const usuariosData = await usuariosRes.json();
            const usuariosList = Array.isArray(usuariosData) ? usuariosData : (usuariosData.results || []);
            
            usuariosRegistrados = usuariosList.map((u: any) => {
              // Construir nombre completo
              const nombreCompleto = [
                u.first_name,
                u.last_name,
                '-',
                u.username
              ].filter(Boolean).join(' ').trim() || u.email?.split('@')[0] || 'Usuario';
              
              return {
                id: u.id,  // ID positivo = registrado
                nombre: nombreCompleto,
                telefono: u.perfil?.telefono || u.telefono || u.username || '',
                email: u.email || '',
                esRegistrado: true,
                userId: u.id
              };
            });
            console.log(`✅ [AdminPage] Usuarios registrados cargados: ${usuariosRegistrados.length}`);
            usuariosRegistrados.forEach(u => {
              console.log(`👤 [AdminPage] Registrado: ${u.nombre} (ID: ${u.userId})`);
            });
          } else {
            console.warn('⚠️ [AdminPage] Error cargando usuarios registrados:', await usuariosRes.text());
          }
          
          // 2. Fetch a /api/citas/ → extraer clientes no registrados (sin cliente_id)
          console.log('📡 [AdminPage] Fetching /api/citas/ (clientes no registrados)...');
          const citasRes = await fetch(`${apiUrl}/citas/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          let clientesNoRegistrados: Cliente[] = [];
          if (citasRes.ok) {
            const citasData = await citasRes.json();
            const citasList = Array.isArray(citasData) ? citasData : (citasData.results || []);
            
            // Extraer clientes únicos de citas que NO tienen cliente (no registrados)
            const clientesMap = new Map<string, Cliente>();
            
            for (const cita of citasList) {
              const nombre = cita.cliente_nombre?.trim();
              const email = cita.cliente_email?.trim()?.toLowerCase();
              const telefono = cita.cliente_telefono || '';
              const clienteId = cita.cliente;  // ← DRF usa 'cliente', no 'cliente_id'
              
              if (!nombre || clienteId) continue;  // ← Saltar si tiene cliente (ya está en usuariosRegistrados)
              
              // Key única para evitar duplicados: nombre + email
              const key = `${nombre.toLowerCase()}|${email || ''}`;
              
              if (!clientesMap.has(key)) {
                clientesMap.set(key, {
                  id: -Date.now() - Math.random() * 1000,  // ID negativo temporal único
                  nombre: nombre,
                  telefono: telefono,
                  email: email || '',
                  esRegistrado: false
                });
              }
            }
            
            clientesNoRegistrados = Array.from(clientesMap.values());
            console.log(`✅ [AdminPage] Clientes no registrados cargados: ${clientesNoRegistrados.length}`);
            clientesNoRegistrados.forEach(c => {
              console.log(`👤 [AdminPage] No registrado: ${c.nombre}`);
            });
          } else {
            console.warn('⚠️ [AdminPage] Error cargando citas:', await citasRes.text());
          }
          
          // 3. Combinar ambos arrays (usuarios registrados primero, luego no registrados)
          // Usar Map para evitar duplicados por userId
          const clientesCombinadosMap = new Map<number, Cliente>();
          
          // Primero agregar usuarios registrados
          for (const usuario of usuariosRegistrados) {
            clientesCombinadosMap.set(usuario.id, usuario);
          }
          
          // Luego agregar no registrados (con ID negativo para no colisionar)
          for (const cliente of clientesNoRegistrados) {
            clientesCombinadosMap.set(cliente.id, cliente);
          }
          
          const todosClientes = Array.from(clientesCombinadosMap.values())
            .sort((a, b) => {
              // Registrados primero, luego por nombre
              if (a.esRegistrado && !b.esRegistrado) return -1;
              if (!a.esRegistrado && b.esRegistrado) return 1;
              return a.nombre.localeCompare(b.nombre);
            });
          
          const countRegistrados = todosClientes.filter(c => c.esRegistrado).length;
          const countNoRegistrados = todosClientes.filter(c => !c.esRegistrado).length;
          
          console.log(`✅ [AdminPage] === FIN CARGA CLIENTES ===`);
          console.log(`📊 Total: ${todosClientes.length} | Registrados: ${countRegistrados} | No registrados: ${countNoRegistrados}`);
          
          setClientes(todosClientes.slice(0, 300)); // Limitar a 300 para rendimiento
          
        } catch (err) {
          console.error('❌ [AdminPage] Error crítico cargando clientes:', err);
        }
      }
      loadClientes();
    }
  }, [showClientModal]);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('🔍 [AdminPage] Cargando servicios y profesionales...');
        const [serviciosData, profsData] = await Promise.all([
          api.getAllServicios ? api.getAllServicios() : api.getServicios(),
          api.getProfesionales(),
        ]);
        
        const serviciosList = Array.isArray(serviciosData) ? serviciosData : (serviciosData.results || []);
        const profsList = Array.isArray(profsData) ? profsData : (profsData.results || []);
        
        setServicios(serviciosList);
        setProfesionales(profsList);
        console.log(`✅ [AdminPage] Servicios: ${serviciosList.length}, Profesionales: ${profsList.length}`);
      } catch (err) {
        console.error('❌ [AdminPage] Error cargando datos:', err);
      }
    }
    loadData();
  }, []);

  const serviciosFiltrados = servicios.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ← Filtrar clientes para el modal con búsqueda
  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    c.telefono.includes(clienteSearchTerm) ||
    c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
  );

  // ← Formatear nombre para display: "nombre (id)" o "nombre (sin registro)"
  const formatClienteDisplay = (cliente: Cliente): string => {
    if (cliente.esRegistrado && cliente.userId) {
      return `${cliente.nombre} (${cliente.userId})`;
    }
    return `${cliente.nombre} (sin registro)`;
  };

    const handleServicioClick = (servicio: Servicio) => {
    const precio = parseFloat(servicio.precio_min);
    
    // ← NUEVO: Extraer duración del servicio o usar 60 min por defecto
    const duracionMinutos = servicio.duracion 
      ? parseInt(servicio.duracion.replace(/\D/g, '')) || 60
      : 60;
    
    console.log(`🎯 [AdminPage] Servicio seleccionado: ${servicio.nombre} - Precio: ${precio} - Duración: ${duracionMinutos}min`);
    
    setCitaEnCreacion(prev => ({
      ...prev,
      servicio,
      precio_total: precio,
      duracion_minutos: duracionMinutos,  // ← NUEVO: Guardar duración
    }));
  };

  // ← Manejar precio con formato moneda
  const handlePrecioChange = (value: string) => {
    // Remover formato de moneda y convertir a número
    const numericValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
    const precio = parseFloat(numericValue) || 0;
    setCitaEnCreacion(prev => ({
      ...prev,
      precio_total: precio,
    }));
  };

  // ← Formatear precio como moneda para display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace('COP', '$').trim();
  };

  // ← Seleccionar cliente del modal (mezcla registrados/no registrados)
  const handleClienteSelect = (cliente: Cliente) => {
    console.log(`👤 [AdminPage] Cliente seleccionado: ${formatClienteDisplay(cliente)}`);
    setCitaEnCreacion(prev => ({
      ...prev,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_email: cliente.email,
    }));
    // Guardar ID solo si está registrado (userId positivo)
    setClienteSeleccionadoId(cliente.esRegistrado ? cliente.userId || null : null);
    setShowClientModal(false);
  };

  // ← Abrir modal de registro de cliente nuevo
  const handleNuevoCliente = () => {
    console.log('➕ [AdminPage] Abrir modal de registro de cliente nuevo');
    setNuevoClienteData({ nombre: '', telefono: '', email: '' });
    setShowRegisterModal(true);
  };

  // ← Guardar cliente nuevo y cerrar modales
  const handleGuardarNuevoCliente = () => {
    console.log('💾 [AdminPage] Guardando cliente nuevo:', nuevoClienteData);
    
    if (!nuevoClienteData.nombre.trim()) {
      console.warn('⚠️ [AdminPage] Nombre requerido para nuevo cliente');
      alert('⚠️ El nombre es requerido');
      return;
    }
    
    // Llenar campo de cita con el nuevo cliente
    setCitaEnCreacion(prev => ({
      ...prev,
      cliente_nombre: nuevoClienteData.nombre,
      cliente_telefono: nuevoClienteData.telefono,
      cliente_email: nuevoClienteData.email,
    }));
    
    // No guardamos clienteSeleccionadoId porque aún no tiene ID de user
    setClienteSeleccionadoId(null);
    
    // Cerrar modales
    setShowRegisterModal(false);
    setShowClientModal(false);
    
    console.log('✅ [AdminPage] Cliente nuevo aplicado a cita:', nuevoClienteData.nombre);
    alert(`✅ Cliente "${nuevoClienteData.nombre}" agregado a la cita\n\nNota: Para registrar usuario permanente, ve a Clientes → Nuevo`);
  };

    
   // ← NUEVO: Calcular hora_fin basada en hora_inicio + duración del servicio
  // ← Calcular hora_fin basada en hora_inicio + duración
  const calcularHoraFin = (horaInicio: string, duracionMinutos: number): string => {
    if (!horaInicio) {
      console.warn('⚠️ [AdminPage] hora_inicio vacío');
      return '';
    }
    
    try {
      // Parsear hora_inicio (formato "HH:MM") - ESTO YA ESTÁ BIEN
      const [hours, minutes] = horaInicio.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error('❌ [AdminPage] Formato de hora inválido:', horaInicio);
        return '';
      }
      
      // Calcular hora fin usando duracion_minutos
      const fechaInicio = new Date();  // ← Usa fecha actual local
      fechaInicio.setHours(hours, minutes, 0, 0);  // ← Establece hora local
      
      const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
      
      // Formatear como "HH:MM"
      const hh = String(fechaFin.getHours()).padStart(2, '0');
      const mm = String(fechaFin.getMinutes()).padStart(2, '0');
      
      const horaFinCalculada = `${hh}:${mm}`;
      console.log(`⏱️ [AdminPage] Hora fin: ${horaInicio} + ${duracionMinutos}min = ${horaFinCalculada}`);
      
      return horaFinCalculada;
    } catch (err) {
      console.error('❌ [AdminPage] Error calculando hora_fin:', err);
      return '';
    }
  };

    // ← NUEVO: Manejar selección de profesional desde modal
  const handleProfesionalSelect = (profesional: Profesional) => {
    console.log(`👤 [AdminPage] Profesional seleccionado: ${profesional.nombre} (ID: ${profesional.id})`);
    setCitaEnCreacion(prev => ({
      ...prev,
      profesional: profesional.id,
      profesionalData: profesional,
    }));
    setProfesionalSeleccionadoData(profesional);
  };


    // ← NUEVO: Manejar selección de método de pago desde modal
  const handlePaymentMethodSelect = (metodo: any) => {
    console.log(`💳 [AdminPage] Método de pago seleccionado: ${metodo.banco} (ID: ${metodo.id})`);
    setCitaEnCreacion(prev => ({
      ...prev,
      metodo_pago: metodo.banco.toLowerCase(),  // Guardar nombre del banco
    }));
    setMetodoPagoSeleccionadoId(metodo.id);
  };



  const handleCrearCita = async () => {
    console.log('🚀 [AdminPage] Iniciando creación de cita...');
    
    if (!citaEnCreacion.servicio) {
      console.warn('⚠️ [AdminPage] Intento de crear cita sin servicio seleccionado');
      alert('⚠️ Selecciona un servicio primero');
      return;
    }
    
    if (!citaEnCreacion.hora_inicio) {
      console.warn('⚠️ [AdminPage] Intento de crear cita sin hora de inicio');
      alert('⚠️ Selecciona una hora de inicio');
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const codigoReserva = 'DZ-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      console.log('🎫 [AdminPage] Código de reserva generado:', codigoReserva);
      
      // ← Calcular hora_fin
           // ← Calcular hora_fin usando duracion_minutos
      const horaFin = calcularHoraFin(
        citaEnCreacion.hora_inicio,
        citaEnCreacion.duracion_minutos  // ← NUEVO: Usar duracion_minutos
      );
      
      if (!horaFin) {
        console.error('❌ [AdminPage] hora_fin está vacío');
        alert('⚠️ Error calculando la hora de fin.');
        return;
      }
      
      console.log(`⏱️ [AdminPage] Hora inicio: ${citaEnCreacion.hora_inicio}, Duración: ${citaEnCreacion.duracion_minutos}min, Hora fin: ${horaFin}`);
      
      // ← NUEVO: Teléfono por defecto si está vacío (requerido por backend)
      const telefonoCliente = citaEnCreacion.cliente_telefono.trim() || '300 000 0000';
      console.log(`📱 [AdminPage] Teléfono cliente: "${telefonoCliente}"`);
      
      const citaData = {
        servicio: citaEnCreacion.servicio.id,
        profesional: citaEnCreacion.profesional,
        fecha: citaEnCreacion.fecha,
        hora_inicio: citaEnCreacion.hora_inicio,
        hora_fin: horaFin,  // ← USAR horaFin calculada
        precio_total: citaEnCreacion.precio_total.toString(),
        metodo_pago: citaEnCreacion.metodo_pago || 'pendiente',
        pago_estado: 'pendiente',
        estado: 'confirmada',  // ← CAMBIO: Inicia como confirmada (no pendiente)
        cliente_nombre: citaEnCreacion.cliente_nombre || 'Cliente Walk-in',
        cliente_telefono: telefonoCliente,  // ← USAR teléfono con default
        cliente_email: citaEnCreacion.cliente_email || '',
        notas_cliente: 'Cita creada desde panel de control',
        disponible_salon: true,
        disponible_domicilio: false,
        codigo_reserva: codigoReserva,
        ...(clienteSeleccionadoId && { cliente: clienteSeleccionadoId }),
      };

      console.log('📦 [AdminPage] Payload de cita:', JSON.stringify(citaData, null, 2));
      
      console.log('📡 [AdminPage] POST /api/citas/...');
      const res = await fetch(`${apiUrl}/citas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(citaData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ [AdminPage] Error HTTP creando cita:', res.status, res.statusText, errorText);
        throw new Error(`Error ${res.status}: ${errorText || res.statusText}`);
      }

      const resultado = await res.json();
      console.log('✅ [AdminPage] Cita creada exitosamente:', resultado);
      
      // ← NUEVA LÓGICA: Crear pago y actualizar estados según método de pago seleccionado
      if (citaEnCreacion.precio_total > 0) {
        console.log('💰 [AdminPage] Procesando pago...');
        
        // ← Verificar si se seleccionó un método de pago válido desde el modal
        // Un método es válido si: tiene valor, no está vacío, y NO es el default ''
        const metodoPagoSeleccionado = citaEnCreacion.metodo_pago && 
                                       citaEnCreacion.metodo_pago.trim() !== '' &&
                                       citaEnCreacion.metodo_pago !== '';
        
        console.log('🔍 [AdminPage] Debug método_pago:', {
          valor: citaEnCreacion.metodo_pago,
          tieneValor: !!citaEnCreacion.metodo_pago,
          noVacio: citaEnCreacion.metodo_pago?.trim() !== '',
          esValido: metodoPagoSeleccionado
        });
        
        if (metodoPagoSeleccionado) {
          // ✅ CASO 1: EXISTE MÉTODO DE PAGO SELECCIONADO
          console.log('✅ [AdminPage] Método de pago seleccionado:', citaEnCreacion.metodo_pago);
          
          // 1. Actualizar la cita a "completada" y "pagado"
          console.log('🔄 [AdminPage] Actualizando cita a estado completada/pagado...');
          const updateCitaRes = await fetch(`${apiUrl}/citas/${resultado.id}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              estado: 'completada',
              pago_estado: 'pagado',
            }),
          });
          
          if (updateCitaRes.ok) {
            console.log('✅ [AdminPage] Cita actualizada: estado=completada, pago_estado=pagado');
          } else {
            console.warn('⚠️ [AdminPage] Error actualizando cita:', await updateCitaRes.text());
          }
          
          // 2. Crear registro en salon_app_pago con estado 'exitoso'
          console.log('💾 [AdminPage] Creando registro de pago en BD...');
          const pagoRes = await fetch(`${apiUrl}/pagos/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              monto: citaEnCreacion.precio_total,
              metodo_pago: citaEnCreacion.metodo_pago,
              estado: 'exitoso',
              origen_tipo: 'cita',
              origen_id: resultado.id,
              referencia_externa: `RESERVA-${codigoReserva}`,
            }),
          });
          
          if (pagoRes.ok) {
            const pagoData = await pagoRes.json();
            console.log('✅ [AdminPage] Pago creado en BD:', pagoData);
          } else {
            console.error('❌ [AdminPage] Error creando pago en BD:', await pagoRes.text());
          }
          
        } else {
          // ❌ CASO 2: NO SE SELECCIONÓ MÉTODO DE PAGO
          console.log('⏳ [AdminPage] Sin método de pago seleccionado - Cita en pendiente');
          console.log('ℹ️ [AdminPage] No se crea registro de pago en BD');
          // La cita ya fue creada con estado='confirmada' y pago_estado='pendiente'
          // NO creamos registro en salon_app_pago
        }
      }

      alert(`✅ Cita creada exitosamente\nCódigo: ${codigoReserva}`);

      // Resetear formulario
setCitaEnCreacion({
  servicio: null,
  profesional: null,
  profesionalData: null,
  // ← USAR funciones locales:
  fecha: getFechaLocal(),
  hora_inicio: getHoraLocal(),
  hora_fin: '',
  duracion_minutos: 60,
  precio_total: 0,
  metodo_pago: '',
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
});

      // ← CAMBIO: Usar setTimeout para asegurar que el alert se cierre antes de redirigir
      setTimeout(() => {
        setActiveTab('citas');
        console.log('🔄 [AdminPage] Redirigiendo a pestaña Citas');
      }, 100);
      
      // Resetear formulario
      setCitaEnCreacion({
        servicio: null,
        profesional: null,
        profesionalData: null,
        fecha: getFechaLocal(),
        hora_inicio: getHoraLocal(),
        hora_fin: '',
        duracion_minutos: 60,
        precio_total: 0,
        metodo_pago: '',   // ← Default para próxima cita
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
      });
      setClienteSeleccionadoId(null);
      console.log('🔄 [AdminPage] Formulario reseteado');

    } catch (err: any) {
      console.error('❌ [AdminPage] ERROR CRÍTICO creando cita:', err);
      console.error('📋 [AdminPage] Stack trace:', err.stack);
      alert('❌ Error al crear la cita: ' + err.message);
    }
  };

  const handleCancelar = () => {
    console.log('🗑️ [AdminPage] Cancelando cita en creación...');
    if (confirm('¿Estás seguro de cancelar esta cita?')) {
      setCitaEnCreacion({
        servicio: null,
        profesional: null,
        profesionalData: null,
        fecha: getFechaLocal(),
        hora_inicio: getHoraLocal(),
        hora_fin: '',
        duracion_minutos: 60,
        precio_total: 0,
        metodo_pago: '',
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
      });
      setClienteSeleccionadoId(null);
      console.log('✅ [AdminPage] Cita cancelada, formulario reseteado');
    }
  };

    // ← NUEVO: Crear fecha local evitando conversión UTC
  const createDateLocal = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    // Mes es 0-indexed en JavaScript (0 = enero, 11 = diciembre)
    return new Date(year, month - 1, day);
  };

  // ← NUEVO: Formatear fecha para input date (YYYY-MM-DD)
  const formatDateInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 -mx-4 -my-2">
      
      {/* ========== HEADER CON TABS (Full Width) ========== */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-xl border-b border-gray-700">
        <div className="px-6">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('control')}
              className={`px-8 py-4 font-semibold transition-all border-b-4 ${
                activeTab === 'control'
                  ? 'bg-gray-700 text-white border-blue-500'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
              }`}
            >
              📋 Control de Citas
            </button>
            <button
              onClick={() => setActiveTab('citas')}
              className={`px-8 py-4 font-semibold transition-all border-b-4 ${
                activeTab === 'citas'
                  ? 'bg-gray-700 text-white border-blue-500'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
              }`}
            >
              📅 Citas
            </button>
            <button
              onClick={() => setActiveTab('profesionales')}  // ← CAMBIO: 'clientes' → 'profesionales'
              className={`px-8 py-4 font-semibold transition-all border-b-4 ${
                activeTab === 'profesionales'  // ← CAMBIO: 'clientes' → 'profesionales'
                  ? 'bg-gray-700 text-white border-blue-500'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
              }`}
            >
              👨‍⚕️ Profesionales  
            </button>
          </div>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL (Full Width, Sin Máximos) ========== */}
      <div className="p-4">
        
        {/* TAB: CONTROL */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-180px)]">
            
            {/* ========== PANEL IZQUIERDO (70%) ========== */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col">
              
              {/* Buscador (Full Width) */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Buscar servicio por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-lg transition-colors"
                />
              </div>

              {/* Grid de Servicios (5 columnas) */}
              <div 
               className="overflow-y-auto pr-2 bg-gray-900 bg-repeat max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {serviciosFiltrados.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => handleServicioClick(servicio)}
                      className={`relative aspect-square rounded-xl overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 ${
                        citaEnCreacion.servicio?.id === servicio.id
                          ? 'ring-4 ring-blue-500 border-2 border-blue-500'
                          : 'border-2 border-gray-700'
                      }`}
                    >
                      {/* ← CAMBIO 2: Imagen con overlay y datos encima */}
                      <div className="absolute inset-0">
                        {servicio.imagen_url || servicio.imagen ? (
                          <img
                            src={servicio.imagen_url || servicio.imagen || ''}
                            alt={servicio.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Overlay oscuro para contraste */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                        
                        {/* Contenido sobre la imagen */}
                        <div className="absolute inset-0 p-2 flex flex-col justify-end">
                          <h3 className="font-bold text-xs text-white mb-0.5 line-clamp-2 drop-shadow-lg">
                            {servicio.nombre}
                          </h3>
                          <p className="text-[10px] text-gray-300 mb-1 line-clamp-1 drop-shadow">
                            {servicio.categoria_nombre}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-blue-400 drop-shadow">
                              ${parseInt(servicio.precio_min).toLocaleString()}
                            </p>
                            {servicio.duracion && (
                              <p className="text-[10px] text-gray-400 drop-shadow">
                                ⏱ {servicio.duracion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {serviciosFiltrados.length === 0 && (
                  <div className="text-center py-12 bg-gray-800 rounded-xl">
                    <p className="text-gray-400 text-lg">No se encontraron servicios</p>
                  </div>
                )}
              </div>
            </div>

            {/* ========== PANEL DERECHO (30%) ========== */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3">
              {/* sticky para que permanezca visible al hacer scroll */}
              <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-gray-700 sticky top-4 self-start">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">📝</span> Nueva Cita Rápida
                </h2>

                {/* Servicio Seleccionado */}
                {citaEnCreacion.servicio ? (
                  <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-2 border-blue-500 rounded-xl p-4 mb-4">
                    <p className="text-xs text-blue-300 font-semibold mb-1 uppercase tracking-wide">
                      Servicio seleccionado:
                    </p>
                    <p className="text-lg font-bold text-white">
                      {citaEnCreacion.servicio.nombre}
                    </p>
                    <p className="text-sm text-gray-300">
                      {citaEnCreacion.servicio.categoria_nombre}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border-2 border-yellow-500 rounded-xl p-4 mb-4">
                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                      <span>⚠️</span> Selecciona un servicio del panel izquierdo
                    </p>
                  </div>
                )}

                {/* Precio (Editable - Full Width) - Formato moneda */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <span>💰</span> Precio Total
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(citaEnCreacion.precio_total)}
                    onChange={(e) => handlePrecioChange(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-900 border-2 border-gray-600 rounded-xl text-white focus:border-blue-500 focus:outline-none text-2xl font-bold transition-colors"
                    placeholder="$0"
                  />
                </div>


                {/* Botones en una fila */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    type="button"
                    className="px-2 py-3 bg-purple-900/50 text-purple-300 border border-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-800/50 transition-colors"
                    onClick={() => alert('Función: Agregar productos (próximamente)')}
                  >
                    🛍 Productos
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-3 border rounded-xl text-xs font-semibold transition-colors ${
                      citaEnCreacion.profesional
                        ? 'bg-green-900/50 text-green-300 border-green-700 hover:bg-green-800/50'
                        : 'bg-green-900/50 text-green-300 border border-green-700 hover:bg-green-800/50'
                    }`}
                    onClick={() => setShowProfessionalModal(true)}
                  >
                    👨‍⚕️ {citaEnCreacion.profesionalData ? citaEnCreacion.profesionalData.nombre.split(' ')[0] : 'Profesional'}
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-3 border rounded-xl text-xs font-semibold transition-colors ${
                      citaEnCreacion.metodo_pago && citaEnCreacion.metodo_pago !== ''
                        ? 'bg-orange-900/50 text-orange-300 border-orange-700 hover:bg-orange-800/50'
                        : 'bg-orange-900/50 text-orange-300 border border-orange-700 hover:bg-orange-800/50'
                    }`}
                    onClick={() => setShowPaymentMethodModal(true)}
                  >
                    💳 {citaEnCreacion.metodo_pago && citaEnCreacion.metodo_pago !== '' 
                      ? citaEnCreacion.metodo_pago.charAt(0).toUpperCase() + citaEnCreacion.metodo_pago.slice(1)
                      : 'Pago'}
                  </button>
                </div>

                {/* Campos visibles siempre */}
                <div className="space-y-3 mb-4">
                  {/* Campo cliente con icono de búsqueda */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center justify-between">
                      <span>👤 Cliente</span>
                      <button
                        type="button"
                        onClick={() => setShowClientModal(true)}
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={citaEnCreacion.cliente_nombre}
                        onChange={(e) => setCitaEnCreacion(prev => ({ ...prev, cliente_nombre: e.target.value }))}
                        className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none pr-10"
                        placeholder="Nombre del cliente"
                        readOnly={!!clienteSeleccionadoId}
                      />
                      {clienteSeleccionadoId && (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('🗑️ [AdminPage] Limpiando cliente seleccionado');
                            setClienteSeleccionadoId(null);
                            setCitaEnCreacion(prev => ({
                              ...prev,
                              cliente_nombre: '',
                              cliente_telefono: '',
                              cliente_email: ''
                            }));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Quitar cliente"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ← NUEVO: Acordeón de Datos Adicionales */}
                <div className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Header del acordeón */}
                  <button
                    type="button"
                    onClick={() => setDatosAdicionalesOpen(!datosAdicionalesOpen)}
                    className="w-full px-4 py-3 bg-gray-700/50 hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-gray-300">
                      📋 Datos adicionales
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        datosAdicionalesOpen ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Contenido del acordeón (colapsable) */}
                  {datosAdicionalesOpen && (
                    <div className="px-4 py-3 bg-gray-800/50 space-y-3 border-t border-gray-700">
                     {/* Fecha */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          📅 Fecha
                        </label>
                        <input
                          type="date"
                          value={citaEnCreacion.fecha}
                          onChange={(e) => {
                            // ← CAMBIO: Usar fecha directamente sin conversión UTC
                            const fechaValor = e.target.value;
                            setCitaEnCreacion(prev => ({ 
                              ...prev, 
                              fecha: fechaValor  // ← Guardar string YYYY-MM-DD directamente
                            }));
                          }}
                          className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Hora Inicio */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          ⏰ Hora Inicio
                        </label>
                        <input
                          type="time"
                          value={citaEnCreacion.hora_inicio}
                          onChange={(e) => setCitaEnCreacion(prev => ({ ...prev, hora_inicio: e.target.value }))}
                          className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Duración */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          ⏱️ Duración (minutos)
                        </label>
                        <input
                          type="number"
                          value={citaEnCreacion.duracion_minutos || 60}
                          onChange={(e) => {
                            const minutos = parseInt(e.target.value) || 60;
                            setCitaEnCreacion(prev => ({ ...prev, duracion_minutos: minutos }));
                          }}
                          className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="60"
                          min="15"
                          step="15"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          {citaEnCreacion.servicio?.duracion 
                            ? `Del servicio: ${citaEnCreacion.servicio.duracion}`
                            : '⚠️ Servicio sin duración - Usando 1 hora por defecto'}
                        </p>
                      </div>

                      {/* Teléfono Cliente */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          📱 Teléfono Cliente *
                        </label>
                        <input
                          type="tel"
                          value={citaEnCreacion.cliente_telefono}
                          onChange={(e) => setCitaEnCreacion(prev => ({ ...prev, cliente_telefono: e.target.value }))}
                          className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Ej: 300 123 4567 (requerido)"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="space-y-3 mt-auto">
                  <button
                    onClick={handleCrearCita}
                    disabled={!citaEnCreacion.servicio}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
                  >
                    ✅ Aceptar y Crear Cita
                  </button>
                  <button
                    onClick={handleCancelar}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg text-lg"
                  >
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CITAS */}
        {activeTab === 'citas' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-gray-700">
            <CitasTab />
          </div>
        )}

        {/* TAB: PROFESIONALES (Reemplaza Clientes) */}  // ← CAMBIO: Título
        {activeTab === 'profesionales' && (  // ← CAMBIO: 'clientes' → 'profesionales'
          <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-gray-700">
            <ProfesionalesTab />  // ← CAMBIO: Componente
          </div>
        )}
                {/* ← Modal de Selección de Clientes (combinados) */}
        {showClientModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <div 
              className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">👥 Seleccionar Cliente</h3>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Buscador dentro del modal */}
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

              {/* Lista de clientes - Scrollable */}
              <div className="overflow-y-auto max-h-96 p-2">
                {/* Botón Nuevo Cliente */}
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

                {/* Cards de clientes existentes (combinados) */}
                {clientesFiltrados.map((cliente) => (
                  <button
                    key={`${cliente.esRegistrado ? 'reg' : 'no'}-${cliente.id}`}
                    onClick={() => handleClienteSelect(cliente)}
                    className="w-full p-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl text-left hover:bg-gray-700 hover:border-blue-500 transition-all flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      cliente.esRegistrado ? 'bg-blue-900' : 'bg-gray-700'
                    }`}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Display con formato "nombre (id)" o "nombre (sin registro)" */}
                      <p className="font-semibold text-white truncate">
                        {formatClienteDisplay(cliente)}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
                      {cliente.email && (
                        <p className="text-xs text-gray-500 truncate">{cliente.email}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}

                {clientesFiltrados.length === 0 && clienteSearchTerm && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No se encontraron clientes con "{clienteSearchTerm}"</p>
                  </div>
                )}
              </div>

              {/* Footer del modal */}
              <div className="p-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">
                  {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ← Modal de Registro de Cliente Nuevo */}
        {showRegisterModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowRegisterModal(false)}
          >
            <div 
              className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">➕ Nuevo Cliente</h3>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Formulario */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Nombre completo *
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={nuevoClienteData.telefono}
                    onChange={(e) => setNuevoClienteData(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: 300 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={nuevoClienteData.email}
                    onChange={(e) => setNuevoClienteData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Ej: cliente@email.com"
                  />
                </div>
              </div>

              {/* Footer con acciones */}
              <div className="p-4 border-t border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNuevoCliente}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  ✅ Agregar a Cita
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        {/* ← NUEVO: Modal de Métodos de Pago */}
        <PaymentMethodModal
          isOpen={showPaymentMethodModal}
          onClose={() => setShowPaymentMethodModal(false)}
          onSelect={handlePaymentMethodSelect}
          metodoSeleccionadoId={metodoPagoSeleccionado}
        />


        {/* ← Modal de Profesionales */}
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => setShowProfessionalModal(false)}
          onSelect={handleProfesionalSelect}
          servicioId={citaEnCreacion.servicio?.id || null}
          profesionalSeleccionadoId={citaEnCreacion.profesional}
        />
    </div>
  );
}