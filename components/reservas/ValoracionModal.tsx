// components/reservas/ValoracionModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useValoracion } from '@/hooks/useValoracion';
import SeccionCliente from './valoracion/SeccionCliente';
import ResumenValoracion from './valoracion/ResumenValoracion';

interface ValoracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicioId: number;
  servicioNombre: string;
  onCompletar: (precioCalculado: number, respuestas: any[]) => void;
}

export default function ValoracionModal({
  isOpen,
  onClose,
  servicioId,
  servicioNombre,
  onCompletar
}: ValoracionModalProps) {
  const {
    config,
    loading,
    error,
    respuestas,
    calculo,
    actualizarRespuesta,
    setRespuestas
  } = useValoracion(servicioId);

  const [pasoActual, setPasoActual] = useState(0);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  // Resetear estado al abrir/cerrar modal
  useEffect(() => {
    if (!isOpen) {
      setPasoActual(0);
      setMostrarResumen(false);
      setRespuestas([]);
    }
  }, [isOpen]);

  // Validar si se puede avanzar al siguiente paso
  const puedeAvanzar = () => {
    if (!config || !config.secciones[pasoActual]) return false;
    
    const seccion = config.secciones[pasoActual];
    const respuesta = respuestas.find(r => r.seccion === seccion.id);

    // Si no es obligatoria, puede avanzar
    if (!seccion.obligatoria) return true;

    // Validar según tipo de sección
    switch (seccion.tipo) {
      case 'foto_opciones':
      case 'foto_descripcion':
      case 'pregunta_opciones':
        return respuesta?.opcion_seleccionada !== undefined;
      
      case 'pregunta_texto':
        return respuesta?.respuesta_texto?.trim() !== '';
      
      case 'subir_foto':
        return respuesta?.foto_subida !== undefined;
      
      default:
        return true;
    }
  };

  const handleSiguiente = () => {
    if (pasoActual < (config?.secciones.length || 0) - 1) {
      setPasoActual(pasoActual + 1);
    } else {
      // Última sección, mostrar resumen
      setMostrarResumen(true);
    }
  };

  const handleAnterior = () => {
    if (mostrarResumen) {
      setMostrarResumen(false);
    } else if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleCompletar = () => {
    if (calculo) {
      onCompletar(calculo.precio_total, respuestas);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando valoración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const progreso = mostrarResumen 
    ? 100 
    : ((pasoActual + 1) / config.secciones.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                📋 {config.titulo || 'Valoración del Servicio'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">{servicioNombre}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">
            {mostrarResumen 
              ? 'Revisión final' 
              : `Paso ${pasoActual + 1} de ${config.secciones.length}`
            }
          </p>
        </div>

       

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {!mostrarResumen ? (
            <SeccionCliente
              seccion={config.secciones[pasoActual]}
              respuestaActual={respuestas.find(r => r.seccion === config.secciones[pasoActual].id)}
              onRespuesta={(respuesta) => {
                const seccionId = config.secciones[pasoActual]?.id;
                if (seccionId !== undefined) {
                  actualizarRespuesta(seccionId, respuesta);
                }
              }}
            />
          ) : (
            <ResumenValoracion
              config={config}
              respuestas={respuestas}
              calculo={calculo}
            />
          )}
        </div>
 {/* ← ← ← MENSAJES INFORMATIVOS COMPACTOS (NUEVO) ← ← ← */}
        <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-3">
            {/* Mensaje 1: Seguridad */}
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 text-sm">🔒</span>
              </div>
              <p className="text-gray-400 leading-tight">
                Información protegida
              </p>
            </div>
            
            {/* Mensaje 2: Rapidez */}
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 text-sm">⏱️</span>
              </div>
              <p className="text-gray-400 leading-tight">
                Cotización rápida
              </p>
            </div>
            
            {/* Mensaje 3: Asesoría */}
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 bg-purple-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 text-sm">👨‍💼</span>
              </div>
              <p className="text-gray-400 leading-tight">
                Asesoría profesional
              </p>
            </div>
          </div>
        </div>
        {/* Footer con navegación y precio */}
        <div className="p-6 border-t border-gray-700 bg-gray-950 rounded-b-2xl">
          <div className="flex items-center justify-between gap-4">
            {/* Botón anterior */}
            {(pasoActual > 0 || mostrarResumen) ? (
              <button
                onClick={handleAnterior}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            {/* Precio calculado - SOLO VISIBLE EN RESUMEN */}
            <div className="flex-1 text-center">
              {mostrarResumen && calculo ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Estimado</p>
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    {calculo.precio_total_formateado}
                  </p>                  
                  <p className="text-[10px] text-gray-500 text-center italic pt-2 ">
                    * El precio final puede variar según evaluación presencial
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Paso {pasoActual + 1} de {config.secciones.length}</p>
              )}
            </div>

            {/* Botón siguiente/completar */}
            {!mostrarResumen ? (
              <button
                onClick={handleSiguiente}
                disabled={!puedeAvanzar()}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold shadow-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pasoActual === config.secciones.length - 1 ? 'Ver Resumen →' : 'Siguiente →'}
              </button>
            ) : (
              <button
                onClick={handleCompletar}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                ✓ Confirmar Valoración
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}