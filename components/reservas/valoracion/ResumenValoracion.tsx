'use client';

import { ValoracionConfig, RespuestaValoracion, CalculoValoracion, ValoracionSeccion } from '@/types/valoracion';

interface ResumenValoracionProps {
  config: ValoracionConfig;
  respuestas: RespuestaValoracion[];
  calculo: CalculoValoracion | null;
  seccionesVisibles?: ValoracionSeccion[]; // ← ← ← NUEVO: Secciones actualmente visibles
}

export default function ResumenValoracion({
  config,
  respuestas,
  calculo,
  seccionesVisibles // ← ← ← NUEVO
}: ResumenValoracionProps) {
  
  // ← ← ← NUEVO: Filtrar respuestas para solo mostrar las de secciones visibles ← ← ←
  const respuestasVisibles = seccionesVisibles 
    ? respuestas.filter(r => seccionesVisibles.some(s => s.id === r.seccion))
    : respuestas;

  // ← ← ← NUEVO: Recalcular total basándose solo en respuestas visibles ← ← ←
  const calcularTotalVisible = () => {
    if (!config) return { precio_base: 0, adicionales: 0, total: 0, total_formateado: '$0' };
    
    let adicionalesVisibles = 0;
    
    // Calcular adicionales SOLO de las respuestas visibles
    respuestasVisibles.forEach(respuesta => {
      const seccion = config.secciones.find(s => s.id === respuesta.seccion);
      if (!seccion) return;
      
      // Si tiene opción seleccionada, sumar su valor adicional
      if (respuesta.opcion_seleccionada !== undefined && respuesta.opcion_seleccionada !== null) {
        if (Array.isArray(respuesta.opcion_seleccionada)) {
          respuesta.opcion_seleccionada.forEach(opId => {
            const opcion = seccion.opciones.find(op => op.id === opId);
            if (opcion) adicionalesVisibles += parseFloat(String(opcion.valor_adicional)) || 0;
          });
        } else {
          const opcion = seccion.opciones.find(op => op.id === respuesta.opcion_seleccionada);
          if (opcion) adicionalesVisibles += parseFloat(String(opcion.valor_adicional)) || 0;
        }
      }
    });
    
    // Calcular adicionales ORIGINALES (de todas las respuestas, no solo visibles)
    let adicionalesOriginales = 0;
    respuestas.forEach(respuesta => {
      const seccion = config.secciones.find(s => s.id === respuesta.seccion);
      if (!seccion) return;
      
      if (respuesta.opcion_seleccionada !== undefined && respuesta.opcion_seleccionada !== null) {
        if (Array.isArray(respuesta.opcion_seleccionada)) {
          respuesta.opcion_seleccionada.forEach(opId => {
            const opcion = seccion.opciones.find(op => op.id === opId);
            if (opcion) adicionalesOriginales += parseFloat(String(opcion.valor_adicional)) || 0;
          });
        } else {
          const opcion = seccion.opciones.find(op => op.id === respuesta.opcion_seleccionada);
          if (opcion) adicionalesOriginales += parseFloat(String(opcion.valor_adicional)) || 0;
        }
      }
    });
    
    // Calcular precio base (precio total original - adicionales originales)
    const precioBase = calculo ? (calculo.precio_total - adicionalesOriginales) : 0;
    const total = precioBase + adicionalesVisibles;
    
    return {
      precio_base: precioBase,
      adicionales: adicionalesVisibles,
      total,
      total_formateado: new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(total).replace('COP', '$').trim()
    };
  };

  const totalVisible = calcularTotalVisible();
  
  const getDetalleRespuesta = (respuesta: RespuestaValoracion) => {
    const seccion = config.secciones.find(s => s.id === respuesta.seccion);
    if (!seccion) return null;

    const opcionSeleccionada = respuesta.opcion_seleccionada;
    
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
          {/* ← ← ← USAR totalVisible EN LUGAR DE calculo ← ← ← */}
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            {totalVisible.total_formateado}
          </p>
        </div>
      </div>

      {/* Franja Informativa */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 border-r border-gray-700 pr-3">
            <span className="text-blue-400 text-lg flex-shrink-0">ℹ️</span>
            <div>
              <p className="text-xs font-semibold text-blue-400">Precios aproximados</p>
              <p className="text-[10px] text-gray-400 leading-tight">
                Valor final se define en el salón
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
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

      {/* Desglose - Solo respuestas visibles */}
      <div className="max-w-2xl mx-auto">
        <div className="space-y-2">
          {/* ← ← ← USAR respuestasVisibles EN LUGAR DE respuestas ← ← ← */}
          {respuestasVisibles.map((respuesta, idx) => {
            const detalle = getDetalleRespuesta(respuesta);
            if (!detalle) return null;

            return (
              <div key={idx} className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                <h4 className="font-semibold text-purple-400 text-xs mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[8px]">
                    {idx + 1}
                  </span>
                  {detalle.seccion.titulo}
                </h4>

                <div className="space-y-0.5 pl-6">
                  <div className="flex flex-wrap gap-1">
                    {detalle.opciones.map(op => (
                      <span key={op.id} className="text-xs text-gray-300">
                        ✓ {op.titulo}
                      </span>
                    ))}
                  </div>

                  {detalle.texto && (
                    <p className="text-xs text-gray-400 italic line-clamp-2">
                      "{detalle.texto}"
                    </p>
                  )}

                  {detalle.foto && (
                    <img
                      src={
                        detalle.foto instanceof File
                          ? URL.createObjectURL(detalle.foto)
                          : detalle.foto
                      }
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded border border-gray-600 mt-1"
                    />
                  )}
                </div>
              </div>
            );
          })}
          
          {/* ← ← ← NUEVO: Mensaje si no hay respuestas visibles ← ← ← */}
          {respuestasVisibles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay respuestas para mostrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}