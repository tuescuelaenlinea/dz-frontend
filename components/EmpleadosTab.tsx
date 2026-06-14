'use client';
// components/EmpleadosTab.tsx
import { useState, useEffect } from 'react';

interface Empleado {
  id: number;
  usuario: number;
  usuario_nombre: string;
  usuario_email: string;
  convenio: number;
  convenio_codigo: string;
  aliado_nombre: string;
  numero_identificacion: string;
  cargo: string;
  activo: boolean;
  fecha_vinculacion: string;
}

interface EmpleadosTabProps {
  token: string | null;
  apiUrl: string;
}


interface Props {
  token: string | null;
  apiUrl: string;
}

export default function EmpleadosTab({ token, apiUrl }: EmpleadosTabProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAliado, setFiltroAliado] = useState('');
  const [aliados, setAliados] = useState<any[]>([]);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const cargarEmpleados = async () => {
    try {
      const url = filtroAliado 
        ? `${apiUrl}/clientes-aliados/?convenio__aliado=${filtroAliado}`
        : `${apiUrl}/clientes-aliados/`;
      
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setEmpleados(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarAliados = async () => {
    try {
      const res = await fetch(`${apiUrl}/aliados/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAliados(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando aliados:', err);
    }
  };

  useEffect(() => {
    cargarEmpleados();
    cargarAliados();
  }, [filtroAliado]);

  const handleRevocar = async (id: number) => {
    if (!confirm('¿Revocar la afiliación de este empleado?')) return;
    
    try {
      const res = await fetch(`${apiUrl}/clientes-aliados/${id}/revocar/`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        alert('✅ Afiliación revocada');
        cargarEmpleados();
      } else {
        alert('❌ Error al revocar');
      }
    } catch (err) {
      alert('❌ Error de conexión');
    }
  };

  const handleReactivar = async (id: number) => {
    try {
      const res = await fetch(`${apiUrl}/clientes-aliados/${id}/reactivar/`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        alert('✅ Afiliación reactivada');
        cargarEmpleados();
      } else {
        alert('❌ Error al reactivar');
      }
    } catch (err) {
      alert('❌ Error de conexión');
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">👥 Empleados Afiliados</h2>
        <select
          value={filtroAliado}
          onChange={(e) => setFiltroAliado(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white"
        >
          <option value="">Todas las empresas</option>
          {aliados.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      {empleados.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-lg">No hay empleados afiliados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empleados.map((empleado) => (
            <div
              key={empleado.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{empleado.usuario_nombre}</h3>
                  <p className="text-sm text-gray-400">{empleado.usuario_email}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  empleado.activo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {empleado.activo ? 'Activo' : 'Revocado'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Empresa</p>
                  <p className="text-white">{empleado.aliado_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Código Convenio</p>
                  <p className="text-blue-400 font-mono">{empleado.convenio_codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Identificación</p>
                  <p className="text-white">{empleado.numero_identificacion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cargo</p>
                  <p className="text-white">{empleado.cargo || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fecha Vinculación</p>
                  <p className="text-white">{new Date(empleado.fecha_vinculacion).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {empleado.activo ? (
                  <button
                    onClick={() => handleRevocar(empleado.id)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    🚫 Revocar
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivar(empleado.id)}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    ✅ Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}