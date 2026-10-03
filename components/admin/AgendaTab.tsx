// components/admin/AgendaTab.tsx
'use client';

import { useState, useEffect } from 'react';
import AgendaDayView from './agenda/AgendaDayView';
import CitaDetailPanel from './agenda/CitaDetailPanel';
import ModalCrearCitaRapida from './agenda/ModalCrearCitaRapida';
import { Cita, ProfesionalConHorario, VistaAgenda, ModalCrearCitaData } from './agenda/types';

interface AgendaTabProps {
  apiUrl: string;
  token: string | null;
}

// ← ← ← FIX TIMEZONE: Helper para obtener la fecha local (YYYY-MM-DD) sin conversión a UTC
const getFechaLocal = (): string => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AgendaTab({ apiUrl, token }: AgendaTabProps) {
  const [vistaActual, setVistaActual] = useState<VistaAgenda>('dia');
  
  // ← ← ← FIX TIMEZONE: Usar el helper local en lugar de toISOString()
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(getFechaLocal);
  
  const [profesionales, setProfesionales] = useState<ProfesionalConHorario[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Panel lateral
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  
  // Modal crear cita
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modalCrearData, setModalCrearData] = useState<ModalCrearCitaData | null>(null);

  const cargarAgendaDia = async () => {
    try {
      setCargando(true);
      const res = await fetch(
        `${apiUrl}/citas/agenda-dia/?fecha=${fechaSeleccionada}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setProfesionales(data.profesionales);
        setCitas(data.citas);
      } else {
        console.error('Error cargando agenda:', res.status);
      }
    } catch (err) {
      console.error('Error cargando agenda:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (vistaActual === 'dia') {
      cargarAgendaDia();
    }
  }, [fechaSeleccionada, vistaActual]);

  const handleCitaClick = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setPanelAbierto(true);
  };

  // ← ← ← CORREGIDO: Recibir data completa como en la versión original
  const handleSlotClick = (data: ModalCrearCitaData) => {
    setModalCrearData(data);
    setModalCrearOpen(true);
  };

  const handleCitaCreada = async (nuevaCita: Cita) => {
    // 1. Cerrar el modal
    setModalCrearOpen(false);
    setModalCrearData(null);
    
    // 2. Recargar la agenda para asegurar que el grid esté sincronizado
    await cargarAgendaDia();
    
    // 3. Mostrar el panel lateral con la información de la cita recién creada
    setCitaSeleccionada(nuevaCita);
    setPanelAbierto(true);
  };

  const handleCitaActualizada = (citaActualizada: Cita) => {
    setCitas(prev => prev.map(c => c.id === citaActualizada.id ? citaActualizada : c));
    setCitaSeleccionada(citaActualizada);
  };

    const handleCitaEliminada = () => {
    setPanelAbierto(false);   // 1. Cierra el panel lateral
    cargarAgendaDia();        // 2. Vuelve a traer los datos de la agenda actualizada
  };


  // ← ← ← FIX TIMEZONE: Usar el helper local
  const irAHoy = () => {
    setFechaSeleccionada(getFechaLocal());
  };

  const cambiarDia = (direccion: 'anterior' | 'siguiente') => {
    const fecha = new Date(fechaSeleccionada + 'T12:00:00'); // ← ← ← CLAVE: Forzar mediodía para evitar saltos de día por timezone
    fecha.setDate(fecha.getDate() + (direccion === 'anterior' ? -1 : 1));
    
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    setFechaSeleccionada(`${year}-${month}-${day}`);
  };

  const formatearFecha = (fechaStr: string) => {
    // ← ← ← FIX TIMEZONE: Agregar 'T12:00:00' para evitar que el navegador lo interprete como UTC medianoche
    const fecha = new Date(fechaStr + 'T12:00:00');
    return fecha.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-900 rounded-xl overflow-hidden">
      
      {/* ========== ÁREA DE AGENDA (FLEXIBLE - SE REDUCE) ========== */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Header de navegación */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Navegación de fecha */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => cambiarDia('anterior')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={irAHoy}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs md:text-sm font-medium text-white transition-colors"
              >
                Hoy
              </button>
              
              <button
                onClick={() => cambiarDia('siguiente')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="ml-2 md:ml-4 min-w-0">
                <h2 className="text-sm md:text-lg lg:text-xl font-bold text-white capitalize truncate">
                  {formatearFecha(fechaSeleccionada)}
                </h2>
              </div>
            </div>

            {/* Tabs de vista */}
            <div className="flex bg-gray-900 rounded-lg p-1">
              {(['dia', 'semana', 'mes'] as VistaAgenda[]).map((vista) => (
                <button
                  key={vista}
                  onClick={() => setVistaActual(vista)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-all ${
                    vistaActual === vista
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {vista.charAt(0).toUpperCase() + vista.slice(1)}
                </button>
              ))}
            </div>

            {/* Input de fecha */}
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="px-2 md:px-3 py-1.5 md:py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs md:text-sm"
            />
          </div>
        </div>

        {/* Contenido de la agenda */}
        <div className="flex-1 overflow-hidden">
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : vistaActual === 'dia' ? (
            <AgendaDayView
              profesionales={profesionales}
              citas={citas}
              onCitaClick={handleCitaClick}
              onSlotClick={handleSlotClick}
              fechaActual={fechaSeleccionada}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-lg">Vista {vistaActual} en desarrollo...</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== PANEL LATERAL (ANCHO FIJO - NO SE REDUCE) ========== */}
      {panelAbierto && citaSeleccionada && (
        <CitaDetailPanel
          cita={citaSeleccionada}
          onClose={() => setPanelAbierto(false)}
          onCitaActualizada={handleCitaActualizada}
           onCitaEliminada={handleCitaEliminada} 
          onFechaCambiada={(nuevaFecha) => setFechaSeleccionada(nuevaFecha)}
          apiUrl={apiUrl}
          token={token}
        />
      )}

      {/* Modal crear cita rápida */}
      {modalCrearOpen && modalCrearData && (
        <ModalCrearCitaRapida
          data={modalCrearData}
          onClose={() => {
            setModalCrearOpen(false);
            setModalCrearData(null);
          }}
          onCitaCreada={handleCitaCreada}
          apiUrl={apiUrl}
          token={token}
        />
      )}
    </div>
  );
}