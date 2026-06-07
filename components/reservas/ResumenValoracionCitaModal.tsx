'use client';

import { useState, useEffect } from 'react';

interface OpcionSeleccionada {
  id: number;
  titulo: string;
  descripcion?: string;
  foto_url?: string;
  valor_adicional: number;
}

interface RespuestaValoracion {
  id: number;
  seccion_id: number;
  seccion_titulo: string;
  seccion_tipo: string;
  seccion_instruccion?: string;
  opcion_seleccionada?: OpcionSeleccionada;
  respuesta_texto?: string;
  foto_subida_url?: string;
  valor_aplicado: number;
  fecha_registro: string;
}

interface ResumenValoracionCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  citaId: number;
}

export default function ResumenValoracionCitaModal({
  isOpen,
  onClose,
  citaId
}: ResumenValoracionCitaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    cita_id: number;
    cita_codigo: string;
    servicio_nombre: string;
    precio_base_servicio: number;
    total_valoracion: number;
    precio_total_cita: number;
    respuestas: RespuestaValoracion[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && citaId) {
      cargarRespuestas();
    }
  }, [isOpen, citaId]);

  const cargarRespuestas = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/valoracion/cita/${citaId}/respuestas/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al cargar respuestas');
      }

      const responseData = await res.json();
      setData(responseData);
    } catch (err: any) {
      console.error('❌ Error cargando respuestas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                📋 Resumen de Valoración
              </h2>
              {data && (
                <p className="text-sm text-gray-400 mt-1">
                  {data.servicio_nombre} • Cita: {data.cita_codigo}
                </p>
              )}
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
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-400">Cargando respuestas...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-red-400 text-lg">{error}</p>
            </div>
          ) : data && data.respuestas.length > 0 ? (
            <div className="space-y-6">
              {/* Resumen de precios */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
                {/*<div className="grid grid-cols-3 gap-4 text-center">*/}
                <div className="grid text-center">  
                  {/*<div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Precio Base</p>
                    <p className="text-2xl font-bold text-white">
                      ${data.precio_base_servicio.toLocaleString('es-CO')}
                    </p>
                  </div>*/}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Valoración</p>
                    <p className="text-2xl font-bold text-purple-400">
                      ${data.precio_total_cita.toLocaleString('es-CO')}
                    </p>
                  </div>
                  {/*<div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Cita</p>
                    <p className="text-2xl font-bold text-green-400">
                      +${data.total_valoracion.toLocaleString('es-CO')}
                    </p>
                  </div>*/}
                </div>
              </div>

              {/* Respuestas por sección */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm">
                    {data.respuestas.length}
                  </span>
                  Respuestas del Cliente
                </h3>

                {data.respuestas.map((respuesta, index) => (
                  <div
                    key={respuesta.id}
                    className="bg-gray-800/50 rounded-xl p-5 border border-gray-700"
                  >
                    {/* Header de la sección */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg">{respuesta.seccion_titulo}</h4>
                        {respuesta.seccion_instruccion && (
                          <p className="text-sm text-gray-400 mt-1">{respuesta.seccion_instruccion}</p>
                        )}
                      </div>
                      {respuesta.valor_aplicado > 0 && (
                        <span className="px-3 py-1 bg-purple-900/50 text-purple-400 text-sm rounded-full border border-purple-700">
                          +${respuesta.valor_aplicado.toLocaleString('es-CO')}
                        </span>
                      )}
                    </div>

                    {/* Contenido de la respuesta */}
                    <div className="ml-11 space-y-3">
                      {/* Opción seleccionada */}
                      {respuesta.opcion_seleccionada && (
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-start gap-4">
                            {respuesta.opcion_seleccionada.foto_url && (
                              <img
                                src={respuesta.opcion_seleccionada.foto_url}
                                alt={respuesta.opcion_seleccionada.titulo}
                                className="w-24 h-24 object-cover rounded-lg border-2 border-purple-500"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-white text-lg">
                                ✓ {respuesta.opcion_seleccionada.titulo}
                              </p>
                              {respuesta.opcion_seleccionada.descripcion && (
                                <p className="text-sm text-gray-400 mt-1">
                                  {respuesta.opcion_seleccionada.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Texto libre */}
                      {respuesta.respuesta_texto && (
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <p className="text-sm text-gray-400 mb-2">Respuesta:</p>
                          <p className="text-white italic">"{respuesta.respuesta_texto}"</p>
                        </div>
                      )}

                      {/* Foto subida por el cliente */}
                      {respuesta.foto_subida_url && (
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                            📸 Foto subida por el cliente:
                          </p>
                          <img
                            src={respuesta.foto_subida_url}
                            alt="Foto del cliente"
                            className="w-full max-w-md h-auto rounded-lg border-2 border-blue-500 shadow-lg"
                          />
                        </div>
                      )}

                      {/* Fecha de registro */}
                      <p className="text-xs text-gray-500">
                        Registrado: {new Date(respuesta.fecha_registro).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-5xl mb-4">📋</div>
              <p className="text-gray-400 text-lg">Esta cita no tiene respuestas de valoración</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-950 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}