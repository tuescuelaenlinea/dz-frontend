'use client';
import { useState, useEffect } from 'react';

interface Transaccion {
  fecha: string;
  hora: string;
  tipo: string;
  descripcion: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

interface LibroDiarioData {
  fecha_inicial: string;
  fecha_final: string;
  saldo_inicial: number;
  saldo_final: number;
  total_ingresos: number;
  total_egresos: number;
  transacciones: Transaccion[];
  resumen: {
    saldo_anterior: number;
    total_ingresos: number;
    total_egresos: number;
    saldo_final: number;
  };
}

interface LibroDiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
}

export default function LibroDiarioModal({
  isOpen,
  onClose,
  apiUrl,
  token,
}: LibroDiarioModalProps) {
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [data, setData] = useState<LibroDiarioData | null>(null);
  const [loading, setLoading] = useState(false);

  // ← ← ← NUEVO: Función segura para formatear fechas SIN desplazamiento de zona horaria
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    if (isOpen) {
      // Establecer fecha de hoy por defecto
      const hoy = new Date().toISOString().split('T')[0];
      setFechaInicial(hoy);
      setFechaFinal(hoy);
    }
  }, [isOpen]);

  // En LibroDiarioModal.tsx - función cargarLibroDiario

const cargarLibroDiario = async () => {
  if (!fechaInicial || !fechaFinal) {
    alert('⚠️ Debes seleccionar un rango de fechas');
    return;
  }

  setLoading(true);
  try {
    const params = new URLSearchParams({
      fecha_inicial: fechaInicial,
      fecha_final: fechaFinal,
      saldo_inicial: saldoInicial.replace(/,/g, ''),
    });

    const res = await fetch(`${apiUrl}/caja/libro-diario/?${params}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) throw new Error('Error cargando libro diario');

    const resultado = await res.json();
    
    // ========================================================================
    // ← ← ← FILTRO FRONTEND: Depuración estricta por rango ← ← ←
    // ========================================================================
    const fechaIniFiltro = new Date(fechaInicial + 'T00:00:00');
    const fechaFinFiltro = new Date(fechaFinal + 'T23:59:59.999');

    const transaccionesFiltradas = resultado.transacciones.filter((trans: Transaccion) => {
      const fechaTransStr = `${trans.fecha}T${trans.hora || '00:00:00'}`;
      const fechaTrans = new Date(fechaTransStr);
      
      return fechaTrans >= fechaIniFiltro && fechaTrans <= fechaFinFiltro;
    });

    console.log(`🔍 [Frontend] Filtrado: ${resultado.transacciones.length} → ${transaccionesFiltradas.length} transacciones`);

    // ========================================================================
    // ← ← ← RECÁLCULO DE SALDOS con las transacciones depuradas ← ← ←
    // ========================================================================
    let saldoAcumulado = parseFloat(resultado.saldo_inicial.toString()) || 0;

    const transaccionesConSaldo = transaccionesFiltradas.map((trans: Transaccion) => {
      if (trans.tipo === 'APERTURA') {
        // El saldo de apertura es el saldo inicial
        return { ...trans, saldo: saldoAcumulado };
      } else {
        // Para el resto, acumulamos ingresos - egresos
        saldoAcumulado += (trans.ingresos || 0) - (trans.egresos || 0);
        return { ...trans, saldo: saldoAcumulado };
      }
    });

    // ← ← ← CLAVE: Calcular totales EXCLUYENDO las APERTURAS ← ← ←
    const totalIngresosFiltrado = transaccionesFiltradas
      .filter((t: Transaccion) => t.tipo !== 'APERTURA')  // ← ← ← EXCLUIR APERTURAS
      .reduce((sum: number, t: Transaccion) => sum + (t.ingresos || 0), 0);

    const totalEgresosFiltrado = transaccionesFiltradas
      .filter((t: Transaccion) => t.tipo !== 'APERTURA')  // ← ← ← EXCLUIR APERTURAS
      .reduce((sum: number, t: Transaccion) => sum + (t.egresos || 0), 0);

    // ========================================================================
    // ← ← ← ACTUALIZAR ESTADO CON DATOS DEPURADOS Y RECACLULADOS ← ← ←
    // ========================================================================
    setData({
      ...resultado,
      transacciones: transaccionesConSaldo,
      total_ingresos: totalIngresosFiltrado,
      total_egresos: totalEgresosFiltrado,
      saldo_final: saldoAcumulado,
      resumen: {
        ...resultado.resumen,
        total_ingresos: totalIngresosFiltrado,
        total_egresos: totalEgresosFiltrado,
        saldo_final: saldoAcumulado
      }
    });

  } catch (err) {
    console.error('❌ Error:', err);
    alert('️ No se pudo cargar el libro diario');
  } finally {
    setLoading(false);
  }
};
  const handleImprimir = () => {
    if (!data) return;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('⚠️ Permite las ventanas emergentes para imprimir');
      return;
    }

    const fechaActual = new Date().toLocaleDateString('es-CO');
    const horaActual = new Date().toLocaleTimeString('es-CO');

    // ← ← ← FUNCIÓN DE FORMATO DENTRO DEL HTML PARA EVITAR TZ SHIFTS ← ← ←
    const formatDatePrint = (dateStr: string) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Libro Diario - ${formatDatePrint(data.fecha_inicial)} al ${formatDatePrint(data.fecha_final)}</title>
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
          .tipo-apertura { background: #fef3c7 !important; }
          .tipo-venta { background: #dbeafe !important; }
          .tipo-ingreso { background: #d1fae5 !important; }
          .tipo-egreso { background: #fee2e2 !important; }
          .tipo-pago-empleado { background: #fce7f3 !important; }
          .tipo-comision { background: #e0e7ff !important; }
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
          <h1>📊 LIBRO DIARIO DE CAJA</h1>
          <h2>DZ Salón - Sistema de Gestión</h2>
        </div>

        <div class="info-rango">
          <div><strong>Rango:</strong> ${formatDatePrint(data.fecha_inicial)} - ${formatDatePrint(data.fecha_final)}</div>
          <div><strong>Generado:</strong> ${fechaActual} ${horaActual}</div>
          <div><strong>Total Transacciones:</strong> ${data.transacciones.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%">Fecha</th>
              <th style="width: 7%">Hora</th>
              <th style="width: 10%">Tipo</th>
              <th style="width: 40%">Descripción</th>
              <th style="width: 12%" class="text-right">Ingresos</th>
              <th style="width: 12%" class="text-right">Egresos</th>
              <th style="width: 11%" class="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${data.transacciones.map((trans, index) => `
              <tr class="tipo-${trans.tipo.toLowerCase().replace('_', '-')}">
                <td>${formatDatePrint(trans.fecha)}</td>
                <td class="text-center">${trans.hora}</td>
                <td><strong>${trans.tipo}</strong></td>
                <td>${trans.descripcion}</td>
                <td class="text-right ${trans.ingresos > 0 ? 'monto-positivo' : ''}">
                  ${trans.ingresos > 0 ? '$ ' + trans.ingresos.toLocaleString('es-CO') : '-'}
                </td>
                <td class="text-right ${trans.egresos > 0 ? 'monto-negativo' : ''}">
                  ${trans.egresos > 0 ? '$ ' + trans.egresos.toLocaleString('es-CO') : '-'}
                </td>
                <td class="text-right"><strong>$ ${trans.saldo.toLocaleString('es-CO')}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="resumen">
          <h3>📋 RESUMEN DEL PERÍODO</h3>
          <div class="resumen-grid">
            <div class="resumen-item">
              <label>Saldo Inicial</label>
              <strong>$ ${data.saldo_inicial.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Total Ingresos</label>
              <strong class="monto-positivo">$ ${data.total_ingresos.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Total Egresos</label>
              <strong class="monto-negativo">$ ${data.total_egresos.toLocaleString('es-CO')}</strong>
            </div>
            <div class="resumen-item">
              <label>Saldo Final</label>
              <strong>$ ${data.saldo_final.toLocaleString('es-CO')}</strong>
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Libro Diario de Caja
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Consulta todas las transacciones del período
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-gray-700 bg-gray-900/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fecha Inicial *
              </label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fecha Final *
              </label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Saldo Inicial
              </label>
              <input
                type="text"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={cargarLibroDiario}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Consultar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto p-6">
          {data ? (
            <div className="space-y-6">
              {/* Resumen rápido */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Saldo Inicial</p>
                  <p className="text-lg font-bold text-white">
                    $ {data.saldo_inicial.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-700">
                  <p className="text-xs text-green-400 mb-1">Total Ingresos</p>
                  <p className="text-lg font-bold text-green-400">
                    $ {data.total_ingresos.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="bg-red-900/30 rounded-lg p-4 border border-red-700">
                  <p className="text-xs text-red-400 mb-1">Total Egresos</p>
                  <p className="text-lg font-bold text-red-400">
                    $ {data.total_egresos.toLocaleString('es-CO')}
                  </p>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                  <p className="text-xs text-blue-400 mb-1">Saldo Final</p>
                  <p className="text-lg font-bold text-blue-400">
                    $ {data.saldo_final.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {/* Tabla de transacciones */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300">Hora</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300">Descripción</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">Ingresos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">Egresos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {data.transacciones.map((trans, index) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-800/50 transition-colors ${
                            trans.tipo === 'APERTURA' ? 'bg-yellow-900/20' :
                            trans.tipo === 'VENTA' ? 'bg-blue-900/20' :
                            trans.tipo === 'INGRESO' ? 'bg-green-900/20' :
                            trans.tipo === 'EGRESO' ? 'bg-red-900/20' :
                            trans.tipo === 'PAGO_EMPLEADO' ? 'bg-pink-900/20' :
                            trans.tipo === 'COMISION' ? 'bg-indigo-900/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {/* ← ← ← CORREGIDO: Usa la función segura de formato ← ← ← */}
                            {formatDateDisplay(trans.fecha)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{trans.hora}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              trans.tipo === 'APERTURA' ? 'bg-yellow-900/50 text-yellow-400' :
                              trans.tipo === 'VENTA' ? 'bg-blue-900/50 text-blue-400' :
                              trans.tipo === 'INGRESO' ? 'bg-green-900/50 text-green-400' :
                              trans.tipo === 'EGRESO' ? 'bg-red-900/50 text-red-400' :
                              trans.tipo === 'PAGO_EMPLEADO' ? 'bg-pink-900/50 text-pink-400' :
                              trans.tipo === 'COMISION' ? 'bg-indigo-900/50 text-indigo-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {trans.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{trans.descripcion}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {trans.ingresos > 0 ? (
                              <span className="text-green-400 font-medium">
                                $ {trans.ingresos.toLocaleString('es-CO')}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {trans.egresos > 0 ? (
                              <span className="text-red-400 font-medium">
                                $ {trans.egresos.toLocaleString('es-CO')}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-white">
                            $ {trans.saldo.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {data.transacciones.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">No hay transacciones en este período</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Selecciona un rango de fechas y consulta el libro diario</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        {data && (
          <div className="p-6 border-t border-gray-700 bg-gray-900/50 flex gap-3">
            <button
              onClick={handleImprimir}
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Libro Diario
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}