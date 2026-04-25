// /components/booking/DateTimePicker.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface HorarioOcupado {
  hora_inicio: string;
  hora_fin: string;
  cita_id: number;
  servicio: string;
}

interface DateTimePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  selectedTime: string | null;
  onTimeChange: (time: string | null) => void;
  servicioId: number | null;
  profesionalId: number | null;
  mode: 'salon' | 'domicilio';
  onAvailabilityError?: (message: string) => void;
}

// ← FUNCIÓN SIMPLIFICADA: Formatear Date a YYYY-MM-DD en zona local
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ← FUNCIÓN SIMPLIFICADA: Parsear YYYY-MM-DD a Date (mediodía para evitar DST)
const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // ← Usar 12:00 (mediodía) para evitar problemas con timezone/DST
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export default function DateTimePicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  servicioId,
  profesionalId,
  mode,
  onAvailabilityError,
}: DateTimePickerProps) {
  const [allDaySlots, setAllDaySlots] = useState<string[]>([]);
  const [occupiedTimes, setOccupiedTimes] = useState<HorarioOcupado[]>([]);
  const [loading, setLoading] = useState(false);
  const [minDate, setMinDate] = useState<string>('');
  const [showOccupiedMessage, setShowOccupiedMessage] = useState<string | null>(null);

  const generateAllDaySlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Establecer fecha mínima (hoy + 1 día) - EN ZONA HORARIA LOCAL
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // ← Usar formateo local simplificado
    setMinDate(formatDateLocal(tomorrow));
    setAllDaySlots(generateAllDaySlots());
  }, []);

  // Cargar horarios ocupados cuando cambia la fecha
  useEffect(() => {
    // ← Validación temprana
    if (!selectedDate || !profesionalId) {
      setOccupiedTimes([]);
      setAllDaySlots([]);
      return;
    }

    // ← CORREGIDO: Obtener fecha como string LOCAL directamente del Date
    // Sin pasar por toISOString() que convierte a UTC
    const fechaStr = formatDateLocal(selectedDate);
    const profesionalIdToUse = profesionalId;

    async function loadAvailability() {
      setLoading(true);
      
      try {
        // ← Enviar string YYYY-MM-DD directamente al backend
        // El backend debe interpretar esto como fecha LOCAL, no UTC
        const data = await api.getDisponibilidadProfesional(profesionalIdToUse, fechaStr);
        
        if (data.no_trabaja) {
          setAllDaySlots([]);
          setOccupiedTimes([]);
          if (onAvailabilityError) {
            onAvailabilityError(data.mensaje || 'El profesional no trabaja este día');
          }
          return;
        }
        
        if (data.horario_laboral) {
          const [inicioHour] = data.horario_laboral.inicio.split(':').map(Number);
          const [finHour] = data.horario_laboral.fin.split(':').map(Number);
          
          const slots: string[] = [];
          for (let h = inicioHour; h < finHour; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`);
          }
          setAllDaySlots(slots);
        }
        
        setOccupiedTimes(data.horarios_ocupados || []);
        
      } catch (err: any) {
        console.error('❌ Error cargando disponibilidad:', err);
        setAllDaySlots([]);
        setOccupiedTimes([]);
        if (onAvailabilityError) {
          onAvailabilityError('Error cargando horarios disponibles');
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadAvailability();
  }, [selectedDate, profesionalId, onAvailabilityError]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ← CORREGIDO: Parsear fecha con mediodía para evitar problemas de timezone
    const dateString = e.target.value;  // "YYYY-MM-DD" del input
    const date = dateString ? parseDateLocal(dateString) : null;
    
    onDateChange(date);
    onTimeChange(null);
    setShowOccupiedMessage(null);
  };

  const isTimeOccupied = (time: string): boolean => {
    return occupiedTimes.some(occ => occ.hora_inicio === time);
  };

  const getOccupiedInfo = (time: string): HorarioOcupado | null => {
    return occupiedTimes.find(occ => occ.hora_inicio === time) || null;
  };

  const handleTimeClick = (time: string) => {
    if (isTimeOccupied(time)) {
      const info = getOccupiedInfo(time);
      setShowOccupiedMessage(
        `⚠️ Horario ocupado: ${info?.servicio || 'Otra cita'} (${time} - ${info?.hora_fin || 'N/A'})`
      );
      setTimeout(() => setShowOccupiedMessage(null), 3000);
      return;
    }
    
    onTimeChange(time);
    setShowOccupiedMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Campo de Fecha */}
      <div 
        className="space-y-2 cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'INPUT') {
            const input = (e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement);
            if (input) input.showPicker?.();
          }
        }}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Selecciona una fecha</span>
          </span>
        </label>
        
        <input
          type="date"
          // ← CORREGIDO: Usar formateo local simplificado
          value={selectedDate ? formatDateLocal(selectedDate) : ''}
          onChange={handleDateChange}
          min={minDate}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        />
      </div>

      {/* Campo de Hora */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Horarios disponibles</span>
            </span>
          </label>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {showOccupiedMessage && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                  <p className="text-sm text-red-800 font-medium">{showOccupiedMessage}</p>
                </div>
              )}
              
              <div className="flex gap-4 text-xs mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span className="text-gray-600">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded cursor-not-allowed"></div>
                  <span className="text-gray-600">Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Seleccionado</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allDaySlots.map((time) => {
                  const isOccupied = isTimeOccupied(time);
                  const isSelected = selectedTime === time;
                  const occupiedInfo = getOccupiedInfo(time);
                  
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleTimeClick(time)}
                      disabled={isOccupied}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all relative ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                          : isOccupied
                            ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-300 line-through'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 hover:shadow-sm'
                      }`}
                      title={isOccupied 
                        ? `Ocupado: ${occupiedInfo?.servicio || 'Otra cita'} (${occupiedInfo?.hora_inicio}-${occupiedInfo?.hora_fin})`
                        : time
                      }
                    >
                      {time}
                      {isOccupied && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full -mt-1 -mr-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {occupiedTimes.length > 0 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  💡 {occupiedTimes.length} horario(s) ocupado(s) - Selecciona un horario disponible
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}