'use client';

import { useState, useEffect, useMemo } from 'react';  // ← Agregar useMemo
import { api } from '@/lib/api';

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  disponible: boolean;
  categoria?: number | null;
  categoria_nombre?: string | null;
  precio_min?: string;
  duracion?: string;
}

interface CategoryServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriaId: number;
  categoriaNombre: string;
  onServicesUpdated: () => void;
}

type ModalView = 'assigned' | 'manage';

export default function CategoryServicesModal({
  isOpen,
  onClose,
  categoriaId,
  categoriaNombre,
  onServicesUpdated,
}: CategoryServicesModalProps) {
  const [view, setView] = useState<ModalView>('assigned');
  const [serviciosAsignados, setServiciosAsignados] = useState<Servicio[]>([]);
  const [todosLosServicios, setTodosLosServicios] = useState<Servicio[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  
  // ← NUEVO: Estado para búsqueda/filtro
  const [busqueda, setBusqueda] = useState('');

  // Cargar datos según la vista
  useEffect(() => {
    if (isOpen) {
      if (view === 'assigned') {
        cargarServiciosAsignados();
      } else {
        cargarTodosLosServicios();
      }
    }
  }, [isOpen, view]);

  // Resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setView('assigned');
      setServiciosSeleccionados([]);
      setError(null);
      setMensaje(null);
      setBusqueda('');  // ← Limpiar búsqueda al cerrar
    }
  }, [isOpen]);

  // Cargar servicios ya asignados a esta categoría
  const cargarServiciosAsignados = async () => {
    try {
      setLoading(true);
      setError(null);
      setMensaje(null);
      
      const data = await api.getCategoriaServicios(categoriaId);
      const servicios = data.servicios || data.results || data || [];
      setServiciosAsignados(Array.isArray(servicios) ? servicios : []);
      
    } catch (err: any) {
      console.error('❌ Error cargando servicios asignados:', err);
      setError(err.message || 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  // ← NUEVO: Filtrar servicios según búsqueda (con useMemo para performance)
  const serviciosFiltrados = useMemo(() => {
    if (!busqueda.trim()) {
      return todosLosServicios;  // Sin búsqueda: mostrar todos
    }
    
    const termino = busqueda.toLowerCase().trim();
    return todosLosServicios.filter(servicio => {
      const nombreMatch = servicio.nombre.toLowerCase().includes(termino);
      const categoriaMatch = servicio.categoria_nombre?.toLowerCase().includes(termino);
      return nombreMatch || categoriaMatch;
    });
  }, [todosLosServicios, busqueda]);

  // ← NUEVO: Cargar TODOS los servicios (con su categoría actual)
  const cargarTodosLosServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      setMensaje(null);
      
      const data = await api.getServiciosParaAsignar();
      const servicios = data.servicios || data.results || data || [];
      setTodosLosServicios(Array.isArray(servicios) ? servicios : []);
      
      // ← Pre-marcar servicios que ya están en esta categoría
      const seleccionados = servicios
        .filter((s: Servicio) => s.categoria === categoriaId)
        .map((s: Servicio) => s.id);
      
      setServiciosSeleccionados(seleccionados);
      console.log(`✅ Servicios pre-marcados: ${seleccionados.length} (de ${servicios.length} totales)`);
      
    } catch (err: any) {
      console.error('❌ Error cargando todos los servicios:', err);
      setError(err.message || 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selección individual
  const toggleServicio = (servicioId: number) => {
    setServiciosSeleccionados(prev => 
      prev.includes(servicioId)
        ? prev.filter(id => id !== servicioId)
        : [...prev, servicioId]
    );
  };

  // ← ACTUALIZADO: Seleccionar/deseleccionar todos los FILTRADOS (no todos)
  const toggleTodos = () => {
    if (serviciosFiltrados.length === 0) return;
    
    const todosSeleccionados = serviciosFiltrados.every(s => 
      serviciosSeleccionados.includes(s.id)
    );
    
    if (todosSeleccionados) {
      // Deseleccionar solo los filtrados
      setServiciosSeleccionados(prev => 
        prev.filter(id => !serviciosFiltrados.some(s => s.id === id))
      );
    } else {
      // Seleccionar todos los filtrados
      const idsFiltrados = serviciosFiltrados.map(s => s.id);
      setServiciosSeleccionados(prev => [...new Set([...prev, ...idsFiltrados])]);
    }
  };

  // ← NUEVO: Guardar cambios (asignar/desasignar servicios)
  const guardarCambios = async () => {
    try {
      setGuardando(true);
      setError(null);
      setMensaje(null);
      
      // ← Obtener servicios que estaban asignados antes (para detectar cambios)
      const asignadosAntes = serviciosAsignados.map(s => s.id);
      
      // ← Servicios que se van a asignar (marcados ahora)
      const asignadosAhora = serviciosSeleccionados;
      
      // ← Detectar cambios
      const paraAgregar = asignadosAhora.filter(id => !asignadosAntes.includes(id));
      const paraQuitar = asignadosAntes.filter(id => !asignadosAhora.includes(id));
      
      console.log('📊 Cambios detectados:', {
        paraAgregar: paraAgregar.length,
        paraQuitar: paraQuitar.length,
        totalSeleccionados: asignadosAhora.length
      });
      
      // ← Si no hay cambios, solo mostrar mensaje
      if (paraAgregar.length === 0 && paraQuitar.length === 0) {
        setMensaje('ℹ️ No hay cambios para guardar');
        setTimeout(() => {
          setMensaje(null);
          setView('assigned');
        }, 2000);
        return;
      }
      
      // ← NUEVO: Usar endpoint de REASIGNACIÓN (permite mover entre categorías)
      const response = await api.reasignarServiciosACategoria(categoriaId, asignadosAhora);
      
      console.log('✅ Respuesta de reasignación:', response);
      
      // ← Mostrar mensaje de éxito
      setMensaje(response.mensaje || `✅ ${asignadosAhora.length} servicios actualizados`);
      
      // ← Actualizar lista de asignados con la respuesta del backend
      if (response.servicios) {
        setServiciosAsignados(response.servicios);
      } else {
        // Si no viene la lista completa, recargar
        await cargarServiciosAsignados();
      }
      
      // ← Limpiar selección y volver a vista principal
      setServiciosSeleccionados([]);
      setView('assigned');
      
      // ← Actualizar contador en lista principal de categorías
      onServicesUpdated();
      
      // ← Auto-ocultar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000);
      
    } catch (err: any) {
      console.error('❌ Error guardando cambios:', err);
      
      // Manejar errores específicos
      if (err.message?.includes('ya tienen categoría')) {
        setError('⚠️ Error: El endpoint antiguo no permite mover servicios. Contacta al administrador.');
      } else {
        setError(err.message || 'Error al guardar los cambios');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* ========== HEADER ========== */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {view === 'assigned' ? '🗂️' : '✏️'}
              {view === 'assigned' ? 'Servicios de' : 'Gestionar'} "{categoriaNombre}"
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {view === 'assigned' 
                ? `${serviciosAsignados.length} servicios asignados` 
                : `${serviciosSeleccionados.length} de ${serviciosFiltrados.length} seleccionados${busqueda ? ` (filtrados de ${todosLosServicios.length})` : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ========== CONTENT ========== */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Mensaje de éxito */}
          {mensaje && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">{mensaje}</span>
            </div>
          )}
          
          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
              <button 
                onClick={() => view === 'assigned' ? cargarServiciosAsignados() : cargarTodosLosServicios()}
                className="mt-2 text-red-600 hover:text-red-800 font-medium text-sm"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ========== VISTA 1: SERVICIOS ASIGNADOS ========== */}
          {view === 'assigned' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  <span className="mt-3 text-gray-600">Cargando servicios...</span>
                </div>
              ) : serviciosAsignados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-lg font-medium">No hay servicios asignados</p>
                  <p className="text-sm text-gray-400 mt-1">Usa "Gestionar servicios" para asignar</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {serviciosAsignados.map((servicio) => (
                    <div 
                      key={servicio.id}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{servicio.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {servicio.duracion && `⏱️ ${servicio.duracion}`}
                          {servicio.precio_min && ` • 💰 $${servicio.precio_min}`}
                        </p>
                      </div>
                      <span className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Asignado
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón para gestionar servicios */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setView('manage')}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  ✏️ Gestionar servicios
                </button>
              </div>
            </div>
          )}

          {/* ========== VISTA 2: GESTIONAR TODOS LOS SERVICIOS ========== */}
          {view === 'manage' && (
            <div className="space-y-4">
              
              {/* ← NUEVO: Campo de búsqueda */}
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="🔍 Buscar servicio por nombre o categoría..."
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
                <svg 
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Controles de selección */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-600">
                  {busqueda ? (
                    <>
                      Mostrando <strong className="text-indigo-600">{serviciosFiltrados.length}</strong> de {todosLosServicios.length} servicios
                    </>
                  ) : (
                    <>
                      <strong className="text-indigo-600">{serviciosSeleccionados.length}</strong> de {todosLosServicios.length} seleccionados
                    </>
                  )}
                </span>
                <button
                  onClick={toggleTodos}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                  disabled={loading || serviciosFiltrados.length === 0}
                >
                  {serviciosFiltrados.length > 0 && serviciosFiltrados.every(s => serviciosSeleccionados.includes(s.id))
                    ? 'Deseleccionar filtrados' 
                    : 'Seleccionar filtrados'}
                </button>
              </div>

              {/* Leyenda */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-gray-600">De esta categoría</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-yellow-400 bg-yellow-50 rounded"></span>
                  <span className="text-gray-600">De otra categoría</span>
                </div>
              </div>

              {/* Lista de TODOS los servicios (FILTRADA) */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  <span className="mt-3 text-gray-600">Cargando servicios...</span>
                </div>
              ) : serviciosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-lg font-medium">
                    {busqueda ? `No se encontraron servicios para "${busqueda}"` : 'No hay servicios disponibles'}
                  </p>
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda('')}
                      className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {serviciosFiltrados.map((servicio) => {
                    const isSelected = serviciosSeleccionados.includes(servicio.id);
                    const esDeOtraCategoria = servicio.categoria && servicio.categoria !== categoriaId;
                    
                    return (
                      <label
                        key={servicio.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? esDeOtraCategoria
                              ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200'
                              : 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleServicio(servicio.id)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{servicio.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {servicio.duracion && `⏱️ ${servicio.duracion}`}
                            {servicio.precio_min && ` • 💰 $${servicio.precio_min}`}
                          </p>
                        </div>
                        
                        {/* Badge: Categoría actual */}
                        {esDeOtraCategoria ? (
                          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {servicio.categoria_nombre || 'Otra categoría'}
                          </span>
                        ) : (
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded whitespace-nowrap">
                            ✅ Esta categoría
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
                <button
                  onClick={() => {
                    setView('assigned');
                    setBusqueda('');  // ← Limpiar búsqueda al volver
                  }}
                  disabled={guardando}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Cancelar
                </button>
                <button
                  onClick={guardarCambios}
                  disabled={guardando}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {guardando ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}