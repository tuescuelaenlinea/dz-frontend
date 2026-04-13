// components/booking/BankAccountsModal.tsx
'use client';
import { useEffect, useState } from 'react';

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
  es_principal?: boolean;
  activo?: boolean;
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
  // ← Estado para controlar qué cuenta está expandida (INICIA EN null = TODAS CERRADAS)
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  
  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ← ELIMINADO: Ya no expandimos automáticamente ninguna cuenta

  // ← SOLO expandir/colapsar (NO confirma nada)
  const handleToggleAccount = (accountId: number) => {
    setExpandedAccount(prev => prev === accountId ? null : accountId);
  };

  if (!isOpen) return null;

  // ← FIX: Validar que accounts sea array antes de filtrar
  const accountsArray = Array.isArray(accounts) ? accounts : [];
  const activeAccounts = accountsArray.filter(acc => acc.activo !== false);

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
            aria-label="Cerrar modal"
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
          
          {/* ← ACORDEÓN DE CUENTAS BANCARIAS (TODAS CERRADAS POR DEFECTO) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              Haz clic en una cuenta para ver los detalles:
            </h3>
            
            <div className="space-y-3">
              {activeAccounts.map((cuenta) => {
                const isExpanded = expandedAccount === cuenta.id;
                const isPrincipal = cuenta.es_principal;
                
                return (
                  <div 
                    key={cuenta.id} 
                    className={`border-2 rounded-xl overflow-hidden transition-all duration-200 ${
                      isExpanded 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* ← CABECERA: SOLO expande/colapsa (NO confirma) */}
                    <button
                       type="button"
                      onClick={() => handleToggleAccount(cuenta.id)}
                      className="w-full p-4 bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 hover:to-white transition-colors flex items-center justify-between"
                      aria-expanded={isExpanded}
                      aria-controls={`account-details-${cuenta.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icono */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                          isPrincipal 
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
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
                        
                        {/* Información básica */}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {cuenta.banco_display || cuenta.banco}
                            </h4>
                            {isPrincipal && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                                ⭐ Principal
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 capitalize">
                            Cuenta {cuenta.tipo_cuenta_display || cuenta.tipo_cuenta}
                          </p>
                        </div>
                      </div>
                      
                      {/* ← Icono de expandir/colapsar */}
                      <svg
                        className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-blue-600' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* ← DETALLES (solo visible si está expandido) */}
                    {isExpanded && (
                      <div 
                        id={`account-details-${cuenta.id}`}
                        className="p-5 bg-white border-t-2 border-blue-100"
                      >
                        <div className="space-y-3">
                          {/* Número de cuenta destacado */}
                          {cuenta.numero_cuenta && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                              <p className="text-xs text-blue-600 font-semibold mb-1">Número de cuenta:</p>
                              <p className="font-mono font-bold text-blue-900 text-2xl tracking-wider">
                                {cuenta.numero_cuenta}
                              </p>
                            </div>
                          )}
                          
                          {/* Grid de información */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-600 mb-1">Titular:</p>
                              <p className="font-bold text-gray-900">{cuenta.titular}</p>
                            </div>
                            
                            {cuenta.documento_titular && (
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Documento:</p>
                                <p className="font-mono text-gray-900">{cuenta.documento_titular}</p>
                              </div>
                            )}
                            
                            {cuenta.telefono && (
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 md:col-span-2">
                                <p className="text-xs text-gray-600 mb-1">Teléfono / WhatsApp:</p>
                                <p className="font-mono font-bold text-gray-900">{cuenta.telefono}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ← ELIMINADO: Botón "Ya realicé el pago" - Ya no existe */}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {activeAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">⚠️ No hay cuentas bancarias disponibles</p>
                  <p className="text-sm mt-2">Contacta al administrador para más información</p>
                </div>
              )}
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
                <span>Haz clic en una cuenta para <strong>ver los detalles</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>Realiza la transferencia por el monto de <strong>${total.toLocaleString()}</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>Toma una <strong>foto del comprobante</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
                <span>Haz clic en <strong>"Confirmar y Subir Comprobante"</strong></span>
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
                <strong>⚠️ Importante:</strong> Tu cita quedará <strong>pendiente</strong> hasta que subas el comprobante.
              </p>
            </div>
          </div>
        </div>
        
        {/* ← Footer con botones: SIEMPRE VISIBLE */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            // ← ESTE botón SÍ dispara el submit
            onClick={() => {
              onClose(); // Cierra modal primero
              // ← Dispara el submit del form
              const form = document.getElementById('booking-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
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