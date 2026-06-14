'use client';
import { useState, useEffect } from 'react';

// ✅ CORRECCIÓN 2: Campos alineados al modelo Django de Aliado
interface Aliado {
  id: number;
  nombre: string;
  nit: string;
  contacto_nombre: string;
  contacto_email: string;
  contacto_telefono: string;
  notas: string;
  activo: boolean;
}

interface Convenio {
  id: number;
  aliado: number;
  porcentaje_descuento: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  codigo_acceso: string;
}

interface ClienteAliado {
  id: number;
  usuario: number;
  usuario_nombre: string;
  usuario_email: string;
  convenio: number;
  numero_identificacion: string;
  cargo: string;
  activo: boolean;
  fecha_vinculacion: string;
}

interface AliadosTabProps {
  token: string | null;
  apiUrl: string;
}



export default function AliadosTab({ token, apiUrl }: AliadosTabProps) {
  const [aliados, setAliados] = useState<Aliado[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [empleados, setEmpleados] = useState<ClienteAliado[]>([]);
  
  const [aliadoSeleccionado, setAliadoSeleccionado] = useState<Aliado | null>(null);
  const [expandedAliado, setExpandedAliado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modales
  const [showModalAliado, setShowModalAliado] = useState(false);
  const [showModalConvenio, setShowModalConvenio] = useState(false);
  const [editingAliado, setEditingAliado] = useState<Aliado | null>(null);
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null); // ← NUEVO
  
  // ✅ CORRECCIÓN 2: Formulario alineado a campos del backend
  const [formDataAliado, setFormDataAliado] = useState({
    nombre: '',
    nit: '',
    contacto_nombre: '',
    contacto_email: '',
    contacto_telefono: '',
    notas: '',
    activo: true
  });
  
  const [formDataConvenio, setFormDataConvenio] = useState({
    porcentaje_descuento: 15,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    activo: true
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`
  });

  // Carga inicial
  useEffect(() => {
    cargarAliados();
    cargarConvenios();
  }, []);

  // ✅ CORRECCIÓN 3: Disparar carga de empleados al cambiar selección
  useEffect(() => {
    if (aliadoSeleccionado) {
      cargarEmpleados(aliadoSeleccionado.id);
    } else {
      setEmpleados([]);
    }
  }, [aliadoSeleccionado]);

  const cargarAliados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/aliados/`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAliados(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error('Error cargando aliados:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarConvenios = async () => {
    try {
      const res = await fetch(`${API_URL}/convenios/`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConvenios(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error('Error cargando convenios:', error);
    }
  };

  const cargarEmpleados = async (aliadoId: number) => {
    try {
      const res = await fetch(`${API_URL}/clientes-aliados/?convenio__aliado=${aliadoId}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setEmpleados(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const handleCrearAliado = async () => {
    setLoading(true);
    try {
      const url = editingAliado 
        ? `${API_URL}/aliados/${editingAliado.id}/` 
        : `${API_URL}/aliados/`;
      const method = editingAliado ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formDataAliado)
      });
      
      if (res.ok) {
        await cargarAliados();
        setShowModalAliado(false);
        setEditingAliado(null);
        setFormDataAliado({
          nombre: '', nit: '', contacto_nombre: '', contacto_email: '',
          contacto_telefono: '', notas: '', activo: true
        });
      }
    } catch (error) {
      console.error('Error guardando aliado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarAliado = async (id: number) => {
    if (!confirm('¿Eliminar esta empresa aliada?')) return;
    try {
      const res = await fetch(`${API_URL}/aliados/${id}/`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        await cargarAliados();
        if (aliadoSeleccionado?.id === id) setAliadoSeleccionado(null);
      }
    } catch (error) {
      console.error('Error eliminando:', error);
    }
  };

  // ← ← ← NUEVO: Handler para crear/editar convenio ← ← ←
  const handleGuardarConvenio = async () => {
    if (!aliadoSeleccionado) return;
    setLoading(true);
    try {
      const url = editingConvenio
        ? `${API_URL}/convenios/${editingConvenio.id}/`
        : `${API_URL}/convenios/`;
      const method = editingConvenio ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({ 
          ...formDataConvenio, 
          aliado: aliadoSeleccionado.id 
        })
      });
      
      if (res.ok) {
        await cargarConvenios();
        setShowModalConvenio(false);
        setEditingConvenio(null);
        setFormDataConvenio({
          porcentaje_descuento: 15,
          fecha_inicio: new Date().toISOString().split('T')[0],
          fecha_fin: '',
          activo: true
        });
      } else {
        const error = await res.json();
        alert(`Error: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error guardando convenio:', error);
      alert('Error al guardar convenio');
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← NUEVO: Handler para editar convenio ← ← ←
  const handleEditarConvenio = (convenio: Convenio) => {
    setEditingConvenio(convenio);
    setFormDataConvenio({
      porcentaje_descuento: convenio.porcentaje_descuento,
      fecha_inicio: convenio.fecha_inicio,
      fecha_fin: convenio.fecha_fin || '',
      activo: convenio.activo
    });
    setShowModalConvenio(true);
  };

  const handleRevocarEmpleado = async (empleadoId: number) => {
    if (!confirm('¿Revocar acceso a este empleado?')) return;
    try {
      const res = await fetch(`${API_URL}/clientes-aliados/${empleadoId}/revocar/`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok && aliadoSeleccionado) await cargarEmpleados(aliadoSeleccionado.id);
    } catch (error) {
      console.error('Error revocando:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Módulo de Aliados</h1>
      
      <div className="grid grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO (40%) */}
        <div className="col-span-5 space-y-4">
          <button
            onClick={() => {
              setEditingAliado(null);
              setFormDataAliado({ nombre: '', nit: '', contacto_nombre: '', contacto_email: '', contacto_telefono: '', notas: '', activo: true });
              setShowModalAliado(true);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            + Nueva Empresa
          </button>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
            {aliados.map((aliado) => {
              const isExpanded = expandedAliado === aliado.id;
              const isSelected = aliadoSeleccionado?.id === aliado.id;
              const convenioEmpresa = convenios.find(c => c.aliado === aliado.id && c.activo);

              return (
                <div key={aliado.id} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                  {/* Encabezado Acordeón */}
                  <div
                    onClick={() => {
                      setExpandedAliado(isExpanded ? null : aliado.id);
                      setAliadoSeleccionado(aliado);
                    }}
                    className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/40 border-l-4 border-blue-500' : 'hover:bg-gray-750'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{aliado.nombre}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded ${aliado.activo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {aliado.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          {/* ← ← ← CAMBIO: Badge clickeable para editar convenio ← ← ← */}
                          {convenioEmpresa && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAliadoSeleccionado(aliado);
                                handleEditarConvenio(convenioEmpresa);
                              }}
                              className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800 hover:bg-blue-900/50 transition-colors"
                              title="Click para editar convenio"
                            >
                              🎫 Convenio: {convenioEmpresa.codigo_acceso} ({convenioEmpresa.porcentaje_descuento}%)
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* ← ← ← CAMBIO: Botón "Nuevo Convenio" solo si no existe convenio ← ← ← */}
                      {!convenioEmpresa && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAliadoSeleccionado(aliado);
                            setEditingConvenio(null);
                            setFormDataConvenio({
                              porcentaje_descuento: 15,
                              fecha_inicio: new Date().toISOString().split('T')[0],
                              fecha_fin: '',
                              activo: true
                            });
                            setShowModalConvenio(true);
                          }}
                          className="ml-4 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                        >
                          + Nuevo Convenio
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle Expandible */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-800/60 border-t border-gray-700 text-sm space-y-2">
                      <p className="text-gray-300"><span className="text-gray-500">NIT:</span> {aliado.nit}</p>
                      <p className="text-gray-300"><span className="text-gray-500">Contacto:</span> {aliado.contacto_nombre || 'N/A'}</p>
                      <p className="text-gray-300"><span className="text-gray-500">Email:</span> {aliado.contacto_email || 'N/A'}</p>
                      <p className="text-gray-300"><span className="text-gray-500">Teléfono:</span> {aliado.contacto_telefono || 'N/A'}</p>
                      <p className="text-gray-300"><span className="text-gray-500">Notas:</span> {aliado.notas || 'Sin notas'}</p>
                      
                      <div className="flex gap-2 pt-3">
                        <button
                          onClick={() => {
                            setEditingAliado(aliado);
                            setFormDataAliado({
                              nombre: aliado.nombre, nit: aliado.nit, contacto_nombre: aliado.contacto_nombre,
                              contacto_email: aliado.contacto_email, contacto_telefono: aliado.contacto_telefono,
                              notas: aliado.notas, activo: aliado.activo
                            });
                            setShowModalAliado(true);
                          }}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleEliminarAliado(aliado.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO (60%) */}
        <div className="col-span-7 bg-gray-800 rounded-lg p-6 min-h-[500px]">
          {aliadoSeleccionado ? (
            <>
              <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{aliadoSeleccionado.nombre}</h2>
                  <p className="text-gray-400 text-sm">Empleados afiliados ({empleados.length})</p>
                </div>
                {convenios.find(c => c.aliado === aliadoSeleccionado.id && c.activo) && (
                  <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-right">
                    <p className="text-blue-300 text-sm font-medium">Convenio Activo</p>
                    <p className="text-white text-lg font-bold">
                      {convenios.find(c => c.aliado === aliadoSeleccionado.id && c.activo)?.porcentaje_descuento}% DESC
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {empleados.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No hay empleados registrados para esta empresa</p>
                    <p className="text-xs mt-2">Los empleados se registran automáticamente usando el código de convenio</p>
                  </div>
                ) : (
                  empleados.map((emp) => (
                    <div key={emp.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-semibold text-white">{emp.usuario_nombre}</span>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-300">{emp.cargo || 'Sin cargo'}</span>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-400 text-xs">
                            Vinculado: {new Date(emp.fecha_vinculacion).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${emp.activo ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                            {emp.activo ? 'Activo' : 'Revocado'}
                          </span>
                        </div>
                        {emp.activo && (
                          <button
                            onClick={() => handleRevocarEmpleado(emp.id)}
                            className="ml-4 text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 px-3 py-1 rounded transition-all"
                          >
                            Revocar
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 flex gap-3">
                        <span>ID: {emp.numero_identificacion}</span>
                        <span>•</span>
                        <span>{emp.usuario_email}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg">Selecciona una empresa para ver sus empleados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Aliado */}
      {showModalAliado && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">{editingAliado ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
            <div className="space-y-3">
              <input placeholder="Nombre *" className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.nombre} onChange={e => setFormDataAliado({...formDataAliado, nombre: e.target.value})} />
              <input placeholder="NIT *" className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.nit} onChange={e => setFormDataAliado({...formDataAliado, nit: e.target.value})} />
              <input placeholder="Nombre Contacto" className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.contacto_nombre} onChange={e => setFormDataAliado({...formDataAliado, contacto_nombre: e.target.value})} />
              <input placeholder="Email Contacto" type="email" className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.contacto_email} onChange={e => setFormDataAliado({...formDataAliado, contacto_email: e.target.value})} />
              <input placeholder="Teléfono Contacto" className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.contacto_telefono} onChange={e => setFormDataAliado({...formDataAliado, contacto_telefono: e.target.value})} />
              <textarea placeholder="Notas" rows={2} className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white" value={formDataAliado.notas} onChange={e => setFormDataAliado({...formDataAliado, notas: e.target.value})} />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={formDataAliado.activo} onChange={e => setFormDataAliado({...formDataAliado, activo: e.target.checked})} /> Activo
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModalAliado(false)} className="flex-1 py-2 bg-gray-700 rounded text-white">Cancelar</button>
              <button onClick={handleCrearAliado} disabled={loading} className="flex-1 py-2 bg-blue-600 rounded text-white disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← NUEVO: Modal Convenio Completo ← ← ← */}
      {showModalConvenio && aliadoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {editingConvenio ? '✏️ Editar Convenio' : '➕ Nuevo Convenio'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Empresa: <span className="text-blue-400 font-medium">{aliadoSeleccionado.nombre}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Porcentaje de Descuento *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                  value={formDataConvenio.porcentaje_descuento}
                  onChange={e => setFormDataConvenio({...formDataConvenio, porcentaje_descuento: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                    value={formDataConvenio.fecha_inicio}
                    onChange={e => setFormDataConvenio({...formDataConvenio, fecha_inicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Fin (opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white"
                    value={formDataConvenio.fecha_fin}
                    onChange={e => setFormDataConvenio({...formDataConvenio, fecha_fin: e.target.value})}
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formDataConvenio.activo}
                  onChange={e => setFormDataConvenio({...formDataConvenio, activo: e.target.checked})}
                />
                Convenio activo
              </label>
              
              {editingConvenio && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-300 mb-1">Código de Acceso (generado automáticamente):</p>
                  <p className="text-white font-mono text-sm">{editingConvenio.codigo_acceso}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModalConvenio(false);
                  setEditingConvenio(null);
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarConvenio}
                disabled={loading || !formDataConvenio.porcentaje_descuento || !formDataConvenio.fecha_inicio}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Guardando...' : (editingConvenio ? 'Actualizar' : 'Crear Convenio')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}