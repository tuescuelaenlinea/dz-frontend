'use client';

//app/admin/profesionales-accesos/page.tsx
import { useState, useEffect } from 'react';
import PermisoGuard from '@/components/admin/PermisoGuard';

// ==========================================
// INTERFACES
// ==========================================
interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  foto_url: string | null;
  activo: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Rol {
  id: number;
  codigo: string;
  nombre: string;
  color: string;
}

interface AccesoProfesional {
  id: number;
  profesional: number;
  profesional_nombre: string;
  profesional_especialidad: string;
  profesional_foto_url: string | null;
  user: number;
  user_username: string;
  user_email: string;
  user_full_name: string;
  rol: number;
  rol_nombre: string;
  rol_codigo: string;
  rol_color: string;
  activo: boolean;
  fecha_asignacion: string;
  fecha_expiracion: string | null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function ProfesionalesAccesosPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const [accesos, setAccesos] = useState<AccesoProfesional[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [accesoEditando, setAccesoEditando] = useState<AccesoProfesional | null>(null);
  const [formData, setFormData] = useState({
    profesional: '',
    user: '',
    rol: '',
    fecha_expiracion: '',
    notas: '',
  });
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filtroProfesional, setFiltroProfesional] = useState('');
  const [filtroUser, setFiltroUser] = useState('');

