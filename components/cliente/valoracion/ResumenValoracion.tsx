'use client';

import { useMemo } from 'react';
import { ValoracionConfig, ValoracionSeccion, RespuestaValoracion } from '@/types/valoracion';

interface ResumenProps {
  config: ValoracionConfig;
  respuestas: RespuestaValoracion[];
  totalEstimado: number;
}

export default function ResumenValoracion({ config, respuestas, totalEstimado }: ResumenProps) {
  
 // components/cliente/valoracion/ResumenValoracion.tsx

// Función para encontrar la opción seleccionada y sus datos
const getDetalleRespuesta = (respuesta: RespuestaValoracion) => {
  const seccion = config.secciones.find(s => s.id === respuesta.seccion);
  if (!seccion) return null;

  // ← ← ← CLAVE: Usar variable intermedia para type narrowing ← ← ←
  const opcionSeleccionada = respuesta.opcion_seleccionada;

  // Si es selección múltiple
  if (Array.isArray(opcionSeleccionada)) {
    const opciones = seccion.opciones.filter(op => 
      opcionSeleccionada.includes(op.id!)  // ← ← ← AHORA TypeScript sabe que es array
    );
    return { seccion, opciones, texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
  }

  // Si es selección única
  if (opcionSeleccionada !== undefined && opcionSeleccionada !== null) {
    const opcion = seccion.opciones.find(op => op.id === opcionSeleccionada);
    return { seccion, opciones: opcion ? [opcion] : [], texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
  }

  // Si es solo texto o foto
  return { seccion, opciones: [], texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
};

  // ← ← ← CLAVE: Calcular total correctamente aquí también ← ← ←
  const totalCalculadoLocal = useMemo(() => {
    let total = 0;
    
    respuestas.forEach(resp => {
      const seccion = config.secciones.find(s => s.id === resp.seccion);
      if (!seccion) return;

      if (resp.opcion_seleccionada) {
        const ids = Array.isArray(resp.opcion_seleccionada) 
          ? resp.opcion_seleccionada 
          : [resp.opcion_seleccionada];
        
        ids.forEach(id => {
          const opcion = seccion.opciones.find(o => o.id === id);
          if (opcion) {
            // ← ← ← CONVERTIR EXPLÍCITAMENTE A NÚMERO ← ← ←
            const valor = parseFloat(String(opcion.valor_adicional || 0));
            total += isNaN(valor) ? 0 : valor;
          }
        });
      }
    });

    return total;
  }, [respuestas, config]);

  // Usar el total calculado localmente (más confiable)
  const totalFinal = totalCalculadoLocal > 0 ? totalCalculadoLocal : totalEstimado;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">📋 Resumen de tu Valoración</h2>
        <p className="opacity-90 mt-1">Revisa los detalles antes de finalizar</p>
      </div>

      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Configuración General */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{config.titulo}</h3>
          {config.descripcion && (
            <p className="text-sm text-gray-600 mb-4">{config.descripcion}</p>
          )}
        </div>

        {/* Líneas divisorias y detalles */}
        <div className="space-y-6">
          {respuestas.map((respuesta, idx) => {
            const detalle = getDetalleRespuesta(respuesta);
            if (!detalle) return null;

            // ← ← ← CLAVE: Convertir a número y sumar correctamente ← ← ←
            const subtotalSeccion = detalle.opciones.reduce((sum, op) => {
               const valor = Number(op.valor_adicional) || 0;
               return sum + valor;
            }, 0);

            return (
              <div key={idx} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    {detalle.seccion.titulo}
                  </h4>
                  {subtotalSeccion > 0 && (
                    <span className="font-bold text-purple-600 text-sm">
                      +${subtotalSeccion.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>

                <div className="space-y-1 pl-2 border-l-2 border-purple-100 ml-1">
                  {/* Opciones seleccionadas */}
                  {detalle.opciones.map(op => (
                    <div key={op.id} className="flex justify-between text-sm text-gray-600">
                      <span>✓ {op.titulo}</span>
                      {parseFloat(String(op.valor_adicional || 0)) > 0 && (
                        <span className="text-purple-600 font-medium">
                          +${parseFloat(String(op.valor_adicional || 0)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {/* Texto libre */}
                  {detalle.texto && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2 italic">
                      "{detalle.texto}"
                    </div>
                  )}

                  {/* Foto subida */}
                  {detalle.foto && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">📎 Foto adjunta:</p>
                      <img 
                        src={URL.createObjectURL(detalle.foto as File)} 
                        alt="Preview" 
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer con Total Final */}
      <div className="bg-gray-50 p-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 font-medium">Total Estimado</span>
          <span className="text-3xl font-bold text-gray-900">
            ${totalFinal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <p className="text-xs text-gray-500 text-right">
          * El precio final puede variar según evaluación presencial.
        </p>
      </div>
    </div>
  );
}