'use client';

import { useState, useEffect } from 'react';
import { CostoFijoMensual } from '@/lib/api/costosFijos';

interface Proveedor {
  id: number;
  nombre: string;
  numero_documento: string;
  tipo: 'proveedor';
}

interface Profesional {
  id: number;
  nombre: string;
  tipo: 'profesional';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CostoFijoMensual>) => void;
  mode: 'crear' | 'editar';
  costo?: CostoFijoMensual;
  mesDefault?: number;
  anioDefault?: number;
  apiUrl: string;
  token: string | null;
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
  apiUrl,
  token,
}: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [beneficiarioSeleccionado, setBeneficiarioSeleccionado] = useState<number | null>(null);
  const [showNuevoProveedorModal, setShowNuevoProveedorModal] = useState(false);
  
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
    referencia_pago: '',
    es_recurrente: true,
    es_esencial: false,
    notas: '',
  });

  const [loading, setLoading] = useState(false);

  // 🧠 LÓGICA DINÁMICA: El tipo de beneficiario se deriva directamente de la categoría
  const tipoBeneficiario = formData.categoria === 'nomina_fija' ? 'profesional' : 'proveedor';

  // Cargar beneficiarios y datos al abrir
  useEffect(() => {
    if (isOpen) {
      cargarBeneficiarios();
      
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
          referencia_pago: costo.referencia_pago || '',
          es_recurrente: costo.es_recurrente,
          es_esencial: costo.es_esencial,
          notas: costo.notas || '',
        });
        
        // Cargar el beneficiario guardado
        if (costo.profesional) {
          setBeneficiarioSeleccionado(costo.profesional);
        } else if (costo.proveedor) {
          setBeneficiarioSeleccionado(costo.proveedor);
        }
      } else {
        // Resetear para modo crear
        setBeneficiarioSeleccionado(null);
      }
    }
  }, [isOpen, mode, costo, mesDefault, anioDefault]);

  const cargarBeneficiarios = async () => {
    try {
      const [provRes, profRes] = await Promise.all([
        fetch(`${apiUrl}/proveedores/para_costos_fijos/`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }),
        
        fetch(`${apiUrl}/profesionales/?incluir_inactivos=true`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
      ]);
      
      if (provRes.ok) {
        const provData = await provRes.json();
        setProveedores(provData);
      }
      
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfesionales(
          Array.isArray(profData) ? profData : (profData.results || [])
        );
      }
    } catch (error) {
      console.error('Error cargando beneficiarios:', error);
    }
  };

  // 🔄 Handler especial para la categoría: limpia la selección al cambiar para evitar inconsistencias
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, categoria: e.target.value });
    setBeneficiarioSeleccionado(null); // Forzar nueva selección
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!beneficiarioSeleccionado) {
      alert(`Debe seleccionar un ${tipoBeneficiario === 'proveedor' ? 'proveedor' : 'profesional'}`);
      return;
    }

    setLoading(true);

    try {
      const data: Partial<CostoFijoMensual> = {
        ...formData,
        monto: parseFloat(formData.monto),
        monto_proyectado: formData.monto_proyectado ? parseFloat(formData.monto_proyectado) : null,
        tipo_beneficiario: tipoBeneficiario, // Se envía dinámicamente
        proveedor: tipoBeneficiario === 'proveedor' ? beneficiarioSeleccionado : null,
        profesional: tipoBeneficiario === 'profesional' ? beneficiarioSeleccionado : null,
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
7          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Categoría (Ahora controla la lógica del beneficiario) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📂 Categoría *
            </label>
            <select
              required
              value={formData.categoria}
              onChange={handleCategoriaChange}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {formData.categoria === 'nomina_fija' && (
              <p className="text-xs text-green-400 mt-1">💡 Se mostrarán los profesionales del equipo para este pago de nómina.</p>
            )}
          </div>

          {/* Selector de Beneficiario (Dinámico) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {tipoBeneficiario === 'proveedor' ? '🏢 Proveedor *' : '👨‍⚕️ Profesional *'}
            </label>
            <div className="flex gap-2">
              <select
                value={beneficiarioSeleccionado || ''}
                onChange={(e) => setBeneficiarioSeleccionado(Number(e.target.value))}
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                required
              >
                <option value="">
                  Seleccionar {tipoBeneficiario === 'proveedor' ? 'proveedor' : 'profesional'}...
                </option>
                {(tipoBeneficiario === 'proveedor' ? proveedores : profesionales).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} {'numero_documento' in item && item.numero_documento && `(${item.numero_documento})`}
                  </option>
                ))}
              </select>
              
              {tipoBeneficiario === 'proveedor' && (
                <button
                  type="button"
                  onClick={() => setShowNuevoProveedorModal(true)}
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  title="Crear nuevo proveedor"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          </div>

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
              placeholder="Ej: Arriendo local, Internet Tigo, Nómina Marzo"
            />
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

          {/* Día de pago y Método de Pago (Compactos) */}
          <div className="grid grid-cols-2 gap-4">
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
            
            {/* ✅ MÉTODO DE PAGO SIMPLIFICADO A UN SELECTOR */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                💳 Método de Pago
              </label>
              <select
                value={formData.metodo_pago}
                onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              >
                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Referencia de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📄 Referencia de Pago
            </label>
            <input
              type="text"
              value={formData.referencia_pago}
              onChange={(e) => setFormData({ ...formData, referencia_pago: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              placeholder="Número de factura, comprobante, etc."
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.es_recurrente}
                onChange={(e) => setFormData({ ...formData, es_recurrente: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 bg-gray-800 border-gray-600"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">Recurrente</span>
                <span className="text-xs text-gray-400">Se replica cada mes</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors">
              <input
                type="checkbox"
                checked={formData.es_esencial}
                onChange={(e) => setFormData({ ...formData, es_esencial: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 bg-gray-800 border-gray-600"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200">Esencial</span>
                <span className="text-xs text-gray-400">Crítico para operar</span>
              </div>
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
              rows={2}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Observaciones, recordatorios..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3 bg-gray-800 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !beneficiarioSeleccionado}
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

      {/* Modal para crear nuevo proveedor */}
      {showNuevoProveedorModal && (
        <NuevoProveedorModal
          isOpen={showNuevoProveedorModal}
          onClose={() => setShowNuevoProveedorModal(false)}
          onSave={(nuevoProveedor) => {
            setProveedores([...proveedores, nuevoProveedor]);
            setBeneficiarioSeleccionado(nuevoProveedor.id);
            setShowNuevoProveedorModal(false);
          }}
          apiUrl={apiUrl}
          token={token}
        />
      )}
    </div>
  );
}

// ==========================================
// Componente NuevoProveedorModal
// ==========================================
interface NuevoProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proveedor: Proveedor) => void;
  apiUrl: string;
  token: string | null;
}

function NuevoProveedorModal({ isOpen, onClose, onSave, apiUrl, token }: NuevoProveedorModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    numero_documento: '',
    tipo_documento: 'nit',
    email: '',
    telefono: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/proveedores/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        onSave(data);
        onClose();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || error.numero_documento?.[0] || 'Error al crear proveedor'}`);
      }
    } catch (error) {
      console.error('Error creating proveedor:', error);
      alert('Error al crear el proveedor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">➕ Nuevo Proveedor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo Doc.</label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="nit">NIT</option>
                <option value="cedula">Cédula</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Número *</label>
              <input
                type="text"
                required
                value={formData.numero_documento}
                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}