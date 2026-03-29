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
      {/* Selector de fecha */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Selecciona una fecha
        </label>
        <input
          type="date"
          value={selectedDate?.toISOString().split('T')[0] || ''}
          onChange={handleDateChange}
          min={minDate}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
        />
      </div>

      {/* Selector de hora */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🕐 Horarios disponibles
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