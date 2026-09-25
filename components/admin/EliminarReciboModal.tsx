'use client';
import { useState } from 'react';

interface EliminarReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  reciboId: number;
  reciboCodigo: string;
  apiUrl: string;
  token: string | null;
  onSuccess: () => void;
}

export default function EliminarReciboModal({
  isOpen, onClose, reciboId, reciboCodigo, apiUrl, token, onSuccess
}: EliminarReciboModalProps) {
  const [accion, setAccion] = useState<'revertir' | 'eliminar'>('revertir');
  const [loading, setLoading] = useState(false);
  const [reporte, setReporte] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/eliminar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ accion_cita: accion })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Error al procesar la solicitud');
      }

      // El backend debe retornar un objeto 'reporte'. Usamos fallbacks por seguridad.
      if (data.reporte) {
        setReporte(data.reporte);
      } else {
        setReporte({
          recibo_codigo: reciboCodigo,
          citas_afectadas: data.citas_afectadas || [],
          vales_eliminados: data.vales_eliminados || [],
          pagos_eliminados: data.pagos_eliminados || 0,
          abonos_eliminados: data.abonos_eliminados || 0,
          comisiones_eliminadas: data.comisiones_eliminadas || 0,
          propinas_eliminadas: data.propinas_eliminadas || 0,
          referidos_revertidos: data.referidos_revertidos || 0,
        });
      }
      
      onSuccess(); // Notificar al padre para recargar la lista
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReporte(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  // ==========================================
  // VISTA DEL REPORTE FINAL
  // ==========================================
  if (reporte) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
          <h3 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
            ✅ Proceso Completado Exitosamente
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3 max-h-[60vh] overflow-y-auto border border-gray-200">
            <p className="font-semibold text-gray-800 border-b pb-2">
              Resumen de Anulación: <span className="text-blue-600">{reporte.recibo_codigo}</span>
            </p>
            
            <div className="space-y-2">
              <p><strong>📅 Citas afectadas:</strong> {reporte.citas_afectadas?.length > 0 ? reporte.citas_afectadas.join(', ') : 'Ninguna'}</p>
              <p><strong>🎫 Vales eliminados:</strong> {reporte.vales_eliminados?.length > 0 ? reporte.vales_eliminados.join(', ') : 'Ninguno'}</p>
            </div>

            <div className="border-t pt-3 mt-3">
              <p className="font-semibold text-gray-700 mb-2">Registros financieros afectados:</p>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>Pagos eliminados: <span className="font-medium text-gray-800">{reporte.pagos_eliminados}</span></li>
                <li>Abonos eliminados: <span className="font-medium text-gray-800">{reporte.abonos_eliminados}</span></li>
                <li>Comisiones eliminadas: <span className="font-medium text-gray-800">{reporte.comisiones_eliminadas}</span></li>
                <li>Propinas eliminadas: <span className="font-medium text-gray-800">{reporte.propinas_eliminadas}</span></li>
                <li>Descuentos referidos revertidos: <span className="font-medium text-gray-800">{reporte.referidos_revertidos}</span></li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Entendido y Recargar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA DE CONFIRMACIÓN
  // ==========================================
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
          ⚠️ Anular Recibo
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Estás a punto de anular el recibo <strong>{reciboCodigo}</strong>.
          ¿Qué deseas hacer con las citas vinculadas?
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            ❌ {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
            <input
              type="radio"
              name="accion_cita"
              value="revertir"
              checked={accion === 'revertir'}
              onChange={(e) => setAccion(e.target.value as any)}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="font-semibold text-gray-900">Revertir Citas (Recomendado)</p>
              <p className="text-xs text-gray-500">Las citas volverán a estado "Pendiente" y "No pagadas", conservando el historial del cliente.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
            <input
              type="radio"
              name="accion_cita"
              value="eliminar"
              checked={accion === 'eliminar'}
              onChange={(e) => setAccion(e.target.value as any)}
              className="mt-1 text-red-600 focus:ring-red-500"
            />
            <div>
              <p className="font-semibold text-red-700">Eliminar Citas Permanentemente</p>
              <p className="text-xs text-red-500">Las citas se borrarán de la base de datos. Esta acción no se puede deshacer.</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>🗑️ Confirmar Anulación</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}