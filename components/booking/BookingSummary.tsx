// components/booking/BookingSummary.tsx
'use client';
import { api } from '@/lib/api';

interface Servicio {
  id: number;
  nombre: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
}

interface BookingSummaryProps {
  servicio: Servicio | null;
  fecha: Date | null;
  hora: string | null;
  mode: 'salon' | 'domicilio';
  adicionalDomicilio?: string;
  clienteData: {
    nombre: string;
    telefono: string;
    email: string;
  };
}

export default function BookingSummary({
  servicio,
  fecha,
  hora,
  mode,
  adicionalDomicilio,
  clienteData,
}: BookingSummaryProps) {
  if (!servicio || !fecha || !hora) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
        Selecciona un servicio, fecha y hora para ver el resumen
      </div>
    );
  }

  const imageUrl = api.getImageUrl(servicio.imagen, servicio.imagen_url);
  
  const formatPrice = () => {
    const base = parseInt(servicio.precio_min);
    const adicional = mode === 'domicilio' && adicionalDomicilio ? parseInt(adicionalDomicilio) : 0;
    const total = base + adicional;
    return total.toLocaleString();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
        📋 Resumen de tu reserva
      </h3>
      
      {/* Servicio */}
      <div className="flex items-center gap-4">
        {imageUrl && (
          <img src={imageUrl} alt={servicio.nombre} className="w-16 h-16 rounded-lg object-cover" />
        )}
        <div>
          <p className="font-semibold text-gray-900">{servicio.nombre}</p>
          <p className="text-sm text-gray-500">{servicio.categoria_nombre}</p>
          {servicio.duracion && (
            <p className="text-xs text-gray-400">⏱️ {servicio.duracion}</p>
          )}
        </div>
      </div>
      
      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">📅 Fecha</p>
          <p className="font-medium text-gray-900 capitalize">{formatDate(fecha)}</p>
        </div>
        <div>
          <p className="text-gray-500">🕐 Hora</p>
          <p className="font-medium text-gray-900">{hora}</p>
        </div>
      </div>
      
      {/* Modo de atención */}
      <div>
        <p className="text-gray-500 text-sm">📍 Modalidad</p>
        <p className="font-medium text-gray-900">
          {mode === 'salon' ? '🏠 En Salón' : '🚗 A Domicilio'}
        </p>
      </div>
      
      {/* Cliente */}
      <div>
        <p className="text-gray-500 text-sm">👤 Cliente</p>
        <p className="font-medium text-gray-900">{clienteData.nombre || 'Invitado'}</p>
        {clienteData.telefono && (
          <p className="text-sm text-gray-600">📱 {clienteData.telefono}</p>
        )}
      </div>
      
      {/* Precio total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-green-600">${formatPrice()}</span>
        </div>
        {mode === 'domicilio' && adicionalDomicilio && parseInt(adicionalDomicilio) > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Incluye ${parseInt(adicionalDomicilio).toLocaleString()} por servicio a domicilio
          </p>
        )}
      </div>
    </div>
  );
}