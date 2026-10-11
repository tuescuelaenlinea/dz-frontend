// components/fidelizacion/ProximaCitaSugeridaModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProfessionalModal from '@/components/booking/ProfessionalModal';  

// ==========================================
// INTERFACES
// ==========================================
interface ProximaCitaSugeridaModalProps {
  isOpen: boolean;
  onClose: () => void;
  citaIds: number[];
  apiUrl: string;
  token: string | null;
  onSuccess?: () => void;
}

interface Servicio {
  id: number;
  nombre: string;
  categoria: number;
  categoria_nombre: string;
  duracion: string;
  precio_min: string;
  imagen_url?: string;
}

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
}

interface CitaAProcesar {
  citaId: number;
  servicioId: number | null;
  profesionalId: number | null;
  clienteId: number | null;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  fechaProximaSugerida: string;
  frecuenciaDias: number;
  ultimaFechaReal?: string;
  servicio?: Servicio;
  profesional?: Profesional;
  esClienteRegistrado: boolean;
}

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  esRegistrado: boolean;
  userId?: number;
}

// ==========================================
// HELPERS
// ==========================================
const formatearFecha = (fechaStr: string): string => {
  if (!fechaStr) return 'Sin fecha';
  const fecha = new Date(fechaStr + 'T12:00:00');
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const sumarDias = (fecha: Date, dias: number): Date => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

const diferenciaDias = (fecha1: Date, fecha2: Date): number => {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round(Math.abs(fecha2.getTime() - fecha1.getTime()) / msPorDia);
};

const generarPasswordAleatorio = (): string => {
  return Math.random().toString(36).slice(-10) + 'A1b!';
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function ProximaCitaSugeridaModal({
  isOpen,
  onClose,
  citaIds,
  apiUrl,
  token,
  onSuccess
}: ProximaCitaSugeridaModalProps) {
  
  // Estados principales
  const [citasParaProcesar, setCitasParaProcesar] = useState<CitaAProcesar[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [esMismoCliente, setEsMismoCliente] = useState(false);
  const [clienteUnicoId, setClienteUnicoId] = useState<number | null>(null);

  // Modales anidados
  const [showClientModal, setShowClientModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Datos para modales
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [nuevoClienteData, setNuevoClienteData] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  // ==========================================
  // CARGA INICIAL DE DATOS
  // ==========================================
  useEffect(() => {
    if (isOpen && citaIds.length > 0) {
      cargarCitas();
    }
  }, [isOpen, citaIds]);

  const cargarCitas = async () => {
    setLoading(true);
    try {
      // 1. Fetch de todas las citas usando el endpoint específico para IDs
      const idsParam = citaIds.join(',');
      const citasRes = await fetch(
        `${apiUrl}/citas/por-ids/?ids=${idsParam}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );

      if (!citasRes.ok) {
        const errorData = await citasRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Error cargando citas');
      }

      const citasData = await citasRes.json();
      // El endpoint nuevo devuelve un array directo, no paginado
      const citasList = Array.isArray(citasData) ? citasData : [];

      if (citasList.length === 0) {
        alert('⚠️ No se encontraron citas con los IDs proporcionados');
        onClose();
        return;
      }

      // 2. Detectar si es mismo cliente
      const primerCita = citasList[0];
      const mismoCliente = citasList.every((c: any) => 
        (c.cliente_id && c.cliente_id === primerCita.cliente_id) ||
        (c.cliente_email && c.cliente_email === primerCita.cliente_email)
      );

      setEsMismoCliente(mismoCliente);

      if (mismoCliente && primerCita.cliente_id) {
        setClienteUnicoId(primerCita.cliente_id);
      }

      // 3. Procesar cada cita
      const citasProcesadas: CitaAProcesar[] = [];

      for (const cita of citasList) {
        // Cargar servicio
        let servicio: Servicio | undefined;
        if (cita.servicio) {
          const servicioRes = await fetch(
            `${apiUrl}/servicios/${cita.servicio}/`,
            { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
          );
          if (servicioRes.ok) {
            servicio = await servicioRes.json();
          }
        }

        // Cargar profesional
        let profesional: Profesional | undefined;
        if (cita.profesional) {
          const profRes = await fetch(
            `${apiUrl}/profesionales/${cita.profesional}/`,
            { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
          );
          if (profRes.ok) {
            profesional = await profRes.json();
          }
        }

        // Calcular fecha sugerida
        const { fecha, frecuenciaDias } = await calcularFechaSugerida(
          cita.servicio,
          cita.cliente_id,
          cita.fecha
        );

        citasProcesadas.push({
          citaId: cita.id,
          servicioId: cita.servicio || null,
          profesionalId: cita.profesional || null,
          clienteId: cita.cliente_id || null,
          clienteNombre: cita.cliente_nombre || '',
          clienteEmail: cita.cliente_email || '',
          clienteTelefono: cita.cliente_telefono || '',
          fechaProximaSugerida: fecha,
          frecuenciaDias,
          ultimaFechaReal: cita.fecha,
          servicio,
          profesional,
          esClienteRegistrado: !!cita.cliente_id
        });
      }

      setCitasParaProcesar(citasProcesadas);

    } catch (error) {
      console.error('❌ Error cargando citas:', error);
      alert(error instanceof Error ? error.message : 'Error al cargar las citas');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const calcularFechaSugerida = async (
    servicioId: number | null,
    clienteId: number | null,
    ultimaFechaReal?: string
  ): Promise<{ fecha: string; frecuenciaDias: number }> => {
    
    if (!clienteId || !servicioId || !ultimaFechaReal) {
      return {
        fecha: sumarDias(new Date(), 30).toISOString().split('T')[0],
        frecuenciaDias: 30
      };
    }

    try {
      // Buscar historial de citas del cliente con este servicio
      const historialRes = await fetch(
        `${apiUrl}/citas/?cliente=${clienteId}&servicio=${servicioId}&estado=completada&page_size=10`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );

      if (!historialRes.ok) {
        return {
          fecha: sumarDias(new Date(ultimaFechaReal), 30).toISOString().split('T')[0],
          frecuenciaDias: 30
        };
      }

      const historialData = await historialRes.json();
      const historial = Array.isArray(historialData) ? historialData : (historialData.results || []);

      if (historial.length < 2) {
        return {
          fecha: sumarDias(new Date(ultimaFechaReal), 30).toISOString().split('T')[0],
          frecuenciaDias: 30
        };
      }

      // Calcular frecuencia promedio
      const fechas = historial.map((c: any) => new Date(c.fecha));
      fechas.sort((a: Date, b: Date) => a.getTime() - b.getTime());

      let totalDias = 0;
      for (let i = 1; i < fechas.length; i++) {
        totalDias += diferenciaDias(fechas[i - 1], fechas[i]);
      }

      const frecuenciaPromedio = Math.round(totalDias / (fechas.length - 1));
      const fechaSugerida = sumarDias(fechas[fechas.length - 1], frecuenciaPromedio);

      return {
        fecha: fechaSugerida.toISOString().split('T')[0],
        frecuenciaDias: frecuenciaPromedio
      };

    } catch (error) {
      console.error('Error calculando fecha sugerida:', error);
      return {
        fecha: sumarDias(new Date(ultimaFechaReal), 30).toISOString().split('T')[0],
        frecuenciaDias: 30
      };
    }
  };

  // ==========================================
  // CARGA DE CLIENTES
  // ==========================================
  const cargarClientes = async () => {
    setLoadingClientes(true);
    try {
      // ← ← ← SOLO cargar usuarios registrados (NO clientes de citas)
      const usuariosRes = await fetch(`${apiUrl}/usuarios/?page_size=500`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      let usuariosRegistrados: Cliente[] = [];
      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json();
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : (usuariosData.results || []);

        usuariosRegistrados = usuariosList
          .filter((u: any) => u.is_active !== false)  // Solo usuarios activos
          .map((u: any) => ({
            id: u.id,
            nombre: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Usuario',
            telefono: u.perfil?.telefono || u.telefono || '',
            email: u.email || '',
            esRegistrado: true,
            userId: u.id
          }));
      }

      setClientes(usuariosRegistrados);
      console.log(`✅ [cargarClientes] ${usuariosRegistrados.length} clientes registrados cargados`);
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => {
    if (showClientModal) {
      cargarClientes();
    }
  }, [showClientModal]);

  // ==========================================
  // CARGA DE SERVICIOS
  // ==========================================
  const cargarServicios = async () => {
    setLoadingServicios(true);
    try {
      const serviciosRes = await fetch(`${apiUrl}/servicios/?disponible=true&page_size=5000`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (serviciosRes.ok) {
        const data = await serviciosRes.json();
        setServiciosDisponibles(data.results || data);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoadingServicios(false);
    }
  };

  useEffect(() => {
    if (showServiceModal) {
      cargarServicios();
    }
  }, [showServiceModal]);

  // ==========================================
  // HANDLERS DE MODALES
  // ==========================================
  const handleCampoClick = (campo: string, index: number) => {
    setCurrentIndex(index);
    if (campo === 'cliente') {
      setShowClientModal(true);
    } else if (campo === 'servicio') {
      setShowServiceModal(true);
    } else if (campo === 'profesional') {
      setShowProfessionalModal(true);
    } else if (campo === 'fecha') {
      setShowDatePicker(true);
    }
  };

  const handleClienteSelect = (cliente: Cliente) => {
    const citasActualizadas = citasParaProcesar.map((cita, idx) => {
      if (esMismoCliente || idx === currentIndex) {
        return {
          ...cita,
          clienteId: cliente.userId || cliente.id,
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          clienteTelefono: cliente.telefono,
          esClienteRegistrado: true
        };
      }
      return cita;
    });

    setCitasParaProcesar(citasActualizadas);
    setShowClientModal(false);
    setClienteSearchTerm('');
  };

  const handleServiceSelect = async (servicio: Servicio) => {
    const citaActual = citasParaProcesar[currentIndex];
    
    // Recalcular fecha sugerida con el nuevo servicio
    const { fecha, frecuenciaDias } = await calcularFechaSugerida(
      servicio.id,
      citaActual.clienteId,
      citaActual.ultimaFechaReal
    );

    const citasActualizadas = [...citasParaProcesar];
    citasActualizadas[currentIndex] = {
      ...citasActualizadas[currentIndex],
      servicioId: servicio.id,
      servicio,
      fechaProximaSugerida: fecha,
      frecuenciaDias
    };

    setCitasParaProcesar(citasActualizadas);
    setShowServiceModal(false);
  };

  const handleProfessionalSelect = (profesional: Profesional) => {
    const citasActualizadas = [...citasParaProcesar];
    citasActualizadas[currentIndex] = {
      ...citasActualizadas[currentIndex],
      profesionalId: profesional.id,
      profesional
    };

    setCitasParaProcesar(citasActualizadas);
    setShowProfessionalModal(false);
  };

  const handleFechaChange = (nuevaFecha: string) => {
    const citasActualizadas = [...citasParaProcesar];
    citasActualizadas[currentIndex] = {
      ...citasActualizadas[currentIndex],
      fechaProximaSugerida: nuevaFecha
    };

    setCitasParaProcesar(citasActualizadas);
    setShowDatePicker(false);
  };

  // ==========================================
  // REGISTRO DE NUEVO CLIENTE
  // ==========================================
  const handleGuardarNuevoCliente = async () => {
    if (!nuevoClienteData.nombre.trim() || !nuevoClienteData.telefono.trim()) {
      alert('⚠️ Nombre y teléfono son obligatorios');
      return;
    }

    try {
      setLoading(true);

      // ← ← ← NUEVO: Usar endpoint específico que crea usuario + perfil
      const res = await fetch(`${apiUrl}/fidelizacion/crear-cliente/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nombre: nuevoClienteData.nombre,
          telefono: nuevoClienteData.telefono,
          email: nuevoClienteData.email
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error creando cliente');
      }

      const data = await res.json();
      const nuevoUsuario = data.usuario;

      // ← ← ← NUEVO: Recargar la lista de clientes inmediatamente
      await cargarClientes();

      // ← ← ← CLAVE: Si es mismo cliente, asignar a TODAS las citas
      if (esMismoCliente) {
        const citasActualizadas = citasParaProcesar.map(cita => ({
          ...cita,
          clienteId: nuevoUsuario.id,
          clienteNombre: nuevoUsuario.first_name + ' ' + (nuevoUsuario.last_name || ''),
          clienteEmail: nuevoUsuario.email,
          clienteTelefono: nuevoUsuario.telefono,
          esClienteRegistrado: true
        }));
        setCitasParaProcesar(citasActualizadas);
      } else {
        // Si no es mismo cliente, asignar solo a la cita actual
        const citasActualizadas = [...citasParaProcesar];
        citasActualizadas[currentIndex] = {
          ...citasActualizadas[currentIndex],
          clienteId: nuevoUsuario.id,
          clienteNombre: nuevoUsuario.first_name + ' ' + (nuevoUsuario.last_name || ''),
          clienteEmail: nuevoUsuario.email,
          clienteTelefono: nuevoUsuario.telefono,
          esClienteRegistrado: true
        };
        setCitasParaProcesar(citasActualizadas);
      }

      setShowRegisterModal(false);
      setNuevoClienteData({ nombre: '', telefono: '', email: '' });
      alert(`✅ Cliente "${nuevoUsuario.first_name} ${nuevoUsuario.last_name}" creado y asignado`);

    } catch (error) {
      console.error('Error creando cliente:', error);
      alert(error instanceof Error ? error.message : 'Error al crear el cliente');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GUARDAR TODO
  // ==========================================
  const handleGuardarTodo = async () => {
    // Validar
    const invalidas = citasParaProcesar.filter(c => 
      !c.clienteId || !c.servicioId || !c.fechaProximaSugerida
    );

    if (invalidas.length > 0) {
      alert(`️ ${invalidas.length} cita(s) incompletas. Todas deben tener cliente, servicio y fecha.`);
      return;
    }

    if (!confirm(`¿Guardar ${citasParaProcesar.length} sugerencia(s) de próxima cita?`)) {
      return;
    }

    setGuardando(true);
    try {
      const resultados = await Promise.all(
        citasParaProcesar.map(async (cita) => {
          // 1. Buscar si existe registro previo
          const existentesRes = await fetch(
            `${apiUrl}/fidelizacion/proximas-citas/?cliente=${cita.clienteId}&servicio=${cita.servicioId}`,
            { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
          );

          const existentes = existentesRes.ok ? await existentesRes.json() : { results: [] };
          const registrosExistentes = Array.isArray(existentes) ? existentes : (existentes.results || []);

          const data = {
            cliente: cita.clienteId,
            servicio_sugerido: cita.servicioId,
            profesional_sugerido: cita.profesionalId,
            fecha_sugerida: cita.fechaProximaSugerida,
            frecuencia_dias: cita.frecuenciaDias,
            ultima_cita_real: cita.citaId,
            es_activo: true
          };

          if (registrosExistentes.length > 0) {
            // Actualizar existente
            const res = await fetch(
              `${apiUrl}/fidelizacion/proximas-citas/${registrosExistentes[0].id}/`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(data)
              }
            );
            return res.ok;
          } else {
            // Crear nuevo
            const res = await fetch(`${apiUrl}/fidelizacion/proximas-citas/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(data)
            });
            return res.ok;
          }
        })
      );

      const exitosos = resultados.filter(r => r).length;
      const fallidos = resultados.length - exitosos;

      if (fallidos > 0) {
        alert(`⚠️ ${exitosos} guardadas exitosamente, ${fallidos} fallaron`);
      } else {
        alert(`✅ ${exitosos} sugerencias guardadas exitosamente`);
        onSuccess?.();
        onClose();
      }

    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar las sugerencias');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // FILTROS
  // ==========================================
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearchTerm.trim()) return clientes;
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
      c.telefono.includes(clienteSearchTerm) ||
      c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
    );
  }, [clientes, clienteSearchTerm]);

  const serviciosFiltrados = useMemo(() => {
    if (!busquedaServicio.trim()) return serviciosDisponibles;
    return serviciosDisponibles.filter(s => 
      s.nombre.toLowerCase().includes(busquedaServicio.toLowerCase()) ||
      s.categoria_nombre?.toLowerCase().includes(busquedaServicio.toLowerCase())
    );
  }, [serviciosDisponibles, busquedaServicio]);

  // ==========================================
  // RENDER
  // ==========================================
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-gray-700 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl"></span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Próxima Cita Sugerida</h3>
                <p className="text-xs text-purple-100">{citasParaProcesar.length} cita(s) a procesar</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Cargando citas...
              </div>
            ) : (
              citasParaProcesar.map((cita, index) => (
                <div key={cita.citaId} className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-3">
                  {/* Número de cita */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Cita #{index + 1}</span>
                    <span className="text-xs text-gray-500">ID: {cita.citaId}</span>
                  </div>

                  {/* Cliente */}
                  <div 
                    onClick={() => handleCampoClick('cliente', index)}
                    className="group cursor-pointer hover:bg-gray-800 rounded-lg p-3 transition-colors border border-gray-700 hover:border-purple-500"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">👤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                          {cita.clienteNombre || 'Sin cliente asignado'}
                        </p>
                        {cita.clienteTelefono && (
                          <p className="text-xs text-gray-400">{cita.clienteTelefono}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Servicio */}
                  <div 
                    onClick={() => handleCampoClick('servicio', index)}
                    className="group cursor-pointer hover:bg-gray-800 rounded-lg p-3 transition-colors border border-gray-700 hover:border-blue-500"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🛠️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Servicio</p>
                        <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {cita.servicio?.nombre || 'Sin servicio'}
                        </p>
                        {cita.servicio?.categoria_nombre && (
                          <p className="text-xs text-gray-400">{cita.servicio.categoria_nombre}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Profesional */}
                  <div 
                    onClick={() => handleCampoClick('profesional', index)}
                    className="group cursor-pointer hover:bg-gray-800 rounded-lg p-3 transition-colors border border-gray-700 hover:border-green-500"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">💇</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Profesional</p>
                        <p className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                          {cita.profesional?.nombre || 'Sin asignar'}
                        </p>
                        {cita.profesional?.especialidad && (
                          <p className="text-xs text-gray-400">{cita.profesional.especialidad}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Fecha Sugerida */}
                  <div 
                    onClick={() => handleCampoClick('fecha', index)}
                    className="group cursor-pointer hover:bg-gray-800 rounded-lg p-3 transition-colors border border-gray-700 hover:border-orange-500"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">📅</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fecha Sugerida</p>
                        <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                          {formatearFecha(cita.fechaProximaSugerida)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Frecuencia</p>
                        <p className="text-sm font-bold text-orange-400">{cita.frecuenciaDias} días</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-900 flex gap-3">
            <button 
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGuardarTodo}
              disabled={guardando || loading || citasParaProcesar.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Guardar {citasParaProcesar.length} sugerencia(s)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL DE SELECCIÓN DE CLIENTES
      ========================================== */}
      {showClientModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowClientModal(false)}>
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
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-96 p-2">
              {loadingClientes ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Cargando clientes...
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setNuevoClienteData({ nombre: '', telefono: '', email: '' });
                      setShowRegisterModal(true);
                    }}
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
                      key={`cliente-${cliente.id}`}
                      onClick={() => handleClienteSelect(cliente)}
                      className="w-full p-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl text-left hover:bg-gray-700 hover:border-purple-500 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center text-white font-bold">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{cliente.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
                        {cliente.email && <p className="text-xs text-gray-500 truncate">{cliente.email}</p>}
                      </div>
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No se encontraron clientes</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE REGISTRO DE NUEVO CLIENTE
      ========================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRegisterModal(false)}>
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
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Ej: María González"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Teléfono *</label>
                <input
                  type="tel"
                  value={nuevoClienteData.telefono}
                  onChange={(e) => setNuevoClienteData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Ej: 3001234567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={nuevoClienteData.email}
                  onChange={(e) => setNuevoClienteData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Ej: cliente@email.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => setShowRegisterModal(false)} 
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuardarNuevoCliente}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando...' : '✅ Crear y Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE SELECCIÓN DE SERVICIOS
      ========================================== */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowServiceModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🛠️ Seleccionar Servicio</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                placeholder="🔍 Buscar servicios..."
                value={busquedaServicio}
                onChange={(e) => setBusquedaServicio(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingServicios ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Cargando servicios...
                </div>
              ) : serviciosFiltrados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No se encontraron servicios</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {serviciosFiltrados.map((servicio) => {
                    const isSelected = citasParaProcesar[currentIndex]?.servicioId === servicio.id;
                    return (
                      <button
                        key={servicio.id}
                        onClick={() => handleServiceSelect(servicio)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {servicio.imagen_url ? (
                            <img src={servicio.imagen_url} alt={servicio.nombre} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">🛠️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">{servicio.nombre}</h4>
                            <p className="text-xs text-gray-400 mb-1">{servicio.categoria_nombre}</p>
                            <p className="text-xs font-semibold text-blue-400">${parseInt(servicio.precio_min).toLocaleString()}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL DE SELECCIÓN DE PROFESIONAL
      ========================================== */}
      {showProfessionalModal && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => setShowProfessionalModal(false)}
          onSelect={handleProfessionalSelect}
          servicioId={citasParaProcesar[currentIndex]?.servicioId || undefined}
          profesionalSeleccionadoId={citasParaProcesar[currentIndex]?.profesionalId || undefined}
        />
      )}

      {/* ==========================================
          MODAL DE SELECCIÓN DE FECHA
      ========================================== */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowDatePicker(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">📅 Seleccionar Fecha</h3>
              <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha sugerida para próxima cita
                </label>
                <input
                  type="date"
                  value={citasParaProcesar[currentIndex]?.fechaProximaSugerida || ''}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-lg"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Frecuencia calculada: {citasParaProcesar[currentIndex]?.frecuenciaDias || 30} días
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => setShowDatePicker(false)} 
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setShowDatePicker(false)}
                className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}