'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

type TabType = 'control' | 'citas' | 'clientes';

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
  
  // ← Estados para modal de registro de cliente
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState<NuevoClienteData>({
    nombre: '',
    telefono: '',
    email: ''
  });
  
  const [citaEnCreacion, setCitaEnCreacion] = useState<{
    servicio: Servicio | null;
    profesional: number | null;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    precio_total: number;
    metodo_pago: string;
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
  }>({
    servicio: null,
    profesional: null,
    fecha: new Date().toISOString().split('T')[0],
    // ← Hora actual por defecto
    hora_inicio: new Date().toTimeString().slice(0, 5),
    hora_fin: '',
    precio_total: 0,
    metodo_pago: 'efectivo',
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
    console.log(`🎯 [AdminPage] Servicio seleccionado: ${servicio.nombre} - Precio: ${precio}`);
    setCitaEnCreacion(prev => ({
      ...prev,
      servicio,
      precio_total: precio,
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
  const calcularHoraFin = (horaInicio: string, duracion: string): string => {
    if (!horaInicio || !duracion) return '';
    
    try {
      // Parsear hora_inicio (formato "HH:MM")
      const [hours, minutes] = horaInicio.split(':').map(Number);
      
      // Extraer minutos de la duración (ej: "60 minutos" → 60)
      const duracionMinutos = parseInt(duracion.replace(/\D/g, '')) || 60;
      
      // Calcular hora fin
      const fechaInicio = new Date();
      fechaInicio.setHours(hours, minutes, 0, 0);
      
      const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
      
      // Formatear como "HH:MM"
      const hh = String(fechaFin.getHours()).padStart(2, '0');
      const mm = String(fechaFin.getMinutes()).padStart(2, '0');
      
      return `${hh}:${mm}`;
    } catch (err) {
      console.error('❌ [AdminPage] Error calculando hora_fin:', err);
      return '';
    }
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
      const horaFin = calcularHoraFin(
        citaEnCreacion.hora_inicio,
        citaEnCreacion.servicio.duracion
      );
      console.log(`⏱️ [AdminPage] Hora inicio: ${citaEnCreacion.hora_inicio}, Duración: ${citaEnCreacion.servicio.duracion}, Hora fin calculada: ${horaFin}`);
      
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
        metodo_pago: citaEnCreacion.metodo_pago,
        estado_pago: 'pendiente',
        cliente_nombre: citaEnCreacion.cliente_nombre || 'Cliente Walk-in',
        cliente_telefono: telefonoCliente,  // ← USAR teléfono con default
        cliente_email: citaEnCreacion.cliente_email || '',
        notas_cliente: 'Cita creada desde panel de control',
        disponible_salon: true,
        disponible_domicilio: false,
        codigo_reserva: codigoReserva,
        estado: 'pendiente',
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
      
      // Crear pago si hay precio
      if (citaEnCreacion.precio_total > 0) {
        console.log('💰 [AdminPage] Creando pago asociado...');
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
          console.log('✅ [AdminPage] Pago creado:', pagoData);
        } else {
          console.warn('⚠️ [AdminPage] Error creando pago:', await pagoRes.text());
        }
      }

      alert(`✅ Cita creada exitosamente\nCódigo: ${codigoReserva}`);
      
      // Resetear formulario
      setCitaEnCreacion({
        servicio: null,
        profesional: null,
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: new Date().toTimeString().slice(0, 5),
        hora_fin: '',
        precio_total: 0,
        metodo_pago: 'efectivo',
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
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: new Date().toTimeString().slice(0, 5),
        hora_fin: '',
        precio_total: 0,
        metodo_pago: 'efectivo',
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
      });
      setClienteSeleccionadoId(null);
      console.log('✅ [AdminPage] Cita cancelada, formulario reseteado');
    }
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
              onClick={() => setActiveTab('clientes')}
              className={`px-8 py-4 font-semibold transition-all border-b-4 ${
                activeTab === 'clientes'
                  ? 'bg-gray-700 text-white border-blue-500'
                  : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
              }`}
            >
              👥 Clientes
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
                      className={`bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition-all transform hover:scale-105 hover:shadow-2xl ${
                        citaEnCreacion.servicio?.id === servicio.id
                          ? 'ring-4 ring-blue-500 border-2 border-blue-500'
                          : 'border-2 border-gray-700'
                      }`}
                    >
                      {/* Imagen del servicio */}
                      <div className="aspect-square bg-gray-900 overflow-hidden">
                        {servicio.imagen_url || servicio.imagen ? (
                          <img
                            src={servicio.imagen_url || servicio.imagen || ''}
                            alt={servicio.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Información */}
                      <div className="p-3">
                        <h3 className="font-bold text-sm text-white mb-1 line-clamp-2 min-h-[2.5rem]">
                          {servicio.nombre}
                        </h3>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                          {servicio.categoria_nombre}
                        </p>
                        <p className="text-lg font-bold text-blue-400">
                          ${parseInt(servicio.precio_min).toLocaleString()}
                        </p>
                        {servicio.duracion && (
                          <p className="text-xs text-gray-500 mt-1">
                            ⏱ {servicio.duracion}
                          </p>
                        )}
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
                    className="px-2 py-3 bg-green-900/50 text-green-300 border border-green-700 rounded-xl text-xs font-semibold hover:bg-green-800/50 transition-colors"
                    onClick={() => alert('Función: Seleccionar profesional (próximamente)')}
                  >
                    👨‍⚕️ Profesional
                  </button>
                  <button
                    type="button"
                    className="px-2 py-3 bg-orange-900/50 text-orange-300 border border-orange-700 rounded-xl text-xs font-semibold hover:bg-orange-800/50 transition-colors"
                    onClick={() => alert('Función: Método de pago (próximamente)')}
                  >
                    💳 Pago
                  </button>
                </div>

                {/* Campos adicionales */}
               {/* Campos adicionales */}
<div className="space-y-3 mb-6">
  <div>
    <label className="block text-xs font-semibold text-gray-400 mb-1">
      📅 Fecha
    </label>
    <input
      type="date"
      value={citaEnCreacion.fecha}
      onChange={(e) => setCitaEnCreacion(prev => ({ ...prev, fecha: e.target.value }))}
      className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
    />
  </div>
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
  {/* ← NUEVO: Campo de teléfono (requerido por backend) */}
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

        {/* Modal de Selección de Clientes (combinados) */}
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

        {/* Modal de Registro de Cliente Nuevo */}
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

        {/* TAB: CITAS (Placeholder) */}
        {activeTab === 'citas' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-12 text-center border-2 border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-4">📅 Gestión de Citas</h2>
            <p className="text-gray-400 text-lg">Próximamente: Lista completa de citas, filtros y edición</p>
          </div>
        )}

        {/* TAB: CLIENTES (Placeholder) */}
        {activeTab === 'clientes' && (
          <div className="bg-gray-800 rounded-xl shadow-2xl p-12 text-center border-2 border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-4">👥 Gestión de Clientes</h2>
            <p className="text-gray-400 text-lg">Próximamente: Base de datos de clientes, historial y estadísticas</p>
          </div>
        )}
      </div>
    </div>
  );
}