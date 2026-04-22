// components/admin/ProfesionalesTab.tsx
'use client';
import { useState, useEffect } from 'react';
import EditCitaModal from './EditCitaModal';
import ProfessionalModal from '../booking/ProfessionalModal';
import PaymentMethodModal from '../booking/PaymentMethodModal';

interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_id: number | null;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  metodo_pago: string;
  estado: string;
  pago_estado: string;
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  foto?: string | null;
}

interface MetodoPago {
  id: number | string;
  banco: string;
  nombre?: string;
}

export default function ProfesionalesTab() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [fechaFin, setFechaFin] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // ← Profesional seleccionado (null = sin profesional / todas las citas sin asignar)
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<number | null>(null);
  
  // ← Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profesionalModalOpen, setProfesionalModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  
  // ← Cita seleccionada para editar
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [citaEditandoId, setCitaEditandoId] = useState<number | null>(null);

  // ← Totales
  const [totalGenerado, setTotalGenerado] = useState<number>(0);
  const [totalGanado, setTotalGanado] = useState<number>(0);
  const [totalAbonos, setTotalAbonos] = useState<number>(0);

  // ← Cargar citas y profesionales al montar o cambiar fechas
  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  const cargarDatos = async () => {
    console.log('📅 [ProfesionalesTab] Cargando datos...');
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // Cargar citas
      const citasUrl = `${apiUrl}/citas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&ordering=fecha,hora_inicio`;
      console.log(`📡 [ProfesionalesTab] Fetching citas: ${citasUrl}`);
      
      const citasRes = await fetch(citasUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let citasList: Cita[] = [];
      if (citasRes.ok) {
        const data = await citasRes.json();
        citasList = Array.isArray(data) ? data : (data.results || []);
        console.log(`✅ [ProfesionalesTab] Citas cargadas: ${citasList.length}`);
      }
      
      // Cargar profesionales
      const profsUrl = `${apiUrl}/profesionales/?activo=true&ordering=nombre`;
      console.log(`📡 [ProfesionalesTab] Fetching profesionales: ${profsUrl}`);
      
      const profsRes = await fetch(profsUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let profsList: Profesional[] = [];
      if (profsRes.ok) {
        const data = await profsRes.json();
        profsList = Array.isArray(data) ? data : (data.results || []);
        console.log(`✅ [ProfesionalesTab] Profesionales cargados: ${profsList.length}`);
      }
      
      setCitas(citasList);
      setProfesionales(profsList);
      
      // Calcular totales
      calcularTotales(citasList, profsList);
      
    } catch (err) {
      console.error('❌ [ProfesionalesTab] Error crítico:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← Calcular totales según profesional seleccionado
  const calcularTotales = (citasList: Cita[], profsList: Profesional[]) => {
    let generado = 0;
    let ganado = 0;
    let abonos = 0;
    
    const citasFiltradas = getCitasFiltradas(citasList);
    
    for (const cita of citasFiltradas) {
      const precio = parseFloat(cita.precio_total) || 0;
      generado += precio;
      
      // ← Próximamente: Calcular lo ganado (porcentaje del profesional)
      // Por ahora, asumimos 100% del total
      ganado += precio;
      
      // ← Próximamente: Calcular abonos (pagos parciales)
      // Por ahora, asumimos que todo está pagado si pago_estado='pagado'
      if (cita.pago_estado === 'pagado') {
        abonos += precio;
      }
    }
    
    setTotalGenerado(generado);
    setTotalGanado(ganado);
    setTotalAbonos(abonos);
    
    console.log(`💰 [ProfesionalesTab] Totales: Generado=$${generado.toLocaleString()}, Ganado=$${ganado.toLocaleString()}, Abonos=$${abonos.toLocaleString()}`);
  };

  // ← Obtener citas filtradas por profesional seleccionado
  const getCitasFiltradas = (citasList: Cita[]): Cita[] => {
    if (profesionalSeleccionado === null) {
      // Citas sin profesional asignado
      return citasList.filter(c => c.profesional === null || c.profesional === 0);
    }
    
    // Citas del profesional seleccionado
    return citasList.filter(c => c.profesional === profesionalSeleccionado);
  };

  // ← Formatear fecha para display
  const formatDate = (fechaStr: string): string => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-CO', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  // ← Obtener color según estado
  const getEstadoColor = (estado: string): string => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-yellow-600',
      'confirmada': 'bg-blue-600',
      'completada': 'bg-green-600',
      'cancelada': 'bg-red-600'
    };
    return colors[estado] || 'bg-gray-600';
  };

  // ← Abrir modal de edición
  const handleEditCita = (cita: Cita) => {
    console.log('✏️ [ProfesionalesTab] Editar cita:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setEditModalOpen(true);
  };

  // ← Actualizar cita después de editar
  const handleCitaUpdated = (citaActualizada: Cita) => {
    console.log('✅ [ProfesionalesTab] Cita actualizada:', citaActualizada.codigo_reserva);
    setCitas(prev => prev.map(c => c.id === citaActualizada.id ? citaActualizada : c));
    setEditModalOpen(false);
    setCitaSeleccionada(null);
    setCitaEditandoId(null);
    // Recalcular totales
    calcularTotales(citas, profesionales);
  };

  // ← Abrir modal de profesional
  const handleSelectProfesional = (cita: Cita) => {
    console.log('👨‍⚕️ [ProfesionalesTab] Seleccionar profesional para cita:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setProfesionalModalOpen(true);
  };

  // ← Actualizar profesional
  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!citaEditandoId) return;
    
    console.log('✅ [ProfesionalesTab] Profesional asignado:', profesional.nombre);
    
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const updateRes = await fetch(`${apiUrl}/citas/${citaEditandoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profesional: profesional.id,
        }),
      });
      
      if (updateRes.ok) {
        const citaActualizada = await updateRes.json();
        console.log('✅ [ProfesionalesTab] Profesional actualizado en backend');
        
        setCitas(prev => prev.map(c => 
          c.id === citaEditandoId 
            ? { ...c, profesional: profesional.id, profesional_nombre: profesional.nombre }
            : c
        ));
        
        // Recalcular totales si cambió el profesional
        const nuevasCitas = citas.map(c => 
          c.id === citaEditandoId 
            ? { ...c, profesional: profesional.id, profesional_nombre: profesional.nombre }
            : c
        );
        calcularTotales(nuevasCitas, profesionales);
      }
      
    } catch (err: any) {
      console.error('❌ [ProfesionalesTab] ERROR:', err);
      alert('Error al asignar profesional: ' + err.message);
    } finally {
      setProfesionalModalOpen(false);
      setCitaSeleccionada(null);
      setCitaEditandoId(null);
    }
  };

  // ← Abrir modal de método de pago
  const handleSelectMetodoPago = (cita: Cita) => {
    console.log('💳 [ProfesionalesTab] Seleccionar método de pago:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setPagoModalOpen(true);
  };

  // ← Actualizar método de pago
  const handleMetodoPagoSelected = async (metodo: MetodoPago) => {
    if (!citaEditandoId || !citaSeleccionada) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const esMetodoBase = ['bold', 'efectivo', 'pendiente'].includes(metodo.banco.toLowerCase());
      const metodoPagoValue = esMetodoBase ? metodo.banco.toLowerCase() : 'efectivo';
      
      const payload: any = {
        metodo_pago: metodoPagoValue,
        estado: 'completada',
        pago_estado: 'pagado',
      };
      
      if (!esMetodoBase && typeof metodo.id === 'number') {
        payload.cuenta_bancaria_usada = metodo.id;
      }
      
      const updateRes = await fetch(`${apiUrl}/citas/${citaEditandoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      
      if (updateRes.ok) {
        console.log('✅ [ProfesionalesTab] Pago registrado');
        
        setCitas(prev => prev.map(c => 
          c.id === citaEditandoId 
            ? { ...c, metodo_pago: metodoPagoValue, estado: 'completada', pago_estado: 'pagado' }
            : c
        ));
        
        // Recalcular totales
        const nuevasCitas = citas.map(c => 
          c.id === citaEditandoId 
            ? { ...c, metodo_pago: metodoPagoValue, estado: 'completada', pago_estado: 'pagado' }
            : c
        );
        calcularTotales(nuevasCitas, profesionales);
        
        alert(`✅ Pago registrado: ${metodo.banco}`);
      }
      
    } catch (err: any) {
      console.error('❌ [ProfesionalesTab] ERROR:', err);
      alert('Error al procesar pago: ' + err.message);
    } finally {
      setPagoModalOpen(false);
      setCitaSeleccionada(null);
      setCitaEditandoId(null);
    }
  };

  // ← Contar citas sin profesional
  const citasSinProfesional = citas.filter(c => c.profesional === null || c.profesional === 0);

  return (
    <div className="space-y-6">
      {/* ========== FILTROS DE FECHA Y TOTALES ========== */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📅 Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📅 Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Total Generado */}
          <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-3 border border-blue-700 flex flex-col justify-center">
            <p className="text-blue-300 text-[10px] font-semibold mb-0.5">
              💰 Total Generado
            </p>
            <p className="text-lg font-bold text-blue-400">
              ${totalGenerado.toLocaleString('es-CO')}
            </p>
          </div>

          {/* Total Ganado (Próximamente) */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-3 border border-purple-700 flex flex-col justify-center opacity-75">
            <p className="text-purple-300 text-[10px] font-semibold mb-0.5">
              💵 Total Ganado <span className="text-[8px]">(Próximamente)</span>
            </p>
            <p className="text-lg font-bold text-purple-400">
              ${totalGanado.toLocaleString('es-CO')}
            </p>
          </div>

          {/* Total Abonos (Próximamente) */}
          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-3 border border-green-700 flex flex-col justify-center opacity-75">
            <p className="text-green-300 text-[10px] font-semibold mb-0.5">
              💳 Abonos <span className="text-[8px]">(Próximamente)</span>
            </p>
            <p className="text-lg font-bold text-green-400">
              ${totalAbonos.toLocaleString('es-CO')}
            </p>
          </div>

          {/* Profesional Seleccionado */}
          <div className="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 rounded-xl p-3 border border-yellow-700 flex flex-col justify-center">
            <p className="text-yellow-200 text-[10px] font-bold mb-0.5 uppercase tracking-wide">
              👨‍⚕️ Profesional
            </p>
            <p className="text-sm font-bold text-white">
              {profesionalSeleccionado === null 
                ? 'Sin Asignar'
                : profesionales.find(p => p.id === profesionalSeleccionado)?.nombre || 'Todos'
              }
            </p>
            <p className="text-yellow-300/70 text-[10px] mt-0.5">
              {getCitasFiltradas(citas).length} citas
            </p>
          </div>
        </div>
      </div>

      {/* ========== GRID DE DOS COLUMNAS ========== */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* ========== COLUMNA IZQUIERDA - PROFESIONALES (20%) ========== */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sticky top-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              👨‍⚕️ Profesionales
            </h3>
            
            <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              
              {/* Card: Citas sin profesional */}
              <button
                onClick={() => setProfesionalSeleccionado(null)}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  profesionalSeleccionado === null
                    ? 'border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/50'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      Sin Profesional
                    </p>
                    <p className="text-xs text-gray-400">
                      {citasSinProfesional.length} citas
                    </p>
                  </div>
                </div>
              </button>

              {/* Cards de profesionales */}
              {profesionales.map((profesional) => {
                const citasDelProfesional = citas.filter(c => c.profesional === profesional.id);
                const totalProfesional = citasDelProfesional.reduce((sum, c) => sum + parseFloat(c.precio_total), 0);
                
                return (
                  <button
                    key={profesional.id}
                    onClick={() => setProfesionalSeleccionado(profesional.id)}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                      profesionalSeleccionado === profesional.id
                        ? 'border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/50'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {profesional.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {profesional.titulo} {profesional.nombre}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {profesional.especialidad}
                        </p>
                        <p className="text-xs text-blue-400 mt-1">
                          {citasDelProfesional.length} citas • ${totalProfesional.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========== COLUMNA DERECHA - CITAS (80%) ========== */}
        <div className="col-span-12 lg:col-span-9 xl:col-span-10">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Citas {profesionalSeleccionado === null ? 'sin Profesional' : `de ${profesionales.find(p => p.id === profesionalSeleccionado)?.nombre || ''}`}
              </h2>
              <p className="text-sm text-gray-400">
                {fechaInicio === fechaFin 
                  ? `Del ${formatDate(fechaInicio)}`
                  : `Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`
                }
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Cargando citas...</p>
              </div>
            ) : getCitasFiltradas(citas).length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-lg">
                  {profesionalSeleccionado === null
                    ? 'No hay citas sin profesional asignado'
                    : 'No hay citas para este profesional en el rango de fechas'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getCitasFiltradas(citas).map((cita) => (
                  <div
                    key={cita.id}
                    onClick={() => handleEditCita(cita)}
                    className="bg-gray-900 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all cursor-pointer hover:shadow-xl hover:scale-105 overflow-hidden"
                  >
                    {/* Header con código y estado */}
                    <div className="bg-gray-800 p-3 border-b border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-blue-400">
                          {cita.codigo_reserva}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getEstadoColor(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </div>
                      <p className="text-white font-semibold text-sm truncate">
                        {cita.cliente_nombre}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {cita.hora_inicio} - {cita.hora_fin}
                      </p>
                    </div>

                    {/* Body con servicio */}
                    <div className="p-3">
                      <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                        {cita.servicio_nombre}
                      </p>
                      <p className="text-lg font-bold text-green-400">
                        ${parseInt(cita.precio_total).toLocaleString()}
                      </p>
                    </div>

                    {/* Footer con profesional y método de pago */}
                    <div className="bg-gray-800 p-3 border-t border-gray-700 space-y-2">
                      {/* Profesional */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProfesional(cita);
                        }}
                        className="w-full flex items-center justify-between px-2 py-1 bg-gray-900 hover:bg-gray-700 rounded text-xs transition-colors"
                      >
                        <span className="text-gray-400">👨‍⚕️</span>
                        <span className="text-gray-300 truncate flex-1 mx-2">
                          {cita.profesional_nombre || 'Sin asignar'}
                        </span>
                        <span className="text-blue-400">✏️</span>
                      </button>

                      {/* Método de Pago */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMetodoPago(cita);
                        }}
                        className="w-full flex items-center justify-between px-2 py-1 bg-gray-900 hover:bg-gray-700 rounded text-xs transition-colors"
                      >
                        <span className="text-gray-400">💳</span>
                        <span className="text-gray-300 truncate flex-1 mx-2 capitalize">
                          {cita.metodo_pago}
                        </span>
                        <span className="text-blue-400">✏️</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ← Modal de Edición de Cita */}
      {editModalOpen && citaSeleccionada && (
        <EditCitaModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          cita={citaSeleccionada}
          onCitaUpdated={handleCitaUpdated}
        />
      )}

      {/* ← Modal de Profesional */}
      {profesionalModalOpen && citaSeleccionada && (
        <ProfessionalModal
          isOpen={profesionalModalOpen}
          onClose={() => {
            setProfesionalModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          onSelect={handleProfesionalSelected}
          servicioId={citaSeleccionada.servicio}
          profesionalSeleccionadoId={citaSeleccionada.profesional}
        />
      )}

      {/* ← Modal de Método de Pago */}
      {pagoModalOpen && citaSeleccionada && (
        <PaymentMethodModal
          isOpen={pagoModalOpen}
          onClose={() => {
            setPagoModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          onSelect={handleMetodoPagoSelected}
          metodoSeleccionadoId={null}
        />
      )}
    </div>
  );
}