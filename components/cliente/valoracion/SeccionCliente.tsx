'use client';
//components/cliente/valoracion/SeccionCliente.tsx

import { useState, useEffect } from 'react';
import { ValoracionSeccion, ValoracionOpcion, RespuestaValoracion } from '@/types/valoracion';
import PhotoUploader from '@/components/admin/valoracion/PhotoUploader';

interface SeccionClienteProps {
  seccion: ValoracionSeccion;
  respuestaActual?: RespuestaValoracion;
  onRespuesta: (respuesta: Partial<RespuestaValoracion>) => void;
  valoracionConfig: any; // Para acceso a contexto si se requiere
}

export default function SeccionCliente({
  seccion,
  respuestaActual,
  onRespuesta,
}: SeccionClienteProps) {
  
  // Estado local para inputs de texto o archivos
  const [textoLocal, setTextoLocal] = useState(respuestaActual?.respuesta_texto || '');
  const [fotoLocal, setFotoLocal] = useState<File | null>(null);

  // Función para seleccionar opción (Radio o Checkbox)
  const handleSeleccion = (opcionId: number) => {
    if (seccion.seleccion_multiple) {
      // Lógica de múltiples selecciones (Checkbox)
      const actuales = (respuestaActual?.opcion_seleccionada as number[]) || [];
      const nuevas = actuales.includes(opcionId)
        ? actuales.filter((id) => id !== opcionId)
        : [...actuales, opcionId];
      onRespuesta({ opcion_seleccionada: nuevas });
    } else {
      // Lógica de selección única (Radio)
      onRespuesta({ opcion_seleccionada: opcionId });
    }
  };

  const esSeleccionado = (opcionId: number) => {
    if (seccion.seleccion_multiple) {
      return (respuestaActual?.opcion_seleccionada as number[])?.includes(opcionId);
    }
    return respuestaActual?.opcion_seleccionada === opcionId;
  };

  // --- RENDERIZADO SEGÚN TIPO DE SECCIÓN ---

  // TIPO: Foto con opciones (Estilo "Alisados")
  if (seccion.tipo === 'foto_opciones' || seccion.tipo === 'foto_descripcion') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{seccion.titulo}</h3>
          {seccion.instruccion && (
            <p className="text-gray-500 mt-1">{seccion.instruccion}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seccion.opciones
            .filter(op => op.activo)
            .map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => opcion.id && handleSeleccion(opcion.id)}
                className={`
                  relative overflow-hidden rounded-xl border-2 transition-all duration-200 text-left group
                  ${esSeleccionado(opcion.id!) 
                    ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' 
                    : 'border-gray-200 hover:border-purple-300 bg-white'}
                `}
              >
                {/* Checkmark visual */}
                {esSeleccionado(opcion.id!) && (
                  <div className="absolute top-3 right-3 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center z-10">
                    ✓
                  </div>
                )}
                
                {/* Imagen */}
                {opcion.foto_url && (
                  <div className="h-40 w-full overflow-hidden">
                    <img 
                      src={opcion.foto_url} 
                      alt={opcion.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Contenido */}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{opcion.titulo}</p>
                      {seccion.tipo === 'foto_descripcion' && opcion.descripcion && (
                        <p className="text-sm text-gray-500 mt-1">{opcion.descripcion}</p>
                      )}
                    </div>
                    {opcion.valor_adicional > 0 && (
                      <span className="font-bold text-purple-600 whitespace-nowrap ml-2">
                        +${opcion.valor_adicional.toLocaleString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>
    );
  }

  // TIPO: Pregunta con botones (Estilo "Blower" - Sin fotos)
  if (seccion.tipo === 'pregunta_opciones') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{seccion.titulo}</h3>
          {seccion.instruccion && (
            <p className="text-gray-500 mt-1">{seccion.instruccion}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {seccion.opciones
            .filter(op => op.activo)
            .map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => opcion.id && handleSeleccion(opcion.id)}
                className={`
                  px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 border-2
                  ${esSeleccionado(opcion.id!)
                    ? 'border-purple-600 bg-purple-600 text-white shadow-lg scale-105'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{opcion.titulo}</span>
                  {opcion.valor_adicional > 0 && (
                    <span className={`text-xs ${esSeleccionado(opcion.id!) ? 'text-purple-200' : 'text-gray-400'}`}>
                      (+${opcion.valor_adicional.toLocaleString('es-CO')})
                    </span>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>
    );
  }

  // TIPO: Pregunta con texto libre
  if (seccion.tipo === 'pregunta_texto') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{seccion.titulo}</h3>
          {seccion.instruccion && (
            <p className="text-gray-500 mt-1">{seccion.instruccion}</p>
          )}
        </div>

        <textarea
          value={textoLocal}
          onChange={(e) => {
            setTextoLocal(e.target.value);
            onRespuesta({ respuesta_texto: e.target.value });
          }}
          rows={4}
          className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none bg-gray-50"
          placeholder="Escribe tu respuesta aquí..."
        />
      </div>
    );
  }

  // TIPO: Subir foto
  if (seccion.tipo === 'subir_foto') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">{seccion.titulo}</h3>
          {seccion.instruccion && (
            <p className="text-gray-500 mt-1">{seccion.instruccion}</p>
          )}
        </div>

        <PhotoUploader
          onPhotoSelect={(file) => {
            setFotoLocal(file);
            // En el payload final enviaremos el archivo
            // Aquí solo indicamos que hay un archivo pendiente
            if (file) onRespuesta({ foto_subida: file });
          }}
          label="Subir foto de referencia"
          required={seccion.obligatoria}
        />
      </div>
    );
  }

  return <p className="text-red-500">Tipo de sección no soportado: {seccion.tipo}</p>;
}