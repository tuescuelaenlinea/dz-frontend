'use client';
// components/ConveniosTab.tsx
import { useState, useEffect } from 'react';

interface Convenio {
  id: number;
  aliado: number;
  aliado_nombre: string;
  porcentaje_descuento: string;
  aplica_a: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  codigo_acceso: string;
}

interface Props {
  token: string | null;
  apiUrl: string;
}

interface ConveniosTabProps {
  token: string | null;
  apiUrl: string;
}


export default function ConveniosTab({ token, apiUrl }: ConveniosTabProps) {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const cargarConvenios = async () => {
    try {
      const res = await fetch(`${apiUrl}/convenios/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConvenios(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando convenios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConvenios();
  }, []);

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este convenio?')) return;
    
    try {
      const res = await fetch(`${apiUrl}/convenios/${id}/`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        alert('✅ Convenio eliminado');
        cargarConvenios();
      } else {
        alert('❌ Error al eliminar');
      }
    } catch (err) {
      alert('❌ Error de conexión');
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    alert('✅ Código copiado al portapapeles');
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">📋 Convenios de Descuento</h2>
        <button
          onClick={() => {
            setEditingConvenio(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
        >
          + Nuevo Convenio
        </button>
      </div>

      {convenios.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-lg">No hay convenios registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {convenios.map((convenio) => (
            <div
              key={convenio.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{convenio.aliado_nombre}</h3>
                  <p className="text-sm text-gray-400">
                    {convenio.fecha_inicio} → {convenio.fecha_fin || 'Indefinido'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  convenio.activo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {convenio.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Descuento</p>
                  <p className="text-2xl font-bold text-blue-400">{convenio.porcentaje_descuento}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Aplica a</p>
                  <p className="text-sm text-white capitalize">{convenio.aplica_a}</p>
                </div>
              </div>

              {/* Código de acceso destacado */}
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Código de Acceso</p>
                    <p className="text-lg font-mono font-bold text-white">{convenio.codigo_acceso}</p>
                  </div>
                  <button
                    onClick={() => copiarCodigo(convenio.codigo_acceso)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingConvenio(convenio);
                    setShowModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleEliminar(convenio.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ConvenioModal
          convenio={editingConvenio}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            cargarConvenios();
          }}
          token={token}
          apiUrl={apiUrl}
        />
      )}
    </div>
  );
}

// Modal de Crear/Editar Convenio
function ConvenioModal({ convenio, onClose, onSave, token, apiUrl }: any) {
  const [aliados, setAliados] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    aliado: convenio?.aliado || '',
    porcentaje_descuento: convenio?.porcentaje_descuento || '',
    aplica_a: convenio?.aplica_a || 'todos',
    fecha_inicio: convenio?.fecha_inicio || '',
    fecha_fin: convenio?.fecha_fin || '',
    activo: convenio?.activo ?? true
  });
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  useEffect(() => {
    // Cargar lista de aliados para el select
    fetch(`${apiUrl}/aliados/`, { headers })
      .then(res => res.json())
      .then(data => setAliados(Array.isArray(data) ? data : (data.results || [])))
      .catch(err => console.error('Error cargando aliados:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = convenio ? `${apiUrl}/convenios/${convenio.id}/` : `${apiUrl}/convenios/`;
      const method = convenio ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          porcentaje_descuento: parseFloat(formData.porcentaje_descuento)
        })
      });

      if (res.ok) {
        alert(convenio ? '✅ Convenio actualizado' : '✅ Convenio creado');
        onSave();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${JSON.stringify(error)}`);
      }
    } catch (err) {
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">
            {convenio ? '✏️ Editar Convenio' : '➕ Nuevo Convenio'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Empresa Aliada *
            </label>
            <select
              required
              value={formData.aliado}
              onChange={(e) => setFormData({ ...formData, aliado: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
            >
              <option value="">Seleccionar empresa...</option>
              {aliados.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Porcentaje de Descuento *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={formData.porcentaje_descuento}
              onChange={(e) => setFormData({ ...formData, porcentaje_descuento: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Aplica a
            </label>
            <select
              value={formData.aplica_a}
              onChange={(e) => setFormData({ ...formData, aplica_a: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
            >
              <option value="todos">Todos los servicios</option>
              <option value="categorias">Categorías específicas</option>
              <option value="servicios">Servicios específicos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              required
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fecha de Fin (opcional)
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="activo" className="text-sm text-gray-300">
              Convenio activo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}