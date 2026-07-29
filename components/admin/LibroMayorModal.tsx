'use client';
import { useState, useEffect } from 'react';

interface FilaLibroMayor {
  fecha: string;
  saldo_anterior: number;
  ingresos: number;
  egresos: number;
  saldo_actual: number;
  movimientos: number;
}

interface LibroMayorData {
  fecha_inicial: string;
  fecha_final: string;
  saldo_inicial: number;
  saldo_final: number;
  total_ingresos: number;
  total_egresos: number;
  total_movimientos: number;
  filas: FilaLibroMayor[];
  resumen: {
    valor_inicial: number;
    total_ingresos: number;
    total_egresos: number;
    saldo_final: number;
  };
}

interface LibroMayorModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
}

export default function LibroMayorModal({
  isOpen,
  onClose,
  apiUrl,
  token,
}: LibroMayorModalProps) {
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [data, setData] = useState<LibroMayorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generado, setGenerado] = useState(false);

  // Calcular semana actual (domingo a sábado) al abrir
  useEffect(() => {
    if (isOpen) {
      const hoy = new Date();
      const diaSemana = hoy.getDay(); // 0=domingo, 6=sábado
      const diasDesdeDomingo = diaSemana;
      const domingo = new Date(hoy);
      domingo.setDate(hoy.getDate() - diasDesdeDomingo);
      const sabado = new Date(domingo);
      sabado.setDate(domingo.getDate() + 6);

      setFechaInicial(formatDateInput(domingo));
      setFechaFinal(formatDateInput(sabado));
      setSaldoInicial('0');
      setData(null);
      setGenerado(false);
    }
  }, [isOpen]);

  const formatDateInput = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const generarReporte = async () => {
    if (!fechaInicial || !fechaFinal) {
      alert('⚠️ Debes seleccionar un rango de fechas');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_inicial: fechaInicial,
        fecha_final: fechaFinal,
        saldo_inicial: saldoInicial.replace(/\./g, '').replace(',', '.'),
      });
      
      console.log('🔍 Solicitando Libro Mayor con params:', params.toString());
      
      const res = await fetch(`${apiUrl}/caja/libro-mayor/?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const jsonData = await res.json();
        console.log('✅ Datos recibidos del backend:', jsonData);
        setData(jsonData);
        setGenerado(true);
      } else {
        const error = await res.json();
        console.error('❌ Error del backend:', error);
        alert(`❌ Error: ${error.error || 'Error al generar reporte'}`);
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← NUEVA FUNCIÓN DE IMPRESIÓN (Estilo Libro Diario) ← ← ←
  const handleImprimir = () => {
    if (!data) return;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('⚠️ Permite las ventanas emergentes para imprimir');
      return;
    }

    const fechaActual = new Date().toLocaleDateString('es-CO');
    const horaActual = new Date().toLocaleTimeString('es-CO');

    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Libro Mayor - ${data.fecha_inicial} al ${data.fecha_final}</title>
        <style>
          @page {
            size: letter;
            margin: 1cm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10px;
            color: #333;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
          }
          .header h1 {
            color: #2563eb;
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header h2 {
            color: #666;
            font-size: 16px;
            font-weight: normal;
          }
          .info-rango {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          .info-rango div {
            margin: 5px 10px;
          }
          .info-rango strong {
            color: #2563eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px;
          }
          th {
            background: #2563eb;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #1e40af;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          tr:hover {
            background: #eff6ff;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .monto-positivo { color: #059669; font-weight: 600; }
          .monto-negativo { color: #dc2626; font-weight: 600; }
          .resumen {
            background: #f8fafc;
            border: 2px solid #2563eb;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
          }
          .resumen h3 {
            color: #2563eb;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .resumen-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }
          .resumen-item {
            background: white;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #2563eb;
          }
          .resumen-item label {
            display: block;
            color: #666;
            font-size: 9px;
            margin-bottom: 3px;
          }
          .resumen-item strong {
            font-size: 14px;
            color: #1e293b;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 9px;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📒 LIBRO MAYOR DE CAJA</h1>
          <h2>DZ Salón - Sistema de Gestión</h2>
        </div>

        <div class="info-rango">
          <div><strong>Rango:</strong> ${formatDateDisplay(data.fecha_inicial)} - ${formatDateDisplay(data.fecha_final)}</div>
          <div><strong>Generado:</strong> ${fechaActual} ${horaActual}</div>
          <div><strong>Total Días con Movimientos:</strong> ${data.filas.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%">Fecha</th>
              <th style="width: 15%" class="text-right">Saldo Anterior</th>
              <th style="width: 15%" class="text-right">Ingresos</th>
              <th style="width: 15%" class="text-right">Egresos</th>
              <th style="width: 15%" class="text-right">Saldo Actual</th>
              <th style="width: 10%" class="text-center">Movimientos</th>
            </tr>
          </thead>
          <tbody>
            ${data.filas.length === 0 ? `
              <tr>
                <td colspan="6" class="text-center" style="padding: 20px; color: #666;">
                  No hay movimientos en este período
                </td>
              </tr>
            ` : data.filas.map((fila) => `
              <tr>
                <td>${formatDateDisplay(fila.fecha)}</td>
                <td class="text-right">$ ${fila.saldo_anterior.toLocaleString('es-CO')}</td>
                <td class="text-right ${fila.ingresos > 0 ? 'monto-positivo' : ''}">
                  ${fila.ingresos > 0 ? '$ ' + fila.ingresos.toLocaleString('es-CO') : '-'}
                </td>
                <td class="text-right ${fila.egresos > 0 ? 'monto-negativo' : ''}">
                  ${fila.egresos > 0 ? '$ ' + fila.egresos.toLocaleString('es-CO') : '-'}
                </td>
                <td class="text-right"><strong>$ ${fila.saldo_actual.toLocaleString('es-CO')}</strong></td>
                <td class="text-center">${fila.movimientos}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="resumen">
          <h3>📋 RESUMEN DEL PERÍODO</h3>
          <div class="resumen-grid">
            <div class="resumen-item">
              <label>Valor Inicial</label>
              <strong>$ ${data.resumen.valor_inicial.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Total Ingresos</label>
              <strong class="monto-positivo">$ ${data.resumen.total_ingresos.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Total Egresos</label>
              <strong class="monto-negativo">$ ${data.resumen.total_egresos.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Saldo Final</label>
              <strong>$ ${data.resumen.saldo_final.toLocaleString('es-CO')}</strong>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado automáticamente - ${fechaActual} ${horaActual}</p>
          <p>DZ Salón - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;

    ventana.document.write(contenidoHTML);
    ventana.document.close();
    
    setTimeout(() => {
      ventana.print();
    }, 250);
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatPeriodo = () => {
    if (!data) return '';
    return `${formatDateDisplay(data.fecha_inicial)} al ${formatDateDisplay(data.fecha_final)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div
        id="libro-mayor-content"
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            📘 Libro Mayor de Caja
          </h3>
          <button
            onClick={onClose}
            className="no-print p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 bg-gray-800/50 border-b border-gray-700 no-print">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Filtros</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Valor Inicial del Período</label>
              <input
                type="number"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={generarReporte}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generar Reporte
                </>
              )}
            </button>
            <button
              onClick={handleImprimir}
              disabled={!generado}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>
        </div>

        {/* Contenido del reporte */}
        {generado && data ? (
          <div className="p-6">
            {/* Título del reporte */}
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                📒 LIBRO MAYOR DE CAJA
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Período: {formatPeriodo()}
              </p>
            </div>

            {/* Tabla de Libro Mayor */}
            <div className="overflow-x-auto rounded-lg border border-gray-700 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-300">
                    <th className="px-4 py-3 text-left font-semibold">📅 Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold">💰 Saldo Anterior</th>
                    <th className="px-4 py-3 text-right font-semibold text-green-400">📈 Ingresos</th>
                    <th className="px-4 py-3 text-right font-semibold text-red-400">📉 Egresos</th>
                    <th className="px-4 py-3 text-right font-semibold text-blue-400">💵 Saldo Actual</th>
                    <th className="px-4 py-3 text-center font-semibold"> Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.filas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No hay movimientos en este período
                      </td>
                    </tr>
                  ) : (
                    data.filas.map((fila, idx) => {
                      const esNegativo = fila.saldo_actual < 0;
                      return (
                        <tr
                          key={fila.fecha}
                          className={`${
                            idx % 2 === 0
                              ? 'bg-gray-800/30'
                              : 'bg-gray-900/30'
                          } hover:bg-gray-700/50 transition-colors`}
                        >
                          <td className="px-4 py-3 text-gray-300 font-medium">
                            {formatDateDisplay(fila.fecha)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300 font-mono">
                            {formatMoney(fila.saldo_anterior)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-green-400">
                            {fila.ingresos > 0 ? `+${formatMoney(fila.ingresos)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-red-400">
                            {fila.egresos > 0 ? `-${formatMoney(fila.egresos)}` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${
                              esNegativo
                                ? 'text-red-400 bg-red-900/20'
                                : fila.saldo_actual > 0
                                ? 'text-green-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {formatMoney(fila.saldo_actual)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium">
                              {fila.movimientos}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen del Período */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                📊 Resumen del Período
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-gray-500">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Valor Inicial</p>
                  <p className="text-xl font-bold text-white">{formatMoney(data.resumen.valor_inicial)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-green-500">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Ingresos</p>
                  <p className="text-xl font-bold text-green-400">+{formatMoney(data.resumen.total_ingresos)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-red-500">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Egresos</p>
                  <p className="text-xl font-bold text-red-400">-{formatMoney(data.resumen.total_egresos)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border-l-4 border-blue-500">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Saldo Final</p>
                  <p
                    className={`text-xl font-bold ${
                      data.resumen.saldo_final >= 0 ? 'text-blue-400' : 'text-red-400'
                    }`}
                  >
                    {formatMoney(data.resumen.saldo_final)}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del reporte */}
            <div className="mt-6 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
              <p>
                Reporte generado el {new Date().toLocaleString('es-CO')} • DZ Salón - Sistema de Gestión
              </p>
              <p className="mt-1">
                Total de movimientos en el período: <span className="font-semibold text-gray-400">{data.total_movimientos}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">Selecciona un rango de fechas y haz clic en "Generar Reporte"</p>
            <p className="text-sm mt-2">Por defecto se muestra la semana actual (domingo a sábado)</p>
          </div>
        )}

        {/* Footer con botón cerrar */}
        <div className="p-4 border-t border-gray-700 flex justify-end no-print bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}