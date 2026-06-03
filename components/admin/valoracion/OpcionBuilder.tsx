// components/admin/valoracion/OpcionBuilder.tsx
'use client';

import { useState } from 'react';
import { ValoracionOpcion } from '@/types/valoracion';
import PhotoUploader from './PhotoUploader';

interface OpcionBuilderProps {
  opcion: ValoracionOpcion;
  index: number;
  onUpdate: (opcion: ValoracionOpcion) => void;
  onDelete: () => void;
  tipoSeccion: string;
}

export default function OpcionBuilder({
  opcion,
  index,
  onUpdate,
  onDelete,
  tipoSeccion,
}: OpcionBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePhotoSelect = (file: File | null, previewUrl: string | null) => {
    onUpdate({
      ...opcion,
      // Si hay archivo nuevo, actualizar; si no, mantener existente
      ...(file !== null ? { foto: file, foto_url: previewUrl || undefined } : {}),
    });
  };

  const tiposConFoto = ['foto_opciones', 'foto_descripcion'];
  const requiereFoto = tiposConFoto.includes(tipoSeccion);

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden">
      {/* Header colapsable */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-white">
              {opcion.titulo || `Opción ${index + 1}`}
            </p>
            {opcion.valor_adicional > 0 && (
              <p className="text-sm text-green-400">
                +${opcion.valor_adicional.toLocaleString('es-CO')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {requiereFoto && opcion.foto_url && (
            <span className="text-xs text-green-400 px-2 py-1 bg-green-900/30 rounded">
              ✓ Foto
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
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
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Título de la opción *
            </label>
            <input
              type="text"
              value={opcion.titulo}
              onChange={(e) =>
                onUpdate({ ...opcion, titulo: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="Ej: Solo raíz, Todo el cabello, Corto, etc."
              required
            />
          </div>

          {/* Descripción (solo para foto_descripcion) */}
          {tipoSeccion === 'foto_descripcion' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={opcion.descripcion || ''}
                onChange={(e) =>
                  onUpdate({ ...opcion, descripcion: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Describe esta opción en detalle..."
              />
            </div>
          )}

          {/* Foto (para tipos que la requieren) */}
          {requiereFoto && (
            <PhotoUploader
              onPhotoSelect={handlePhotoSelect}
              existingPhoto={opcion.foto_url}
              label="Foto de la opción"
              required={requiereFoto}
            />
          )}

          {/* Valor adicional */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Valor adicional ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={opcion.valor_adicional}
                onChange={(e) =>
                  onUpdate({
                    ...opcion,
                    valor_adicional: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 pl-8 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor que se sumará al precio base del servicio
            </p>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Orden de visualización
            </label>
            <input
              type="number"
              min="0"
              value={opcion.orden}
              onChange={(e) =>
                onUpdate({
                  ...opcion,
                  orden: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Activo */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={opcion.activo}
              onChange={(e) =>
                onUpdate({ ...opcion, activo: e.target.checked })
              }
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">Opción activa</span>
          </label>

          {/* Botón eliminar */}
          <div className="pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={onDelete}
              className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              🗑️ Eliminar esta opción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}