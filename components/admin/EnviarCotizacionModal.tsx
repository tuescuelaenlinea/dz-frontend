// components/admin/EnviarCotizacionModal.tsx
'use client';
import { useState } from 'react';

interface Cotizacion {
  id: number;
  // codigo_cotizacion: string; // ← ELIMINADO: El backend usa directamente el 'id'
  nombre_completo: string;
  correo_electronico: string;
  whatsapp: string;
  valor_total?: number; // ← OPCIONAL: Por si no siempre viene en la respuesta
  estado?: string;
}

interface EnviarCotizacionModalProps {
  cotizacion: Cotizacion;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnviarCotizacionModal({ cotizacion, onClose, onSuccess }: EnviarCotizacionModalProps) {
  const [metodoEnvio, setMetodoEnvio] = useState<'email' | 'whatsapp' | 'ambos'>('email');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [incluirTerminos, setIncluirTerminos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnviar = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('admin_token'); 
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // ✅ CORRECCIÓN 1: Agregar '/api/' a la ruta del endpoint
      const response = await fetch(`${apiUrl}/cotizaciones/${cotizacion.id}/enviar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify({
          metodo_envio: metodoEnvio,
          mensaje_personalizado: mensajePersonalizado,
          incluir_terminos: incluirTerminos,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Error al procesar la cotización');
      }
      
      console.log('✅ Respuesta del servidor:', data);
      
      // ✅ CORRECCIÓN 2: Si el backend devuelve un enlace de WhatsApp, abrirlo en nueva pestaña
      if (data.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank');
      }
      
      alert(`✅ Cotización procesada exitosamente por: ${data.exitos.join(', ')}`);
      
      onSuccess();
      
    } catch (err) {
      console.error('❌ Error enviando cotización:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la cotización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Enviar Cotización</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Info de la cotización */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Cotización <span className="font-semibold text-gray-900">#{cotizacion.id}</span></p>            
            <p className="text-lg font-semibold text-gray-900 mt-1">{cotizacion.nombre_completo}</p>
            {cotizacion.valor_total && (
              <p className="text-sm text-gray-600">Valor: <span className="font-semibold">${cotizacion.valor_total.toLocaleString('es-CO')}</span></p>
            )}
          </div>

          {/* Método de envío */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Método de envío</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMetodoEnvio('email')}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  metodoEnvio === 'email'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Email</span>
              </button>
              
              <button
                onClick={() => setMetodoEnvio('whatsapp')}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  metodoEnvio === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </button>
              
              <button
                onClick={() => setMetodoEnvio('ambos')}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  metodoEnvio === 'ambos'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">📧</span>
                <span className="text-sm font-medium">Ambos</span>
              </button>
            </div>
          </div>

          {/* Mensaje personalizado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mensaje personalizado <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <textarea
              value={mensajePersonalizado}
              onChange={(e) => setMensajePersonalizado(e.target.value)}
              placeholder="Escribe un mensaje personalizado para el cliente..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Checkbox términos */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="terminos"
              checked={incluirTerminos}
              onChange={(e) => setIncluirTerminos(e.target.checked)}
              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="terminos" className="text-sm text-gray-700">
              Incluir términos y condiciones
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg font-medium hover:from-amber-700 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar Cotización
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}