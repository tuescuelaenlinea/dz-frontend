// Add this new component file: components/booking/ValoracionModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface OpcionValoracion {
  id: number;
  titulo: string;
  descripcion: string;
  valor_adicional: number;
  foto_url?: string | null;
}

interface SeccionValoracion {
  id: number;
  tipo: 'foto_opciones' | 'pregunta_opciones' | 'pregunta_texto' | 'subir_foto';
  titulo: string;
  instruccion: string;
  obligatoria: boolean;
  seleccion_multiple: boolean;
  opciones?: OpcionValoracion[];
}

interface ValoracionConfig {
  id: number;
  servicio: number;
  titulo: string;
  descripcion: string;
  secciones: SeccionValoracion[];
}

interface ValoracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (precioFinal: number) => void;
  servicioId: number;
  precioBase: number;
  token?: string | null;
}

export default function ValoracionModal({
  isOpen,
  onClose,
  onAccept,
  servicioId,
  precioBase,
  token
}: ValoracionModalProps) {
  const [config, setConfig] = useState<ValoracionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [respuestas, setRespuestas] = useState<{
    [seccionId: number]: number | number[] | string;
  }>({});
  const [precioCalculado, setPrecioCalculado] = useState(precioBase);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  useEffect(() => {
    if (isOpen && servicioId) {
      loadValoracionConfig();
    }
  }, [isOpen, servicioId]);

  useEffect(() => {
    calcularPrecio();
  }, [respuestas, precioBase]);

  const loadValoracionConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/servicios/${servicioId}/valoracion-config/`, {
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        setError('No se pudo cargar la configuración de valoración');
      }
    } catch (err) {
      console.error('Error cargando valoración:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const calcularPrecio = () => {
    let total = precioBase;
    
    Object.entries(respuestas).forEach(([seccionId, valor]) => {
      const seccion = config?.secciones.find(s => s.id === parseInt(seccionId));
      if (!seccion || !seccion.opciones) return;

      if (Array.isArray(valor)) {
        // Selección múltiple
        valor.forEach(opcionId => {
          const opcion = seccion.opciones?.find(o => o.id === opcionId);
          if (opcion) total += opcion.valor_adicional;
        });
      } else if (typeof valor === 'number') {
        // Selección simple
        const opcion = seccion.opciones?.find(o => o.id === valor);
        if (opcion) total += opcion.valor_adicional;
      }
    });

    setPrecioCalculado(total);
  };

  const handleOpcionSelect = (seccionId: number, opcionId: number, multiple: boolean) => {
    setRespuestas(prev => {
      const current = prev[seccionId];
      
      if (multiple) {
        const currentArray = Array.isArray(current) ? current : [];
        if (currentArray.includes(opcionId)) {
          return { ...prev, [seccionId]: currentArray.filter(id => id !== opcionId) };
        } else {
          return { ...prev, [seccionId]: [...currentArray, opcionId] };
        }
      } else {
        return { ...prev, [seccionId]: opcionId };
      }
    });
  };

  const handleTextoChange = (seccionId: number, value: string) => {
    setRespuestas(prev => ({ ...prev, [seccionId]: value }));
  };

  const validarRespuestas = () => {
    if (!config) return false;

    for (const seccion of config.secciones) {
      if (seccion.obligatoria) {
        const respuesta = respuestas[seccion.id];
        if (!respuesta || (Array.isArray(respuesta) && respuesta.length === 0)) {
          setError(`La sección "${seccion.titulo}" es obligatoria`);
          return false;
        }
      }
    }
    return true;
  };

  const handleAccept = () => {
    if (!validarRespuestas()) return;
    onAccept(precioCalculado);
  };

  const handleClear = () => {
    setRespuestas({});
    setPrecioCalculado(precioBase);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {config?.titulo || 'Valoración del Servicio'}
              </h2>
              {config?.descripcion && (
                <p className="text-sm text-gray-600 mt-1">{config.descripcion}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : config ? (
            <>
              {/* Secciones de valoración */}
              {config.secciones.map((seccion) => (
                <div key={seccion.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900">{seccion.titulo}</h3>
                    {seccion.obligatoria && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Obligatorio
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{seccion.instruccion}</p>

                  {/* Opciones con fotos */}
                  {seccion.tipo === 'foto_opciones' && seccion.opciones && (
                    <div className="grid grid-cols-2 gap-3">
                      {seccion.opciones.map((opcion) => {
                        const respuestaActual = respuestas[seccion.id];
                        const isSelected = Array.isArray(respuestaActual)
                          ? respuestaActual.includes(opcion.id)
                          : respuestaActual === opcion.id;

                        return (
                          <button
                            key={opcion.id}
                            onClick={() => handleOpcionSelect(seccion.id, opcion.id, seccion.seleccion_multiple)}
                            className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {opcion.foto_url && (
                              <img
                                src={opcion.foto_url}
                                alt={opcion.titulo}
                                className="w-full h-24 object-cover rounded-md mb-2"
                              />
                            )}
                            <p className="font-medium text-sm text-gray-900">{opcion.titulo}</p>
                            {opcion.descripcion && (
                              <p className="text-xs text-gray-600 mt-1">{opcion.descripcion}</p>
                            )}
                            {opcion.valor_adicional > 0 && (
                              <p className="text-xs text-blue-600 font-semibold mt-1">
                                +${opcion.valor_adicional.toLocaleString()}
                              </p>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Opciones sin fotos */}
                  {seccion.tipo === 'pregunta_opciones' && seccion.opciones && (
                    <div className="space-y-2">
                      {seccion.opciones.map((opcion) => {
                        const respuestaActual = respuestas[seccion.id];
                        const isSelected = Array.isArray(respuestaActual)
                          ? respuestaActual.includes(opcion.id)
                          : respuestaActual === opcion.id;

                        return (
                          <label
                            key={opcion.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type={seccion.seleccion_multiple ? 'checkbox' : 'radio'}
                                name={`seccion-${seccion.id}`}
                                checked={isSelected}
                                onChange={() => handleOpcionSelect(seccion.id, opcion.id, seccion.seleccion_multiple)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div>
                                <p className="font-medium text-sm text-gray-900">{opcion.titulo}</p>
                                {opcion.descripcion && (
                                  <p className="text-xs text-gray-600">{opcion.descripcion}</p>
                                )}
                              </div>
                            </div>
                            {opcion.valor_adicional > 0 && (
                              <span className="text-sm text-blue-600 font-semibold">
                                +${opcion.valor_adicional.toLocaleString()}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Campo de texto */}
                  {seccion.tipo === 'pregunta_texto' && (
                    <textarea
                      value={(respuestas[seccion.id] as string) || ''}
                      onChange={(e) => handleTextoChange(seccion.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Escribe tu respuesta aquí..."
                    />
                  )}
                </div>
              ))}

              {/* Total aproximado */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-700">TOTAL APROXIMADO</span>
                  <span className="text-3xl font-bold text-purple-700">
                    ${precioCalculado.toLocaleString()}
                  </span>
                </div>
                
                {/* Info box */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mb-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Los precios son aproximaciones</p>
                      <p className="text-xs text-blue-700">El último valor se define en el salón.</p>
                    </div>
                  </div>
                </div>

                {/* Warning box */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Antes de iniciar el proceso</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Se realizará nuevamente la valoración real y física del servicio.
                        Si el servicio tiene un valor mayor, se pagará el excedente en el salón.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Las imágenes son de referencia.
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              LIMPIAR SELECCIONES
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-[2] py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              AGENDAR CITA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}