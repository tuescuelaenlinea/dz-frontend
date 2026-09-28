// components/admin/costos-fijos/CostoFijoModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { CostoFijoMensual } from '@/lib/api/costosFijos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CostoFijoMensual>) => void;
  mode: 'crear' | 'editar';
  costo?: CostoFijoMensual;
  mesDefault?: number;
  anioDefault?: number;
}

const CATEGORIAS = [
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

const FRECUENCIAS = [
  { value: 'mensual', label: '📅 Mensual' },
  { value: 'bimestral', label: '📆 Bimestral' },
  { value: 'trimestral', label: '🗓️ Trimestral' },
  { value: 'semestral', label: '📅 Semestral' },
  { value: 'anual', label: '📆 Anual' },
  { value: 'unico', label: '🔹 Único' },
];

const METODOS_PAGO = [
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'nequi', label: '📱 Nequi' },
  { value: 'daviplata', label: '📱 Daviplata' },
  { value: 'bold', label: '💳 Bold' },
  { value: 'tarjeta', label: '💳 Tarjeta' },
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CostoFijoModal({
  isOpen,
  onClose,
  onSubmit,
  mode,
  costo,
  mesDefault,
  anioDefault,
}: Props) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'otros',
    descripcion: '',
    monto: '',
    monto_proyectado: '',
    frecuencia: 'mensual',
    mes_referencia: mesDefault || new Date().getMonth() + 1,
    anio_referencia: anioDefault || new Date().getFullYear(),
    dia_pago: 1,
    metodo_pago: 'transferencia',
    proveedor: '',
    referencia_pago: '',
    es_recurrente: true,
    es_esencial: false,
    notas: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'editar' && costo) {
      setFormData({
        nombre: costo.nombre,
        categoria: costo.categoria,
        descripcion: costo.descripcion || '',
        monto: costo.monto.toString(),
        monto_proyectado: costo.monto_proyectado?.toString() || '',
        frecuencia: costo.frecuencia,
        mes_referencia: costo.mes_referencia,
        anio_referencia: costo.anio_referencia,
        dia_pago: costo.dia_pago,
        metodo_pago: costo.metodo_pago,
        proveedor: costo.proveedor || '',
        referencia_pago: costo.referencia_pago || '',
        es_recurrente: costo.es_recurrente,
        es_esencial: costo.es_esencial,
        notas: costo.notas || '',
      });
    }
  }, [mode, costo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: Partial<CostoFijoMensual> = {
      ...formData,
      monto: parseFloat(formData.monto).toString(),  // ← Convertir a string
      monto_proyectado: formData.monto_proyectado ? parseFloat(formData.monto_proyectado).toString() : null,
    };

      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">
            {mode === 'crear' ? '➕ Nuevo Costo Fijo' : '✏️ Editar Costo Fijo'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'crear'
              ? 'Registra un nuevo costo fijo mensual'
              : 'Modifica los datos del costo fijo'}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📝 Nombre del Costo *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              placeholder="Ej: Arriendo local, Internet Tigo"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📂 Categoría *
            </label>
            <select
              required
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📄 Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                💰 Monto Actual *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📊 Monto Proyectado
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monto_proyectado}
                  onChange={(e) => setFormData({ ...formData, monto_proyectado: e.target.value })}
                  className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>

          {/* Frecuencia y Período */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📅 Frecuencia
              </label>
              <select
                value={formData.frecuencia}
                onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              >
                {FRECUENCIAS.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📆 Mes
              </label>
              <select
                value={formData.mes_referencia}
                onChange={(e) => setFormData({ ...formData, mes_referencia: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              >
                {MESES.map((mes, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📅 Año
              </label>
              <input
                type="number"
                value={formData.anio_referencia}
                onChange={(e) => setFormData({ ...formData, anio_referencia: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Día de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📆 Día de Pago (1-31)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.dia_pago}
              onChange={(e) => setFormData({ ...formData, dia_pago: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              💳 Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS_PAGO.map((metodo) => (
                <button
                  key={metodo.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, metodo_pago: metodo.value })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    formData.metodo_pago === metodo.value
                      ? 'bg-purple-600 border-white text-white'
                      : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {metodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              🏢 Proveedor
            </label>
            <input
              type="text"
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              placeholder="Nombre del proveedor"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_recurrente}
                onChange={(e) => setFormData({ ...formData, es_recurrente: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">
                🔄 Es recurrente (se replica automáticamente cada mes)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_esencial}
                onChange={(e) => setFormData({ ...formData, es_esencial: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">
                ⭐ Es esencial para la operación
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📝 Notas Internas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Observaciones, recordatorios..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : mode === 'crear' ? (
              '✅ Crear Costo'
            ) : (
              '💾 Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}