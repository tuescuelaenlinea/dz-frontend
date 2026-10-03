// components/admin/agenda/ModalCrearCitaRapida.tsx
'use client';

import { useState, useEffect } from 'react';
import { ModalCrearCitaData, Cita } from './types';
import { generarCodigoReservaFrontend } from './utils';

interface ModalCrearCitaRapidaProps {
  data: ModalCrearCitaData;
  onClose: () => void;
  onCitaCreada: (cita: Cita) => void;
  apiUrl: string;
  token: string | null;
}

// Helper para calcular hora_fin basado en hora_inicio + duración
const calcularHoraFin = (horaInicio: string, duracionMinutos: number = 30): string => {
  const [hora, minutos] = horaInicio.split(':').map(Number);
  const fechaInicio = new Date();
  fechaInicio.setHours(hora, minutos, 0, 0);
  
  const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
  
  const horaFin = fechaFin.getHours().toString().padStart(2, '0');
  const minutosFin = fechaFin.getMinutes().toString().padStart(2, '0');
  
  return `${horaFin}:${minutosFin}`;
};

export default function ModalCrearCitaRapida({
  data,
  onClose,
  onCitaCreada,
  apiUrl,
  token
}: ModalCrearCitaRapidaProps) {
  const [creando, setCreando] = useState(false);
  const [servicios, setServicios] = useState<any[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<number | null>(null);
  const [precio, setPrecio] = useState<number>(1000);
  const [horaFin, setHoraFin] = useState<string>('');

  // Cargar servicios del profesional al abrir el modal
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const res = await fetch(
          `${apiUrl}/servicios-profesionales/?profesional=${data.profesionalId}&activo=true`,
          {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }
        );
        if (res.ok) {
          const dataRes = await res.json();
          const lista = Array.isArray(dataRes) ? dataRes : (dataRes.results || []);
          setServicios(lista);
          
          // Pre-seleccionar el primer servicio disponible
          if (lista.length > 0) {
            const primerServicio = lista[0];
            const idServicio = primerServicio.servicio || primerServicio.id;
            setServicioSeleccionado(idServicio);
            
            // Usar precio especial si existe, sino el precio base del servicio
            const precioBase = primerServicio.precio_especial || primerServicio.servicio?.precio_min || 1000;
            setPrecio(parseFloat(precioBase));
            
            // Calcular hora_fin basada en la duración del servicio
            const duracion = primerServicio.servicio?.duracion || '30 minutos';
            const duracionMinutos = extraerMinutosDeDuracion(duracion);
            setHoraFin(calcularHoraFin(data.hora, duracionMinutos));
          }
        }
      } catch (err) {
        console.error('Error cargando servicios:', err);
      }
    };
    
    fetchServicios();
  }, [data.profesionalId, data.hora, apiUrl, token]);

  // Helper para extraer minutos de la duración (ej: "60 minutos" → 60)
  const extraerMinutosDeDuracion = (duracion: string): number => {
    const match = duracion.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30;
  };

  // Actualizar hora_fin cuando cambia el servicio seleccionado
  useEffect(() => {
    if (servicioSeleccionado && servicios.length > 0) {
      const servicio = servicios.find(s => s.servicio === servicioSeleccionado || s.id === servicioSeleccionado);
      if (servicio) {
        const duracion = servicio.servicio?.duracion || '30 minutos';
        const duracionMinutos = extraerMinutosDeDuracion(duracion);
        setHoraFin(calcularHoraFin(data.hora, duracionMinutos));
      }
    }
  }, [servicioSeleccionado, servicios, data.hora]);

  const handleCrear = async () => {
    if (!servicioSeleccionado) {
      alert('⚠️ Debes seleccionar un servicio (requerido por el sistema)');
      return;
    }

    if (precio <= 0) {
      alert('⚠️ El precio debe ser mayor a 0');
      return;
    }

    if (!horaFin) {
      alert('⚠️ La hora de finalización es requerida');
      return;
    }

    try {
      setCreando(true);
      // ← ← ← CLAVE: Generar código ADM- si el profesionalId es 0 (Sin Asignar) o ADM- normal
      const esSinAsignar = data.profesionalId === 0;
      const codigoReserva = generarCodigoReservaFrontend('ADM'); 

      const payload = {
        codigo_reserva: codigoReserva,
        profesional: data.profesionalId,
        fecha: data.fecha,
        hora_inicio: data.hora,
        hora_fin: horaFin,  // ← ← ← NUEVO: Agregar hora_fin
        // Campos mínimos requeridos por el modelo Cita en Django
        cliente_nombre: 'Por definir',
        cliente_telefono: '0000000000',
        cliente_email: 'pendiente@dzsalon.com',
        servicio: servicioSeleccionado,
        precio_total: precio,
        estado: 'pendiente',
        metodo_pago: 'pendiente'
      };

      const res = await fetch(`${apiUrl}/citas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const nuevaCita = await res.json(); // ← ← ← OBTENER LA CITA CREADA DEL BACKEND
        onCitaCreada(nuevaCita); 
      } else {
        const error = await res.json();
        console.error('❌ Error creando cita:', error);
        
        // Mostrar detalles específicos de validación si existen
        const mensajesError = error.detalles 
          ? Object.entries(error.detalles).map(([campo, errs]: any) => `${campo}: ${Array.isArray(errs) ? errs.join(', ') : errs}`).join('\n')
          : error.detail || 'Error desconocido';
          
        alert(`❌ Error al crear la cita:\n\n${mensajesError}`);
      }
    } catch (err) {
      console.error('Error de red:', err);
      alert('❌ Error de conexión al crear la cita');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Crear Cita Rápida</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span className="text-sm text-gray-400">Fecha:</span>
              <span className="text-white font-medium">{data.fecha}</span>
            </div>
            <div className="flex items-center gap-2">
              <span></span>
              <span className="text-sm text-gray-400">Hora Inicio:</span>
              <span className="text-white font-medium">{data.hora}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👨‍⚕️</span>
              <span className="text-sm text-gray-400">Profesional ID:</span>
              <span className="text-white font-medium">{data.profesionalId}</span>
            </div>
          </div>

          {/* Selector de Servicio (Requerido por la BD) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Servicio <span className="text-red-400">*</span>
              <span className="text-xs text-gray-500 ml-1">(Requerido por el sistema)</span>
            </label>
            <select
              value={servicioSeleccionado || ''}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setServicioSeleccionado(id);
                const serv = servicios.find(s => s.servicio === id || s.id === id);
                if (serv) {
                  const precioBase = serv.precio_especial || serv.servicio?.precio_min || 1000;
                  setPrecio(parseFloat(precioBase));
                }
              }}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map((s: any) => (
                <option key={s.servicio || s.id} value={s.servicio || s.id}>
                  {s.servicio_nombre || s.nombre} - ${s.precio_especial || s.servicio?.precio_min || 0}
                </option>
              ))}
            </select>
          </div>

          {/* ← ← ← NUEVO: Campo de Hora Fin ← ← ← */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hora Finalización <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Calculada automáticamente según la duración del servicio
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Precio Inicial
            </label>
            <input
              type="number"
              min="1"
              value={precio}
              onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              💡 <strong>Nota:</strong> El sistema requiere un servicio, precio y hora de finalización para crear la cita. 
              Podrás cambiar todos los datos <strong>inmediatamente después</strong> desde el panel lateral de detalles.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={creando}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={creando || !servicioSeleccionado || !horaFin}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creando ? 'Creando...' : '✅ Crear Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}