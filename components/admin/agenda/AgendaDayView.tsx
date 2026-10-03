// components/admin/agenda/AgendaDayView.tsx
'use client';

import { useMemo, useState } from 'react';
import { Cita, ProfesionalConHorario, ModalCrearCitaData } from './types';

interface AgendaDayViewProps {
  profesionales: ProfesionalConHorario[];
  citas: Cita[];
  onCitaClick: (cita: Cita) => void;
  onSlotClick: (data: ModalCrearCitaData) => void;
  fechaActual: string;
}

// Configuración del grid
const HORA_INICIO = 8; // 8:00 AM
const HORA_FIN = 20; // 8:00 PM
const SLOT_MINUTOS = 30;
const ALTURA_FILA = 50; // px por cada slot de 30 min

// Generar slots de 30 minutos
const generarSlots = () => {
  const slots = [];
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTOS) {
      const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hora12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label = `${hora12}:${m.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ hora, label });
    }
  }
  return slots;
};

const SLOTS = generarSlots();
const TOTAL_FILAS = SLOTS.length;
const ALTURA_TOTAL = TOTAL_FILAS * ALTURA_FILA;

// ← ← ← NUEVO: Helper para corregir URLs de imágenes ← ← ←
const getCorrectImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
  const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
  
  if (url.startsWith(PRODUCTION_DOMAIN)) return url;
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
      .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
      .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
      .replace('http://127.0.0.1:8080', LOCAL_DOMAIN)
      .replace('http://localhost:8080', LOCAL_DOMAIN);
  }
  
  if (url.startsWith('/media/')) {
    const isProd = process.env.NODE_ENV === 'production';
    const baseUrl = isProd ? PRODUCTION_DOMAIN : LOCAL_DOMAIN;
    return `${baseUrl}${url}`;
  }
  
  return null;
};

// ← ← ← NUEVO: Fallback SVG para cuando la imagen falla o no existe ← ← ←
const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M20 21a8 8 0 10-16 0"%3E%3C/path%3E%3C/svg%3E';

// Helper: Calcular posición Y basada en hora
const calcularPosY = (horaInicio: string): number => {
  const [h, m] = horaInicio.split(':').map(Number);
  const minutosDesdeInicio = (h - HORA_INICIO) * 60 + m;
  const fila = Math.floor(minutosDesdeInicio / SLOT_MINUTOS);
  return fila * ALTURA_FILA;
};

// Helper: Calcular altura basada en duración
const calcularAltura = (horaInicio: string, horaFin: string): number => {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  const minutosInicio = (h1 - HORA_INICIO) * 60 + m1;
  const minutosFin = (h2 - HORA_INICIO) * 60 + m2;
  const duracion = minutosFin - minutosInicio;
  const filas = Math.max(1, Math.ceil(duracion / SLOT_MINUTOS));
  return filas * ALTURA_FILA;
};

// ← ← ← NUEVO: Helper para identificar el origen de la cita por su código ← ← ←
const obtenerOrigenCita = (codigo_reserva: string | undefined) => {
  if (!codigo_reserva) {
    return { tipo: 'desconocido', icono: '📌', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Sistema' };
  }

  const codigo = codigo_reserva.toUpperCase();

  if (codigo.startsWith('DZ-')) {
    return { tipo: 'web', icono: '🌐', color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Web' };
  }
  if (codigo.startsWith('RC-')) {
    return { tipo: 'caja', icono: '🏪', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', label: 'Caja' };
  }
  if (codigo.startsWith('ADM-')) {
    return { tipo: 'admin', icono: '👨‍💻', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', label: 'Admin' };
  }
  if (codigo.startsWith('PRO-')) {
    return { tipo: 'profesional', icono: '👨‍⚕️', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', label: 'Prof' };
  }

  // Fallback para códigos legacy o sin formato conocido
  return { tipo: 'desconocido', icono: '📌', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Sistema' };
};


// Colores por estado
const getEstadoColor = (estado: string, esSuperpuesta: boolean = false) => {
  // ← ← ← SI ES SUPERPUESTA, USAR ESTILO PÚRPURA DISTINTIVO ← ← ←
  if (esSuperpuesta) {
    return 'bg-purple-900/40 border-purple-400 text-purple-100 ring-1 ring-purple-400/50';
  }
  
  switch (estado) {
    case 'pendiente': return 'bg-yellow-500/20 border-yellow-500 text-yellow-100';
    case 'confirmada': return 'bg-blue-500/20 border-blue-500 text-blue-100';
    case 'completada': return 'bg-green-500/20 border-green-500 text-green-100';
    case 'cancelada': return 'bg-red-500/20 border-red-500 text-red-100 opacity-50';
    default: return 'bg-gray-500/20 border-gray-500 text-gray-100';
  }
};

// ← ← ← NUEVO: Profesional ficticio para citas sin asignar ← ← ←
const PROFESIONAL_SIN_ASIGNAR: ProfesionalConHorario = {
  id: 0,
  nombre: 'Sin Asignar',
  especialidad: 'Pendiente',
  activo: true,
  orden: -1,
  trabaja_hoy: true,
  horarios_dia: [],
  foto_url: null
};

// ← ← ← NUEVO: Helpers para detectar superposiciones ← ← ←
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const haySuperposicion = (cita1: Cita, cita2: Cita): boolean => {
  const inicio1 = timeToMinutes(cita1.hora_inicio);
  const fin1 = timeToMinutes(cita1.hora_fin);
  const inicio2 = timeToMinutes(cita2.hora_inicio);
  const fin2 = timeToMinutes(cita2.hora_fin);
  
  // Dos rangos se superponen si el inicio de uno es menor que el fin del otro, y viceversa
  return inicio1 < fin2 && inicio2 < fin1;
};

const obtenerGrupoSuperpuesto = (cita: Cita, citasDelProf: Cita[]): Cita[] => {
  return citasDelProf.filter(c => haySuperposicion(cita, c));
};

// ← ← ← NUEVO: Componente Modal para Citas Superpuestas ← ← ←
const ModalCitasSuperpuestas = ({ 
  citas, 
  onClose, 
  onCitaSelect 
}: { 
  citas: Cita[]; 
  onClose: () => void; 
  onCitaSelect: (cita: Cita) => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border-2 border-purple-500 overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-purple-900/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="text-lg font-bold text-white">Citas Superpuestas</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-400 mb-2">
            Se encontraron {citas.length} citas que se solapan en este horario. Selecciona una para ver sus detalles:
          </p>
          
          {citas.map((cita) => (
            <button
              key={cita.id}
              onClick={() => {
                onCitaSelect(cita);
                onClose();
              }}
              className="w-full text-left p-3 rounded-lg border border-gray-600 bg-gray-900 hover:bg-purple-900/30 hover:border-purple-500 transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white group-hover:text-purple-300">
                  {cita.cliente_nombre}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  cita.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-300' :
                  cita.estado === 'confirmada' ? 'bg-blue-500/20 text-blue-300' :
                  cita.estado === 'completada' ? 'bg-green-500/20 text-green-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {cita.estado}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-1">{cita.servicio_nombre}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {cita.hora_inicio.substring(0, 5)} - {cita.hora_fin.substring(0, 5)}
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <button 
            onClick={onClose}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AgendaDayView({
  profesionales,
  citas,
  onCitaClick,
  onSlotClick,
  fechaActual
}: AgendaDayViewProps) {
  
  // ← ← ← NUEVO: Estado para el modal de superposiciones ← ← ←
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [citasSuperpuestas, setCitasSuperpuestas] = useState<Cita[]>([]);

  const profesionalesActivos = useMemo(() => {
    const profs = profesionales.filter(p => p.trabaja_hoy);
    return [PROFESIONAL_SIN_ASIGNAR, ...profs];
  }, [profesionales]);

  const citasPorProfesional = useMemo(() => {
    const agrupadas: Record<number, Cita[]> = {};
    citas.forEach(cita => {
      const profId = cita.profesional || 0;
      if (!agrupadas[profId]) {
        agrupadas[profId] = [];
      }
      agrupadas[profId].push(cita);
    });
    
    // Ordenar citas por hora de inicio para mejor renderizado
    Object.keys(agrupadas).forEach(key => {
      agrupadas[Number(key)].sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio));
    });
    
    return agrupadas;
  }, [citas]);

  const handleSlotClick = (profesionalId: number, hora: string) => {
    onSlotClick({
      fecha: fechaActual,
      hora,
      profesionalId
    });
  };

  // ← ← ← NUEVO: Manejador de clic en cita con detección de superposición ← ← ←
  const handleCitaClick = (cita: Cita, citasDelProf: Cita[]) => {
    const grupoSuperpuesto = obtenerGrupoSuperpuesto(cita, citasDelProf);
    
    // Si hay más de 1 cita en el grupo, significa que hay superposición
    if (grupoSuperpuesto.length > 1) {
      setCitasSuperpuestas(grupoSuperpuesto);
      setShowOverlapModal(true);
    } else {
      // Comportamiento normal: abrir panel lateral
      onCitaClick(cita);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[800px]">
        
        {/* ========== HEADER CON NOMBRES DE PROFESIONALES ========== */}
        <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700">
          <div className="flex">
            {/* Columna de hora (esquina superior izquierda) */}
            <div className="w-[60px] flex-shrink-0 p-2 border-r border-gray-700 bg-gray-900">
              <span className="text-[10px] md:text-xs font-semibold text-gray-400">Hora</span>
            </div>
            
            {/* Columnas de profesionales (incluye "Sin Asignar") */}
            {profesionalesActivos.map((prof) => {
              const esSinAsignar = prof.id === 0;
              
              return (
                <div
                  key={prof.id}
                  className={`flex-1 min-w-[120px] p-1 md:p-2 border-r border-gray-700 text-center ${
                    esSinAsignar ? 'bg-gray-800/50' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                    {prof.foto_url ? (
                      <img
                        src={getCorrectImageUrl(prof.foto_url) || FALLBACK_IMAGE}
                        alt={prof.nombre}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        esSinAsignar 
                          ? 'bg-orange-900/30 border-orange-600' 
                          : 'bg-gray-700 border-gray-600'
                      }`}>
                        <span className={`text-base md:text-lg ${esSinAsignar ? 'text-orange-400' : 'text-gray-400'}`}>
                          {esSinAsignar ? '❓' : '👤'}
                        </span>
                      </div>
                    )}
                    
                    <div className="min-w-0 w-full">
                      <p className={`text-[10px] md:text-xs font-semibold leading-tight break-words ${
                        esSinAsignar ? 'text-orange-400' : 'text-white'
                      }`}>
                        {prof.nombre}
                      </p>
                      <p 
                        className="text-[9px] md:text-[10px] text-gray-400 truncate"
                        title={prof.especialidad}
                      >
                        {prof.especialidad}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== BODY CON SCROLL ========== */}
        <div className="flex relative" style={{ height: `${ALTURA_TOTAL}px` }}>
          
          {/* ========== COLUMNA DE HORAS (FIJA) ========== */}
          <div className="w-[60px] flex-shrink-0 border-r border-gray-700 bg-gray-900/50 relative">
            {SLOTS.map((slot) => (
              <div
                key={slot.hora}
                className="absolute left-0 right-0 border-b border-gray-700 flex items-start justify-end pr-1 md:pr-2"
                style={{ 
                  top: `${calcularPosY(slot.hora)}px`,
                  height: `${ALTURA_FILA}px`
                }}
              >
                <span className="text-[9px] md:text-[10px] font-mono text-gray-400 leading-none whitespace-nowrap">
                  {slot.label}
                </span>
              </div>
            ))}
          </div>

          {/* ========== COLUMNAS DE PROFESIONALES ========== */}
          {profesionalesActivos.map((prof) => {
            const citasDelProf = citasPorProfesional[prof.id] || [];
            const esSinAsignar = prof.id === 0;
            
            return (
              <div
                key={prof.id}
                className={`flex-1 min-w-[120px] border-r border-gray-700 relative ${
                  esSinAsignar ? 'bg-gray-800/20' : ''
                }`}
              >
                {/* Líneas horizontales de cada slot (clickables) */}
                {SLOTS.map((slot) => (
                  <div
                    key={`${prof.id}-${slot.hora}`}
                    onClick={() => handleSlotClick(prof.id, slot.hora)}
                    className={`absolute left-0 right-0 border-b border-gray-700 cursor-pointer transition-colors ${
                      esSinAsignar 
                        ? 'hover:bg-orange-900/20' 
                        : 'hover:bg-blue-900/20'
                    }`}
                    style={{ 
                      top: `${calcularPosY(slot.hora)}px`,
                      height: `${ALTURA_FILA}px`
                    }}
                  >
                    <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <svg className={`w-4 h-4 md:w-5 md:h-5 ${esSinAsignar ? 'text-orange-400' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                ))}

                {/* Citas posicionadas absolutamente */}
                {citasDelProf.map((cita) => {
                  const top = calcularPosY(cita.hora_inicio);
                  const height = calcularAltura(cita.hora_inicio, cita.hora_fin);
                  
                  const grupoSuperpuesto = obtenerGrupoSuperpuesto(cita, citasDelProf);
                  const esSuperpuesta = grupoSuperpuesto.length > 1;
                  
                  // ← ← ← NUEVO: Obtener datos del origen ← ← ←
                  const origen = obtenerOrigenCita(cita.codigo_reserva);
                  
                  return (
                    <div
                      key={cita.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCitaClick(cita, citasDelProf);
                      }}
                      className={`absolute left-1 right-1 rounded-md border-l-4 p-1 md:p-1.5 cursor-pointer hover:shadow-lg transition-all overflow-hidden z-10 ${getEstadoColor(cita.estado, esSuperpuesta)}`}
                      style={{ 
                        top: `${top}px`,
                        height: `${height}px`
                      }}
                      title={`${cita.cliente_nombre} - ${cita.servicio_nombre} (${cita.hora_inicio.substring(0,5)} - ${cita.hora_fin.substring(0,5)})${esSuperpuesta ? ' ⚠️ SUPERPUESTA' : ''}`}
                    >
                      {/* ← ← ← NUEVO: BADGE DE ORIGEN (Esquina Superior Izquierda) ← ← ← */}
                      <div className={`absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border backdrop-blur-sm ${origen.color}`}>
                        <span>{origen.icono}</span>
                        <span>{origen.label}</span>
                      </div>

                      {/* ← ← ← EXISTENTE: BADGE DE SUPERPOSICIÓN (Esquina Superior Derecha) ← ← ← */}
                      {esSuperpuesta && (
                        <div className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                          <span>⚠️</span>
                          <span>{grupoSuperpuesto.length}</span>
                        </div>
                      )}
                      
                      <p className="font-semibold text-[10px] md:text-xs leading-tight break-words pr-6 mt-4 md:mt-5">
                        {cita.cliente_nombre}
                      </p>
                      <p className="text-[9px] md:text-[10px] leading-tight break-words opacity-90">
                        {cita.servicio_nombre}
                      </p>
                      
                      {height < 40 && (
                        <div className="absolute bottom-1 right-1 text-[8px] opacity-75">
                          {cita.hora_inicio.substring(0,5)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ← ← ← MODAL DE CITAS SUPERPUESTAS ← ← ← */}
      {showOverlapModal && citasSuperpuestas.length > 0 && (
        <ModalCitasSuperpuestas
          citas={citasSuperpuestas}
          onClose={() => {
            setShowOverlapModal(false);
            setCitasSuperpuestas([]);
          }}
          onCitaSelect={onCitaClick}
        />
      )}
    </div>
  );
}