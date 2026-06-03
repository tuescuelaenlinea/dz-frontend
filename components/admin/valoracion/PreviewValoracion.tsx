// components/admin/valoracion/PreviewValoracion.tsx
'use client';

import { useState, useMemo } from 'react';
import { ValoracionConfig, ValoracionSeccion } from '@/types/valoracion';

interface PreviewValoracionProps {
  config: ValoracionConfig;
}

export default function PreviewValoracion({ config }: PreviewValoracionProps) {
  // Estado para almacenar respuestas: { seccionId: opcionId | opcionId[] | texto }
  const [respuestasPreview, setRespuestasPreview] = useState<Record<number, any>>({});

  // Función para manejar selección de opciones
  const handleSeleccionOpcion = (seccionId: number, opcionId: number, seleccionMultiple: boolean) => {
    setRespuestasPreview(prev => {
      const actual = prev[seccionId];
      
      if (seleccionMultiple) {
        // Selección múltiple: toggle en array
        const arrayActual = Array.isArray(actual) ? actual : [];
        const nuevoArray = arrayActual.includes(opcionId)
          ? arrayActual.filter(id => id !== opcionId)
          : [...arrayActual, opcionId];
        
        return { ...prev, [seccionId]: nuevoArray };
      } else {
        // Selección única: reemplazar valor
        return { ...prev, [seccionId]: opcionId };
      }
    });
  };

  // Función para manejar texto libre
  const handleTextoChange = (seccionId: number, texto: string) => {
    setRespuestasPreview(prev => ({ ...prev, [seccionId]: texto }));
  };

  // Función para verificar si una opción está seleccionada
  const isOpcionSeleccionada = (seccionId: number, opcionId: number): boolean => {
    const respuesta = respuestasPreview[seccionId];
    if (Array.isArray(respuesta)) {
      return respuesta.includes(opcionId);
    }
    return respuesta === opcionId;
  };

  // Función para verificar si una sección debe ser visible (condiciones)
  const isSeccionVisible = (seccion: ValoracionSeccion): boolean => {
    if (!seccion.condicion_visible || !seccion.condicion_visible.seccion_id) {
      return true; // Sin condición, siempre visible
    }

    const condicion = seccion.condicion_visible;
    const respuestaSeccionBase = respuestasPreview[condicion.seccion_id];

    // Si no hay respuesta en la sección base, ocultar
    if (!respuestaSeccionBase) {
      return false;
    }

    // Si hay condición de opción específica
    if (condicion.opcion_id) {
      if (Array.isArray(respuestaSeccionBase)) {
        return respuestaSeccionBase.includes(condicion.opcion_id);
      }
      return respuestaSeccionBase === condicion.opcion_id;
    }

    // Si solo hay condición de sección (cualquier respuesta es válida)
    return true;
  };

  // Calcular total estimado
  const totalEstimado = useMemo(() => {
    return config.secciones.reduce((total, seccion) => {
      if (!isSeccionVisible(seccion)) return total;

      const respuesta = respuestasPreview[seccion.id!];
      
      if (!respuesta) return total;

      // Si es array (selección múltiple)
      if (Array.isArray(respuesta)) {
        return total + respuesta.reduce((sum, opcionId) => {
          const opcion = seccion.opciones.find(o => o.id === opcionId);
          return sum + (opcion?.valor_adicional || 0);
        }, 0);
      }

      // Si es selección única
      const opcion = seccion.opciones.find(o => o.id === respuesta);
      return total + (opcion?.valor_adicional || 0);
    }, 0);
  }, [respuestasPreview, config.secciones]);

  // Función para limpiar todas las respuestas
  const limpiarRespuestas = () => {
    setRespuestasPreview({});
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{config.titulo}</h2>
            {config.descripcion && (
              <p className="text-gray-600 mt-2">{config.descripcion}</p>
            )}
          </div>
          <button
            onClick={limpiarRespuestas}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-6">
        {config.secciones
          .filter(seccion => isSeccionVisible(seccion))
          .map((seccion, index) => (
          <div key={seccion.id || index} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              {index + 1}. {seccion.titulo}
              {seccion.obligatoria && <span className="text-red-500 ml-1">*</span>}
            </h3>
            
            {seccion.instruccion && (
              <p className="text-sm text-gray-600 mb-3">{seccion.instruccion}</p>
            )}

            {/* Vista previa según tipo de sección */}
            {seccion.tipo === 'foto_opciones' && (
              <div className="grid grid-cols-2 gap-3">
                {seccion.opciones.map((opcion, optIndex) => {
                  const seleccionada = isOpcionSeleccionada(seccion.id!, opcion.id!);
                  return (
                    <div
                      key={opcion.id || optIndex}
                      onClick={() => handleSeleccionOpcion(seccion.id!, opcion.id!, seccion.seleccion_multiple)}
                      className={`border-2 rounded-lg p-3 text-center cursor-pointer transition-all ${
                        seleccionada
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-300 hover:border-purple-400 hover:shadow-sm'
                      }`}
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
                      {seleccionada && (
                        <div className="mt-2 text-purple-600 font-bold">✓ Seleccionado</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {seccion.tipo === 'foto_descripcion' && (
              <div className="space-y-3">
                {seccion.opciones.map((opcion, optIndex) => {
                  const seleccionada = isOpcionSeleccionada(seccion.id!, opcion.id!);
                  return (
                    <div
                      key={opcion.id || optIndex}
                      onClick={() => handleSeleccionOpcion(seccion.id!, opcion.id!, seccion.seleccion_multiple)}
                      className={`flex gap-3 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        seleccionada
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-400 hover:shadow-sm'
                      }`}
                    >
                      {opcion.foto_url && (
                        <img
                          src={opcion.foto_url}
                          alt={opcion.titulo}
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opcion.titulo}</p>
                        <p className="text-xs text-gray-600 mt-1">{opcion.descripcion}</p>
                        {opcion.valor_adicional > 0 && (
                          <p className="text-purple-600 text-xs font-semibold mt-1">
                            +${opcion.valor_adicional.toLocaleString('es-CO')}
                          </p>
                        )}
                        {seleccionada && (
                          <p className="text-purple-600 text-xs font-bold mt-1">✓ Seleccionado</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {seccion.tipo === 'pregunta_opciones' && (
              <div className="flex flex-wrap gap-2">
                {seccion.opciones.map((opcion, optIndex) => {
                  const seleccionada = isOpcionSeleccionada(seccion.id!, opcion.id!);
                  return (
                    <button
                      key={opcion.id || optIndex}
                      onClick={() => handleSeleccionOpcion(seccion.id!, opcion.id!, seccion.seleccion_multiple)}
                      className={`px-4 py-2 border-2 rounded-lg text-sm transition-all ${
                        seleccionada
                          ? 'border-purple-500 bg-purple-500 text-white shadow-md'
                          : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      {opcion.titulo}
                      {opcion.valor_adicional > 0 && (
                        <span className={`ml-2 text-xs ${seleccionada ? 'text-purple-100' : 'text-purple-600'}`}>
                          (+${opcion.valor_adicional.toLocaleString('es-CO')})
                        </span>
                      )}
                      {seleccionada && <span className="ml-2">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {seccion.tipo === 'pregunta_texto' && (
              <textarea
                value={respuestasPreview[seccion.id!] || ''}
                onChange={(e) => handleTextoChange(seccion.id!, e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                rows={3}
                placeholder="Escribe tu respuesta aquí..."
              />
            )}

            {seccion.tipo === 'subir_foto' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                <div className="text-gray-400 text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-600">
                  Arrastra una imagen o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 5MB • JPG, PNG, WEBP
                </p>
                <button
                  onClick={() => alert('En la vista real, esto abrirá el selector de archivos')}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                  Seleccionar archivo
                </button>
              </div>
            )}

            {seccion.obligatoria && (
              <p className="text-xs text-red-500 mt-2">* Campo obligatorio</p>
            )}
          </div>
        ))}
      </div>

      {/* Total estimado */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600 mb-1 text-center">Valor estimado total</p>
          <p className="text-3xl font-bold text-purple-600 text-center">
            ${totalEstimado.toLocaleString('es-CO')}
          </p>
          {totalEstimado > 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              * El precio final puede variar según evaluación presencial
            </p>
          )}
        </div>
      </div>

      {/* Resumen de selecciones */}
      {Object.keys(respuestasPreview).length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">📋 Resumen de selecciones:</p>
          <div className="space-y-1">
            {config.secciones
              .filter(seccion => respuestasPreview[seccion.id!] !== undefined)
              .map(seccion => {
                const respuesta = respuestasPreview[seccion.id!];
                let textoRespuesta = '';

                if (Array.isArray(respuesta)) {
                  const opciones = respuesta
                    .map(id => seccion.opciones.find(o => o.id === id)?.titulo)
                    .filter(Boolean)
                    .join(', ');
                  textoRespuesta = opciones;
                } else if (typeof respuesta === 'number') {
                  textoRespuesta = seccion.opciones.find(o => o.id === respuesta)?.titulo || '';
                } else if (typeof respuesta === 'string') {
                  textoRespuesta = respuesta;
                }

                return (
                  <div key={seccion.id} className="text-xs text-blue-800">
                    <span className="font-medium">{seccion.titulo}:</span> {textoRespuesta}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 font-medium">
          👁️ Esta es una vista previa interactiva de cómo verá el cliente la valoración
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Haz clic en las opciones para probar la selección y ver el cálculo del total
        </p>
      </div>
    </div>
  );
}