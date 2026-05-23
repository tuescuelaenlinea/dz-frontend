// app/admin/tareas/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import TareasModule from '@/components/admin/TareasModule';

interface TareasStats {
  pendientes_hoy: number;
  completadas_semana: number;
  tasa_finalizacion: number;
  total_tareas: number;
  total_finalizadas: number;
}

export default function TareasPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<TareasStats>({
    pendientes_hoy: 0,
    completadas_semana: 0,
    tasa_finalizacion: 0,
    total_tareas: 0,
    total_finalizadas: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // ← ← ← OBTENER TOKEN EN CLIENTE (evita error de window en SSR) ← ← ←
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    setToken(storedToken);
    console.log('🔐 [TareasPage] Token cargado:', storedToken ? '✅' : '❌');
  }, []);

  // ← ← ← FETCH DE ESTADÍSTICAS (solo cuando token esté disponible) ← ← ←
  const fetchStats = useCallback(async () => {
    if (!token) {
      console.log('⏳ [Stats] Esperando token...');
      return;
    }

    try {
      console.log('📊 [Stats] Fetching estadísticas...');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://179.43.112.64:8080/api';
      
      const response = await fetch(`${apiUrl}/tareas/estadisticas/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'  // ← ← ← CLAVE: Evitar cache de Next.js
      });

      console.log('📦 [Stats] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [Stats] Datos recibidos:', data);
      
      setStats({
        pendientes_hoy: data.pendientes_hoy ?? 0,
        completadas_semana: data.completadas_semana ?? 0,
        tasa_finalizacion: data.tasa_finalizacion ?? 0,
        total_tareas: data.total_tareas ?? 0,
        total_finalizadas: data.total_finalizadas ?? 0
      });
      setStatsError(null);
      
    } catch (error) {
      console.error('❌ [Stats] Error:', error);
      setStatsError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoadingStats(false);
    }
  }, [token]);

  // ← ← ← EJECUTAR FETCH CUANDO TOKEN ESTÉ LISTO ← ← ←
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  // ← ← ← CALLBACK PARA REFRESCAR STATS AL COMPLETAR TAREA ← ← ←
  const handleTareaFinalizada = useCallback((tarea: any) => {
    console.log('🎯 Tarea completada:', tarea);
    // Refrescar estadísticas después de 1 segundo (para que backend procese)
    setTimeout(() => fetchStats(), 1000);
  }, [fetchStats]);

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gray-900">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
          📋 Gestión de Tareas
        </h1>
        <p className="text-gray-400 mt-1">
          Organiza, prioriza y completa tus actividades diarias
        </p>
      </div>

      {/* ← ← ← CARDS DE ESTADÍSTICAS ← ← ← */}
      <div className="mt-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        
        {/* Card: Pendientes Hoy */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pendientes hoy</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">
                {loadingStats ? '...' : statsError ? '❌' : stats.pendientes_hoy}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
          {statsError && <p className="text-xs text-red-400 mt-1">Error al cargar</p>}
          <p className="text-xs text-gray-500 mt-2">
            Tareas creadas hoy sin completar
          </p>
        </div>

        {/* Card: Completadas Esta Semana */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Completadas esta semana</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {loadingStats ? '...' : statsError ? '❌' : stats.completadas_semana}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Últimos 7 días</p>
        </div>

        {/* Card: Tasa de Finalización */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Tasa de finalización</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {loadingStats ? '...' : statsError ? '❌' : `${stats.tasa_finalizacion}%`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.total_finalizadas} de {stats.total_tareas} tareas
          </p>
        </div>
      </div>

      {/* Módulo de tareas */}
      <div className="max-w-4xl mx-auto">
        <TareasModule
          apiUrl={process.env.NEXT_PUBLIC_API_URL}
          token={token}
          onTareaFinalizada={handleTareaFinalizada}
          filtroInicial="todas"
          className="bg-gray-800 rounded-xl border border-gray-700 p-6"
        />
      </div>
    </div>
  );
}