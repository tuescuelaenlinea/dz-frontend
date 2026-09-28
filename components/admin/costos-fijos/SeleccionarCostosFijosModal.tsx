// components/admin/costos-fijos/SeleccionarCostosFijosModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface CostoFijo {
  id: number;
  nombre: string;
  categoria: string;
  categoria_display: string;
  monto: string;
  dia_pago: number;
  mes_referencia: number;
  anio_referencia: number;
  estado: string;
  es_vencido: boolean;
  dias_para_vencer: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionar: (costos: CostoFijo[]) => void;
  apiUrl: string;
  token: string | null;
}

export default function SeleccionarCostosFijosModal({
  isOpen,
  onClose,
  onSeleccionar,
  apiUrl,
  token
}: Props) {
  const [costosPendientes, setCostosPendientes] = useState<CostoFijo[]>([]);
  const [costosSeleccionados, setCostosSeleccionados] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Cargar costos fijos pendientes
  useEffect(() => {
    if (isOpen) {
      cargarCostosPendientes();
    }
  }, [isOpen]);

  const cargarCostosPendientes = async () => {
    setLoading(true);
    try {
      const hoy = new Date();
      const mesActual = hoy.getMonth() + 1;
      const anioActual = hoy.getFullYear();

      const res = await fetch(
        `${apiUrl}/costos-fijos/?estado=pendiente&mes=${mesActual}&anio=${anioActual}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );

      if (res.ok) {
        const data = await res.json();
        const costos = Array.isArray(data) ? data : (data.results || []);
        setCostosPendientes(costos);
      }
    } catch (err) {
      console.error('❌ Error cargando costos pendientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeleccion = (costoId: number) => {
    const nuevos = new Set(costosSeleccionados);
    if (nuevos.has(costoId)) {
      nuevos.delete(costoId);
    } else {
      nuevos.add(costoId);
    }
    setCostosSeleccionados(nuevos);
  };

  const seleccionarTodos = () => {
    if (costosSeleccionados.size === costosFiltrados.length) {
      setCostosSeleccionados(new Set());
    } else {
      setCostosSeleccionados(new Set(costosFiltrados.map(c => c.id)));
    }
  };

  const handleConfirmar = () => {
    const costos = costosPendientes.filter(c => costosSeleccionados.has(c.id));
    onSeleccionar(costos);
    setCostosSeleccionados(new Set());
    onClose();
  };

  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const getEstadoColor = (costo: CostoFijo) => {
    if (costo.es_vencido) return 'bg-red-900/30 text-red-400 border-red-700';
    if (costo.dias_para_vencer !== null && costo.dias_para_vencer <= 7) {
      return 'bg-orange-900/30 text-orange-400 border-orange-700';
    }
    return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
  };

  const getVencimientoTexto = (costo: CostoFijo) => {
    if (costo.es_vencido) return '❌ Vencido';
    if (costo.dias_para_vencer === 0) return '⚠️ Vence hoy';
    if (costo.dias_para_vencer !== null && costo.dias_para_vencer <= 7) {
      return `⚠️ ${costo.dias_para_vencer}d`;
    }
    return `${costo.dia_pago}/${costo.mes_referencia}`;
  };

  // Filtrar por categoría
  const costosFiltrados = filtroCategoria
    ? costosPendientes.filter(c => c.categoria === filtroCategoria)
    : costosPendientes;

  // Calcular total seleccionado
  const totalSeleccionado = costosPendientes
    .filter(c => costosSeleccionados.has(c.id))
    .reduce((sum, c) => sum + parseFloat(c.monto), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-purple-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                📥 Importar Costos Fijos Pendientes
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Selecciona los costos que deseas agregar al recibo de gasto
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Filtrar por categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="">Todas las categorías</option>
                <option value="arriendo">🏢 Arriendo</option>
                <option value="servicios">💡 Servicios Públicos</option>
                <option value="internet"> Internet</option>
                <option value="software">💻 Software</option>
                <option value="marketing">📢 Marketing</option>
                <option value="insumos"> Insumos</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
                <option value="seguros">️ Seguros</option>
                <option value="impuestos">📋 Impuestos</option>
                <option value="nomina_fija">💼 Nómina</option>
                <option value="contabilidad">📊 Contabilidad</option>
                <option value="otros">📦 Otros</option>
              </select>
            </div>
            <button
              onClick={seleccionarTodos}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {costosSeleccionados.size === costosFiltrados.length ? 'Deseleccionar' : 'Seleccionar'} todos
            </button>
          </div>
        </div>

        {/* Lista de costos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-400">Cargando costos pendientes...</span>
            </div>
          ) : costosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-3">📭</div>
              <p className="text-gray-400 font-medium">
                {filtroCategoria
                  ? 'No hay costos pendientes en esta categoría'
                  : 'No hay costos fijos pendientes para este mes'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {costosFiltrados.map((costo) => {
                const isSelected = costosSeleccionados.has(costo.id);
                return (
                  <div
                    key={costo.id}
                    onClick={() => toggleSeleccion(costo.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-900/30 border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500'
                          : 'border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{costo.categoria_display.split(' ')[0]}</span>
                          <h4 className="font-semibold text-white truncate">
                            {costo.nombre}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-400">
                          {costo.categoria_display.split(' ').slice(1).join(' ')}
                        </p>
                      </div>

                      {/* Monto */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {formatMoney(costo.monto)}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEstadoColor(costo)}`}>
                          {getVencimientoTexto(costo)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con resumen y acciones */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400">
                {costosSeleccionados.size} costo(s) seleccionado(s)
              </p>
              <p className="text-2xl font-bold text-purple-400">
                Total: {formatMoney(totalSeleccionado)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={costosSeleccionados.size === 0}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar al Recibo ({costosSeleccionados.size})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}