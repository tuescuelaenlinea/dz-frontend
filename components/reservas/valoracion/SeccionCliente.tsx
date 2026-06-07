// components/reservas/valoracion/SeccionCliente.tsx
'use client';

import { useState, useRef } from 'react';
import { ValoracionSeccion, RespuestaValoracion } from '@/types/valoracion';

interface SeccionClienteProps {
  seccion: ValoracionSeccion;
  respuestaActual?: RespuestaValoracion;
  onRespuesta: (respuesta: Partial<RespuestaValoracion>) => void;
}

export default function SeccionCliente({
  seccion,
  respuestaActual,
  onRespuesta
}: SeccionClienteProps) {
  const [textoLocal, setTextoLocal] = useState(respuestaActual?.respuesta_texto || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar selección de opción
  const handleSeleccion = (opcionId: number) => {
    if (seccion.seleccion_multiple) {
      const actuales = (respuestaActual?.opcion_seleccionada as number[]) || [];
      const nuevas = actuales.includes(opcionId)
        ? actuales.filter(id => id !== opcionId)
        : [...actuales, opcionId];
      onRespuesta({ opcion_seleccionada: nuevas });
    } else {
      onRespuesta({ opcion_seleccionada: opcionId });
    }
  };

  // Verificar si una opción está seleccionada
  const esSeleccionado = (opcionId: number) => {
    if (seccion.seleccion_multiple) {
      return (respuestaActual?.opcion_seleccionada as number[])?.includes(opcionId);
    }
    return respuestaActual?.opcion_seleccionada === opcionId;
  };

  // Manejar upload de foto
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRespuesta({ foto_subida: file });
    }
  };

  // Renderizar según tipo de sección
  const renderizarContenido = () => {
    switch (seccion.tipo) {
      case 'foto_opciones':
      case 'foto_descripcion':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seccion.opciones.map(opcion => (
              <button
                key={opcion.id}
                onClick={() => opcion.id && handleSeleccion(opcion.id)}
                disabled={!opcion.id}
                className={`
                  relative overflow-hidden rounded-xl border-2 transition-all duration-200 text-left group
                  ${esSeleccionado(opcion.id!)
                    ? 'border-purple-500 bg-purple-900/20 ring-2 ring-purple-500/50'
                    : 'border-gray-700 hover:border-purple-500/50 bg-gray-800/50'}
                  ${!opcion.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {opcion.id && esSeleccionado(opcion.id) && (
                  <div className="absolute top-3 right-3 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center z-10">
                    ✓
                  </div>
                )}
                
                {opcion.foto_url && (
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      src={opcion.foto_url}
                      alt={opcion.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white text-lg">{opcion.titulo}</p>
                      {seccion.tipo === 'foto_descripcion' && opcion.descripcion && (
                        <p className="text-sm text-gray-400 mt-1">{opcion.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      case 'pregunta_opciones':
        return (
          <div className="flex flex-wrap gap-3">
            {seccion.opciones.map(opcion => (
              <button
                key={opcion.id}
                onClick={() => opcion.id && handleSeleccion(opcion.id)}
                disabled={!opcion.id}
                className={`
                  px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2
                  ${opcion.id && esSeleccionado(opcion.id)
                    ? 'border-purple-500 bg-purple-600 text-white shadow-lg scale-105'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-purple-500/50'}
                  ${!opcion.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{opcion.titulo}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'pregunta_texto':
        return (
          <textarea
            value={textoLocal}
            onChange={(e) => {
              setTextoLocal(e.target.value);
              onRespuesta({ respuesta_texto: e.target.value });
            }}
            rows={4}
            className="w-full p-4 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all outline-none resize-none bg-gray-800 text-white placeholder-gray-500"
            placeholder="Escribe tu respuesta aquí..."
          />
        );

      case 'subir_foto':
        return (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoUpload}
              className="hidden"
            />
            
            {!respuestaActual?.foto_subida ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-12 border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-500 transition-colors bg-gray-800/50"
              >
                <div className="text-center">
                  <div className="text-5xl mb-3">📸</div>
                  <p className="text-gray-400 font-medium">Haz clic para subir una foto</p>
                  <p className="text-xs text-gray-500 mt-2">JPG, PNG o WEBP (máx. 5MB)</p>
                </div>
              </button>
            ) : (
              <div className="relative group">
                <img
                  src={URL.createObjectURL(respuestaActual.foto_subida as File)}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-xl border-2 border-purple-500"
                />
                <button
                  onClick={() => {
                    onRespuesta({ foto_subida: undefined });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-3 right-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-red-400">Tipo de sección no soportado</p>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título e instrucción */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">{seccion.titulo}</h3>
        {seccion.instruccion && (
          <p className="text-gray-400">{seccion.instruccion}</p>
        )}
        {seccion.obligatoria && (
          <span className="inline-block mt-2 px-3 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-700">
            ⚠️ Obligatorio
          </span>
        )}
      </div>

      {/* Contenido dinámico */}
      {renderizarContenido()}
    </div>
  );
}