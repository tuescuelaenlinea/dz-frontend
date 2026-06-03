// components/admin/valoracion/PreviewValoracion.tsx
'use client';

import { useState } from 'react';
import { ValoracionConfig } from '@/types/valoracion';

interface PreviewValoracionProps {
  config: ValoracionConfig;
}

export default function PreviewValoracion({ config }: PreviewValoracionProps) {
  const [respuestasPreview, setRespuestasPreview] = useState<Record<number, any>>({});

  const handleRespuestaPreview = (seccionId: number, valor: any) => {
    setRespuestasPreview(prev => ({
      ...prev,
      [seccionId]: valor
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{config.titulo}</h2>
        {config.descripcion && (
          <p className="text-gray-600 mt-2">{config.descripcion}</p>
        )}
      </div>

      <div className="space-y-6">
        {config.secciones.map((seccion, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              {index + 1}. {seccion.titulo}
            </h3>
            
            {seccion.instruccion && (
              <p className="text-sm text-gray-600 mb-3">{seccion.instruccion}</p>
            )}

            {/* Vista previa según tipo de sección */}
            {seccion.tipo === 'foto_opciones' && (
              <div className="grid grid-cols-2 gap-3">
                {seccion.opciones.map((opcion, optIndex) => (
                  <div
                    key={optIndex}
                    className="border border-gray-300 rounded-lg p-3 text-center hover:border-purple-500 cursor-pointer transition-colors"
                  >
                    {opcion.foto_url && (
                      <img
                        src={opcion.foto_url}
                        alt={opcion.titulo}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-medium text-sm">{opcion.titulo}</p>
                    {opcion.valor_adicional > 0 && (
                      <p className="text-purple-600 text-sm font-semibold mt-1">
                        +${opcion.valor_adicional.toLocaleString('es-CO')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {seccion.tipo === 'foto_descripcion' && (
              <div className="space-y-3">
                {seccion.opciones.map((opcion, optIndex) => (
                  <div
                    key={optIndex}
                    className="flex gap-3 border border-gray-200 rounded-lg p-3"
                  >
                    {opcion.foto_url && (
                      <img
                        src={opcion.foto_url}
                        alt={opcion.titulo}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{opcion.titulo}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {opcion.descripcion}
                      </p>
                      {opcion.valor_adicional > 0 && (
                        <p className="text-purple-600 text-xs font-semibold mt-1">
                          +${opcion.valor_adicional.toLocaleString('es-CO')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {seccion.tipo === 'pregunta_opciones' && (
              <div className="flex flex-wrap gap-2">
                {seccion.opciones.map((opcion, optIndex) => (
                  <button
                    key={optIndex}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    {opcion.titulo}
                    {opcion.valor_adicional > 0 && (
                      <span className="ml-2 text-purple-600 text-xs">
                        (+${opcion.valor_adicional.toLocaleString('es-CO')})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {seccion.tipo === 'pregunta_texto' && (
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-purple-500 focus:outline-none"
                rows={3}
                placeholder="Escribe tu respuesta aquí..."
                readOnly
              />
            )}

            {seccion.tipo === 'subir_foto' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-gray-400 text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-600">
                  Arrastra una imagen o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 5MB • JPG, PNG, WEBP
                </p>
              </div>
            )}

            {seccion.obligatoria && (
              <p className="text-xs text-red-500 mt-2">* Campo obligatorio</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Valor estimado total</p>
          <p className="text-2xl font-bold text-purple-600">
            $
            {config.secciones.reduce((total, seccion) => {
              const respuestaId = respuestasPreview[seccion.id!] || 0;
              const opcion = seccion.opciones.find(o => o.id === respuestaId);
              return total + (opcion?.valor_adicional || 0);
            }, 0).toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 font-medium">
          👁️ Esta es una vista previa de cómo verá el cliente la valoración
        </p>
      </div>
    </div>
  );
}