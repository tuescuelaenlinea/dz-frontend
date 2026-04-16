// components/admin/ServicioProfesionalesModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  activo: boolean;
  precio_especial?: string | null;
}

interface ServicioProfesionalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicioId: number;
  servicioNombre: string;
  onProfesionalesUpdated: () => void;
}

export default function ServicioProfesionalesModal({
  isOpen,
  onClose,
  servicioId,
  servicioNombre,
  onProfesionalesUpdated,
}: ServicioProfesionalesModalProps) {
  const [profesionalesAsignados, setProfesionalesAsignados] = useState<number[]>([]);
  const [todosLosProfesionales, setTodosLosProfesionales] = useState<Profesional[]>([]);
  const [profesionalesSeleccionados, setProfesionalesSeleccionados] = useState<number[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Cargar datos al abrir modal
  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  // Resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setBusqueda('');
      setError(null);
      setMensaje(null);
    }
  }, [isOpen]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar profesionales asignados al servicio
      const asignadosData = await api.getServicioProfesionales(servicioId);
      const asignadosIds = asignadosData.profesionales?.map((p: Profesional) => p.id) || [];
      setProfesionalesAsignados(asignadosIds);
      setProfesionalesSeleccionados(asignadosIds);
      
      // Cargar todos los profesionales activos
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const token = localStorage.getItem('admin_token');
      
      const res = await fetch(`${apiUrl}/profesionales/?activo=true&ordering=nombre`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const profesionalesList = Array.isArray(data) ? data : (data.results || []);
        setTodosLosProfesionales(profesionalesList);
      }
      
    } catch (err: any) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message || 'Error al cargar profesionales');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar profesionales por búsqueda (con debounce manual)
  const profesionalesFiltrados = useMemo(() => {
    if (!busqueda.trim()) {
      return todosLosProfesionales;
    }
    
    const termino = busqueda.toLowerCase().trim();
    return todosLosProfesionales.filter(prof => 
      prof.nombre.toLowerCase().includes(termino) ||
      prof.especialidad.toLowerCase().includes(termino)
    );
  }, [todosLosProfesionales, busqueda]);

  // Toggle selección individual
  const toggleProfesional = (profesionalId: number) => {
    setProfesionalesSeleccionados(prev => 
      prev.includes(profesionalId)
        ? prev.filter(id => id !== profesionalId)
        : [...prev, profesionalId]
    );
  };

  // Seleccionar/deseleccionar todos los filtrados
  const toggleTodos = () => {
    if (profesionalesFiltrados.length === 0) return;
    
    const todosSeleccionados = profesionalesFiltrados.every(p => 
      profesionalesSeleccionados.includes(p.id)
    );
    
    if (todosSeleccionados) {
      // Deseleccionar solo los filtrados
      setProfesionalesSeleccionados(prev => 
        prev.filter(id => !profesionalesFiltrados.some(p => p.id === id))
      );
    } else {
      // Seleccionar todos los filtrados
      const idsFiltrados = profesionalesFiltrados.map(p => p.id);
      setProfesionalesSeleccionados(prev => [...new Set([...prev, ...idsFiltrados])]);
    }
  };

  // Guardar cambios
  const guardarCambios = async () => {
    try {
      setGuardando(true);
      setError(null);
      setMensaje(null);
      
      await api.asignarProfesionalesAServicio(servicioId, profesionalesSeleccionados);
      
      setMensaje(`✅ ${profesionalesSeleccionados.length} profesionales asignados exitosamente`);
      
      // Actualizar lista de asignados
      setProfesionalesAsignados(profesionalesSeleccionados);
      
      // Callback para refrescar contador en tabla principal
      onProfesionalesUpdated();
      
      // Auto-ocultar mensaje y cerrar después de 2 segundos
      setTimeout(() => {
        setMensaje(null);
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Error guardando:', err);
      setError(err.message || 'Error al guardar los cambios');
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
              👥 Profesionales de
            </h2>
            <p className="text-sm opacity-90 mt-1">"{servicioNombre}"</p>
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
                onClick={cargarDatos}
                className="mt-2 text-red-600 hover:text-red-800 font-medium text-sm"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar profesional por nombre o especialidad..."
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
                  Mostrando <strong className="text-indigo-600">{profesionalesFiltrados.length}</strong> de {todosLosProfesionales.length} profesionales
                </>
              ) : (
                <>
                  <strong className="text-indigo-600">{profesionalesSeleccionados.length}</strong> de {todosLosProfesionales.length} seleccionados
                </>
              )}
            </span>
            <button
              onClick={toggleTodos}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
              disabled={loading || profesionalesFiltrados.length === 0}
            >
              {profesionalesFiltrados.length > 0 && profesionalesFiltrados.every(p => profesionalesSeleccionados.includes(p.id))
                ? 'Deseleccionar filtrados' 
                : 'Seleccionar filtrados'}
            </button>
          </div>

          {/* Lista de profesionales */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <span className="mt-3 text-gray-600">Cargando profesionales...</span>
            </div>
          ) : profesionalesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-lg font-medium">
                {busqueda ? `No se encontraron profesionales para "${busqueda}"` : 'No hay profesionales disponibles'}
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
              {profesionalesFiltrados.map((profesional) => {
                const isSelected = profesionalesSeleccionados.includes(profesional.id);
                const isAsignado = profesionalesAsignados.includes(profesional.id);
                
                return (
                  <label
                    key={profesional.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? isAsignado
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-green-500 bg-green-50 ring-2 ring-green-200'
                        : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProfesional(profesional.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{profesional.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{profesional.especialidad}</p>
                    </div>
                    
                    {/* Badge: Ya asignado */}
                    {isAsignado && (
                      <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Asignado
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
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando || profesionalesSeleccionados.length === 0}
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
                  Guardar ({profesionalesSeleccionados.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}