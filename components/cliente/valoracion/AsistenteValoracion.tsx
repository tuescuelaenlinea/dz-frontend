'use client';
// components/cliente/valoracion/AsistenteValoracion.tsx
import { useState, useEffect } from 'react';
import { ValoracionConfig, RespuestaValoracion } from '@/types/valoracion';
import SeccionCliente from './SeccionCliente';
import ResumenValoracion from './ResumenValoracion';

interface AsistenteValoracionProps {
  servicioId: number;
  citaId: number; // Necesario para enviar las respuestas
  onClose: () => void;
  onSuccess: () => void;
}

export default function AsistenteValoracion({ servicioId, citaId, onClose, onSuccess }: AsistenteValoracionProps) {
  const [config, setConfig] = useState<ValoracionConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Estados del Wizard
  const [pasoActual, setPasoActual] = useState(0); // 0 a N-1 son secciones, N es Resumen
  const [respuestas, setRespuestas] = useState<RespuestaValoracion[]>([]);
  const [totalCalculado, setTotalCalculado] = useState(0);
  
  // Estados de Acción
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // 1. Cargar Configuración al montar
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        setLoadingConfig(true);
        const token = localStorage.getItem('admin_token'); // O user_token
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/citas/${citaId}/valoracion-config/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!res.ok) throw new Error('No se pudo cargar la configuración');
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        setError('Error al cargar la valoración. Inténtalo más tarde.');
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    };

    cargarConfig();
  }, [citaId]);

  // 2. Calcular Total Dinámico
useEffect(() => {
  if (!config) return;

  let total = 0;
  
  respuestas.forEach(resp => {
    const seccion = config.secciones.find(s => s.id === resp.seccion);
    if (!seccion) return;

    // Sumar opciones
    if (resp.opcion_seleccionada) {
      const ids = Array.isArray(resp.opcion_seleccionada) 
        ? resp.opcion_seleccionada 
        : [resp.opcion_seleccionada];
      
      ids.forEach(id => {
        const opcion = seccion.opciones.find(o => o.id === id);
        if (opcion) {
          // ← ← ← CONVERSIÓN EXPLÍCITA A NÚMERO ← ← ←
          const valor = Number(opcion.valor_adicional) || 0;
          total += valor;
        }
      });
    }
  });

  setTotalCalculado(total);
}, [respuestas, config]);

  // 3. Manejar Respuestas
  const handleRespuesta = (seccionId: number, data: Partial<RespuestaValoracion>) => {
    setRespuestas(prev => {
      const idx = prev.findIndex(r => r.seccion === seccionId);
      const nuevaRespuesta = { ...prev[idx], seccion: seccionId, ...data } as RespuestaValoracion;
      
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = nuevaRespuesta;
        return next;
      }
      return [...prev, nuevaRespuesta];
    });
  };

  // 4. Enviar al Backend
  const handleSubmit = async () => {
    if (!config || !citaId) return;

    // Validar obligatorias
    const faltantes = config.secciones.filter(sec => {
      if (!sec.obligatoria) return false;
      return !respuestas.find(r => r.seccion === sec.id);
    });

    if (faltantes.length > 0) {
      setError(`Por favor completa la sección obligatoria: "${faltantes[0].titulo}"`);
      // Llevar al usuario a la sección faltante
      const idx = config.secciones.indexOf(faltantes[0]);
      if (idx !== -1) setPasoActual(idx);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      
      // ← ← ← PREPARAR FORMDATA PARA BACKEND (Soporta Archivos) ← ← ←
      const formData = new FormData();
      
      // Respuestas JSON
      const respuestasPayload = respuestas.map(r => ({
        seccion: r.seccion,
        opcion_seleccionada: r.opcion_seleccionada,
        respuesta_texto: r.respuesta_texto || ''
      }));
      
      formData.append('respuestas', JSON.stringify(respuestasPayload));

      // Archivos (si los hay)
      respuestas.forEach(r => {
        if (r.foto_subida instanceof File) {
          // La clave debe coincidir con lo que espera el backend: foto_${seccionId}
          formData.append(`foto_${r.seccion}`, r.foto_subida);
        }
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/citas/${citaId}/enviar-valoracion/`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`
            // NO poner Content-Type: application/json aquí, el navegador lo pone automáticamente con boundary para FormData
          },
          body: formData
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }

      const result = await res.json();
      console.log('✅ Valoración guardada:', result);
      
      onSuccess(); // Callback para cerrar modal o refrescar página
      
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  // Renderizado
  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-gray-500">Cargando formulario de valoración...</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-lg font-bold mb-4">{error}</p>
        <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
          Cerrar
        </button>
      </div>
    );
  }

  if (!config) return null;

  const secciones = config.secciones;
  const esResumen = pasoActual >= secciones.length;
  const progreso = esResumen ? 100 : ((pasoActual + 1) / (secciones.length + 1)) * 100;

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
      
      {/* Header con Barra de Progreso */}
      <div className="p-6 pb-2 bg-white border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{config.titulo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕ Cerrar
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${progreso}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2 text-right">
          {esResumen ? 'Revisión Final' : `Paso ${pasoActual + 1} de ${secciones.length}`}
        </p>
      </div>

      {/* Contenido Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {!esResumen ? (
          <SeccionCliente
            seccion={secciones[pasoActual]}
            respuestaActual={respuestas.find(r => r.seccion === secciones[pasoActual].id)}
            onRespuesta={(data) => handleRespuesta(secciones[pasoActual].id!, data)}
            valoracionConfig={config}
          />
        ) : (
          <ResumenValoracion
            config={config}
            respuestas={respuestas}
            totalEstimado={totalCalculado}
          />
        )}
      </div>

      {/* Footer con Navegación */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={() => setPasoActual(prev => Math.max(0, prev - 1))}
          disabled={pasoActual === 0 || submitting}
          className="px-6 py-3 text-gray-600 font-medium hover:text-gray-900 disabled:opacity-30"
        >
          ← Atrás
        </button>

        <div className="text-right mr-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Estimado</p>
          <p className="text-xl font-bold text-purple-600">${totalCalculado.toLocaleString('es-CO')}</p>
        </div>

        {!esResumen ? (
          <button
            onClick={() => setPasoActual(prev => prev + 1)}
            className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition-all"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 hover:scale-105 transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              '✅ Confirmar Valoración'
            )}
          </button>
        )}
      </div>
    </div>
  );
}