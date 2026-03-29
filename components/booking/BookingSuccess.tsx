// components/booking/BookingSuccess.tsx
'use client';
import Link from 'next/link';

interface BookingSuccessProps {
  citaId: number;
  codigoReserva: string;
  onNewBooking: () => void;
}

export default function BookingSuccess({
  citaId,
  codigoReserva,
  onNewBooking,
}: BookingSuccessProps) {
  const whatsappNumber = '573157072678';
  const whatsappMessage = `Hola DZ Salón, confirmo mi reserva #${codigoReserva}. ¡Gracias!`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="text-center py-12">
      {/* Icono de éxito */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        ¡Reserva confirmada! 🎉
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Tu cita ha sido agendada exitosamente. Te enviaremos un recordatorio 24 horas antes.
      </p>
      
      {/* Código de reserva */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8 inline-block">
        <p className="text-sm text-blue-600 mb-1">Código de reserva</p>
        <p className="text-2xl font-mono font-bold text-blue-900">{codigoReserva}</p>
      </div>
      
      {/* Botones de acción */}
      <div className="space-y-4 max-w-sm mx-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          💬 Confirmar por WhatsApp
        </a>
        
        <Link
          href="/mis-citas"
          className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          📅 Ver mis citas
        </Link>
        
        <button
          onClick={onNewBooking}
          className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ➕ Nueva reserva
        </button>
      </div>
      
      {/* Información adicional */}
      <div className="mt-12 text-sm text-gray-500 space-y-2">
        <p>📍 <strong>Dirección:</strong> Bogotá, Colombia</p>
        <p>📱 <strong>WhatsApp:</strong> +57 315 707 2678</p>
        <p>🕐 <strong>Horario:</strong> Lunes-Viernes 9AM-7PM, Sábados 9AM-5PM</p>
      </div>
    </div>
  );
}