// components/admin/LibroDiarioCajaModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface Transaccion {
  id: number;
  fecha: string;
  hora: string;
  tipo: 'INGRESO' | 'EGRESO';
  descripcion: string;
  monto: number;
  saldo: number;
}

interface ResumenPeriodo {
  saldoAnterior: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
}

interface LibroDiarioCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  token: string | null;
}

export default function LibroDiarioCajaModal({
  isOpen,
  onClose,
  apiUrl,
  token,
}: LibroDiarioCajaModalProps) {
  // Fechas por defecto: día actual
  const hoy = new Date().toISOString().split('T')[0];
  
  const [fechaInicial, setFechaInicial] = useState(hoy);
  const [fechaFinal, setFechaFinal] = useState(hoy);
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [resumen, setResumen] = useState<ResumenPeriodo>({
    saldoAnterior: 0,
    totalIngresos: 0,
    totalEgresos: 0,
    saldoFinal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [generado, setGenerado] = useState(false);

  // Formatear moneda
  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Formatear fecha
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formatear hora
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Generar libro diario
  const handleGenerarLibro = async () => {
    setLoading(true);
    try {
      // Simular carga de datos (reemplazar con llamada real a API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de ejemplo - REEMPLAZAR CON DATOS REALES DE LA API
      const mockTransacciones: Transaccion[] = [
        {
          id: 1,
          fecha: '2026-07-27',
          hora: '18:13',
          tipo: 'INGRESO',
          descripcion: 'Cobro de pedido PED-260707-M-001 (F-20260707-00001)',
          monto: 16000,
          saldo: 16000,
        },
        {
          id: 2,
          fecha: '2026-07-27',
          hora: '19:44',
          tipo: 'INGRESO',
          descripcion: 'Cobro parcial 1 de pedido PED-260707-L-001 (F-20260707-00002)',
          monto: 20000,
          saldo: 36000,
        },
        {
          id: 3,
          fecha: '2026-07-27',
          hora: '19:54',
          tipo: 'INGRESO',
          descripcion: 'Cobro parcial 1 de pedido PED-260706-D-010 (F-20260707-00003)',
          monto: 25000,
          saldo: 61000,
        },
        {
          id: 4,
          fecha: '2026-07-27',
          hora: '19:54',
          tipo: 'INGRESO',
          descripcion: 'Propina compartida - pedido PED-260706-D-010',
          monto: 2000,
          saldo: 63000,
        },
        {
          id: 5,
          fecha: '2026-07-27',
          hora: '20:15',
          tipo: 'EGRESO',
          descripcion: 'Pago de comisión - Profesional Juan Pérez',
          monto: 45000,
          saldo: 18000,
        },
      ];

      // Calcular totales
      const totalIngresos = mockTransacciones
        .filter(t => t.tipo === 'INGRESO')
        .reduce((sum, t) => sum + t.monto, 0);
      
      const totalEgresos = mockTransacciones
        .filter(t => t.tipo === 'EGRESO')
        .reduce((sum, t) => sum + t.monto, 0);

      setTransacciones(mockTransacciones);
      setResumen({
        saldoAnterior: saldoInicial,
        totalIngresos,
        totalEgresos,
        saldoFinal: saldoInicial + totalIngresos - totalEgresos,
      });
      setGenerado(true);
    } catch (error) {
      console.error('Error generando libro diario:', error);
      alert('Error al generar el libro diario');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar modal y resetear
  const handleClose = () => {
    setGenerado(false);
    setTransacciones([]);
    setFechaInicial(hoy);
    setFechaFinal(hoy);
    setSaldoInicial(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-800">Libro Diario de Caja</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicial *
              </label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Final *
              </label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Inicial del Periodo *
              </label>
              <input
                type="number"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Botón Generar */}
          <button
            onClick={handleGenerarLibro}
            disabled={loading}
            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generar Libro Diario
              </>
            )}
          </button>

          {/* Resumen del Período */}
          {generado && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-4">Resumen del Período</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Saldo Anterior</p>
                    <p className="text-xl font-bold text-gray-800">
                      {formatMoney(resumen.saldoAnterior)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Total Ingresos</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatMoney(resumen.totalIngresos)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Total Egresos</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatMoney(resumen.totalEgresos)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">Saldo Final</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatMoney(resumen.saldoFinal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabla de Transacciones */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Ingresos
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Egresos
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transacciones.map((transaccion) => (
                        <tr 
                          key={transaccion.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(transaccion.fecha)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatTime(transaccion.hora)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaccion.tipo === 'INGRESO'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaccion.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {transaccion.descripcion}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                            {transaccion.tipo === 'INGRESO' 
                              ? formatMoney(transaccion.monto)
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                            {transaccion.tipo === 'EGRESO'
                              ? formatMoney(transaccion.monto)
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-800 bg-green-50">
                            {formatMoney(transaccion.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {transacciones.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No hay transacciones para mostrar en este período</p>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}