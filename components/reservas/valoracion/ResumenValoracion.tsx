// components/reservas/valoracion/ResumenValoracion.tsx
'use client';

import { ValoracionConfig, RespuestaValoracion, CalculoValoracion } from '@/types/valoracion';

interface ResumenValoracionProps {
  config: ValoracionConfig;
  respuestas: RespuestaValoracion[];
  calculo: CalculoValoracion | null;
}

export default function ResumenValoracion({
  config,
  respuestas,
  calculo
}: ResumenValoracionProps) {
  
  const getDetalleRespuesta = (respuesta: RespuestaValoracion) => {
  const seccion = config.secciones.find(s => s.id === respuesta.seccion);
  if (!seccion) return null;

  const opcionSeleccionada = respuesta.opcion_seleccionada;
  
  // ← ← ← VERIFICACIÓN ADICIONAL: Asegurar que no sea undefined ← ← ←
  if (Array.isArray(opcionSeleccionada) && opcionSeleccionada !== undefined) {
    const opciones = seccion.opciones.filter(op => 
      op.id !== undefined && opcionSeleccionada.includes(op.id)
    );
    return { seccion, opciones, texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
  }

  if (opcionSeleccionada !== undefined && opcionSeleccionada !== null) {
    const opcion = seccion.opciones.find(op => op.id !== undefined && op.id === opcionSeleccionada);
    return { seccion, opciones: opcion ? [opcion] : [], texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
  }

  return { seccion, opciones: [], texto: respuesta.respuesta_texto, foto: respuesta.foto_subida };
};

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
      {/* Header Compacto */}
      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-bold text-white">📋 Resumen</h3>
          <p className="text-xs text-gray-400">{config.titulo}</p>
        </div>
        <div className="text-right">
          {calculo && (
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              {calculo.precio_total_formateado}
            </p>
          )}
        </div>
      </div>

      {/* ← ← ← FRANJA INFORMATIVA - ANCHO COMPLETO CON SEPARADOR ← ← ← */}
<div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
  <div className="grid grid-cols-2 gap-3">
    {/* Columna 1: Precios aproximados */}
    <div className="flex items-start gap-2 border-r border-gray-700 pr-3 pl-25">
      <span className="text-blue-400 text-lg flex-shrink-0">ℹ️</span>
      <div>
        <p className="text-xs font-semibold text-blue-400">Precios aproximados</p>
        <p className="text-[10px] text-gray-400 leading-tight">
          Valor final se define en el salón
        </p>
      </div>
    </div>

    {/* Columna 2: Valoración física */}
    <div className="flex items-start gap-2 pl-25">
      <span className="text-purple-400 text-lg flex-shrink-0">👥</span>
      <div>
        <p className="text-xs font-semibold text-purple-400">Valoración física</p>
        <p className="text-[10px] text-gray-400 leading-tight">
          Se realizará valoración real en el salón
        </p>
      </div>
    </div>
  </div>
</div>

      {/* ← ← ← DESGLOSE - MÁS ANGOSTO Y CENTRADO ← ← ← */}
      <div className="max-w-2xl mx-auto">
        <div className="space-y-2">
          {respuestas.map((respuesta, idx) => {
            const detalle = getDetalleRespuesta(respuesta);
            if (!detalle) return null;

            return (
              <div key={idx} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                <h4 className="font-semibold text-purple-400 text-xs mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[8px]">
                    {idx + 1}
                  </span>
                  {detalle.seccion.titulo}
               

                <div className="space-y-0.5 pl-6">
                  {/* Opciones en línea si hay espacio */}
                  <div className="flex flex-wrap gap-1">
                    {detalle.opciones.map(op => (
                      <span key={op.id} className="text-xs text-gray-300">
                        ✓ {op.titulo}
                      </span>
                    ))}
                  </div>

                  {/* Texto libre compacto */}
                  {detalle.texto && (
                    <p className="text-xs text-gray-400 italic line-clamp-2">
                      "{detalle.texto}"
                    </p>
                  )}

                  {/* Foto miniatura */}
                  {detalle.foto && (
                    <img
                      src={
                        detalle.foto instanceof File
                          ? URL.createObjectURL(detalle.foto)
                          : detalle.foto  // Si es string (URL), usar directamente
                      }
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded border border-gray-600 mt-1"
                    />
                  )}
                </div> </h4>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}