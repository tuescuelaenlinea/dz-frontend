// app\admin\cuentas-bancarias\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CuentaBancaria {
  id: number;
  banco: 'bancolombia' | 'nequi' | 'davivienda' | 'bbva' | 'otros';
  banco_display?: string;
  tipo_cuenta: 'ahorros' | 'corriente' | 'otros';
  tipo_cuenta_display?: string;
  numero_cuenta: string;
  titular: string;
  documento_titular: string;
  telefono: string;
  activo: boolean;
  es_principal: boolean;
}

export default function AdminCuentasBancariasPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState<CuentaBancaria | null>(null);
  const [formData, setFormData] = useState<Partial<CuentaBancaria>>({
    banco: 'bancolombia',
    tipo_cuenta: 'ahorros',
    numero_cuenta: '',
    titular: '',
    documento_titular: '',
    telefono: '',
    activo: true,
    es_principal: false,
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarCuentas();
  }, []);

  const cargarCuentas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/cuentas-bancarias/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Error al cargar cuentas');
      }

      const data = await res.json();
      setCuentas(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      console.error('Error cargando cuentas:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setCuentaEditando(null);
    setFormData({
      banco: 'bancolombia',
      tipo_cuenta: 'ahorros',
      numero_cuenta: '',
      titular: '',
      documento_titular: '',
      telefono: '',
      activo: true,
      es_principal: false,
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (cuenta: CuentaBancaria) => {
    setCuentaEditando(cuenta);
    setFormData({ ...cuenta });
    setModalAbierto(true);
  };

  const guardarCuenta = async () => {
    if (!formData.numero_cuenta?.trim()) {
      alert('❌ El número de cuenta es obligatorio');
      return;
    }
    if (!formData.titular?.trim()) {
      alert('❌ El titular es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      let res: Response;
      let url: string;
      
      if (cuentaEditando && cuentaEditando.id) {
        url = `${apiUrl}/cuentas-bancarias/${cuentaEditando.id}/`;
        res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        url = `${apiUrl}/cuentas-bancarias/`;
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.numero_cuenta?.[0] || 'Error al guardar');
      }

      alert(`✅ Cuenta ${cuentaEditando ? 'actualizada' : 'creada'} exitosamente`);
      setModalAbierto(false);
      cargarCuentas();
    } catch (err: any) {
      console.error('Error guardando cuenta:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCuenta = async (cuenta: CuentaBancaria) => {
    if (!confirm(`¿Eliminar cuenta ${cuenta.banco} - ${cuenta.numero_cuenta}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/cuentas-bancarias/${cuenta.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Error al eliminar cuenta');
      }

      alert('✅ Cuenta eliminada exitosamente');
      cargarCuentas();
    } catch (err: any) {
      console.error('Error eliminando cuenta:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const toggleActivo = async (cuenta: CuentaBancaria) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/cuentas-bancarias/${cuenta.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !cuenta.activo }),
      });

      if (res.ok) cargarCuentas();
    } catch (err) {
      console.error('Error actualizando cuenta:', err);
    }
  };

  const marcarPrincipal = async (cuenta: CuentaBancaria) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/cuentas-bancarias/${cuenta.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ es_principal: true }),
      });

      if (res.ok) cargarCuentas();
    } catch (err) {
      console.error('Error marcando como principal:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">🏦 Cuentas Bancarias</h1>
          <p className="text-gray-600 mt-2">Configura las cuentas para recibir pagos de reservas</p>
        </div>
        <button
          onClick={() => router.push('/admin/configuracion')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          ← Volver a Configuración
        </button>
      </div>

      {/* Botón Añadir */}
      <div className="mb-6">
        <button
          onClick={abrirModalCrear}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir Cuenta Bancaria
        </button>
      </div>

      {/* Lista de Cuentas */}
      <div className="space-y-4">
        {cuentas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            📭 No hay cuentas bancarias configuradas
          </div>
        ) : (
          cuentas.map((cuenta) => (
            <div 
              key={cuenta.id} 
              className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                cuenta.es_principal ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {cuenta.banco_display || cuenta.banco}
                    </h3>
                    {cuenta.es_principal && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-semibold">
                        ⭐ Principal
                      </span>
                    )}
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                      cuenta.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {cuenta.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 font-medium">Tipo de cuenta:</span>
                      <p className="text-gray-900 capitalize">{cuenta.tipo_cuenta_display || cuenta.tipo_cuenta}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Número:</span>
                      <p className="text-gray-900 font-mono">{cuenta.numero_cuenta}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Titular:</span>
                      <p className="text-gray-900">{cuenta.titular}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Documento:</span>
                      <p className="text-gray-900">{cuenta.documento_titular || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">Teléfono:</span>
                      <p className="text-gray-900">{cuenta.telefono || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => abrirModalEditar(cuenta)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleActivo(cuenta)}
                    className={`p-2 rounded-lg transition-colors ${
                      cuenta.activo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={cuenta.activo ? 'Desactivar' : 'Activar'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  {!cuenta.es_principal && (
                    <button
                      onClick={() => marcarPrincipal(cuenta)}
                      className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Marcar como principal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => eliminarCuenta(cuenta)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {cuentaEditando ? '✏️ Editar Cuenta' : '➕ Nueva Cuenta Bancaria'}
                </h2>
                <p className="text-sm opacity-90">
                  {cuentaEditando ? 'Actualiza la información' : 'Registra una nueva cuenta'}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Banco */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Banco</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banco *</label>
                    <select
                      value={formData.banco ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value as any }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bancolombia">Bancolombia</option>
                      <option value="nequi">Nequi</option>
                      <option value="davivienda">Davivienda</option>
                      <option value="bbva">BBVA</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cuenta *</label>
                    <select
                      value={formData.tipo_cuenta ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_cuenta: e.target.value as any }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ahorros">Ahorros</option>
                      <option value="corriente">Corriente</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Cuenta *</label>
                    <input
                      type="text"
                      value={formData.numero_cuenta ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_cuenta: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="123-456789-00"
                    />
                  </div>
                </div>
              </div>

              {/* Titular */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titular *</label>
                    <input
                      type="text"
                      value={formData.titular ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, titular: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="DZ Salón"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Documento del Titular</label>
                    <input
                      type="text"
                      value={formData.documento_titular ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, documento_titular: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="900123456"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">✅ Cuenta activa (visible para pagos)</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.es_principal}
                      onChange={(e) => setFormData(prev => ({ ...prev, es_principal: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">⭐ Marcar como cuenta principal</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCuenta}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (cuentaEditando ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}