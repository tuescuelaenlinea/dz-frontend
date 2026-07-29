// components/admin/ReporteCierreCajaModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ReporteData {
  session: any;
  resumen_general: any;
  desglose_metodos: any;
  detalles: any;
}

interface ReporteCierreCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  apiUrl: string;
  token: string | null;
}

export default function ReporteCierreCajaModal({ isOpen, onClose, sessionId, apiUrl, token }: ReporteCierreCajaModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      cargarReporte();
    }
  }, [isOpen, sessionId]);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/${sessionId}/reporte-cierre/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error('Error cargando reporte:', err);
    } finally {
      setLoading(false);
    }
  };

  
const handlePrint = () => {
  // Redirigir a la página dedicada de impresión
  router.push(`/admin/caja/reporte-cierre/${sessionId}`);
};

  if (!isOpen) return null;

  const formatMoney = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      {/* Estilos específicos para impresión CORREGIDOS */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: auto;
          }
          
          /* Ocultar todo por defecto */
          body * {
            visibility: hidden !important;
          }
          
          /* Hacer visible solo el contenido del reporte */
          #reporte-cierre-content, #reporte-cierre-content * {
            visibility: visible !important;
          }
          
          /* Contenedor principal - CRÍTICO: Eliminar TODAS las restricciones */
          #reporte-cierre-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            margin: 0 !important;
            
            /* ELIMINAR restricciones de altura y scroll */
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            overflow-y: visible !important;
            
            /* Eliminar estilos visuales */
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          /* Ocultar elementos UI */
          .no-print {
            display: none !important;
          }
          
          /* Forzar salto de página */
          .print-break {
            page-break-before: always !important;
          }
          
          /* Evitar que las tablas se corten */
          table {
            page-break-inside: auto !important;
            width: 100% !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tfoot {
            display: table-footer-group !important;
          }
          
          /* Eliminar scroll de contenedores de tablas */
          .overflow-y-auto, .max-h-64 {
            max-height: none !important;
            overflow: visible !important;
            overflow-y: visible !important;
          }
          
          /* Ajustar colores para impresión */
          .bg-gray-900 {
            background-color: white !important;
            color: black !important;
            border: 1px solid black !important;
          }
        }
      `}</style>

      <div id="reporte-cierre-content" className="bg-white text-gray-900 w-full max-w-5xl rounded-xl shadow-2xl max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50 print:bg-white print:border-black">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏦 Reporte de Cierre de Caja
            </h2>
            {data && (
              <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-x-8 gap-y-1">
                <p><span className="font-semibold">Sesión:</span> #{data.session.id} | {data.session.turno}</p>
                <p><span className="font-semibold">Fecha:</span> {data.session.fecha}</p>
                <p><span className="font-semibold">Cajero:</span> {data.session.usuario}</p>
                <p><span className="font-semibold">Apertura:</span> {data.session.hora_apertura}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handlePrint} 
            className="no-print px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            ️ Imprimir / Guardar PDF
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Generando reporte...</p>
          </div>
        ) : data ? (
          <div className="p-6 space-y-8">
            
            {/* 1. RESUMEN GENERAL */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-600 uppercase">Saldo Inicial</p>
                <p className="text-xl font-bold text-blue-900">{formatMoney(data.resumen_general.saldo_inicial)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-600 uppercase">Total Ingresos</p>
                <p className="text-xl font-bold text-green-900">{formatMoney(data.resumen_general.total_ingresos)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-xs font-semibold text-red-600 uppercase">Total Egresos</p>
                <p className="text-xl font-bold text-red-900">{formatMoney(data.resumen_general.total_egresos)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${data.resumen_general.resultado_general >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
                <p className="text-xs font-semibold uppercase">Resultado General</p>
                <p className={`text-xl font-bold ${data.resumen_general.resultado_general >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                  {formatMoney(data.resumen_general.resultado_general)}
                </p>
              </div>
            </div>

            {/* 2. DESGLOSE POR MÉTODO DE PAGO */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">💳 Desglose por Método de Pago</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3 rounded-tl-lg">Método</th>
                      <th className="p-3 text-right text-green-700">Entradas</th>
                      <th className="p-3 text-right text-blue-700">Ventas</th>
                      <th className="p-3 text-right text-red-700 rounded-tr-lg">Salidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.keys(data.desglose_metodos.entradas).length === 0 && 
                     Object.keys(data.desglose_metodos.ventas).length === 0 && 
                     Object.keys(data.desglose_metodos.salidas).length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin movimientos</td></tr>
                    ) : (
                      Object.keys({
                        ...data.desglose_metodos.entradas,
                        ...data.desglose_metodos.ventas,
                        ...data.desglose_metodos.salidas
                      }).map((metodo) => (
                        <tr key={metodo} className="hover:bg-gray-50">
                          <td className="p-3 font-medium capitalize">{metodo}</td>
                          <td className="p-3 text-right text-green-600">
                            {data.desglose_metodos.entradas[metodo] ? formatMoney(data.desglose_metodos.entradas[metodo]) : '-'}
                          </td>
                          <td className="p-3 text-right text-blue-600">
                            {data.desglose_metodos.ventas[metodo] ? formatMoney(data.desglose_metodos.ventas[metodo]) : '-'}
                          </td>
                          <td className="p-3 text-right text-red-600">
                            {data.desglose_metodos.salidas[metodo] ? formatMoney(data.desglose_metodos.salidas[metodo]) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. LISTADO DE VENTAS DEL DÍA */}
            <div className="print-break">
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">🛍️ Listado de Ventas (Recibos)</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Método</th>
                      <th className="p-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.detalles.ventas.map((venta: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{venta.codigo}</td>
                        <td className="p-3">{venta.cliente}</td>
                        <td className="p-3 capitalize">{venta.metodo}</td>
                        <td className="p-3 text-right font-semibold">{formatMoney(venta.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. COMISIONES Y CITAS ATENDIDAS */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">💰 Comisiones Pagadas</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-3">Profesional</th>
                        <th className="p-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.detalles.comisiones.map((com: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3">
                            <div className="font-medium">{com.profesional}</div>
                            <div className="text-xs text-gray-500">{com.servicio}</div>
                          </td>
                          <td className="p-3 text-right font-semibold text-red-600">{formatMoney(com.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2"> Citas Atendidas</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.detalles.citas_atendidas.map((cita: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3">
                            <div className="font-medium">{cita.codigo_reserva}</div>
                            <div className="text-xs text-gray-500">{cita.profesional} - {cita.servicio}</div>
                          </td>
                          <td className="p-3 text-right font-semibold">{formatMoney(cita.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 5. CUADRE FINAL DE CAJA */}
            <div className="bg-gray-900 text-white p-6 rounded-xl mt-8 print:bg-white print:text-black print:border print:border-black">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 print:border-gray-300">📊 Cuadre Final de Caja</h3>
              <div className="grid grid-cols-2 gap-4 text-sm md:text-base">
                <div className="flex justify-between">
                  <span>Saldo Inicial Registrado:</span>
                  <span className="font-mono">{formatMoney(data.resumen_general.saldo_inicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Final Esperado (Efectivo):</span>
                  <span className="font-mono font-bold">{formatMoney(data.resumen_general.saldo_final_esperado_efectivo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Final Digitado en Cierre:</span>
                  <span className="font-mono">{formatMoney(data.resumen_general.saldo_final_registrado)}</span>
                </div>
                <div className={`flex justify-between text-lg font-bold col-span-2 pt-4 border-t border-gray-700 print:border-gray-300 ${
                  (data.resumen_general.diferencia_caja || 0) === 0 ? 'text-green-400 print:text-green-700' : 
                  (data.resumen_general.diferencia_caja || 0) > 0 ? 'text-blue-400 print:text-blue-700' : 'text-red-400 print:text-red-700'
                }`}>
                  <span>Diferencia de Caja:</span>
                  <span className="font-mono">
                    {data.resumen_general.diferencia_caja !== null ? formatMoney(data.resumen_general.diferencia_caja) : 'N/A'}
                    {data.resumen_general.diferencia_caja === 0 && ' ✅ CUADRA PERFECTAMENTE'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No se pudo cargar la información del reporte.
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end no-print bg-gray-50">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Cerrar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}