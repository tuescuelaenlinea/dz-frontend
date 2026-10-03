// components/admin/PanelAdministrativo.tsx
'use client';

import { useEffect, useState } from 'react';

interface EstadisticasDia {
  fecha: string;
  total: number;
  confirmadas: number;
  pendientes: number;
  canceladas: number;
  no_asistio: number;
  ventas_proyectadas: number;
  servicios_populares: { nombre: string; porcentaje: number }[];
}

interface PanelAdministrativoProps {
  fechaActual: string;
  apiUrl: string;
  token: string | null;
}

export default function PanelAdministrativo({
  fechaActual,
  apiUrl,
  token
}: PanelAdministrativoProps) {
  const [estadisticas, setEstadisticas] = useState<EstadisticasDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(
          `${apiUrl}/citas/estadisticas-dia/?fecha=${fechaActual}`,
          {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }
        );
        
        if (res.ok) {
          const data = await res.json();
          setEstadisticas(data);
        } else {
          setError('Error al cargar las estadísticas');
        }
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();
  }, [fechaActual, apiUrl, token]);

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-3 overflow-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 w-44 bg-gray-200 rounded-lg flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !estadisticas) {
    return (
      <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200 mb-6">
        <p className="text-red-600 text-sm font-medium">
          ⚠️ {error || 'No se pudieron cargar los datos del día'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2 whitespace-nowrap">
        <span>📊</span> Panel Administrativo - {new Date(estadisticas.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h2>
      
      {/* ← ← ← CONTENEDOR DE UNA SOLA LÍNEA CON SCROLL HORIZONTAL ← ← ← */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* 6. Ventas proyectadas (Ligeramente más ancha) */}
        <div className="flex-shrink-0 w-96 bg-gradient-to-br from-purple-50 to-white rounded-lg p-3 border border-purple-200">
          <h3 className="text-xs font-medium text-gray-700 mb-1 truncate">Ventas proyectadas</h3>
          <div className="text-xl font-bold text-gray-900 mb-2">
            {formatearMoneda(estadisticas.ventas_proyectadas)}
          </div>
          <div className="h-10 flex items-end">
            <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,50 Q20,45 40,40 T80,30 T120,35 T160,20 T200,10" fill="none" stroke="#9333ea" strokeWidth="2" />
              <path d="M0,50 Q20,45 40,40 T80,30 T120,35 T160,20 T200,10 L200,60 L0,60 Z" fill="url(#gradient)" opacity="0.2" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* 7. Servicios más reservados (MÁS ANCHA - ocupa espacio restante) */}
        <div className="flex-shrink-0 w-96 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-xs font-medium text-gray-700 mb-2 truncate">Top Servicios</h3>
          <div className="flex items-center gap-3">
            {/* Lista compacta */}
            <div className="flex-1 space-y-1">
              {estadisticas.servicios_populares.length > 0 ? (
                estadisticas.servicios_populares.slice(0, 3).map((servicio, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate pr-1" title={servicio.nombre}>
                      {index + 1}. {servicio.nombre}
                    </span>
                    <span className="text-gray-900 font-medium">
                      {servicio.porcentaje}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 italic">Sin datos</p>
              )}
            </div>
            
            {/* Gráfico circular miniatura */}
            {estadisticas.servicios_populares.length > 0 && (
              <div className="w-16 h-16 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {estadisticas.servicios_populares.slice(0, 4).map((servicio, index) => {
                    const colores = ['#9333ea', '#ef4444', '#3b82f6', '#60a5fa'];
                    const offset = estadisticas.servicios_populares
                      .slice(0, index)
                      .reduce((acc, curr) => acc + curr.porcentaje, 0);
                    
                    return (
                      <path
                        key={index}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={colores[index % colores.length]}
                        strokeWidth="3"
                        strokeDasharray={`${servicio.porcentaje}, 100`}
                        strokeDashoffset={`-${offset}`}
                      />
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
        {/* 1. Citas de hoy */}
        <div className="flex-shrink-0 w-40 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1 truncate">Citas de hoy</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-900">{estadisticas.total}</span>
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* 2. Confirmadas */}
        <div className="flex-shrink-0 w-40 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1 truncate">Confirmadas</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-900">{estadisticas.confirmadas}</span>
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 3. Pendientes */}
        <div className="flex-shrink-0 w-40 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1 truncate">Pendientes</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-900">{estadisticas.pendientes}</span>
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 4. Canceladas */}
        <div className="flex-shrink-0 w-40 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1 truncate">Canceladas</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-900">{estadisticas.canceladas}</span>
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 5. No asistió */}
        <div className="flex-shrink-0 w-40 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1 truncate">No asistió</div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-gray-900">{estadisticas.no_asistio}</span>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        

      </div>
    </div>
  );
}