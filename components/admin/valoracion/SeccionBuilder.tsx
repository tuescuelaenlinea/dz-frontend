// components/admin/valoracion/SeccionBuilder.tsx
'use client';

import { useState } from 'react';
import { ValoracionSeccion, ValoracionOpcion, TipoSeccion } from '@/types/valoracion';
import OpcionBuilder from './OpcionBuilder';

interface SeccionBuilderProps {
  seccion: ValoracionSeccion;
  index: number;
  onUpdate: (seccion: ValoracionSeccion) => void;
  onDelete: () => void;
  todasSecciones: ValoracionSeccion[];
  // ← ← ← NUEVAS PROPS PARA CONTROLAR EXPANSIÓN ← ← ←
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function SeccionBuilder({
  seccion,
  index,
  onUpdate,
  onDelete,
  todasSecciones,
  isExpanded = true,  // ← ← ← DEFAULT: expandida
  onToggleExpand,     // ← ← ← FUNCIÓN PARA TOGGLE
}: SeccionBuilderProps) {
  
  // ← ← ← ESTADO LOCAL COMO FALLBACK (si no se pasa onToggleExpand) ← ← ←
  const [localExpanded, setLocalExpanded] = useState(true);
  
  // Determinar si está expandida (priorizar prop externa)
  const expanded = onToggleExpand ? isExpanded : localExpanded;
  
  // Función para toggle
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const agregarOpcion = () => {
    const nuevaOpcion: ValoracionOpcion = {
      titulo: '',
      descripcion: '',
      valor_adicional: 0,
      orden: seccion.opciones.length,
      activo: true,
    };

    onUpdate({
      ...seccion,
      opciones: [...seccion.opciones, nuevaOpcion],
    });
  };

  const actualizarOpcion = (opcionIndex: number, opcionActualizada: ValoracionOpcion) => {
    const nuevasOpciones = [...seccion.opciones];
    nuevasOpciones[opcionIndex] = opcionActualizada;
    onUpdate({ ...seccion, opciones: nuevasOpciones });
  };

  const eliminarOpcion = (opcionIndex: number) => {
    const nuevasOpciones = seccion.opciones.filter((_, i) => i !== opcionIndex);
    onUpdate({ ...seccion, opciones: nuevasOpciones });
  };

  const getTipoLabel = (tipo: TipoSeccion) => {
    const labels: Record<TipoSeccion, string> = {
      foto_opciones: '📸 Foto + Opciones',
      foto_descripcion: '📝 Foto + Descripción',
      pregunta_opciones: '❓ Pregunta + Botones',
      pregunta_texto: '✍️ Pregunta + Texto',
      subir_foto: '📤 Subir Foto',
    };
    return labels[tipo] || tipo;
  };

  const tiposConOpciones = ['foto_opciones', 'foto_descripcion', 'pregunta_opciones'];
  const requiereOpciones = tiposConOpciones.includes(seccion.tipo);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg">
            {index + 1}
          </span>
          <div>
            <h3 className="font-semibold text-white text-lg">
              {seccion.titulo || `Sección ${index + 1}`}
            </h3>
            <p className="text-sm text-gray-400">
              {getTipoLabel(seccion.tipo)}
              {seccion.obligatoria && (
                <span className="ml-2 text-red-400 text-xs">• Obligatoria</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* ← ← ← BOTÓN TOGGLE EXPANDIR/COLAPSAR ← ← ← */}
          <button
            onClick={handleToggle}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title={expanded ? 'Colapsar sección' : 'Expandir sección'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
            title="Eliminar sección"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ← ← ← CONTENIDO EXPANDIBLE ← ← ← */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* Tipo de sección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de sección
            </label>
            <select
              value={seccion.tipo}
              onChange={(e) =>
                onUpdate({ ...seccion, tipo: e.target.value as TipoSeccion })
              }
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="foto_opciones">📸 Foto + Opciones (Radio/Checkbox)</option>
              <option value="foto_descripcion">📝 Foto + Descripción</option>
              <option value="pregunta_opciones">❓ Pregunta + Botones de Opción</option>
              <option value="pregunta_texto">✍️ Pregunta + Campo de Texto</option>
              <option value="subir_foto">📤 Instrucción + Subir Foto</option>
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Título de la sección *
            </label>
            <input
              type="text"
              value={seccion.titulo}
              onChange={(e) => onUpdate({ ...seccion, titulo: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="Ej: ¿Qué parte deseas alisar?"
              required
            />
          </div>

          {/* Instrucción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Instrucción / Descripción
            </label>
            <textarea
              value={seccion.instruccion}
              onChange={(e) =>
                onUpdate({ ...seccion, instruccion: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Texto guía para el cliente..."
            />
          </div>

          {/* Configuración avanzada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Obligatoria */}
            <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors">
              <input
                type="checkbox"
                checked={seccion.obligatoria}
                onChange={(e) =>
                  onUpdate({ ...seccion, obligatoria: e.target.checked })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <p className="text-sm font-medium text-white">Sección obligatoria</p>
                <p className="text-xs text-gray-400">El cliente debe responder</p>
              </div>
            </label>

            {/* Selección múltiple */}
            {(seccion.tipo === 'foto_opciones' || seccion.tipo === 'pregunta_opciones') && (
              <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="checkbox"
                  checked={seccion.seleccion_multiple}
                  onChange={(e) =>
                    onUpdate({ ...seccion, seleccion_multiple: e.target.checked })
                  }
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Selección múltiple</p>
                  <p className="text-xs text-gray-400">Permitir elegir varias opciones</p>
                </div>
              </label>
            )}
          </div>

          {/* Condiciones de visibilidad */}
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              🔀 Condiciones de visibilidad (opcional)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Esta sección solo se mostrará si se cumple la condición
            </p>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={seccion.condicion_visible?.seccion_id || ''}
                onChange={(e) => {
                  const seccionId = e.target.value ? parseInt(e.target.value) : undefined;
                  onUpdate({
                    ...seccion,
                    condicion_visible: seccionId
                      ? { ...seccion.condicion_visible, seccion_id: seccionId }
                      : undefined,
                  });
                }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Sin condición</option>
                {todasSecciones
                  .filter((s) => s !== seccion)
                  .map((s, idx) => (
                    <option key={idx} value={s.id || idx}>
                      {s.titulo || `Sección ${idx + 1}`}
                    </option>
                  ))}
              </select>
              <select
                value={seccion.condicion_visible?.opcion_id || ''}
                onChange={(e) => {
                  const opcionId = e.target.value ? parseInt(e.target.value) : undefined;
                  onUpdate({
                    ...seccion,
                    condicion_visible: opcionId && seccion.condicion_visible?.seccion_id
                      ? { ...seccion.condicion_visible, opcion_id: opcionId }
                      : undefined,
                  });
                }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:border-purple-500 focus:outline-none"
                disabled={!seccion.condicion_visible?.seccion_id}
              >
                <option value="">Cualquier opción</option>
                {/* Aquí podrías cargar las opciones de la sección seleccionada */}
              </select>
            </div>
          </div>

          {/* Opciones (para tipos que las requieren) */}
          {requiereOpciones && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-300">
                  Opciones ({seccion.opciones.length})
                </h4>
                <button
                  onClick={agregarOpcion}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  ➕ Agregar opción
                </button>
              </div>

              {seccion.opciones.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-dashed border-gray-700">
                  <p className="text-gray-500 mb-2">No hay opciones agregadas</p>
                  <button
                    onClick={agregarOpcion}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Crear primera opción →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {seccion.opciones.map((opcion, opcionIndex) => (
                    <OpcionBuilder
                      key={opcionIndex}
                      opcion={opcion}
                      index={opcionIndex}
                      onUpdate={(opcionActualizada) =>
                        actualizarOpcion(opcionIndex, opcionActualizada)
                      }
                      onDelete={() => eliminarOpcion(opcionIndex)}
                      tipoSeccion={seccion.tipo}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}