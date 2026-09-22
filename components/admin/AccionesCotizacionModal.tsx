// components/admin/AccionesCotizacionModal.tsx
'use client';

interface Cotizacion {
  id: number;
  nombre_completo: string;
  estado: string;
}

interface AccionesCotizacionModalProps {
  cotizacion: Cotizacion;
  onClose: () => void;
  onEditar: () => void;
  onGenerarPDF: () => void;
  onEnviar: () => void;
}

export default function AccionesCotizacionModal({ 
  cotizacion, 
  onClose, 
  onEditar, 
  onGenerarPDF, 
  onEnviar 
}: AccionesCotizacionModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Opciones de Cotización</h3>
            <p className="text-gray-400 text-sm mt-1">
              <span className="font-semibold text-amber-400">#{cotizacion.id}</span> • {cotizacion.nombre_completo}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido: 3 Opciones Grandes */}
        <div className="p-6 grid grid-cols-1 gap-4">
          
          {/* Opción 1: Editar */}
          <button
            onClick={() => { onClose(); onEditar(); }}
            className="group flex items-center gap-4 p-4 rounded-xl border-2 border-amber-100 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-amber-800">Editar Cotización</h4>
              <p className="text-sm text-gray-600">Modificar servicios, precios o datos del cliente.</p>
            </div>
          </button>

          {/* Opción 2: Generar PDF */}
          <button
            onClick={() => { onClose(); onGenerarPDF(); }}
            className="group flex items-center gap-4 p-4 rounded-xl border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-red-200 text-red-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-red-800">Generar PDF</h4>
              <p className="text-sm text-gray-600">Descargar el documento formal de la cotización.</p>
            </div>
          </button>

          {/* Opción 3: Enviar ← ← ← CORREGIDO: Sin onClose() aquí */}
          <button
            onClick={() => { onEnviar(); }} 
            className="group flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 group-hover:text-blue-800">Enviar al Cliente</h4>
              <p className="text-sm text-gray-600">Enviar por correo electrónico o WhatsApp.</p>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}