// components/booking/PaymentMethodSelector.tsx
'use client';
import { useState } from 'react';

export type PaymentMethod = 'bold' | 'efectivo' | 'pendiente';

interface PaymentMethodSelectorProps {
  onSelect: (method: PaymentMethod) => void;
  total: number;
}

export default function PaymentMethodSelector({ onSelect, total }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const handleSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    onSelect(method);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">💳 Selecciona tu método de pago</h3>
      
      {/* Opción 1: Bold (Pago en línea seguro) */}
      <div
        onClick={() => handleSelect('bold')}
        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
          selectedMethod === 'bold'
            ? 'border-blue-600 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selectedMethod === 'bold' ? 'bg-blue-600' : 'bg-gray-100'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Pago en línea seguro - Bold</h4>
            <p className="text-sm text-gray-600 mt-1">
              Paga con tarjeta de crédito/débito, PSE o Nequi. Confirmación inmediata.
            </p>
            {selectedMethod === 'bold' && (
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-800">
                  ✅ Serás redirigido a Bold (procesador de pagos seguro) para completar tu pago de <strong>${total.toLocaleString()}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opción 2: Efectivo/Transferencia */}
      <div
        onClick={() => handleSelect('efectivo')}
        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
          selectedMethod === 'efectivo'
            ? 'border-green-600 bg-green-50 shadow-md'
            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selectedMethod === 'efectivo' ? 'bg-green-600' : 'bg-gray-100'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Transferencia, Nequi o Efectivo</h4>
            <p className="text-sm text-gray-600 mt-1">
              Paga por transferencia bancaria, Nequi, Daviplata o en efectivo.
            </p>
            {selectedMethod === 'efectivo' && (
              <div className="mt-3 p-3 bg-green-100 rounded-lg">
                <p className="text-xs text-green-800">
                  📱 Realiza el pago con tu metodo favorito y luego sube el comprobante para confirmar la cita. De lo contrario Tu cita quedará <strong>pendiente de confirmación</strong> hasta que nos envies el comprobante de pago.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opción 3: Pagar después */}
      <div
        onClick={() => handleSelect('pendiente')}
        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
          selectedMethod === 'pendiente'
            ? 'border-purple-600 bg-purple-50 shadow-md'
            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selectedMethod === 'pendiente' ? 'bg-purple-600' : 'bg-gray-100'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Pagar y confirmar después</h4>
            <p className="text-sm text-gray-600 mt-1">
              Reserva ahora y paga más tarde.
            </p>
            {selectedMethod === 'pendiente' && (
              <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                <p className="text-xs text-purple-800">
                  ⏰ Tu reserva quedará guardada. Para pagar y confirmar, ve a <strong>"Mis Citas"</strong> en tu perfil y selecciona tu última reserva.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}