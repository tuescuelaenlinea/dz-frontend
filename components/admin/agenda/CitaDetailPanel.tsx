// components/admin/agenda/CitaDetailPanel.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Cita } from './types';
import ProfessionalModal from '@/components/booking/ProfessionalModal';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  esRegistrado: boolean;
  userId?: number;
}

interface CitaDetailPanelProps {
  cita: Cita;
  onClose: () => void;
  onCitaActualizada: (cita: Cita) => void;
  onCitaEliminada?: () => void;
  onFechaCambiada?: (fecha: string) => void;
  apiUrl: string;
  token: string | null;
}

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-500 text-white';
    case 'confirmada': return 'bg-blue-500 text-white';
    case 'completada': return 'bg-green-500 text-white';
    case 'cancelada': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'pendiente': return 'bg-yellow-100 border-yellow-400';
    case 'confirmada': return 'bg-blue-100 border-blue-400';
    case 'completada': return 'bg-green-100 border-green-400';
    case 'cancelada': return 'bg-red-100 border-red-400';
    default: return 'bg-gray-100 border-gray-400';
  }
};

const formatearPrecio = (precio: string | number) => {
  const num = parseFloat(String(precio));
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num);
};

const formatearFecha = (fechaStr: string) => {
  const fecha = new Date(fechaStr + 'T12:00:00');
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

// ← ← ← Helper para calcular hora fin ← ← ←
const calcularHoraFin = (horaInicio: string, duracionMinutos: number): string => {
  const [h, m] = horaInicio.split(':').map(Number);
  const fechaInicio = new Date();
  fechaInicio.setHours(h, m, 0, 0);
  const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
  return `${String(fechaFin.getHours()).padStart(2, '0')}:${String(fechaFin.getMinutes()).padStart(2, '0')}`;
};

// ← ← ← Helper para parsear duración a minutos ← ← ←
const parsearDuracionAMinutos = (duracion: string): number => {
  const match = duracion.match(/(\d+):?(\d*)/);
  if (match) {
    const horas = parseInt(match[1]);
    const minutos = match[2] ? parseInt(match[2]) : 0;
    return (horas * 60) + minutos;
  }
  return 60; // Default 1 hora
};

export default function CitaDetailPanel({
  cita,
  onClose,
  onCitaActualizada,
  onCitaEliminada,
  onFechaCambiada,
  apiUrl,
  token
}: CitaDetailPanelProps) {
  
  // ← ← ← ESTADOS PARA EL MODAL DE CLIENTES ← ← ←
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);

  // ← ← ← ESTADOS PARA NUEVO CLIENTE ← ← ←
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  // ← ← ← ESTADOS PARA EL MODAL DE SERVICIOS ← ← ←
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [loadingServicios, setLoadingServicios] = useState(false);

  // ← ← ← ESTADOS PARA EL MODAL DE PROFESIONALES ← ← ←
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);

  // ← ← ← ESTADOS PARA EL MODAL DE FECHA ← ← ←
  const [showDateModal, setShowDateModal] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(cita.fecha);
  const [loadingFecha, setLoadingFecha] = useState(false);

  // ← ← ← ESTADOS PARA EL MODAL DE HORA/DURACIÓN ← ← ←
  const [showHoraDuracionModal, setShowHoraDuracionModal] = useState(false);
  const [nuevaHoraInicio, setNuevaHoraInicio] = useState(cita.hora_inicio.substring(0, 5));
  const [nuevaDuracion, setNuevaDuracion] = useState(60); // En minutos
  const [loadingHoraDuracion, setLoadingHoraDuracion] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<{ disponible: boolean; mensaje: string } | null>(null);

  // ← ← ← NUEVO: ESTADOS PARA EL MODAL DE VALOR/PRECIO ← ← ←
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState<string | number>(cita.precio_total);
  const [loadingPrecio, setLoadingPrecio] = useState(false);

   const [copiado, setCopiado] = useState(false);

  // Opciones de duración predefinidas (en minutos)
  const opcionesDuracion = [
    { valor: 30, label: '30 min' },
    { valor: 60, label: '1 hora' },
    { valor: 90, label: '1:30 h' },
    { valor: 120, label: '2 horas' },
    { valor: 150, label: '2:30 h' },
    { valor: 180, label: '3 horas' },
  ];

  // Cargar clientes (misma lógica que en admin/page.tsx)
  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
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
      
      const citasRes = await fetch(`${apiUrl}/citas/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let clientesNoRegistrados: Cliente[] = [];
      if (citasRes.ok) {
        const citasData = await citasRes.json();
        const citasList = Array.isArray(citasData) ? citasData : (citasData.results || []);
        
        const clientesMap = new Map<string, Cliente>();
        for (const c of citasList) {
          const nombre = c.cliente_nombre?.trim();
          const email = c.cliente_email?.trim()?.toLowerCase();
          const clienteId = c.cliente;
          
          if (!nombre || clienteId) continue;
          
          const key = `${nombre.toLowerCase()}|${email || ''}`;
          if (!clientesMap.has(key)) {
            clientesMap.set(key, {
              id: -Date.now() - Math.random() * 1000,
              nombre: nombre,
              telefono: c.cliente_telefono || '',
              email: email || '',
              esRegistrado: false
            });
          }
        }
        clientesNoRegistrados = Array.from(clientesMap.values());
      }
      
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
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => {
    if (showClientModal) {
      loadClientes();
    }
  }, [showClientModal]);

  const cargarServiciosYCategorias = async () => {
    setLoadingServicios(true);
    try {
      const [serviciosRes, categoriasRes] = await Promise.all([
        fetch(`${apiUrl}/servicios/?disponible=true&page_size=5000`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }),
        fetch(`${apiUrl}/categorias/?activo=true&page_size=100`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
      ]);
      
      if (serviciosRes.ok) {
        const data = await serviciosRes.json();
        setServiciosDisponibles(data.results || data);
      }
      if (categoriasRes.ok) {
        const data = await categoriasRes.json();
        setCategorias(data.results || data);
      }
    } catch (err) {
      console.error('❌ Error cargando servicios y categorías:', err);
    } finally {
      setLoadingServicios(false);
    }
  };

  useEffect(() => {
    if (showServiceModal) {
      cargarServiciosYCategorias();
    }
  }, [showServiceModal]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearchTerm.trim()) return clientes;
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
      c.telefono.includes(clienteSearchTerm) ||
      c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
    );
  }, [clientes, clienteSearchTerm]);

  const serviciosFiltrados = useMemo(() => {
    return serviciosDisponibles.filter((servicio: any) => {
      const coincideCategoria = !filtroCategoria || servicio.categoria?.toString() === filtroCategoria;
      const coincideBusqueda = !busquedaServicio || 
        servicio.nombre.toLowerCase().includes(busquedaServicio.toLowerCase()) ||
        servicio.categoria_nombre?.toLowerCase().includes(busquedaServicio.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });
  }, [serviciosDisponibles, filtroCategoria, busquedaServicio]);

  // ← ← ← MANEJAR SELECCIÓN DE CLIENTE Y ACTUALIZAR CITA ← ← ←
  const handleClienteSelect = async (cliente: Cliente) => {
    try {
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cliente_nombre: cliente.nombre,
          cliente_telefono: cliente.telefono,
          cliente_email: cliente.email,
          cliente: cliente.esRegistrado ? cliente.userId : null
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowClientModal(false);
        setClienteSearchTerm('');
      } else {
        alert('Error al actualizar el cliente de la cita');
      }
    } catch (err) {
      console.error('Error actualizando cliente:', err);
      alert('Error de conexión al actualizar');
    }
  };
    // ← ← ← NUEVO: Función para copiar código con feedback visual ← ← ←
  const handleCopiarCodigo = () => {
    if (cita.codigo_reserva) {
      navigator.clipboard.writeText(cita.codigo_reserva);
      setCopiado(true);
      
      // Ocultar el mensaje después de 2 segundos
      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    }
  };
  const handleNuevoCliente = () => {
    setNuevoClienteData({ nombre: '', telefono: '', email: '' });
    setShowRegisterModal(true);
  };

  const handleGuardarNuevoCliente = async () => {
    if (!nuevoClienteData.nombre.trim()) {
      alert('⚠️ El nombre es requerido');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cliente_nombre: nuevoClienteData.nombre.trim(),
          cliente_telefono: nuevoClienteData.telefono.trim(),
          cliente_email: nuevoClienteData.email.trim().toLowerCase(),
          cliente: null
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowRegisterModal(false);
        setShowClientModal(false);
        setNuevoClienteData({ nombre: '', telefono: '', email: '' });
        alert(`✅ Cliente "${nuevoClienteData.nombre}" agregado a la cita`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al agregar el cliente: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error agregando nuevo cliente:', err);
      alert('Error de conexión al agregar el cliente');
    }
  };

  const handleServiceSelect = async (servicio: any) => {
    try {
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          servicio: servicio.id,
          profesional: null
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowServiceModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el servicio: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error actualizando servicio:', err);
      alert('Error de conexión al actualizar');
    }
  };

  const handleProfessionalSelect = async (profesional: any) => {
    try {
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          profesional: profesional.id
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowProfessionalModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el profesional: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error actualizando profesional:', err);
      alert('Error de conexión al actualizar');
    }
  };

  const handleFechaUpdate = async () => {
    if (!nuevaFecha) {
      alert('⚠️ La fecha es requerida');
      return;
    }

    try {
      setLoadingFecha(true);
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fecha: nuevaFecha
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        if (onFechaCambiada) {
          onFechaCambiada(nuevaFecha);
        }
        setShowDateModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar la fecha: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error actualizando fecha:', err);
      alert('Error de conexión al actualizar');
    } finally {
      setLoadingFecha(false);
    }
  };

  const handleHoraDuracionUpdate = async () => {
    if (!nuevaHoraInicio) {
      alert('⚠️ La hora de inicio es requerida');
      return;
    }

    try {
      setLoadingHoraDuracion(true);
      const horaFin = calcularHoraFin(nuevaHoraInicio, nuevaDuracion);
      
      const resValidacion = await fetch(`${apiUrl}/validar-disponibilidad/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          profesional_id: cita.profesional,
          fecha: cita.fecha,
          hora_inicio: nuevaHoraInicio,
          hora_fin: horaFin,
          cita_id_editar: cita.id
        })
      });

      if (!resValidacion.ok) {
        throw new Error('Error validando disponibilidad');
      }

      const dataValidacion = await resValidacion.json();
      
      if (!dataValidacion.disponible) {
        setDisponibilidad({
          disponible: false,
          mensaje: dataValidacion.mensaje
        });
        setLoadingHoraDuracion(false);
        return;
      }

      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          hora_inicio: nuevaHoraInicio,
          hora_fin: horaFin
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowHoraDuracionModal(false);
        setDisponibilidad(null);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar la hora: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error actualizando hora:', err);
      alert('Error de conexión al actualizar');
    } finally {
      setLoadingHoraDuracion(false);
    }
  };

  // ← ← ← NUEVO: MANEJAR ACTUALIZACIÓN DE VALOR/PRECIO ← ← ←
  const handlePrecioUpdate = async () => {
    const precioNum = parseFloat(String(nuevoPrecio));
    if (isNaN(precioNum) || precioNum < 0) {
      alert('⚠️ El valor debe ser un número válido mayor o igual a 0');
      return;
    }

    try {
      setLoadingPrecio(true);
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          precio_total: precioNum
        })
      });

      if (res.ok) {
        const citaActualizada = await res.json();
        onCitaActualizada(citaActualizada);
        setShowPriceModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al actualizar el valor: ${errorData.detail || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error actualizando precio:', err);
      alert('Error de conexión al actualizar');
    } finally {
      setLoadingPrecio(false);
    }
  };

  // ← ← ← NUEVO: MANEJAR ELIMINACIÓN DE CITA (BLINDADO CON LOGS) ← ← ←
  const handleEliminarCita = async () => {
    console.log("🔥 [handleEliminarCita] 1. Función iniciada. Cita ID:", cita.id);
    
    try {
      // 1. Validar si tiene pagos asociados
      const pagoAcumulado = parseFloat(String(cita.pago_acumulado || 0));
      console.log("💰 [handleEliminarCita] 2. Pago acumulado:", pagoAcumulado, "| Estado:", cita.pago_estado);
      
      if (pagoAcumulado > 0 || cita.pago_estado === 'pagado') {
        console.warn("⚠️ [handleEliminarCita] Bloqueado: Tiene pagos registrados.");
        alert('⚠️ No se puede eliminar esta cita porque tiene pagos registrados. Por favor, anule el recibo asociado primero.');
        return;
      }

      // 2. Validación adicional si la cita ya está completada
      if (cita.estado === 'completada') {
        console.log("⚠️ [handleEliminarCita] 3. Cita completada, solicitando confirmación extra...");
        if (!window.confirm('⚠️ Esta cita ya está completada. ¿Estás seguro de que deseas eliminarla? Esto podría afectar el inventario y las comisiones.')) {
          console.log("⏹️ [handleEliminarCita] Cancelado por el usuario (confirmación completada).");
          return;
        }
      } else {
        // 3. Confirmación estándar
        console.log("⚠️ [handleEliminarCita] 3. Solicitando confirmación estándar...");
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')) {
          console.log("⏹️ [handleEliminarCita] Cancelado por el usuario (confirmación estándar).");
          return;
        }
      }

      console.log("📡 [handleEliminarCita] 4. Enviando petición DELETE al backend...");
      
      // 4. Petición DELETE al backend
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      console.log("📥 [handleEliminarCita] 5. Respuesta del backend:", res.status, res.statusText);

      if (res.ok) {
        console.log("✅ [handleEliminarCita] 6. Eliminación exitosa. Cerrando panel...");
        alert('✅ Cita eliminada exitosamente');
        if (onCitaEliminada) {
          onCitaEliminada(); // Avisa al padre para que recargue la agenda
        }
        onClose(); // Cierra el panel lateral
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("❌ [handleEliminarCita] Error del servidor:", errorData);
        const mensajeError = errorData.detail || errorData.error || 'No se permite eliminar esta cita. Verifica si tiene recibos o pagos asociados.';
        alert(`❌ Error: ${mensajeError}`);
      }
    } catch (err) {
      console.error('❌ [handleEliminarCita] 7. Error de conexión o excepción inesperada:', err);
      alert('Error de conexión al eliminar la cita. Revisa la consola (F12) para más detalles.');
    }
  };

  useEffect(() => {
    if (showHoraDuracionModal && nuevaHoraInicio && nuevaDuracion && cita.profesional) {
      const validarDisponibilidad = async () => {
        try {
          const horaFin = calcularHoraFin(nuevaHoraInicio, nuevaDuracion);
          const res = await fetch(`${apiUrl}/validar-disponibilidad/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              profesional_id: cita.profesional,
              fecha: cita.fecha,
              hora_inicio: nuevaHoraInicio,
              hora_fin: horaFin,
              cita_id_editar: cita.id
            })
          });

          if (res.ok) {
            const data = await res.json();
            setDisponibilidad({
              disponible: data.disponible,
              mensaje: data.mensaje
            });
          }
        } catch (err) {
          console.error('Error validando disponibilidad:', err);
        }
      };

      const timer = setTimeout(validarDisponibilidad, 500);
      return () => clearTimeout(timer);
    }
  }, [nuevaHoraInicio, nuevaDuracion, showHoraDuracionModal]);

  const handleCampoClick = (campo: string) => {
    if (campo === 'cliente') {
      setShowClientModal(true);
    } else if (campo === 'servicio') {
      setShowServiceModal(true);
    } else if (campo === 'profesional') {
      setShowProfessionalModal(true);
    } else if (campo === 'fecha') {
      setNuevaFecha(cita.fecha);
      setShowDateModal(true);
    } else if (campo === 'hora' || campo === 'duracion') {
      setNuevaHoraInicio(cita.hora_inicio.substring(0, 5));      
      setNuevaDuracion(calcularDuracionEnMinutos(cita.hora_inicio, cita.hora_fin));
      setDisponibilidad(null);
      setShowHoraDuracionModal(true);
    } else if (campo === 'precio') {
      setNuevoPrecio(cita.precio_total);
      setShowPriceModal(true);
    } else if (campo === 'cancelar') {
      // Redirigimos al nuevo handler blindado
      handleEliminarCita();
    } else {
      console.log(`Abrir modal para editar: ${campo}`);
    }
  };

  const horaFinCalculada = useMemo(() => {
    return calcularHoraFin(nuevaHoraInicio, nuevaDuracion);
  }, [nuevaHoraInicio, nuevaDuracion]);

  return (
    <>
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Detalles de la Cita
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto">
          
          {/* ← ← ← SECCIÓN: CLIENTE ← ← ← */}
          <div 
            onClick={() => handleCampoClick('cliente')}
            className="px-4 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-bold shadow-md group-hover:scale-105 transition-transform">
                  {cita.cliente_nombre ? cita.cliente_nombre.charAt(0).toUpperCase() : '?'}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                    {cita.cliente_nombre || 'Sin cliente asignado'}
                  </h2>
                  <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600">
                    {cita.cliente_telefono || 'Sin teléfono'}
                  </span>
                  {cita.cliente_telefono && (
                    <a
                      href={`https://wa.me/${cita.cliente_telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-green-600 hover:text-green-700 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  )}
                </div>
                {cita.cliente_email && (
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {cita.cliente_email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Información de la Cita (ESPACIADO REDUCIDO) */}
          <div className="px-4 py-3 space-y-2">
            
            {/* ← ← ← NUEVO: Código de Reserva (Clic para copiar) ← ← ← */}
            {/* ← ← ← SECCIÓN: CÓDIGO DE RESERVA (CON FEEDBACK DE COPIADO) ← ← ← */}
            {cita.codigo_reserva && (
              <div 
                onClick={handleCopiarCodigo}
                className="group cursor-pointer hover:bg-indigo-50 rounded-lg p-2.5 transition-colors border border-transparent hover:border-indigo-200"
                title="Clic para copiar código"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                        Código de Reserva
                      </p>
                      <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5 group-hover:text-indigo-600 transition-colors truncate">
                        {cita.codigo_reserva}
                      </p>
                    </div>
                    
                    {/* ← ← ← FEEDBACK VISUAL: Cambia según el estado 'copiado' ← ← ← */}
                    {copiado ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-semibold animate-pulse">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        ¡Copiado!
                      </div>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Servicio */}
            <div
              onClick={() => handleCampoClick('servicio')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Servicio
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 group-hover:text-purple-600 transition-colors">
                    {cita.servicio_nombre || 'Sin asignar'}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Estilista */}
            <div
              onClick={() => handleCampoClick('profesional')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Estilista
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 group-hover:text-blue-600 transition-colors">
                    {cita.profesional_nombre || 'Sin asignar'}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Fecha */}
            <div
              onClick={() => handleCampoClick('fecha')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Fecha
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 capitalize group-hover:text-green-600 transition-colors">
                    {formatearFecha(cita.fecha)}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Hora */}
            <div
              onClick={() => handleCampoClick('hora')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Hora
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 group-hover:text-orange-600 transition-colors">
                    {cita.hora_inicio.substring(0, 5)} - {cita.hora_fin.substring(0, 5)}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Duración */}
            <div
              onClick={() => handleCampoClick('duracion')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Duración
                  </p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 group-hover:text-teal-600 transition-colors">
                    {calcularDuracion(cita.hora_inicio, cita.hora_fin)}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Valor */}
            <div
              onClick={() => handleCampoClick('precio')}
              className="group cursor-pointer hover:bg-gray-50 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Valor
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5 group-hover:text-emerald-700 transition-colors">
                    {formatearPrecio(cita.precio_total)}
                  </p>
                </div>
                <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sección: Estado (ESPACIADO REDUCIDO) */}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Estado
            </p>
            <div
              onClick={() => handleCampoClick('estado')}
              className={`group cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${getEstadoColor(cita.estado)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getEstadoBadge(cita.estado)}`}></div>
                  <span className="text-xs font-semibold text-gray-900 capitalize">
                    {cita.estado}
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sección: Notas del Estilista (ESPACIADO REDUCIDO) */}
          {cita.notas_cliente && (
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Notas del Estilista
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {cita.notas_cliente}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones (ESPACIADO REDUCIDO) */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
          <button
            onClick={(e) => {
              e.preventDefault();      // Evita comportamientos por defecto del navegador
              e.stopPropagation();     // Evita que el clic se propague a elementos padres
              console.log("🖱️ [BOTON] Click detectado en 'Eliminar Cita'");
              handleEliminarCita();
            }}
            className="w-full py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar Cita
          </button>
        </div>
      </div>

      {/* ← ← ← MODAL DE SELECCIÓN DE CLIENTES ← ← ← */}
      {showClientModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowClientModal(false)}>
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
                      <p className="text-xs text-gray-400">Registrar cliente nuevo para esta cita</p>
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
                  {clientesFiltrados.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No se encontraron clientes
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL PARA REGISTRAR NUEVO CLIENTE ← ← ← */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowRegisterModal(false)}>
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
                ✅ Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL DE SELECCIÓN DE SERVICIOS (SELECCIÓN ÚNICA) ← ← ← */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowServiceModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🛠️ Seleccionar Servicio</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-700 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar servicios..."
                  value={busquedaServicio}
                  onChange={(e) => setBusquedaServicio(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white text-sm placeholder-gray-500"
                />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white text-sm"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
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
                  {serviciosFiltrados.map((servicio: any) => {
                    const isSelected = cita.servicio === servicio.id;
                    const precio = typeof servicio.precio_min === 'string' ? parseInt(servicio.precio_min) : servicio.precio_min;
                    
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
                            <img
                              src={servicio.imagen_url}
                              alt={servicio.nombre}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">🛠️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">{servicio.nombre}</h4>
                            <p className="text-xs text-gray-400 mb-1">{servicio.categoria_nombre}</p>
                            <p className="text-xs font-semibold text-blue-400">
                              ${precio.toLocaleString()}
                            </p>
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

      {/* ← ← ← MODAL DE SELECCIÓN DE PROFESIONALES ← ← ← */}
      {showProfessionalModal && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => setShowProfessionalModal(false)}
          onSelect={handleProfessionalSelect}
          servicioId={cita.servicio || undefined}
          profesionalSeleccionadoId={cita.profesional || undefined}
        />
      )}

      {/* ← ← ← MODAL PARA CAMBIAR FECHA ← ← ← */}
      {showDateModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowDateModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">📅 Cambiar Fecha</h3>
              <button onClick={() => setShowDateModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Selecciona la nueva fecha para la cita
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-lg"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Fecha actual: {formatearFecha(cita.fecha)}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => setShowDateModal(false)} 
                disabled={loadingFecha}
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleFechaUpdate} 
                disabled={loadingFecha || !nuevaFecha}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingFecha ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  '✅ Guardar Fecha'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL PARA CAMBIAR HORA Y DURACIÓN ← ← ← */}
      {showHoraDuracionModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowHoraDuracionModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🕐 Cambiar Hora y Duración</h3>
              <button onClick={() => setShowHoraDuracionModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hora de Inicio
                </label>
                <input
                  type="time"
                  value={nuevaHoraInicio}
                  onChange={(e) => setNuevaHoraInicio(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-lg"
                  step="1800"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Hora actual: {cita.hora_inicio.substring(0, 5)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Duración
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {opcionesDuracion.map((opcion) => (
                    <button
                      key={opcion.valor}
                      onClick={() => setNuevaDuracion(opcion.valor)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        nuevaDuracion === opcion.valor
                          ? 'bg-blue-600 text-white border-2 border-blue-500'
                          : 'bg-gray-900 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Duración actual: {calcularDuracion(cita.hora_inicio, cita.hora_fin)}
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Hora de Fin:</span>
                  <span className="text-lg font-bold text-white">
                    {horaFinCalculada}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Horario:</span>
                  <span className="text-sm font-medium text-blue-400">
                    {nuevaHoraInicio} - {horaFinCalculada}
                  </span>
                </div>
              </div>

              {disponibilidad && (
                <div className={`rounded-lg p-3 border-2 ${
                  disponibilidad.disponible
                    ? 'bg-green-900/20 border-green-600'
                    : 'bg-red-900/20 border-red-600'
                }`}>
                  <div className="flex items-center gap-2">
                    {disponibilidad.disponible ? (
                      <>
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-400 font-medium">
                          {disponibilidad.mensaje}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-red-400 font-medium">
                          {disponibilidad.mensaje}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => setShowHoraDuracionModal(false)} 
                disabled={loadingHoraDuracion}
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleHoraDuracionUpdate}                 
                disabled={loadingHoraDuracion || !nuevaHoraInicio || (disponibilidad !== null && !disponibilidad.disponible)}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingHoraDuracion ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  '✅ Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← NUEVO: MODAL PARA CAMBIAR VALOR/PRECIO ← ← ← */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPriceModal(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">💰 Cambiar Valor</h3>
              <button onClick={() => setShowPriceModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nuevo valor de la cita
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-lg"
                    placeholder="0"
                    min="0"
                    step="1000"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Valor actual: {formatearPrecio(cita.precio_total)}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button 
                onClick={() => setShowPriceModal(false)} 
                disabled={loadingPrecio}
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePrecioUpdate} 
                disabled={loadingPrecio || !nuevoPrecio}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingPrecio ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  '✅ Guardar Valor'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper: Calcular duración
function calcularDuracion(horaInicio: string, horaFin: string): string {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  
  if (horas > 0 && mins > 0) {
    return `${horas}h ${mins}min`;
  } else if (horas > 0) {
    return `${horas}h`;
  } else {
    return `${mins}min`;
  }
}
// Helper: Calcular duración en minutos
function calcularDuracionEnMinutos(horaInicio: string, horaFin: string): number {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  return minutos > 0 ? minutos : 60; // Default 60 min si es negativo
}