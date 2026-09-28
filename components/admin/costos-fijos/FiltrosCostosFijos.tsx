// components/admin/costos-fijos/FiltrosCostosFijos.tsx
'use client';

export interface Filtros {
  mes: number;
  anio: number;
  categoria: string;
  estado: string;
  es_recurrente?: boolean;
  es_esencial?: boolean;
}

interface Props {
  filtros: Filtros;
  setFiltros: (filtros: Filtros) => void;
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const CATEGORIAS = [
  { value: '', label: '📂 Todas las categorías' },
  { value: 'arriendo', label: '🏢 Arriendo / Alquiler' },
  { value: 'servicios', label: '💡 Servicios Públicos' },
  { value: 'internet', label: '🌐 Internet / Telefonía' },
  { value: 'software', label: '💻 Software / Suscripciones' },
  { value: 'marketing', label: '📢 Marketing / Publicidad' },
  { value: 'insumos', label: '🧴 Insumos Operativos' },
  { value: 'mantenimiento', label: '🔧 Mantenimiento' },
  { value: 'seguros', label: '🛡️ Seguros' },
  { value: 'impuestos', label: '📋 Impuestos / Tasas' },
  { value: 'nomina_fija', label: '💼 Nómina Fija' },
  { value: 'contabilidad', label: '📊 Contabilidad' },
  { value: 'otros', label: '📦 Otros' },
];

const ESTADOS = [
  { value: '', label: '📋 Todos los estados' },
  { value: 'pendiente', label: '⏳ Pendiente' },
  { value: 'pagado', label: '✅ Pagado' },
  { value: 'proyectado', label: '📊 Proyectado' },
  { value: 'anulado', label: '❌ Anulado' },
];

export default function FiltrosCostosFijos({ filtros, setFiltros }: Props) {
  const handleLimpiarFiltros = () => {
    setFiltros({
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      categoria: '',
      estado: '',
      es_recurrente: undefined,
      es_esencial: undefined,
    });
  };

  const hayFiltrosActivos = 
    filtros.categoria !== '' ||
    filtros.estado !== '' ||
    filtros.es_recurrente !== undefined ||
    filtros.es_esencial !== undefined;

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🔍 Filtros
        </h3>
        {hayFiltrosActivos && (
          <button
            onClick={handleLimpiarFiltros}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
          >
            🗑️ Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            📅 Mes
          </label>
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
          >
            {MESES.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            📆 Año
          </label>
          <input
            type="number"
            value={filtros.anio}
            onChange={(e) => setFiltros({ ...filtros, anio: parseInt(e.target.value) || new Date().getFullYear() })}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            📂 Categoría
          </label>
          <select
            value={filtros.categoria}
            onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            📋 Estado
          </label>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
          >
            {ESTADOS.map((est) => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles adicionales */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.es_recurrente === true}
            onChange={(e) => setFiltros({
              ...filtros,
              es_recurrente: e.target.checked ? true : undefined
            })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">
            🔄 Solo recurrentes
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.es_esencial === true}
            onChange={(e) => setFiltros({
              ...filtros,
              es_esencial: e.target.checked ? true : undefined
            })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">
            ⭐ Solo esenciales
          </span>
        </label>
      </div>

      {/* Resumen de filtros activos */}
      {hayFiltrosActivos && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Filtros activos:</p>
          <div className="flex flex-wrap gap-2">
            {filtros.categoria && (
              <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded border border-purple-700">
                {CATEGORIAS.find(c => c.value === filtros.categoria)?.label}
              </span>
            )}
            {filtros.estado && (
              <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-700">
                {ESTADOS.find(e => e.value === filtros.estado)?.label}
              </span>
            )}
            {filtros.es_recurrente && (
              <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-700">
                🔄 Recurrentes
              </span>
            )}
            {filtros.es_esencial && (
              <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded border border-yellow-700">
                ⭐ Esenciales
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}