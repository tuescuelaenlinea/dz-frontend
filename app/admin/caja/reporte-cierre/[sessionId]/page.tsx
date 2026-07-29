// app/admin/caja/reporte-cierre/[sessionId]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ReporteData {
  session: any;
  resumen_general: any;
  desglose_metodos: any;
  detalles: any;
}

export default function ReporteCierreImpresionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  useEffect(() => {
    const cargarReporte = async () => {
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

    cargarReporte();
    
    // Imprimir automáticamente al cargar
    setTimeout(() => {
      window.print();
    }, 500);
  }, [sessionId, apiUrl, token]);

  const formatMoney = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold">Error al cargar el reporte</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos específicos para impresión - OPTIMIZADOS */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: auto;
          }
          
          /* Ocultar TODO excepto el contenido del reporte */
          body * {
            visibility: hidden;
          }
          
          /* Mostrar solo el contenedor del reporte y sus hijos */
          .print-content,
          .print-content * {
            visibility: visible;
          }
          
          /* Posicionar el contenido en la esquina superior izquierda */
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: auto;
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          /* Reducir tamaños generales */
          h1 { font-size: 14px !important; margin: 0 0 8px 0; }
          h2 { font-size: 11px !important; margin: 8px 0 4px 0; }
          p, span, div { font-size: 9px !important; }
          td, th { padding: 2px 4px !important; font-size: 9px !important; }
        }
      `}</style>

      {/* Botones de control (no se imprimen) */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-lg"
        >
          ← Volver
        </button>
      </div>

      {/* Contenido del reporte - COMPACTO VERTICAL */}
      <div className="print-content min-h-screen bg-white p-4 max-w-full">
        {/* Header - Más compacto */}
        <div className="border-b border-gray-800 pb-3 mb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900 mb-1"> Reporte de Cierre de Caja</h1>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p><span className="font-semibold">Sesión:</span> #{data.session.id} | {data.session.turno === 'manana' ? 'Mañana' : data.session.turno === 'tarde' ? 'Tarde' : 'Noche'}</p>
                <p><span className="font-semibold">Fecha:</span> {formatDate(data.session.fecha)} | <span className="font-semibold">Apertura:</span> {data.session.hora_apertura}</p>
                <p><span className="font-semibold">Cajero:</span> {data.session.usuario_username}</p>
              </div>
            </div>
            <div className="text-right ml-4">
              <div className={`inline-block px-3 py-1.5 rounded text-sm font-bold ${
                data.resumen_general.diferencia_caja === 0 
                  ? 'bg-green-100 text-green-800' 
                  : data.resumen_general.diferencia_caja > 0 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {data.resumen_general.diferencia_caja === 0 && '✅ CUADRA'}
                {data.resumen_general.diferencia_caja !== 0 && formatMoney(data.resumen_general.diferencia_caja)}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen General - Más compacto */}
        <div className="grid grid-cols-4 gap-2 mb-4 avoid-break">
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-[10px] font-semibold text-blue-600 uppercase">Saldo Inicial</p>
            <p className="text-base font-bold text-blue-900">{formatMoney(data.resumen_general.saldo_inicial)}</p>
          </div>
          <div className="bg-green-50 p-2 rounded border border-green-200">
            <p className="text-[10px] font-semibold text-green-600 uppercase">Total Ingresos</p>
            <p className="text-base font-bold text-green-900">{formatMoney(data.resumen_general.total_ingresos)}</p>
          </div>
          <div className="bg-red-50 p-2 rounded border border-red-200">
            <p className="text-[10px] font-semibold text-red-600 uppercase">Total Egresos</p>
            <p className="text-base font-bold text-red-900">{formatMoney(data.resumen_general.total_egresos)}</p>
          </div>
          <div className={`p-2 rounded border ${
            data.resumen_general.resultado_general >= 0 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <p className="text-[10px] font-semibold uppercase">Resultado</p>
            <p className={`text-base font-bold ${
              data.resumen_general.resultado_general >= 0 
                ? 'text-emerald-900' 
                : 'text-orange-900'
            }`}>
              {formatMoney(data.resumen_general.resultado_general)}
            </p>
          </div>
        </div>

        {/* Desglose por Método de Pago - Más compacto */}
        <div className="mb-4 avoid-break">
          <h2 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1">💳 Desglose por Método</h2>
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Método</th>
                <th className="p-1.5 text-right font-semibold text-green-700 border text-[9px]">Entradas</th>
                <th className="p-1.5 text-right font-semibold text-blue-700 border text-[9px]">Ventas</th>
                <th className="p-1.5 text-right font-semibold text-red-700 border text-[9px]">Salidas</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys({
                ...data.desglose_metodos.entradas,
                ...data.desglose_metodos.ventas,
                ...data.desglose_metodos.salidas
              }).map((metodo) => (
                <tr key={metodo} className="border-b">
                  <td className="p-1.5 font-medium capitalize border-l text-[9px]">{metodo}</td>
                  <td className="p-1.5 text-right text-green-600 border text-[9px]">
                    {data.desglose_metodos.entradas[metodo] ? formatMoney(data.desglose_metodos.entradas[metodo]) : '-'}
                  </td>
                  <td className="p-1.5 text-right text-blue-600 border text-[9px]">
                    {data.desglose_metodos.ventas[metodo] ? formatMoney(data.desglose_metodos.ventas[metodo]) : '-'}
                  </td>
                  <td className="p-1.5 text-right text-red-600 border-r text-[9px]">
                    {data.desglose_metodos.salidas[metodo] ? formatMoney(data.desglose_metodos.salidas[metodo]) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Listado de Ventas - Más compacto */}
        <div className="mb-4 avoid-break">
          <h2 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1">🛍️ Ventas</h2>
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Código</th>
                <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Cliente</th>
                <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Método</th>
                <th className="p-1.5 text-right font-semibold text-gray-700 border text-[9px]">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.detalles.ventas.map((venta: any, idx: number) => (
                <tr key={idx} className="border-b">
                  <td className="p-1.5 font-mono text-[8px] border-l">{venta.codigo}</td>
                  <td className="p-1.5 border text-[9px]">{venta.cliente}</td>
                  <td className="p-1.5 capitalize border text-[9px]">{venta.metodo}</td>
                  <td className="p-1.5 text-right font-semibold border-r text-[9px]">{formatMoney(venta.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comisiones y Citas en dos columnas - Más compacto */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Comisiones Pagadas */}
          <div className="avoid-break">
            <h2 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1">💰 Comisiones</h2>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Profesional</th>
                  <th className="p-1.5 text-right font-semibold text-gray-700 border text-[9px]">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.detalles.comisiones.map((com: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="p-1.5 border-l text-[9px]">
                      <div className="font-medium">{com.profesional}</div>
                      <div className="text-[8px] text-gray-500">{com.servicio}</div>
                    </td>
                    <td className="p-1.5 text-right font-semibold text-red-600 border-r text-[9px]">{formatMoney(com.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Citas Atendidas */}
          <div className="avoid-break">
            <h2 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-300 pb-1">📅 Citas</h2>
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1.5 text-left font-semibold text-gray-700 border text-[9px]">Código</th>
                  <th className="p-1.5 text-right font-semibold text-gray-700 border text-[9px]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.detalles.citas_atendidas.map((cita: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="p-1.5 border-l text-[9px]">
                      <div className="font-medium">{cita.codigo_reserva}</div>
                      <div className="text-[8px] text-gray-500">{cita.profesional} - {cita.servicio}</div>
                    </td>
                    <td className="p-1.5 text-right font-semibold border-r text-[9px]">{formatMoney(cita.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuadre Final de Caja - Más compacto */}
        <div className="bg-gray-900 text-white p-3 rounded avoid-break mb-4">
          <h2 className="text-sm font-bold mb-2 border-b border-gray-700 pb-1">📊 Cuadre Final</h2>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="flex justify-between py-1 border-b border-gray-700">
              <span>Saldo Inicial:</span>
              <span className="font-mono">{formatMoney(data.resumen_general.saldo_inicial)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-700">
              <span>Saldo Final Esperado:</span>
              <span className="font-mono font-bold">{formatMoney(data.resumen_general.saldo_final_esperado_efectivo)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-700">
              <span>Saldo Final Digitado:</span>
              <span className="font-mono">{formatMoney(data.resumen_general.saldo_final_registrado)}</span>
            </div>
            <div className={`flex justify-between py-2 border-t-2 border-gray-600 col-span-2 text-sm font-bold ${
              (data.resumen_general.diferencia_caja || 0) === 0 ? 'text-green-400' : 
              (data.resumen_general.diferencia_caja || 0) > 0 ? 'text-blue-400' : 'text-red-400'
            }`}>
              <span>Diferencia:</span>
              <span className="font-mono">
                {data.resumen_general.diferencia_caja !== null ? formatMoney(data.resumen_general.diferencia_caja) : 'N/A'}
                {data.resumen_general.diferencia_caja === 0 && ' ✅'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-300 text-center text-[8px] text-gray-500">
          <p>Reporte generado: {new Date().toLocaleString('es-CO')}</p>
          <p>DZ Salón - Sistema de Gestión</p>
        </div>
      </div>
    </>
  );
}