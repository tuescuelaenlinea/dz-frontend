'use client';
// /app/admin/roles/page.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PermisoGuard from '@/components/admin/PermisoGuard';

// ==========================================
// INTERFACES
// ==========================================
interface Rol {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  es_sistema: boolean;
  activo: boolean;
  profesionales_count: number;
  modulos_permitidos: Array<{
    modulo_id: number;
    modulo_codigo: string;
    modulo_nombre: string;
    modulo_icono: string;
  }>;
  creado: string;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function RolesPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [rolEditando, setRolEditando] = useState<Rol | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    color: '#3B82F6',
    es_sistema: false,
  });
  const [saving, setSaving] = useState(false);

  // ==========================================
  // CARGAR ROLES
  // ==========================================
  const cargarRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/roles/?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error(' Error cargando roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRoles();
  }, []);

  // ==========================================
  // CREAR / EDITAR ROL
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      alert('⚠️ Código y nombre son requeridos');
      return;
    }

    setSaving(true);
    try {
      const url = rolEditando
        ? `${apiUrl}/roles/${rolEditando.id}/`
        : `${apiUrl}/roles/`;
      const method = rolEditando ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || JSON.stringify(err));
      }

      alert(`✅ Rol ${rolEditando ? 'actualizado' : 'creado'} exitosamente`);
      setModalOpen(false);
      setRolEditando(null);
      setFormData({ codigo: '', nombre: '', descripcion: '', color: '#3B82F6', es_sistema: false });
      cargarRoles();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ELIMINAR ROL
  // ==========================================
  const handleEliminar = async (rol: Rol) => {
    if (rol.es_sistema) {
      alert('⚠️ No se puede eliminar un rol del sistema');
      return;
    }
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/roles/${rol.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ Rol eliminado');
        cargarRoles();
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || err.detail}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ==========================================
  // TOGGLE ACTIVO/INACTIVO
  // ==========================================
  const handleToggleActivo = async (rol: Rol) => {
    try {
      const res = await fetch(`${apiUrl}/roles/${rol.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activo: !rol.activo })
      });
      if (res.ok) {
        cargarRoles();
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ==========================================
  // ABRIR MODAL DE EDICIÓN
  // ==========================================
  const abrirEditar = (rol: Rol) => {
    setRolEditando(rol);
    setFormData({
      codigo: rol.codigo,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      color: rol.color,
      es_sistema: rol.es_sistema,
    });
    setModalOpen(true);
  };

  const abrirNuevo = () => {
    setRolEditando(null);
    setFormData({ codigo: '', nombre: '', descripcion: '', color: '#3B82F6', es_sistema: false });
    setModalOpen(true);
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="p-4 lg:p-8 bg-gray-900 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            🎭 Gestión de Roles
          </h1>
          <p className="text-gray-400 mt-1">
            Define los roles y qué módulos puede ver cada uno
          </p>
        </div>
        <PermisoGuard modulo="roles">
          <button
            onClick={abrirNuevo}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Rol
          </button>
        </PermisoGuard>
      </div>

      {/* Lista de Roles */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="text-5xl mb-3">🎭</div>
          <p className="text-gray-400">No hay roles creados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(rol => (
            <div
              key={rol.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Header con color */}
              <div
                className="h-2"
                style={{ backgroundColor: rol.color }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white truncate">
                        {rol.nombre}
                      </h3>
                      {rol.es_sistema && (
                        <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-[10px] rounded border border-purple-700">
                          SISTEMA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      {rol.codigo}
                    </p>
                  </div>
                  {/* Toggle Activo/Inactivo */}
                  <button
                    onClick={() => handleToggleActivo(rol)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      rol.activo
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-red-900/50 text-red-400 border border-red-700'
                    }`}
                  >
                    {rol.activo ? '✅ Activo' : '⛔ Inactivo'}
                  </button>
                </div>

                {rol.descripcion && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {rol.descripcion}
                  </p>
                )}

                {/* Módulos permitidos */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Módulos permitidos:</p>
                  <div className="flex flex-wrap gap-1">
                    {rol.modulos_permitidos.length === 0 ? (
                      <span className="text-xs text-gray-500 italic">Sin módulos asignados</span>
                    ) : (
                      rol.modulos_permitidos.map(modulo => (
                        <span
                          key={modulo.modulo_id}
                          className="px-2 py-0.5 bg-blue-900/30 text-blue-300 text-[10px] rounded border border-blue-700/50"
                          title={modulo.modulo_nombre}
                        >
                          {modulo.modulo_icono} {modulo.modulo_codigo}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Profesionales</p>
                    <p className="text-lg font-bold text-blue-400">{rol.profesionales_count}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Módulos</p>
                    <p className="text-lg font-bold text-green-400">{rol.modulos_permitidos.length}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/roles/${rol.id}`}
                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded-lg text-sm font-medium transition-colors text-center"
                  >
                    ⚙️ Configurar Módulos
                  </Link>
                  <PermisoGuard modulo="roles">
                    <button
                      onClick={() => abrirEditar(rol)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                      title="Editar rol"
                    >
                      ✏️
                    </button>
                  </PermisoGuard>
                  {!rol.es_sistema && (
                    <PermisoGuard modulo="roles">
                      <button
                        onClick={() => handleEliminar(rol)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 rounded-lg text-sm transition-colors"
                        title="Eliminar rol"
                      >
                        🗑️
                      </button>
                    </PermisoGuard>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {rolEditando ? '✏️ Editar Rol' : '➕ Nuevo Rol'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Código * <span className="text-xs text-gray-500">(único, sin espacios)</span>
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().trim() })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none font-mono"
                  placeholder="ej: recepcionista"
                  disabled={!!rolEditando}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="ej: Recepcionista"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Describe las responsabilidades de este rol..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Color identificador
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 bg-gray-900 border border-gray-600 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.es_sistema}
                  onChange={(e) => setFormData({ ...formData, es_sistema: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={!!rolEditando}
                />
                <span className="text-sm text-gray-300">
                  Es rol del sistema (no se puede eliminar)
                </span>
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setRolEditando(null);
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (rolEditando ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}