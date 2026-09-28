// components/admin/costos-fijos/DashboardCostosFijos.tsx
'use client';

import { ResumenMensual } from '@/lib/api/costosFijos';

interface Props {
  resumen: ResumenMensual;
  formatMoney: (value: string | number) => string;
}

export default function DashboardCostosFijos({ resumen, formatMoney }: Props) {
  const { periodo, totales, cantidades, por_categoria } = resumen;

  // Determinar estado del mes
  const getEstadoMes = () => {
    if (totales.porcentaje_ejecucion >= 100) {
      return { label: '✅ Al día', color: 'bg-green-900/30 border-green-700 text-green-400' };
    } else if (totales.porcentaje_ejecucion >= 50) {
      return { label: '⚠️ En progreso', color: 'bg-yellow-900/30 border-yellow-700 text-yellow-400' };
    } else {
      return { label: '⏳ Pendiente', color: 'bg-orange-900/30 border-orange-700 text-orange-400' };
    }
  };

  const estadoMes = getEstadoMes();

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 Resumen de {periodo.mes_nombre} {periodo.anio}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Control y proyección de costos fijos mensuales
          </p>
        </div>
        <span className={`px-4 py-2 rounded-lg border text-sm font-semibold ${estadoMes.color}`}>
          {estadoMes.label}
        </span>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total del Mes */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm text-gray-400">💰 Total del Mes</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(totales.total)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {cantidades.total} costos registrados
          </p>
        </div>

        {/* Pagado */}
        <div className="bg-gradient-to-br from-green-900/60 to-green-800/40 rounded-xl p-4 border-2 border-green-600 shadow-lg">
          <p className="text-sm font-semibold text-green-200">✅ Pagado</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(totales.pagado)}
          </p>
          <p className="text-xs text-green-300 mt-2">
            {cantidades.pagados} de {cantidades.total} costos
          </p>
        </div>

        {/* Pendiente */}
        <div className="bg-gradient-to-br from-yellow-900/60 to-yellow-800/40 rounded-xl p-4 border-2 border-yellow-600 shadow-lg">
          <p className="text-sm font-semibold text-yellow-200">⏳ Pendiente</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(totales.pendiente)}
          </p>
          <p className="text-xs text-yellow-300 mt-2">
            {cantidades.pendientes} costos por pagar
          </p>
        </div>

        {/* Proyectado */}
        <div className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 rounded-xl p-4 border-2 border-blue-600 shadow-lg">
          <p className="text-sm font-semibold text-blue-200">📊 Proyectado</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(totales.proyectado)}
          </p>
          <p className="text-xs text-blue-300 mt-2">
            {cantidades.proyectados} proyecciones
          </p>
        </div>
      </div>

      {/* ← ← ← NUEVO: GRID PARA EJECUCIÓN Y DESGLOSE EN LA MISMA FILA ← ← ← */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Barra de Progreso */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-300">
              📈 Ejecución del Presupuesto
            </p>
            <p className="text-lg font-bold text-white">
              {totales.porcentaje_ejecucion.toFixed(1)}%
            </p>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totales.porcentaje_ejecucion >= 100
                  ? 'bg-green-500'
                  : totales.porcentaje_ejecucion >= 50
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(totales.porcentaje_ejecucion, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {formatMoney(totales.pagado)} pagado de {formatMoney(totales.total)} presupuestado
          </p>
        </div>

        {/* Desglose por Categoría */}
        {por_categoria.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 h-full">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📂 Desglose por Categoría
            </h3>
            <div className="space-y-3">
              {por_categoria.slice(0, 5).map((cat, idx) => {
                const porcentaje = totales.total > 0 ? (cat.total / totales.total) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 font-medium">
                        {cat.categoria_display}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {cat.cantidad} {cat.cantidad === 1 ? 'costo' : 'costos'}
                        </span>
                        <span className="font-bold text-white">
                          {formatMoney(cat.total)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {porcentaje.toFixed(1)}% del total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}