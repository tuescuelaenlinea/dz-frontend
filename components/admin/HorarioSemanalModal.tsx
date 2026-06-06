'use client';
import { useState, useEffect } from 'react';

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  activo: boolean;
  foto_url?: string | null;
}

interface CitaSemana {
  id: number;
  codigo_reserva?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  profesional?: number | null;
  profesional_nombre?: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  precio_total: string;
}

interface DiaSemana {
  fecha: string;
  diaNombre: string;
  diaValor: string;
  esHoy: boolean;
  citas: CitaSemana[];
}

interface HorarioSemanalModalProps {
  isOpen: boolean;
  onClose: () => void;
  profesional: Profesional | null;
}

// ← ← ← CLAVE: Función para formatear fecha SIN desfase de timezone ← ← ←
const formatDateForAPI = (fecha: Date): string => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ← ← ← CLAVE: Rango de horas del día (8:00 AM a 10:00 PM) ← ← ←
// Ajusta según el horario de tu salón
const HORAS_DEL_DIA = Array.from({ length: 15 }, (_, i) => i + 8); 
// Genera: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

// ← ← ← Helper: Formatear hora para mostrar (8 → "08:00") ← ← ←
const formatearHora = (hora: number): string => {
  return `${hora.toString().padStart(2, '0')}:00`;
};

// ← ← ← Helper: Extraer la hora de una cita (formato "HH:MM:SS" → número) ← ← ←
const extraerHora = (horaInicio: string): number => {
  return parseInt(horaInicio.split(':')[0], 10);
};

