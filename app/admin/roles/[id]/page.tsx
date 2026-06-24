'use client';
// /app/admin/roles/[id]/page.tsx
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ==========================================
// INTERFACES
// ==========================================
interface Rol {
  id: number;
  codigo: string;
  nombre: string;
  color: string;
}

interface Modulo {
  modulo_id: number;
  modulo_codigo: string;
  modulo_nombre: string;
  modulo_icono: string;
  puede_acceder: boolean;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function ConfigurarModulosPage() {
  const params = useParams();
  const router = useRouter();
  const rolId = params.id as string;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const [rol, setRol] = useState<Rol | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // CARGAR DATOS INICIALES
  // ==========================================
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar rol
        const rolRes = await fetch(`${apiUrl}/roles/${rolId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!rolRes.ok) throw new Error('Rol no encontrado');
        const rolData = await rolRes.json();
        setRol(rolData);

        // Cargar módulos con permisos
        const modulosRes = await fetch(`${apiUrl}/roles/${rolId}/modulos/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (modulosRes.ok) {
          const data = await modulosRes.json();
          setModulos(data.modulos || []);
        }
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (rolId) cargarDatos();
  }, [rolId]);

  // ==========================================
  // TOGGLE PERMISO DE MÓDULO
  // ==========================================
  const toggleModulo = (moduloId: number) => {
    setModulos(prev => prev.map(m => 
      m.modulo_id === moduloId 
        ? { ...m, puede_acceder: !m.puede_acceder }
        : m
    ));
  };

  // ==========================================
  // GUARDAR CAMBIOS
  // ==========================================
  const handleGuardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/roles/${rolId}/actualizar-modulos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          modulos: modulos.map(m => ({
            modulo_id: m.modulo_id,
            puede_acceder: m.puede_acceder
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error guardando permisos');
      }

      alert('✅ Permisos de módulos actualizados exitosamente');
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // SELECCIONAR/DESELECCIONAR TODOS
  // ==========================================
  const seleccionarTodos = () => {
    setModulos(prev => prev.map(m => ({ ...m, puede_acceder: true })));
  };

  const deseleccionarTodos = () => {
    setModulos(prev => prev.map(m => ({ ...m, puede_acceder: false })));
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!rol) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">Rol no encontrado</p>
        <Link href="/admin/roles" className="text-blue-400 hover:underline mt-4 inline-block">
          ← Volver a roles
        </Link>
      </div>
    );
  }

  const modulosActivos = modulos.filter(m => m.puede_acceder).length;

  return (
    <div className="p-4 lg:p-8 bg-gray-900 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/roles"
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-12 rounded"
                style={{ backgroundColor: rol.color }}
              />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  Configurar Módulos
                </h1>
                <p className="text-sm text-gray-400">
                  {rol.nombre} ({rol.codigo})
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {modulosActivos} de {modulos.length} módulos activos
          </span>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          💡 <strong>Selecciona los módulos</strong> que este rol puede ver en el menú administrativo.
          Los cambios se guardan al hacer clic en "Guardar Cambios".
        </p>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2">
        <button
          onClick={seleccionarTodos}
          className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 text-green-300 rounded-lg text-sm font-medium transition-colors"
        >
          ✅ Seleccionar Todos
        </button>
        <button
          onClick={deseleccionarTodos}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 rounded-lg text-sm font-medium transition-colors"
        >
           Deseleccionar Todos
        </button>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map(modulo => (
          <div
            key={modulo.modulo_id}
            className={`bg-gray-800 rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
              modulo.puede_acceder
                ? 'border-green-500 bg-green-900/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => toggleModulo(modulo.modulo_id)}
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{modulo.modulo_icono}</span>
                <div>
                  <h3 className="font-bold text-white">{modulo.modulo_nombre}</h3>
                  <p className="text-xs text-gray-400 font-mono">{modulo.modulo_codigo}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                modulo.puede_acceder
                  ? 'bg-green-500 border-green-500'
                  : 'bg-gray-700 border-gray-600'
              }`}>
                {modulo.puede_acceder && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón Guardar */}
      <div className="sticky bottom-4 bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            {modulosActivos} módulo(s) seleccionado(s)
          </p>
        </div>
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            <>
              💾 Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}