  // ==========================================
  // CARGAR DATOS
  // ==========================================
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [accesosRes, profsRes, usersRes, rolesRes] = await Promise.all([
        fetch(`${apiUrl}/profesional-user/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/profesionales/?activo=true`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/usuarios/`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/roles/?activo=true`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (accesosRes.ok) {
        const data = await accesosRes.json();
        setAccesos(Array.isArray(data) ? data : (data.results || []));
      }
      if (profsRes.ok) {
        const data = await profsRes.json();
        setProfesionales(Array.isArray(data) ? data : (data.results || []));
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : (data.results || []));
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

// ==========================================
// GUARDAR ACCESO (CORREGIDO)
// ==========================================
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.profesional || !formData.user || !formData.rol) {
    alert('⚠️ Profesional, usuario y rol son requeridos');
    return;
  }

  setSaving(true);
  try {
    // ← ← ← CLAVE: Payload diferente según sea creación o edición ← ← ←
    let payload: any;
    
    if (accesoEditando) {
      // ← ← ← PATCH: Solo enviar campos editables (NO profesional ni user) ← ← ←
      payload = {
        rol: parseInt(formData.rol),
        notas: formData.notas,
      };
      if (formData.fecha_expiracion) {
        payload.fecha_expiracion = formData.fecha_expiracion;
      }
    } else {
      // ← ← ← POST: Enviar todos los campos requeridos ← ← ←
      payload = {
        profesional: parseInt(formData.profesional),
        user: parseInt(formData.user),
        rol: parseInt(formData.rol),
        notas: formData.notas,
      };
      if (formData.fecha_expiracion) {
        payload.fecha_expiracion = formData.fecha_expiracion;
      }
    }

    const url = accesoEditando
      ? `${apiUrl}/profesional-user/${accesoEditando.id}/`
      : `${apiUrl}/profesional-user/`;
    const method = accesoEditando ? 'PATCH' : 'POST';

    console.log(`📤 [handleSubmit] ${method} ${url}`, payload);

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Error response:', errText);
      let errData;
      try {
        errData = JSON.parse(errText);
      } catch {
        errData = { detail: errText };
      }
      throw new Error(errData.detail || JSON.stringify(errData));
    }

    const data = await res.json();
    console.log('✅ Respuesta exitosa:', data);

    alert(`✅ Acceso ${accesoEditando ? 'actualizado' : 'creado'} exitosamente`);
    setModalOpen(false);
    setAccesoEditando(null);
    setFormData({ profesional: '', user: '', rol: '', fecha_expiracion: '', notas: '' });
    cargarDatos();
  } catch (err: any) {
    console.error('❌ Error en handleSubmit:', err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    setSaving(false);
  }
};

  // ==========================================
  // ELIMINAR ACCESO
  // ==========================================
  const handleEliminar = async (acceso: AccesoProfesional) => {
    if (!confirm(`¿Revocar el acceso de ${acceso.user_full_name} a ${acceso.profesional_nombre}?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/profesional-user/${acceso.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('✅ Acceso revocado');
        cargarDatos();
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ==========================================
  // TOGGLE ACTIVO
  // ==========================================
  const handleToggleActivo = async (acceso: AccesoProfesional) => {
    try {
      const res = await fetch(`${apiUrl}/profesional-user/${acceso.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activo: !acceso.activo })
      });
      if (res.ok) {
        cargarDatos();
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ==========================================
  // FILTROS
  // ==========================================
  const accesosFiltrados = accesos.filter(a => {
    if (filtroProfesional && a.profesional !== parseInt(filtroProfesional)) return false;
    if (filtroUser && a.user !== parseInt(filtroUser)) return false;
    return true;
  });

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="p-4 bg-gray-900 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            🔐 Accesos de Profesionales
          </h1>
          <p className="text-gray-400 mt-1">
            Vincula usuarios del sistema con profesionales y asigna roles
          </p>
        </div>
        {/* ← ← ← CORREGIDO: Solo usar modulo, SIN accion ← ← ← */}
        <PermisoGuard modulo="accesos">
          <button
            onClick={() => {
              setAccesoEditando(null);
              setFormData({ profesional: '', user: '', rol: '', fecha_expiracion: '', notas: '' });
              setModalOpen(true);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Acceso
          </button>
        </PermisoGuard>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">
            Filtrar por Profesional
          </label>
          <select
            value={filtroProfesional}
            onChange={(e) => setFiltroProfesional(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos los profesionales</option>
            {profesionales.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">
            Filtrar por Usuario
          </label>
          <select
            value={filtroUser}
            onChange={(e) => setFiltroUser(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos los usuarios</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Accesos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : accesosFiltrados.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <div className="text-5xl mb-3">🔐</div>
          <p className="text-gray-400">No hay accesos configurados</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Profesional</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Expira</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {accesosFiltrados.map(acceso => (
                  <tr key={acceso.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {acceso.profesional_nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{acceso.profesional_nombre}</p>
                          <p className="text-xs text-gray-400">{acceso.profesional_especialidad}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{acceso.user_full_name}</p>
                      <p className="text-xs text-gray-400">@{acceso.user_username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: acceso.rol_color }}
                      >
                        {acceso.rol_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActivo(acceso)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          acceso.activo
                            ? 'bg-green-900/50 text-green-400 border border-green-700'
                            : 'bg-red-900/50 text-red-400 border border-red-700'
                        }`}
                      >
                        {acceso.activo ? '✅ Activo' : '⛔ Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {acceso.fecha_expiracion
                        ? new Date(acceso.fecha_expiracion).toLocaleDateString('es-CO')
                        : '∞ Indefinido'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {/* ← ← ← CORREGIDO: Solo usar modulo, SIN accion ← ← ← */}
                        <PermisoGuard modulo="accesos">
                          <button
                            onClick={() => {
                              setAccesoEditando(acceso);
                              setFormData({
                                profesional: acceso.profesional.toString(),
                                user: acceso.user.toString(),
                                rol: acceso.rol.toString(),
                                fecha_expiracion: acceso.fecha_expiracion?.split('T')[0] || '',
                                notas: '',
                              });
                              setModalOpen(true);
                            }}
                            className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-xs transition-colors"
                          >
                            ✏️
                          </button>
                        </PermisoGuard>
                        {/* ← ← ← CORREGIDO: Solo usar modulo, SIN accion ← ← ← */}
                        <PermisoGuard modulo="accesos">
                          <button
                            onClick={() => handleEliminar(acceso)}
                            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded text-xs transition-colors"
                          >
                            🗑️
                          </button>
                        </PermisoGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {accesoEditando ? '✏️ Editar Acceso' : '➕ Nuevo Acceso'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Vincula un usuario con un profesional y asigna un rol
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Profesional *
                </label>
                <select
                  value={formData.profesional}
                  onChange={(e) => setFormData({ ...formData, profesional: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                  disabled={!!accesoEditando}
                >
                  <option value="">Seleccionar profesional...</option>
                  {profesionales.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - {p.especialidad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Usuario *
                </label>
                <select
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                  disabled={!!accesoEditando}
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Fecha de expiración (opcional)
                </label>
                <input
                  type="date"
                  value={formData.fecha_expiracion}
                  onChange={(e) => setFormData({ ...formData, fecha_expiracion: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deja vacío para acceso indefinido
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Notas sobre este acceso..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setAccesoEditando(null);
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
                  {saving ? 'Guardando...' : (accesoEditando ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}