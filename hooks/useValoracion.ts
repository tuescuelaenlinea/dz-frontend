// hooks/useValoracion.ts
import { useState, useEffect } from 'react';
import { ValoracionConfig, RespuestaValoracion, CalculoValoracion } from '@/types/valoracion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';

export function useValoracion(servicioId: number | null) {
  const [config, setConfig] = useState<ValoracionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaValoracion[]>([]);
  const [calculo, setCalculo] = useState<CalculoValoracion | null>(null);

  // Cargar configuración de valoración
  const cargarConfiguracion = async () => {
    if (!servicioId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/servicios/${servicioId}/valoracion-config/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('No se pudo cargar la configuración de valoración');
      }

      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular precio basado en respuestas
  const calcularPrecio = async (respuestasData: RespuestaValoracion[]) => {
    if (!servicioId || respuestasData.length === 0) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Preparar payload
      const payload = {
        servicio_id: servicioId,
        respuestas: respuestasData.map(r => ({
          seccion: r.seccion,
          opcion_seleccionada: r.opcion_seleccionada || [],
          respuesta_texto: r.respuesta_texto || ''
        }))
      };

      const res = await fetch(`${API_URL}/valoracion/calcular/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al calcular el precio');
      }

      const data: CalculoValoracion = await res.json();
      setCalculo(data);
      return data;
    } catch (err: any) {
      console.error('❌ Error calculando precio:', err);
      setError(err.message);
      return null;
    }
  };

  // Guardar respuestas vinculadas a cita
  const guardarRespuestas = async (citaId: number, respuestasData: RespuestaValoracion[]) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const formData = new FormData();
      formData.append('cita_id', citaId.toString());
      
      // Agregar respuestas como JSON
      const respuestasPayload = respuestasData.map(r => ({
        seccion: r.seccion,
        opcion_seleccionada: r.opcion_seleccionada || null,
        respuesta_texto: r.respuesta_texto || '',
        valor_aplicado: 0 // Se calculará en el backend
      }));
      
      formData.append('respuestas', JSON.stringify(respuestasPayload));

      // Agregar archivos de fotos si existen
      respuestasData.forEach(r => {
        if (r.foto_subida instanceof File) {
          formData.append(`foto_${r.seccion}`, r.foto_subida);
        }
      });

      const res = await fetch(`${API_URL}/valoracion/guardar-respuestas/`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar respuestas');
      }

      return await res.json();
    } catch (err: any) {
      console.error('❌ Error guardando respuestas:', err);
      setError(err.message);
      return null;
    }
  };

  // Actualizar respuesta de una sección
  const actualizarRespuesta = (seccionId: number, respuesta: Partial<RespuestaValoracion>) => {
    setRespuestas(prev => {
      const existingIndex = prev.findIndex(r => r.seccion === seccionId);
      const nuevaRespuesta = {
        seccion: seccionId,
        ...respuesta
      } as RespuestaValoracion;

      if (existingIndex >= 0) {
        const nuevas = [...prev];
        nuevas[existingIndex] = nuevaRespuesta;
        return nuevas;
      }
      return [...prev, nuevaRespuesta];
    });
  };

  // Calcular precio en tiempo real cuando cambian las respuestas
  useEffect(() => {
    if (respuestas.length > 0) {
      calcularPrecio(respuestas);
    }
  }, [respuestas]);

  // Cargar configuración al montar
  useEffect(() => {
    if (servicioId) {
      cargarConfiguracion();
    }
  }, [servicioId]);

  return {
    config,
    loading,
    error,
    respuestas,
    calculo,
    actualizarRespuesta,
    calcularPrecio,
    guardarRespuestas,
    setRespuestas
  };
}