// components/admin/costos-fijos/ProyeccionAnual.tsx
'use client';

import { ProyeccionAnual as ProyeccionAnualType } from '@/lib/api/costosFijos';
import { useState } from 'react';

interface Props {
  proyeccion: ProyeccionAnualType;
  formatMoney: (value: string | number) => string;
}

export default function ProyeccionAnual({ proyeccion, formatMoney }: Props) {
  const [anioSeleccionado, setAnioSeleccionado] = useState(proyeccion.anio);
  const [vistaGrafico, setVistaGrafico] = useState<'barras' | 'lineas'>('barras');

  // Calcular máximo para escalar barras
  const maxMonto = Math.max(...proyeccion.por_mes.map(m => m.total), 1);

  // Colores para cada mes
  const getMesColor = (mes: number) => {
    const colores = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500',
      'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
    ];
    return colores[mes - 1] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Proyección Anual {proyeccion.anio}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Análisis completo de costos fijos proyectados para el año
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setVistaGrafico('barras')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaGrafico === 'barras'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📊 Barras
            </button>
            <button
              onClick={() => setVistaGrafico('lineas')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaGrafico === 'lineas'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📈 Líneas
            </button>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-lg p-4 border border-purple-700/50">
            <p className="text-sm text-purple-300">💰 Total Anual</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatMoney(proyeccion.total_anual)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-lg p-4 border border-blue-700/50">
            <p className="text-sm text-blue-300">📅 Promedio Mensual</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatMoney(proyeccion.promedio_mensual)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-lg p-4 border border-green-700/50">
            <p className="text-sm text-green-300">📊 Meses Registrados</p>
            <p className="text-2xl font-bold text-white mt-1">
              {proyeccion.por_mes.length} / 12
            </p>
          </div>
        </div>

        {/* Gráfico de Barras/Líneas */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            📈 Evolución Mensual de Costos
          </h3>
          
          {vistaGrafico === 'barras' ? (
            // Vista de Barras
            <div className="space-y-3">
              {proyeccion.por_mes.map((mes) => {
                const porcentaje = (mes.total / maxMonto) * 100;
                return (
                  <div key={mes.mes} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium w-24">
                        {mes.mes_nombre}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden relative">
                          <div
                            className={`h-full ${getMesColor(mes.mes)} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${porcentaje}%` }}
                          >
                            {porcentaje > 15 && (
                              <span className="text-xs text-white font-bold">
                                {formatMoney(mes.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-white font-bold w-32 text-right">
                        {formatMoney(mes.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 ml-28">
                      <span>
                        ✅ {formatMoney(mes.pagado)} pagado
                      </span>
                      <span>
                        ⏳ {formatMoney(mes.pendiente)} pendiente
                      </span>
                      <span>
                        {mes.cantidad} costos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Vista de Líneas (simplificada con puntos)
            <div className="relative h-64 bg-gray-800 rounded-lg p-4">
              <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
                {/* Línea de fondo */}
                <line x1="0" y1="280" x2="1200" y2="280" stroke="#374151" strokeWidth="2" />
                
                {/* Puntos y líneas */}
                {proyeccion.por_mes.map((mes, idx) => {
                  const x = (idx / 11) * 1100 + 50;
                  const y = 280 - (mes.total / maxMonto) * 250;
                  
                  return (
                    <g key={mes.mes}>
                      {/* Línea conectora */}
                      {idx > 0 && (
                        <line
                          x1={(idx - 1) / 11 * 1100 + 50}
                          y1={280 - (proyeccion.por_mes[idx - 1].total / maxMonto) * 250}
                          x2={x}
                          y2={y}
                          stroke="#8B5CF6"
                          strokeWidth="3"
                        />
                      )}
                      {/* Punto */}
                      <circle cx={x} cy={y} r="8" fill="#8B5CF6" stroke="#fff" strokeWidth="2" />
                      {/* Label */}
                      <text x={x} y={y - 15} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                        {formatMoney(mes.total)}
                      </text>
                      <text x={x} y="295" textAnchor="middle" fill="#9CA3AF" fontSize="11">
                        {mes.mes_nombre.substring(0, 3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Desglose por Categoría */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📂 Desglose por Categoría
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proyeccion.por_categoria.map((cat, idx) => (
            <div
              key={idx}
              className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-white">
                  {cat.categoria_display}
                </span>
                <span className="text-xs text-gray-400">
                  {cat.cantidad} {cat.cantidad === 1 ? 'costo' : 'costos'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-purple-400">
                  {formatMoney(cat.total)}
                </span>
                <span className="text-sm font-semibold text-gray-300">
                  {cat.porcentaje.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${cat.porcentaje}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Detallada por Mes */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📅 Detalle Mensual
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-2 text-gray-400 font-semibold">Mes</th>
                <th className="text-right py-3 px-2 text-gray-400 font-semibold">Total</th>
                <th className="text-right py-3 px-2 text-gray-400 font-semibold">Pagado</th>
                <th className="text-right py-3 px-2 text-gray-400 font-semibold">Pendiente</th>
                <th className="text-right py-3 px-2 text-gray-400 font-semibold">Costos</th>
                <th className="text-center py-3 px-2 text-gray-400 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {proyeccion.por_mes.map((mes) => {
                const porcentajePagado = mes.total > 0 ? (mes.pagado / mes.total) * 100 : 0;
                return (
                  <tr key={mes.mes} className="border-b border-gray-700/50 hover:bg-gray-900/30 transition-colors">
                    <td className="py-3 px-2 text-white font-medium">
                      {mes.mes_nombre}
                    </td>
                    <td className="py-3 px-2 text-right text-white font-bold">
                      {formatMoney(mes.total)}
                    </td>
                    <td className="py-3 px-2 text-right text-green-400">
                      {formatMoney(mes.pagado)}
                    </td>
                    <td className="py-3 px-2 text-right text-yellow-400">
                      {formatMoney(mes.pendiente)}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-300">
                      {mes.cantidad}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        porcentajePagado >= 100
                          ? 'bg-green-900/30 text-green-400 border border-green-700'
                          : porcentajePagado >= 50
                          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                          : 'bg-orange-900/30 text-orange-400 border border-orange-700'
                      }`}>
                        {porcentajePagado.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}