export default function HorarioSemanalModal({ isOpen, onClose, profesional }: HorarioSemanalModalProps) {
  const [semanaActual, setSemanaActual] = useState<Date>(new Date());
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [cargandoSemana, setCargandoSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState<string | null>(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaSemana | null>(null);
  const [modalDetalleCitaOpen, setModalDetalleCitaOpen] = useState(false);

  useEffect(() => {
    if (profesional && isOpen) {
      setSemanaActual(new Date());
      cargarCitasSemana(profesional, new Date());
    }
  }, [profesional, isOpen]);

  const getInicioSemana = (fecha: Date): Date => {
    const d = new Date(fecha);
    const dia = d.getDay();
    const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleVerDetalleCita = (cita: CitaSemana) => {
    setCitaSeleccionada(cita);
    setModalDetalleCitaOpen(true);
  };

  const formatDateForDisplay = (fecha: Date): { diaNombre: string; diaNumero: string } => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return {
      diaNombre: dias[fecha.getDay()],
      diaNumero: fecha.getDate().toString(),
    };
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
      case 'confirmada': return 'bg-blue-100 text-blue-800 border-blue-400';
      case 'completada': return 'bg-green-100 text-green-800 border-green-400';
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-400';
      default: return 'bg-gray-100 text-gray-800 border-gray-400';
    }
  };

  const getDiasDeSemana = (fechaBase: Date): DiaSemana[] => {
    const inicio = getInicioSemana(fechaBase);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const dias: DiaSemana[] = [];
    const diasMap: Record<string, string> = {
      '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miercoles',
      '4': 'jueves', '5': 'viernes', '6': 'sabado'
    };
    
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      
      const { diaNombre, diaNumero } = formatDateForDisplay(dia);
      
      dias.push({
        fecha: formatDateForAPI(dia),
        diaNombre: `${diaNombre} ${diaNumero}`,
        diaValor: diasMap[dia.getDay().toString()],
        esHoy: dia.getTime() === hoy.getTime(),
        citas: [],
      });
    }
    
    return dias;
  };

  const irASemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaSemana = new Date(semanaActual);
    nuevaSemana.setDate(semanaActual.getDate() + (direccion === 'anterior' ? -7 : 7));
    setSemanaActual(nuevaSemana);
    if (profesional) {
      cargarCitasSemana(profesional, nuevaSemana);
    }
  };

  const irAHoy = () => {
    setSemanaActual(new Date());
    if (profesional) {
      cargarCitasSemana(profesional, new Date());
    }
  };

  const cargarCitasSemana = async (prof: Profesional, fechaSemana: Date) => {
    try {
      setCargandoSemana(true);
      setErrorSemana(null);
      
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const inicio = getInicioSemana(fechaSemana);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      
      const fechaInicio = formatDateForAPI(inicio);
      const fechaFin = formatDateForAPI(fin);
      
      const url = `${apiUrl}/citas/horario-semanal/?profesional=${prof.id}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      
      console.log('📡 [HorarioSemanal] URL:', url);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }
      
      const data = await res.json();
      const citasList: CitaSemana[] = Array.isArray(data) ? data : (data.results || []);
      
      console.log(`✅ Citas recibidas: ${citasList.length}`);
      console.log('📋 Estados:', [...new Set(citasList.map(c => c.estado))]);
      
      // Función para normalizar fecha a YYYY-MM-DD
      const normalizarFecha = (fechaInput: string | Date): string => {
        if (!fechaInput) return '';
        if (typeof fechaInput === 'string') {
          return fechaInput.split('T')[0].split(' ')[0];
        }
        const date = new Date(fechaInput);
        return formatDateForAPI(date);
      };
      
      // Filtrar citas usando fechas normalizadas
      const diasConCitas = getDiasDeSemana(fechaSemana).map(dia => {
        const citasDelDia = citasList.filter(cita => {
          const fechaCita = normalizarFecha(cita.fecha);
          return fechaCita === dia.fecha;
        });
        
        return {
          ...dia,
          citas: citasDelDia
        };
      });
      
      console.log('📊 Citas por día:', diasConCitas.map(d => ({
        fecha: d.fecha,
        dia: d.diaNombre,
        citas: d.citas.length
      })));
      
      setDiasSemana(diasConCitas);
      
    } catch (err: any) {
      console.error('❌ Error cargando citas:', err);
      setErrorSemana(err.message || 'Error al cargar citas');
      setDiasSemana(getDiasDeSemana(fechaSemana));
    } finally {
      setCargandoSemana(false);
    }
  };

  if (!isOpen || !profesional) return null;

  return (
    <>
      {/* ← ← ← MODAL PRINCIPAL ← ← ← */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full my-8">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold">📅 Agenda Semanal</h2>
              <p className="text-sm opacity-90">{profesional.nombre} - {profesional.especialidad}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Navegación de semanas */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={() => irASemana('anterior')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              ← Semana anterior
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-900">
                {getInicioSemana(semanaActual).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - 
                {new Date(getInicioSemana(semanaActual).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <button onClick={irAHoy} className="text-xs text-indigo-600 hover:underline mt-1">Ir a hoy</button>
            </div>
            <button
              onClick={() => irASemana('siguiente')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              Semana siguiente →
            </button>
          </div>
          
          {/* ← ← ← CONTENIDO: Grid de días con slots por hora ← ← ← */}
          <div className="p-4 max-h-[75vh] overflow-auto">
            {cargandoSemana ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                <span className="ml-3 text-gray-600">Cargando citas...</span>
              </div>
            ) : errorSemana ? (
              <div className="text-center py-8 text-red-600">❌ {errorSemana}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                {diasSemana.map((dia) => (
                  <div 
                    key={dia.fecha} 
                    className={`border rounded-xl overflow-hidden ${
                      dia.esHoy ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Header del día */}
                    <div className={`text-center py-2 border-b ${dia.esHoy ? 'border-indigo-200 bg-indigo-100' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`font-semibold text-sm ${dia.esHoy ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {dia.diaNombre}
                      </p>
                      {dia.esHoy && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Hoy</span>}
                      <p className="text-xs text-gray-500 mt-1">
                        {dia.citas.length} cita{dia.citas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {/* ← ← ← SLOTS POR HORA ← ← ← */}
                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                      {HORAS_DEL_DIA.map((hora) => {
                        // Filtrar citas que empiezan en esta hora
                        const citasDeEstaHora = dia.citas.filter(cita => 
                          extraerHora(cita.hora_inicio) === hora
                        );
                        
                        return (
                          <div 
                            key={`${dia.fecha}-${hora}`}
                            className="flex min-h-[60px]"
                          >
                            {/* ← ← ← COLUMNA IZQUIERDA: Etiqueta de hora ← ← ← */}
                            <div className="w-12 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex items-start justify-center pt-1">
                              <span className="text-[10px] font-mono font-bold text-gray-500">
                                {formatearHora(hora)}
                              </span>
                            </div>
                            
                            {/* ← ← ← COLUMNA DERECHA: Citas de esta hora ← ← ← */}
                            <div className="flex-1 p-1 space-y-1">
                              {citasDeEstaHora.length === 0 ? (
                                // Slot vacío
                                <div className="h-10 flex items-center justify-center">
                                  <span className="text-[9px] text-gray-300 italic">libre</span>
                                </div>
                              ) : (
                                // Mostrar todas las citas de esta hora
                                citasDeEstaHora.map((cita) => (
                                  <div 
                                    key={cita.id}
                                    onClick={() => handleVerDetalleCita(cita)}
                                    className={`p-1.5 rounded border-l-4 cursor-pointer hover:shadow-md transition-all ${getEstadoBadgeClass(cita.estado)}`}
                                    title={`${cita.cliente_nombre} - ${cita.servicio_nombre}`}
                                  >
                                    <p className="font-semibold truncate text-[10px]">
                                      {cita.cliente_nombre}
                                    </p>
                                    <p className="truncate text-gray-600 text-[9px]">
                                      {cita.servicio_nombre}
                                    </p>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <p className="text-[9px] opacity-75 font-mono">
                                        {cita.hora_inicio.substring(0, 5)} - {cita.hora_fin.substring(0, 5)}
                                      </p>
                                      {cita.codigo_reserva && (
                                        <span className="text-[8px] text-gray-500 font-mono truncate max-w-[50px]">
                                          {cita.codigo_reserva}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-400 rounded"></span> Pendiente
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-400 rounded"></span> Confirmada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-400 rounded"></span> Completada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-400 rounded"></span> Cancelada
              </span>
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ← ← ← MODAL DE DETALLE DE CITA ← ← ← */}
      {modalDetalleCitaOpen && citaSeleccionada && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-blue-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">📋 Detalle de Cita</h3>
              <button
                onClick={() => setModalDetalleCitaOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {citaSeleccionada.codigo_reserva && (
                <div>
                  <p className="text-xs text-gray-400">Código de Reserva</p>
                  <p className="text-sm font-bold text-blue-400">{citaSeleccionada.codigo_reserva}</p>
                </div>
              )}
              
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-sm text-white">{citaSeleccionada.cliente_nombre}</p>
                <p className="text-xs text-gray-400">{citaSeleccionada.cliente_telefono}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Servicio</p>
                <p className="text-sm text-white">{citaSeleccionada.servicio_nombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Fecha</p>
                  <p className="text-sm text-white">{citaSeleccionada.fecha}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Hora</p>
                  <p className="text-sm text-white">{citaSeleccionada.hora_inicio.substring(0,5)} - {citaSeleccionada.hora_fin.substring(0,5)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400">Precio</p>
                <p className="text-lg font-bold text-green-400">
                  ${parseInt(citaSeleccionada.precio_total).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Estado</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  citaSeleccionada.estado === 'pendiente' ? 'bg-yellow-600 text-white' :
                  citaSeleccionada.estado === 'confirmada' ? 'bg-blue-600 text-white' :
                  citaSeleccionada.estado === 'completada' ? 'bg-green-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {citaSeleccionada.estado}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button
                onClick={() => setModalDetalleCitaOpen(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}