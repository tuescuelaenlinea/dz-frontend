'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

interface HorarioOcupado {
  hora_inicio: string;
  hora_fin: string;
  cita_id: number;
  servicio: string;
}

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

  // Generar todos los horarios del día (9 AM - 7 PM)
  const generateAllDaySlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Establecer fecha mínima (hoy + 1 día)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDate(tomorrow.toISOString().split('T')[0]);
    
    // Generar todos los slots al inicio
    setAllDaySlots(generateAllDaySlots());
  }, []);

  // Cargar horarios ocupados cuando cambia la fecha
  useEffect(() => {
    console.log('🔍 DateTimePicker - selectedDate:', selectedDate);
    console.log('🔍 DateTimePicker - profesionalId:', profesionalId);
    
    // ← VALIDACIÓN TEMPRANA: Salir si faltan datos requeridos
    if (!selectedDate || !profesionalId) {
      console.log('⚠️ No hay fecha o profesional seleccionado');
      setOccupiedTimes([]);
      setAllDaySlots([]);
      return;
    }

    // ← GUARDAR EN VARIABLES LOCALES PARA QUE TYPESCRIPT INFIERA LOS TIPOS
    const dateToUse: Date = selectedDate;
    const profesionalIdToUse: number = profesionalId;

    async function loadAvailability() {
      setLoading(true);
      console.log('🔄 Cargando disponibilidad...');
      
      try {
        // ← AHORA dateToUse es definitivamente Date (no null)
        const fechaStr: string = dateToUse.toISOString().split('T')[0];

        console.log('📅 Fecha:', fechaStr, '| Profesional ID:', profesionalIdToUse);
        
        // ← LLAMADA AL ENDPOINT CON VARIABLES VALIDADAS
        // profesionalIdToUse es definitivamente number, fechaStr es string
        const data = await api.getDisponibilidadProfesional(profesionalIdToUse, fechaStr);
        console.log('📦 Respuesta del API:', data);
        
        // Si no trabaja ese día
        if (data.no_trabaja) {
          console.log('⚠️ El profesional no trabaja este día');
          setAllDaySlots([]);
          setOccupiedTimes([]);
          if (onAvailabilityError) {
            onAvailabilityError(data.mensaje || 'El profesional no trabaja este día');
          }
          return;
        }
        
        // Generar horarios basados en SU jornada laboral
        if (data.horario_laboral) {
          console.log('⏰ Horario laboral:', data.horario_laboral);
          const [inicioHour] = data.horario_laboral.inicio.split(':').map(Number);
          const [finHour] = data.horario_laboral.fin.split(':').map(Number);
          
          console.log(`🕐 Generando slots de ${inicioHour}:00 a ${finHour}:00`);
          
          const slots: string[] = [];
          for (let h = inicioHour; h < finHour; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`);
          }
          console.log('✅ Slots generados:', slots);
          setAllDaySlots(slots);
        } else {
          console.error('❌ No hay horario_laboral en la respuesta');
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
  }, [selectedDate, profesionalId, onAvailabilityError]);  // ← Agregar onAvailabilityError a dependencias

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onDateChange(date);
    onTimeChange(null);
    setShowOccupiedMessage(null);
  };

  // Verificar si un horario está ocupado
  const isTimeOccupied = (time: string): boolean => {
    return occupiedTimes.some(occ => occ.hora_inicio === time);
  };

  // Obtener info del horario ocupado
  const getOccupiedInfo = (time: string): HorarioOcupado | null => {
    return occupiedTimes.find(occ => occ.hora_inicio === time) || null;
  };

  // Manejar clic en horario
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
          value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
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
              {/* Mensaje de horario ocupado */}
              {showOccupiedMessage && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                  <p className="text-sm text-red-800 font-medium">
                    {showOccupiedMessage}
                  </p>
                </div>
              )}
              
              {/* Leyenda */}
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
              
              {/* Grid de TODOS los horarios */}
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
              
              {/* Información adicional */}
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