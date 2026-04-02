// components/booking/DateTimePicker.tsx
'use client';
import { useState, useEffect } from 'react';

interface DateTimePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  selectedTime: string | null;
  onTimeChange: (time: string | null) => void;
  servicioId: number | null;
  profesionalId: number | null;
  mode: 'salon' | 'domicilio';
}

export default function DateTimePicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  servicioId,
  profesionalId,
  mode,
}: DateTimePickerProps) {
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [minDate, setMinDate] = useState<string>('');

  // Establecer fecha mínima (hoy + 1 día)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Cargar horarios disponibles cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate || !servicioId) {
      setAvailableTimes([]);
      return;
    }

    async function loadAvailableTimes() {
      setLoading(true);
      try {
        // Simular llamada a API (reemplazar con endpoint real)
        // const response = await api.getHorariosDisponibles(servicioId, selectedDate, profesionalId, mode);
        
        // Horarios de ejemplo (9 AM - 7 PM, cada hora)
        const hours = [];
        for (let h = 9; h <= 19; h++) {
          const time = `${h.toString().padStart(2, '0')}:00`;
          // Simular que algunos horarios no están disponibles
          if (Math.random() > 0.3) {
            hours.push(time);
          }
        }
        setAvailableTimes(hours);
      } catch (err) {
        console.error('Error cargando horarios:', err);
        setAvailableTimes([]);
      } finally {
        setLoading(false);
      }
    }
    loadAvailableTimes();
  }, [selectedDate, servicioId, profesionalId, mode]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onDateChange(date);
    onTimeChange(null); // Resetear hora al cambiar fecha
  };

  return (
    <div className="space-y-6">
      {/* Campo de Fecha - Contenedor clicable */}
      <div 
        className="space-y-2 cursor-pointer"
        onClick={(e) => {
          // Solo activar si no se hizo clic en un input ya activo
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
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null;
            onDateChange(date);
          }}
          min={minDate}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        />
      </div>

      {/* Campo de Hora - Solo se muestra si hay fecha seleccionada */}
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
          ) : availableTimes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No hay horarios disponibles para esta fecha
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableTimes.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onTimeChange(isSelected ? null : time)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}