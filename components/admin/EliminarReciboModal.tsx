// componets/admin/EliminarReciboModal.tsx
'use client';
import { useState, useEffect } from 'react';

interface EliminarReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  reciboId: number;
  reciboCodigo: string;
  apiUrl: string;
  token: string | null;
  onSuccess: () => void;
}

// ← ← ← INTERFACES BASADAS EN LA RESPUESTA DEL BACKEND ← ← ←
interface PreviewData {
  recibo: {
    tipo: 'venta' | 'entrada' | 'salida';
    subtipo: string;
    estado: string;
    total: string;
  };
  afectaciones: {
    citas: { count: number };
    pagos: { count: number };
    abonos: { count: number };
    comisiones: { count: number; accion: string };
    propinas: { count: number };
    vales: { eliminados: any[]; revertidos_nomina: number };
    costos_fijos: { revertidos: any[] };
    referidos: { generados_cancelados: number; aplicados_liberados: number };
    inventario: { citas_completadas_con_stock: number };
  };
  opciones_disponibles: {
    accion_cita: {
      disponible: boolean;
      opciones: string[];
      default: string;
    };
  };
  advertencias: Array<{ nivel: 'warning' | 'info' | 'error'; mensaje: string }>;
  puede_eliminar: boolean;
}

export default function EliminarReciboModal({
  isOpen, onClose, reciboId, reciboCodigo, apiUrl, token, onSuccess
}: EliminarReciboModalProps) {
  const [accion, setAccion] = useState<'revertir' | 'eliminar'>('revertir');
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [reporte, setReporte] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ← ← ← 1. CARGAR VISTA PREVIA AL ABRIR EL MODAL ← ← ←
  useEffect(() => {
    if (isOpen && reciboId) {
      fetchPreview();
    }
  }, [isOpen, reciboId]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    setPreviewData(null);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/info-eliminacion/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) throw new Error('No se pudo obtener la información del recibo');
      
      const data = await res.json();
      setPreviewData(data);
      
      // Establecer la acción por defecto recomendada por el backend
      if (data.opciones_disponibles?.accion_cita?.default) {
        setAccion(data.opciones_disponibles.accion_cita.default as 'revertir' | 'eliminar');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  };

  // ← ← ← 2. EJECUTAR LA ELIMINACIÓN ← ← ←
  const handleConfirmar = async () => {
    if (!previewData?.puede_eliminar) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/eliminar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(previewData.opciones_disponibles.accion_cita.disponible ? { accion_cita: accion } : {})
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Error al procesar la solicitud');
      }

      setReporte(data.reporte || { recibo_codigo: reciboCodigo });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReporte(null);
    setError(null);
    setLoading(false);
    setPreviewData(null);
    onSuccess(); 
    onClose();
  };

  if (!isOpen) return null;

  // ==========================================
  // VISTA 1: CARGANDO VISTA PREVIA
  // ==========================================
  if (loadingPreview) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analizando registros vinculados...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: ERROR O SIN PERMISOS
  // ==========================================
  if (error || (previewData && !previewData.puede_eliminar)) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
            ⛔ No se puede anular
          </h3>
          <p className="text-gray-600 mb-6">
            {error || 'Este recibo ya está anulado o no tienes permisos para realizar esta acción.'}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 3: REPORTE FINAL (POST-ELIMINACIÓN)
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
              Resumen de Anulación: <span className="text-blue-600">{reporte.recibo_codigo || reciboCodigo}</span>
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                <p className="text-xs text-blue-600 font-semibold">💰 Pagos Eliminados</p>
                <p className="text-lg font-bold text-blue-800">{reporte.pagos_eliminados || 0}</p>
              </div>
              <div className="bg-purple-50 p-2 rounded border border-purple-100">
                <p className="text-xs text-purple-600 font-semibold">📝 Abonos Eliminados</p>
                <p className="text-lg font-bold text-purple-800">{reporte.abonos_eliminados || 0}</p>
              </div>
              <div className="bg-orange-50 p-2 rounded border border-orange-100">
                <p className="text-xs text-orange-600 font-semibold">💼 Comisiones</p>
                <p className="text-lg font-bold text-orange-800">{reporte.comisiones_eliminadas || 0}</p>
              </div>
              <div className="bg-green-50 p-2 rounded border border-green-100">
                <p className="text-xs text-green-600 font-semibold">🔄 Costos Fijos Revertidos</p>
                <p className="text-lg font-bold text-green-800">{reporte.costos_fijos_revertidos || 0}</p>
              </div>
            </div>

            {reporte.citas_afectadas?.length > 0 && (
              <div className="border-t pt-3">
                <p className="font-semibold text-gray-700 mb-1">📅 Citas Afectadas:</p>
                <p className="text-gray-600 text-xs">{reporte.citas_afectadas.join(', ')}</p>
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  Acción aplicada: {reporte.accion_citas === 'revertir' ? 'Revertidas a Pendiente' : 'Eliminadas permanentemente'}
                </p>
              </div>
            )}
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
  // VISTA 4: CONFIRMACIÓN CON VISTA PREVIA (PRINCIPAL)
  // ==========================================
  
  // ← ← ← EXTRAER VALORES CON FALLBACK PARA EVITAR ERRORES DE TYPESCRIPT ← ← ←
  const citasCount = previewData?.afectaciones?.citas?.count ?? 0;
  const pagosCount = previewData?.afectaciones?.pagos?.count ?? 0;
  const abonosCount = previewData?.afectaciones?.abonos?.count ?? 0;
  const comisionesCount = previewData?.afectaciones?.comisiones?.count ?? 0;
  const comisionesAccion = previewData?.afectaciones?.comisiones?.accion ?? '';
  const valesEliminadosLength = previewData?.afectaciones?.vales?.eliminados?.length ?? 0;
  const costosFijosRevertidosLength = previewData?.afectaciones?.costos_fijos?.revertidos?.length ?? 0;
  const citasCompletadasConStock = previewData?.afectaciones?.inventario?.citas_completadas_con_stock ?? 0;
  const accionCitaDisponible = previewData?.opciones_disponibles?.accion_cita?.disponible ?? false;
  const reciboTipo = previewData?.recibo?.tipo ?? 'desconocido';
  const reciboSubtipo = previewData?.recibo?.subtipo?.replace('_', ' ').toUpperCase() ?? 'DESCONOCIDO';

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2">
          ⚠️ Anular Recibo
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Estás a punto de anular el recibo <strong>{reciboCodigo}</strong> 
          <span className="block text-xs text-gray-500 mt-1">
            Tipo: {reciboSubtipo}
          </span>
        </p>

        {/* ← ← ← ADVERTENCIAS DEL BACKEND ← ← ← */}
        {previewData?.advertencias && previewData.advertencias.length > 0 && (
          <div className="mb-4 space-y-2">
            {previewData.advertencias.map((adv, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg text-sm flex items-start gap-2 border ${
                  adv.nivel === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                  adv.nivel === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <span className="mt-0.5">
                  {adv.nivel === 'error' ? '🚫' : adv.nivel === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span>{adv.mensaje}</span>
              </div>
            ))}
          </div>
        )}

        {/* ← ← ← RESUMEN DE AFECTACIONES ← ← ← */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Registros que se verán afectados:
          </p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {citasCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">📅 Citas:</span>
                <span className="font-semibold text-gray-900">{citasCount}</span>
              </div>
            )}
            {pagosCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">💰 Pagos:</span>
                <span className="font-semibold text-gray-900">{pagosCount}</span>
              </div>
            )}
            {abonosCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">📝 Abonos:</span>
                <span className="font-semibold text-gray-900">{abonosCount}</span>
              </div>
            )}
            {comisionesCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">💼 Comisiones:</span>
                <span className="font-semibold text-gray-900">
                  {comisionesCount} 
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    ({comisionesAccion === 'eliminar' ? 'se eliminarán' : 'volverán a pendiente'})
                  </span>
                </span>
              </div>
            )}
            {valesEliminadosLength > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🎫 Vales:</span>
                <span className="font-semibold text-gray-900">{valesEliminadosLength} eliminados</span>
              </div>
            )}
            {costosFijosRevertidosLength > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">📊 Costos Fijos:</span>
                <span className="font-semibold text-gray-900">{costosFijosRevertidosLength} revertidos</span>
              </div>
            )}
          </div>
        </div>

        {/* ← ← ← OPCIONES DINÁMICAS (SOLO PARA VENTAS CON CITAS) ← ← ← */}
        {accionCitaDisponible && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">
              ¿Qué deseas hacer con las {citasCount} cita(s) vinculada(s)?
            </p>
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                accion === 'revertir' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-gray-50 border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="accion_cita"
                  value="revertir"
                  checked={accion === 'revertir'}
                  onChange={(e) => setAccion(e.target.value as 'revertir' | 'eliminar')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-semibold text-gray-900">🔄 Revertir a Pendiente (Recomendado)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Las citas volverán a estado "Pendiente" y "No pagadas". Se conservan las comisiones, propinas y productos.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                accion === 'eliminar' ? 'bg-red-50 border-red-300 ring-1 ring-red-300' : 'hover:bg-red-50/30 border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="accion_cita"
                  value="eliminar"
                  checked={accion === 'eliminar'}
                  onChange={(e) => setAccion(e.target.value as 'revertir' | 'eliminar')}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div>
                  <p className="font-semibold text-red-700">🗑️ Eliminar Permanentemente</p>
                  <p className="text-xs text-red-500 mt-1">
                    Las citas se borrarán de la base de datos, junto con sus productos, comisiones y propinas. 
                    {citasCompletadasConStock > 0 && ' El stock de productos se restaurará automáticamente.'}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ← ← ← MENSAJE PARA NO-VENTAS ← ← ← */}
        {!accionCitaDisponible && reciboTipo !== 'venta' && (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg border border-gray-200 text-sm text-gray-600">
            ℹ️ Este es un recibo de <strong>{reciboTipo}</strong>. 
            Al anularlo, solo se revertirán/eliminarán los registros financieros (pagos, abonos, costos fijos o vales). 
            Las citas no se verán afectadas.
          </div>
        )}

        {/* ← ← ← BOTONES DE ACCIÓN ← ← ← */}
        <div className="flex gap-3 mt-auto pt-4 border-t border-gray-200">
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