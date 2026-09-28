// components/admin/costos-fijos/CostoFijoCard.tsx
'use client';

import { CostoFijoMensual } from '@/lib/api/costosFijos';

interface Props {
  costo: CostoFijoMensual;
  onEditar: (costo: CostoFijoMensual) => void;
  onEliminar: (id: number) => void;
  onMarcarPagado: (costo: CostoFijoMensual) => void;
  onProyectar: (costo: CostoFijoMensual) => void;
  formatMoney: (value: string | number) => string;
  loading?: boolean;
}

export default function CostoFijoCard({
  costo,
  onEditar,
  onEliminar,
  onMarcarPagado,
  onProyectar,
  formatMoney,
  loading,
}: Props) {
  // Colores por estado
  const getEstadoColor = () => {
    switch (costo.estado) {
      case 'pagado':
        return 'bg-green-900/30 border-green-700 text-green-400';
      case 'pendiente':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'proyectado':
        return 'bg-blue-900/30 border-blue-700 text-blue-400';
      case 'anulado':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-gray-900/30 border-gray-700 text-gray-400';
    }
  };

  // Indicador de vencimiento
  const getVencimientoIndicator = () => {
    if (costo.estado !== 'pendiente') return null;

    if (costo.es_vencido) {
      return (
        <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded border border-red-700">
          ❌ Vencido
        </span>
      );
    }

    if (costo.dias_para_vencer !== null && costo.dias_para_vencer <= 7) {
      return (
        <span className="px-2 py-1 bg-orange-900/50 text-orange-400 text-xs rounded border border-orange-700">
          ⚠️ {costo.dias_para_vencer}d
        </span>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{costo.categoria_display.split(' ')[0]}</span>
              <span className="text-xs text-gray-400 font-medium">
                {costo.categoria_display.split(' ').slice(1).join(' ')}
              </span>
            </div>
            <h3 className="text-base font-bold text-white truncate">
              {costo.nombre}
            </h3>
            {costo.proveedor && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                🏢 {costo.proveedor}
              </p>
            )}
          </div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${getEstadoColor()}`}>
            {costo.estado_display}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Monto */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">💰 Monto</span>
          <span className="text-xl font-bold text-white">
            {formatMoney(costo.monto)}
          </span>
        </div>

        {/* Frecuencia */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">📅 Frecuencia</span>
          <span className="text-gray-300">{costo.frecuencia_display}</span>
        </div>

        {/* Día de pago */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">📆 Día de pago</span>
          <span className="text-gray-300">Día {costo.dia_pago}</span>
        </div>

        {/* Método de pago */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">💳 Método</span>
          <span className="text-gray-300">{costo.metodo_pago_display}</span>
        </div>

        {/* Indicadores */}
        <div className="flex items-center gap-2 flex-wrap">
          {getVencimientoIndicator()}
          {costo.es_recurrente && (
            <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-700">
              🔄 Recurrente
            </span>
          )}
          {costo.es_esencial && (
            <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded border border-red-700">
              ⭐ Esencial
            </span>
          )}
        </div>

        {/* Proyección anual */}
        {costo.proyeccion_anual > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">📊 Proyección anual</span>
              <span className="font-semibold text-blue-400">
                {formatMoney(costo.proyeccion_anual)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Acciones */}
      <div className="p-3 bg-gray-900/50 border-t border-gray-700 flex gap-2">
        {costo.estado === 'pendiente' && (
          <button
            onClick={() => onMarcarPagado(costo)}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            ✅ Pagar
          </button>
        )}
        {costo.estado === 'pagado' && (
          <button
            onClick={() => onProyectar(costo)}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            📊 Proyectar
          </button>
        )}
        <button
          onClick={() => onEditar(costo)}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onEliminar(costo.id)}
          disabled={loading}
          className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 border border-red-700"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}