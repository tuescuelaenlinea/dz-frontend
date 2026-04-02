// components/booking/BankAccountsModal.tsx
'use client';
import { useEffect } from 'react';

interface BankAccount {
  id: number;
  banco: string;
  banco_display: string;
  tipo_cuenta: string;
  tipo_cuenta_display: string;
  numero_cuenta: string;
  titular: string;
  documento_titular: string;
  telefono: string | null;
}

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  total: number;
  onConfirm: () => void;
}

export default function BankAccountsModal({
  isOpen,
  onClose,
  accounts,
  total,
  onConfirm,
}: BankAccountsModalProps) {
  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            💳 Datos de Pago - Transferencia
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Monto a pagar destacado */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">💰 Total a pagar:</p>
            <p className="text-4xl font-bold text-green-700">${total.toLocaleString()}</p>
          </div>
          
          {/* Cuentas bancarias */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              Selecciona una cuenta para realizar tu pago:
            </h3>
            
            <div className="space-y-4">
              {accounts.map((cuenta) => (
                <div key={cuenta.id} className="bg-white rounded-xl p-5 shadow-lg border-2 border-gray-100 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      {cuenta.banco === 'nequi' ? (
                        <span className="text-2xl">📱</span>
                      ) : cuenta.banco === 'daviplata' ? (
                        <span className="text-2xl">📲</span>
                      ) : (
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xl">
                        {cuenta.banco_display || cuenta.banco}
                      </h4>
                      <p className="text-sm text-gray-600 capitalize">
                        Cuenta {cuenta.tipo_cuenta_display || cuenta.tipo_cuenta}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 ml-16">
                    {cuenta.numero_cuenta && (
                      <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                        <span className="text-sm text-gray-600 font-medium">Número de cuenta:</span>
                        <span className="font-mono font-bold text-gray-900 text-lg">{cuenta.numero_cuenta}</span>
                      </div>
                    )}
                    
                    {cuenta.telefono && (
                      <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                        <span className="text-sm text-gray-600 font-medium">Teléfono:</span>
                        <span className="font-mono font-bold text-gray-900">{cuenta.telefono}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                      <span className="text-sm text-gray-600 font-medium">Titular:</span>
                      <span className="font-bold text-gray-900">{cuenta.titular}</span>
                    </div>
                    
                    {cuenta.documento_titular && (
                      <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                        <span className="text-sm text-gray-600 font-medium">Documento:</span>
                        <span className="font-mono text-gray-900">{cuenta.documento_titular}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Instrucciones */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              📋 Pasos a seguir:
            </h4>
            <ol className="text-sm text-blue-800 space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <span>Realiza la transferencia o consignación a <strong>cualquiera de las cuentas</strong> mostradas arriba</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>Toma una <strong>foto o captura de pantalla</strong> del comprobante de pago</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>Haz clic en <strong>"Confirmar y Subir Comprobante"</strong> para adjuntar tu comprobante</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
                <span>Verificaremos tu pago en <strong>menos de 24 horas</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">5</span>
                <span>Recibirás <strong>confirmación por WhatsApp</strong> una vez verificado el pago</span>
              </li>
            </ol>
          </div>
          
          {/* Alerta importante */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Importante:</strong> Tu cita quedará <strong>pendiente de confirmación</strong> hasta que realices el pago y subas el comprobante.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Ver cuentas más tarde
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Confirmar y Subir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
}