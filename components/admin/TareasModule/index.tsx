// components/admin/TareasModule/index.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';  // ← Agregar useCallback
import { Tarea, EstadoTarea, TareasModuleProps } from './types';
import { formatDateColombia, getEstadoBadgeClass, getEstadoLabel } from './utils';

export default function TareasModule({
  apiUrl,
  token,
  onTareaFinalizada,
  filtroInicial = 'todas',
  className = ''  // ← ← ← AGREGAR valor por defecto
}: TareasModuleProps) {
  // ← ← ← ESTADOS PRINCIPALES ← ← ←
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoTarea | 'todas'>(filtroInicial);
  
  // ← ← ← MODAL DE CAMBIO DE ESTADO ← ← ←
  const [modalOpen, setModalOpen] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  
  // ← ← ← ESTADOS PARA EDICIÓN DE TAREA ← ← ←
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [tareaEditando, setTareaEditando] = useState<Tarea | null>(null);
  const [formData, setFormData] = useState<{ titulo: string; descripcion?: string; orden?: number }>({ 
    titulo: '', 
    descripcion: '', 
    orden: 0 
  });
  
  // ← ← ← REFERENCIAS ← ← ←
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← FUNCIONES MOVIDAS AL SCOPE PRINCIPAL (FUERA DEL useEffect) ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←

  // ← ← ← ABRIR MODAL DE EDICIÓN ← ← ←
  const handleAbrirEditar = useCallback((tarea: Tarea) => {
    setTareaEditando(tarea);
    setFormData({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',
      orden: tarea.orden || 0
    });
    setModalEditarOpen(true);
    setTimeout(() => editInputRef.current?.focus(), 100);
  }, []);

  // ← ← ← GUARDAR EDICIÓN DE TAREA ← ← ←
  const handleGuardarEdicion = useCallback(async () => {
    if (!tareaEditando || !formData.titulo.trim()) return;

    const tareaActualizada: Tarea = {
      ...tareaEditando,
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion?.trim(),
      orden: formData.orden,
      fecha_actualizacion: new Date()
    };

    // Actualizar estado local
    setTareas(prev => prev.map(t => 
      t.id === tareaActualizada.id ? tareaActualizada : t
    ));

    // Guardar en API
    if (apiUrl && token) {
      try {
        await fetch(`${apiUrl}/tareas/${tareaEditando.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            titulo: formData.titulo.trim(),
            descripcion: formData.descripcion?.trim() || null,
            orden: formData.orden
          })
        });
        console.log('✅ Tarea editada exitosamente');
      } catch (err) {
        console.error('❌ Error editando tarea en API');
        // Revertir cambio local si falla
        setTareas(prev => prev.map(t => 
          t.id === tareaEditando.id ? tareaEditando : t
        ));
      }
    }

    setModalEditarOpen(false);
    setTareaEditando(null);
  }, [tareaEditando, formData, apiUrl, token]);

  // ← ← ← CARGAR TAREAS ← ← ←
  useEffect(() => {
    const cargarTareas = async () => {
      console.log('🔍 [TareasModule] apiUrl:', apiUrl);
      console.log('🔍 [TareasModule] token:', token ? '✅ Presente' : '❌ Ausente');
      
      if (apiUrl && token) {
        try {
          console.log('📡 Fetching:', `${apiUrl}/tareas/`);
          const res = await fetch(`${apiUrl}/tareas/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          console.log('📦 Response status:', res.status);
          if (res.ok) {
            const data = await res.json();
            console.log('✅ Response data:', data);
            
            // Manejar respuesta paginada o array directo
            const tareasRaw = Array.isArray(data) ? data : (data.results || data.data || []);
            console.log('✅ Tareas cargadas:', tareasRaw.length);
            
            const tareasParseadas = tareasRaw.map((t: any) => ({
              ...t,
              fecha_creacion: t.fecha_creacion ? new Date(t.fecha_creacion) : new Date(),
              fecha_actualizacion: t.fecha_actualizacion ? new Date(t.fecha_actualizacion) : undefined
            }));
            setTareas(tareasParseadas);
            return;
          }
        } catch (err) {
          console.warn('⚠️ No se pudieron cargar tareas desde API, usando localStorage');
        }
      }
      
      // Fallback: localStorage
      const guardadas = localStorage.getItem('tareas_dzsalon');
      if (guardadas) {
        try {
          const parseadas = JSON.parse(guardadas).map((t: any) => ({
            ...t,
            fecha_creacion: new Date(t.fecha_creacion),
            fecha_actualizacion: t.fecha_actualizacion ? new Date(t.fecha_actualizacion) : undefined
          }));
          setTareas(parseadas);
        } catch (e) {
          console.error('❌ Error parseando tareas de localStorage');
        }
      }
    };
    
    cargarTareas();
  }, [apiUrl, token]);  // ← ← ← Las funciones NO van en las dependencias porque están fuera

  // ← ← ← GUARDAR EN LOCALSTORAGE ← ← ←
  useEffect(() => {
    if (!apiUrl) {
      localStorage.setItem('tareas_dzsalon', JSON.stringify(tareas));
    }
  }, [tareas, apiUrl]);

  // ← ← ← CERRAR MODAL AL CLICK FUERA ← ← ←
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setModalOpen(false);
        setTareaSeleccionada(null);
      }
    };
    
    if (modalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modalOpen]);

  // ← ← ← AGREGAR TAREA CON ENTER ← ← ←
  const handleAgregarTarea = async () => {
    const titulo = nuevaTarea.trim();
    if (!titulo) return;

    const nueva: Tarea = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tarea-${Date.now()}`,
      titulo,
      estado: 'pendiente',
      fecha_creacion: new Date(),
      orden: tareas.length + 1
    };

    setTareas(prev => [...prev, nueva]);
    setNuevaTarea('');
    inputRef.current?.focus();

    if (apiUrl && token) {
      try {
        await fetch(`${apiUrl}/tareas/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            titulo: nueva.titulo,
            estado: nueva.estado,
            fecha_creacion: nueva.fecha_creacion.toISOString()
          })
        });
      } catch (err) {
        console.error('❌ Error guardando tarea en API');
      }
    }
  };

  // ← ← ← MANEJAR KEYDOWN EN INPUT ← ← ←
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAgregarTarea();
    }
  };

  // ← ← ← ABRIR MODAL PARA CAMBIAR ESTADO ← ← ←
  const handleAbrirModal = (tarea: Tarea) => {
    setTareaSeleccionada(tarea);
    setModalOpen(true);
  };

  // ← ← ← CAMBIAR ESTADO DE TAREA ← ← ←
  const handleCambiarEstado = async (nuevoEstado: EstadoTarea) => {
    if (!tareaSeleccionada) return;

    const tareaActualizada: Tarea = {
      ...tareaSeleccionada,
      estado: nuevoEstado,
      fecha_actualizacion: new Date()
    };

    setTareas(prev => prev.map(t => 
      t.id === tareaActualizada.id ? tareaActualizada : t
    ));

    if (nuevoEstado === 'finalizada' && onTareaFinalizada) {
      onTareaFinalizada(tareaActualizada);
    }

    if (apiUrl && token) {
      try {
        await fetch(`${apiUrl}/tareas/${tareaSeleccionada.id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            estado: nuevoEstado,
            fecha_actualizacion: tareaActualizada.fecha_actualizacion?.toISOString()
          })
        });
      } catch (err) {
        console.error('❌ Error actualizando estado en API');
      }
    }

    setModalOpen(false);
    setTareaSeleccionada(null);
  };

  // ← ← ← ELIMINAR TAREA ← ← ←
  const handleEliminarTarea = async (tareaId: string) => {
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;

    setTareas(prev => prev.filter(t => t.id !== tareaId));

    if (apiUrl && token) {
      try {
        await fetch(`${apiUrl}/tareas/${tareaId}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('❌ Error eliminando tarea en API');
      }
    }
  };

  // ← ← ← FILTRAR TAREAS ← ← ←
  const tareasFiltradas = tareas.filter(tarea => {
    if (filtroEstado === 'todas') return true;
    return tarea.estado === filtroEstado;
  });

  // ← ← ← CONTADORES ← ← ←
  const contadores = {
    todas: tareas.length,
    pendiente: tareas.filter(t => t.estado === 'pendiente').length,
    en_seguimiento: tareas.filter(t => t.estado === 'en_seguimiento').length,
    finalizada: tareas.filter(t => t.estado === 'finalizada').length
  };

  return (
     <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mx-auto ${className}`.trim()}>            
       {/* ← ← ← HEADER CON FILTROS ← ← ← */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📋 Tareas
          <span className="text-sm font-normal text-gray-500">
            ({contadores[filtroEstado === 'todas' ? 'todas' : filtroEstado]})
          </span>
        </h3>
        
        {/* Filtros por estado */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['todas', 'pendiente', 'en_seguimiento', 'finalizada'] as const).map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filtroEstado === estado
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {estado === 'todas' ? 'Todas' : getEstadoLabel(estado).split(' ')[1]}
              <span className={`ml-1 text-[10px] ${
                filtroEstado === estado ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {contadores[estado]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ← ← ← INPUT PARA AGREGAR TAREA ← ← ← */}
      <div className="mb-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={nuevaTarea}
            onChange={(e) => setNuevaTarea(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe una tarea y presiona Enter..."
            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          />
          <button
            onClick={handleAgregarTarea}
            disabled={!nuevaTarea.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            Agregar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-1">
          💡 Tip: Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border">Enter</kbd> para guardar
        </p>
      </div>
      
      {/* ← ← ← LISTA DE TAREAS ← ← ← */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {tareasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              {filtroEstado === 'todas' 
                ? 'No hay tareas aún. ¡Agrega la primera!' 
                : `No hay tareas "${getEstadoLabel(filtroEstado).split(' ')[1]}"`}
            </p>
          </div>
        ) : (
          tareasFiltradas.map((tarea) => (
            <div
              key={tarea.id}
              onClick={() => handleAbrirModal(tarea)}
              className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                tarea.estado === 'finalizada'
                  ? 'bg-gray-50 border-gray-200 opacity-75 hover:opacity-100'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Checkbox */}
              <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                tarea.estado === 'finalizada'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 group-hover:border-blue-400'
              }`}>
                {tarea.estado === 'finalizada' && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  tarea.estado === 'finalizada' ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {tarea.titulo}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creada: {formatDateColombia(tarea.fecha_creacion)}
                </p>
              </div>

              {/* ← ← ← BOTÓN EDITAR (AHORA FUNCIONA) ← ← ← */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAbrirEditar(tarea);  // ← ← ← AHORA SÍ ESTÁ DEFINIDA
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-opacity"
                title="Editar tarea"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                  />
                </svg>
              </button>

              {/* Badge */}
              <span className={`px-2 py-1 text-xs font-medium rounded border ${
                getEstadoBadgeClass(tarea.estado)
              }`}>
                {getEstadoLabel(tarea.estado).split(' ')[0]}
              </span>

              {/* Eliminar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEliminarTarea(tarea.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                title="Eliminar tarea"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      {/* ← ← ← MODAL PARA EDITAR TAREA ← ← ← */}
      {modalEditarOpen && tareaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">✏️ Editar tarea</h4>
              <button
                onClick={() => {
                  setModalEditarOpen(false);
                  setTareaEditando(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <div className="p-4 space-y-4">
              
              {/* Título (requerido) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  ref={editInputRef}
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGuardarEdicion();
                    }
                  }}
                  placeholder="Ej: Revisar inventario de productos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.titulo.length}/200</p>
              </div>

              {/* Descripción (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Detalles adicionales de la tarea..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{formData.descripcion?.length || 0}/500</p>
              </div>

              {/* Orden (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden de visualización <span className="text-gray-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                  placeholder="0 = primero"
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
                <p className="text-xs text-gray-500 mt-1">Menor número = aparece primero en la lista</p>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setModalEditarOpen(false);
                  setTareaEditando(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEdicion}
                disabled={!formData.titulo.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                💾 Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL PARA CAMBIAR ESTADO ← ← ← */}
      {modalOpen && tareaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            ref={modalRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-200 overflow-hidden"
          >
            {/* Header del modal */}
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">Cambiar estado de tarea</h4>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {tareaSeleccionada.titulo}
              </p>
            </div>

            {/* Opciones de estado */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => handleCambiarEstado('en_seguimiento')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
              >
                <span className="text-xl">🔄</span>
                <div>
                  <p className="font-medium text-blue-900">En seguimiento</p>
                  <p className="text-xs text-blue-700">La tarea está en progreso</p>
                </div>
              </button>

              <button
                onClick={() => handleCambiarEstado('finalizada')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors text-left"
              >
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-medium text-green-900">Finalizada</p>
                  <p className="text-xs text-green-700">Completada y oculta de la lista</p>
                </div>
              </button>
            </div>

            {/* Footer con cancelar */}
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setTareaSeleccionada(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}