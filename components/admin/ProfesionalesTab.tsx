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
  porcentaje_global?: number | string;
}

interface ServicioProfesional {
  id: number;
  servicio: number;
  profesional: number;
  activo: boolean;
  precio_especial: number | string | null;
}

interface Configuracion {
  porcentaje_bold?: number | string;
}

interface DetalleCita {
  cita: Cita;
  precioTotal: number;
  comisionBold: number;
  porcentajeProfesional: number;
  gananciaProfesional: number;
  saldo: number;
  horasCita: number;
}

interface MetodoPago {
  id: number | string;
  banco: string;
  nombre?: string;
}

export default function ProfesionalesTab() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [serviciosProfesionales, setServiciosProfesionales] = useState<ServicioProfesional[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>({});
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

  // ← AGREGAR ESTOS LOGS para monitorear cambios de fecha
  useEffect(() => {
    console.log('📅 [DEBUG] fechaInicio cambió:', fechaInicio);
  }, [fechaInicio]);

  useEffect(() => {
    console.log('📅 [DEBUG] fechaFin cambió:', fechaFin);
  }, [fechaFin]);
  
  // ← Profesional seleccionado
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<number | null>(0);
  
  // ← Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profesionalModalOpen, setProfesionalModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  
  // ← Cita seleccionada para editar
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [citaEditandoId, setCitaEditandoId] = useState<number | null>(null);

  // ← Totales
  const [totalGenerado, setTotalGenerado] = useState<number>(0);
  const [totalGanado, setTotalGanado] = useState<number>(0);
  const [totalAbonos, setTotalAbonos] = useState<number>(0);
  
  // ← Datos calculados
  const [datosCalculados, setDatosCalculados] = useState<{
    detalles: DetalleCita[];
    generado: number;
    ganado: number;
    abonos: number;
  } | null>(null);
  // ← NUEVO: Para cancelar fetches pendientes
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // ← Detalles para el modal
  const [detalleCitas, setDetalleCitas] = useState<DetalleCita[]>([]);
  const [tipoDetalle, setTipoDetalle] = useState<'generado' | 'ganado' | 'abonos'>('generado');

  // ← Cargar citas y profesionales al montar o cambiar fechas
  useEffect(() => {
     // ← AGREGAR ESTE LOG
    console.log('\n=== ⚡ [DEBUG] useEffect cargarDatos disparado ===');
    console.log('📅 fechaInicio:', fechaInicio);
    console.log('📅 fechaFin:', fechaFin);
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  // ← Recalcular totales cuando cambien los datos necesarios
  useEffect(() => {
        // ← AGREGAR ESTE LOG
    console.log('\n=== ⚡ [DEBUG] useEffect recalcular totales disparado ===');
    console.log('📊 citas.length:', citas.length);
    console.log('📊 serviciosProfesionales.length:', serviciosProfesionales.length);
    console.log('📊 configuracion:', Object.keys(configuracion).length > 0 ? 'Cargado' : 'Vacío');
    console.log('👨‍⚕️ profesionalSeleccionado:', profesionalSeleccionado);
    if (citas.length > 0 && serviciosProfesionales.length > 0 && Object.keys(configuracion).length > 0) {
      console.log('🔄 [ProfesionalesTab] Recalculando totales...');
      calcularTotales(citas, serviciosProfesionales, configuracion);
    }
  }, [citas, serviciosProfesionales, configuracion, profesionalSeleccionado]);

    const cargarDatos = async () => {
    // ← NUEVO: Variable local para trackear cancelación
    let isCancelled = false;
    
    // ← CANCELAR fetch anterior si existe
    if (abortController) {
      console.log('🔄 [DEBUG] Cancelando fetch anterior...');
      abortController.abort();
    }
    
    // ← CREAR nuevo AbortController
    const controller = new AbortController();
    setAbortController(controller);
    
    console.log('\n=== 🔄 [DEBUG] cargarDatos() INICIADO ===');
    console.log('📅 Fecha Inicio:', fechaInicio);
    console.log('📅 Fecha Fin:', fechaFin);
    console.log('👨‍⚕️ Profesional Seleccionado:', profesionalSeleccionado);
    
    console.log('📅 [ProfesionalesTab] Cargando datos...');
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // Cargar citas
      const citasUrl = `${apiUrl}/citas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&ordering=fecha,hora_inicio`;
      
      console.log('📡 [DEBUG] URL de citas:', citasUrl);
      console.log(`📡 [ProfesionalesTab] Fetching citas: ${citasUrl}`);
      
      const citasRes = await fetch(citasUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      });
      
      // ← VERIFICAR si fue cancelado
      if (controller.signal.aborted) {
        console.log('⚠️ [DEBUG] Fetch de citas cancelado');
        isCancelled = true;
        return;
      }
      
      let citasList: Cita[] = [];
      if (citasRes.ok) {
        const data = await citasRes.json();
        citasList = Array.isArray(data) ? data : (data.results || []);
        
        // ← VERIFICAR nuevamente después del parseo
        if (controller.signal.aborted) {
          console.log('⚠️ [DEBUG] Fetch de citas cancelado post-parse');
          isCancelled = true;
          return;
        }
        
        console.log('✅ [DEBUG] Citas recibidas del backend:', citasList.length);
        console.log('📋 [DEBUG] Primeras 3 citas:', citasList.slice(0, 3).map(c => ({
          codigo: c.codigo_reserva,
          fecha: c.fecha,
          cliente: c.cliente_nombre,
          profesional: c.profesional
        })));
        
        console.log(`✅ [ProfesionalesTab] Citas cargadas: ${citasList.length}`);
      }
      
      // ← Cargar profesionales
      const profsUrl = `${apiUrl}/profesionales/?activo=true&ordering=nombre`;
      console.log(`📡 [ProfesionalesTab] Fetching profesionales: ${profsUrl}`);
      
      const profsRes = await fetch(profsUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      });
      
      if (controller.signal.aborted) {
        console.log('⚠️ [DEBUG] Fetch de profesionales cancelado');
        isCancelled = true;
        return;
      }
      
      let profsList: Profesional[] = [];
      if (profsRes.ok) {
        const data = await profsRes.json();
        profsList = Array.isArray(data) ? data : (data.results || []);
        console.log(`✅ [ProfesionalesTab] Profesionales cargados: ${profsList.length}`);
      }
      
      // ← Cargar servicios-profesionales
      const spUrl = `${apiUrl}/servicios-profesionales/?activo=true`;
      const spRes = await fetch(spUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      });
      
      // ← CORREGIDO: Agregar llaves {}
      if (controller.signal.aborted) {
        isCancelled = true;
        return;
      }
      
      let spList: ServicioProfesional[] = [];
      if (spRes.ok) {
        const data = await spRes.json();
        spList = Array.isArray(data) ? data : (data.results || []);
        console.log(`✅ [ProfesionalesTab] Servicios-Profesionales cargados: ${spList.length}`);
      }
      
      // ← Cargar configuración
      const configUrl = `${apiUrl}/configuracion/activa/`;
      const configRes = await fetch(configUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: controller.signal
      });
      
      // ← CORREGIDO: Agregar llaves {}
      if (controller.signal.aborted) {
        isCancelled = true;
        return;
      }
      
      let configData: Configuracion = {};
      if (configRes.ok) {
        configData = await configRes.json();
        console.log(`✅ [ProfesionalesTab] Configuración cargada:`, configData);
      }
      
      // ← ACTUALIZAR ESTADOS (solo si no fue cancelado)
      if (!isCancelled) {
        setCitas(citasList);
        setProfesionales(profsList);
        setServiciosProfesionales(spList);
        setConfiguracion(configData);
      }
      
    } catch (err: any) {
      // ← IGNORAR errores de cancelación
      if (err.name === 'AbortError') {
        console.log('✅ [DEBUG] Fetch cancelado intencionalmente');
        isCancelled = true;  // ← AGREGAR: marcar como cancelado
        return;
      }
      console.error('❌ [ProfesionalesTab] Error crítico:', err);
    } finally {
      // ← CORREGIDO: Usar variable local isCancelled
      if (!isCancelled) {
        console.log('✅ [DEBUG] Limpiando loading (no cancelado)');
        setLoading(false);
      } else {
        console.log('⏸️ [DEBUG] NO limpiando loading (fue cancelado)');
      }
    }
  };

  // ← Calcular horas de cita
  const calcularHorasCita = (horaInicio: string, horaFin: string): number => {
    try {
      const [inicioH, inicioM] = horaInicio.split(':').map(Number);
      const [finH, finM] = horaFin.split(':').map(Number);
      
      const inicioMinutos = inicioH * 60 + inicioM;
      const finMinutos = finH * 60 + finM;
      
      const duracionMinutos = finMinutos - inicioMinutos;
      return duracionMinutos / 60;
    } catch (err) {
      return 0;
    }
  };

  // ← Calcular detalles de ganancias para cada cita
  const calcularDetallesCitas = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion): DetalleCita[] => {
    const porcentajeBold = parseFloat(String(configData.porcentaje_bold || 3.5));
    
    return citasList.map(cita => {
      const precioTotal = parseFloat(cita.precio_total) || 0;
      
      // Calcular comisión Bold (solo si pagó con Bold)
      const comisionBold = cita.metodo_pago === 'bold' && cita.pago_estado === 'pagado'
        ? precioTotal * (porcentajeBold / 100)
        : 0;
      
      // Calcular porcentaje del profesional
      let porcentajeProf = 0;
      if (cita.profesional) {
        const asignacion = spList.find(
          sp => sp.servicio === cita.servicio && sp.profesional === cita.profesional
        );
        
        if (asignacion?.precio_especial !== null && asignacion?.precio_especial !== undefined && asignacion.precio_especial !== '') {
          porcentajeProf = parseFloat(String(asignacion.precio_especial));
        } else {
          const profesional = profesionales.find(p => p.id === cita.profesional);
          porcentajeProf = parseFloat(String(profesional?.porcentaje_global || 50));
        }
      }
      
      // Ganancia del profesional
      const gananciaProfesional = (precioTotal - comisionBold) * (porcentajeProf / 100);
      
      // Saldo para el salón
      const saldo = precioTotal - comisionBold - gananciaProfesional;
      
      // Horas de la cita
      const horasCita = calcularHorasCita(cita.hora_inicio, cita.hora_fin);
      
      return {
        cita,
        precioTotal,
        comisionBold,
        porcentajeProfesional: porcentajeProf,
        gananciaProfesional,
        saldo,
        horasCita
      };
    });
  };

  // ← Calcular totales según profesional seleccionado
  const calcularTotales = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion) => {
     // ← AGREGAR ESTOS LOGS
    console.log('\n=== 💰 [DEBUG] calcularTotales() ===');
    console.log('📊 Citas a procesar:', citasList.length);
    
    const citasFiltradas = getCitasFiltradas(citasList);
    const detalles = calcularDetallesCitas(citasFiltradas, spList, configData);
    
    let generado = 0;
    let ganado = 0;
    let abonos = 0;
    
    for (const detalle of detalles) {
      generado += detalle.precioTotal;
      ganado += detalle.gananciaProfesional;
      
      if (detalle.cita.pago_estado === 'pagado') {
        abonos += detalle.precioTotal;
      }
    }
    
    setTotalGenerado(generado);
    setTotalGanado(ganado);
    setTotalAbonos(abonos);
    setDetalleCitas(detalles);
    setDatosCalculados({ detalles, generado, ganado, abonos });
    
    console.log(`💰 [ProfesionalesTab] Totales calculados: Generado=$${generado.toLocaleString()}, Ganado=$${ganado.toLocaleString()}, Abonos=$${abonos.toLocaleString()}`);
  };

  // ← Obtener citas filtradas por profesional seleccionado
  const getCitasFiltradas = (citasList: Cita[]): Cita[] => {
    // ← AGREGAR ESTOS LOGS
    console.log('\n=== 🔍 [DEBUG] getCitasFiltradas() ===');
    console.log('📊 Total citas recibidas:', citasList.length);
    console.log('👨‍⚕️ profesionalSeleccionado:', profesionalSeleccionado);
    if (profesionalSeleccionado === 0) {
      return citasList;
    }
    
    if (profesionalSeleccionado === null) {
      return citasList.filter(c => c.profesional === null || c.profesional === 0);
    }
    
    return citasList.filter(c => c.profesional === profesionalSeleccionado);
  };

  // ← Abrir modal de detalle
  const abrirModalDetalle = (tipo: 'generado' | 'ganado' | 'abonos') => {
    setTipoDetalle(tipo);
    setDetalleModalOpen(true);
  };

  // ← Obtener totales del modal
  const obtenerTotalesModal = () => {
    const totalComisionBold = detalleCitas.reduce((sum, d) => sum + d.comisionBold, 0);
    const totalGananciaProfesionales = detalleCitas.reduce((sum, d) => sum + d.gananciaProfesional, 0);
    const totalSaldos = detalleCitas.reduce((sum, d) => sum + d.saldo, 0);
    const totalServicios = detalleCitas.reduce((sum, d) => sum + d.precioTotal, 0);
    const totalHoras = detalleCitas.reduce((sum, d) => sum + d.horasCita, 0);
    
    return { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios, totalHoras };
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

  // ← Formatear hora para display
  const formatHora = (horaStr: string): string => {
    return horaStr; // Ya viene en formato HH:MM
  };

  // ← Formatear horas
  const formatHoras = (horas: number): string => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}m`;
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
  // ← Limpiar AbortController al desmontar el componente
  useEffect(() => {
    return () => {
      if (abortController) {
        console.log('🧹 [DEBUG] Limpiando AbortController al desmontar');
        abortController.abort();
      }
    };
  }, [abortController]);
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

          {/* Total Generado - CLICKABLE */}
          <button
            onClick={() => abrirModalDetalle('generado')}
            className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-3 border border-blue-700 flex flex-col justify-center hover:scale-105 transition-transform"
            title="Click para ver detalle"
          >
            <p className="text-blue-300 text-[10px] font-semibold mb-0.5">
              💰 Total Generado
            </p>
            <p className="text-lg font-bold text-blue-400">
              ${totalGenerado.toLocaleString('es-CO')}
            </p>
            <p className="text-blue-200/60 text-[8px] mt-1">Click para ver detalle</p>
          </button>

          {/* Total Ganado - CLICKABLE */}
          <button
            onClick={() => abrirModalDetalle('ganado')}
            className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-3 border border-purple-700 flex flex-col justify-center hover:scale-105 transition-transform"
            title="Click para ver detalle"
          >
            <p className="text-purple-300 text-[10px] font-semibold mb-0.5">
              💵 Total Ganado Profesionales
            </p>
            <p className="text-lg font-bold text-purple-400">
              ${totalGanado.toLocaleString('es-CO')}
            </p>
            <p className="text-purple-200/60 text-[8px] mt-1">Click para ver detalle</p>
          </button>

          {/* Total Abonos - CLICKABLE */}
          <button
            onClick={() => abrirModalDetalle('abonos')}
            className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-3 border border-green-700 flex flex-col justify-center hover:scale-105 transition-transform"
            title="Click para ver detalle"
          >
            <p className="text-green-300 text-[10px] font-semibold mb-0.5">
              💳 Total Abonos
            </p>
            <p className="text-lg font-bold text-green-400">
              ${totalAbonos.toLocaleString('es-CO')}
            </p>
            <p className="text-green-200/60 text-[8px] mt-1">Click para ver detalle</p>
          </button>

          {/* Profesional Seleccionado */}
          <div className="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 rounded-xl p-3 border border-yellow-700 flex flex-col justify-center">
            <p className="text-yellow-200 text-[10px] font-bold mb-0.5 uppercase tracking-wide">
              👨‍⚕️ Profesional
            </p>
            <p className="text-sm font-bold text-white">
              {profesionalSeleccionado === 0
                ? 'Todas las Citas'
                : profesionalSeleccionado === null 
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
              
              {/* Card: TODAS LAS CITAS */}
              <button
                onClick={() => setProfesionalSeleccionado(0)}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  profesionalSeleccionado === 0
                    ? 'border-green-500 bg-green-900/30 ring-2 ring-green-500/50'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      📋 Todas las Citas
                    </p>
                    <p className="text-xs text-green-400">
                      {citas.length} citas totales
                    </p>
                  </div>
                </div>
              </button>

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
                const detallesDelProfesional = detalleCitas.filter(d => d.cita.profesional === profesional.id);
                const totalGanadoProfesional = detallesDelProfesional.reduce((sum, d) => sum + d.gananciaProfesional, 0);
                
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
                          {citasDelProfesional.length} citas • Ganado: ${totalGanadoProfesional.toLocaleString()}
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
                Citas {profesionalSeleccionado === 0 
                  ? 'Todas' 
                  : profesionalSeleccionado === null 
                    ? 'sin Profesional' 
                    : `de ${profesionales.find(p => p.id === profesionalSeleccionado)?.nombre || ''}`}
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
                  {profesionalSeleccionado === 0
                    ? 'No hay citas en este rango de fechas'
                    : profesionalSeleccionado === null
                      ? 'No hay citas sin profesional asignado'
                      : 'No hay citas para este profesional en el rango de fechas'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getCitasFiltradas(citas).map((cita) => {
                  const detalle = detalleCitas.find(d => d.cita.id === cita.id);
                  const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
                  
                  return (
                    <div
                      key={cita.id}
                      onClick={() => handleEditCita(cita)}
                      className="bg-gray-900 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all cursor-pointer hover:shadow-xl hover:scale-105 overflow-hidden"
                    >
                      {/* Header */}
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

                      {/* Body */}
                      <div className="p-3">
                        <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                          {cita.servicio_nombre}
                        </p>
                        <p className="text-lg font-bold text-green-400">
                          ${parseInt(cita.precio_total).toLocaleString()}
                        </p>
                        {detalle && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-purple-400">
                              💵 Ganancia: ${detalle.gananciaProfesional.toLocaleString()} ({detalle.porcentajeProfesional}%)
                            </p>
                            {cita.metodo_pago === 'bold' && cita.pago_estado === 'pagado' && (
                              <p className="text-xs text-orange-400">
                                💳 Bold: ${detalle.comisionBold.toLocaleString()} ({porcentajeBold}%)
                              </p>
                            )}
                            <p className="text-xs text-green-400">
                              💰 Saldo: ${detalle.saldo.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="bg-gray-800 p-3 border-t border-gray-700 space-y-2">
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ← Modal de Detalle - TOTAL GENERADO */}
      {detalleModalOpen && tipoDetalle === 'generado' && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">📊 Detalle de Total Generado</h2>
                <p className="text-sm opacity-90 mt-1">
                  {profesionalSeleccionado === 0
                    ? 'Todas las Citas'
                    : profesionalSeleccionado === null 
                      ? 'Sin Profesional' 
                      : profesionales.find(p => p.id === profesionalSeleccionado)?.nombre} 
                  {' | '}
                  {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                </p>
              </div>
              <button
                onClick={() => setDetalleModalOpen(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabla */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Código</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Servicio</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Cliente</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Profesional</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-300">Valor Servicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-300">Método Pago</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">% Bold</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">Valor Bold</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">% Profesional</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Ganancia Prof.</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-green-300">Saldo Salón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {detalleCitas.map((detalle) => {
                    const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
                    const aplicaBold = detalle.cita.metodo_pago === 'bold' && detalle.cita.pago_estado === 'pagado';
                    
                    return (
                      <tr key={detalle.cita.id} className="hover:bg-gray-700/50">
                        <td className="px-3 py-3 text-xs font-mono text-blue-400">{detalle.cita.codigo_reserva}</td>
                        <td className="px-3 py-3 text-gray-300">{formatDate(detalle.cita.fecha)}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.servicio_nombre}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.cliente_nombre}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.profesional_nombre || 'Sin asignar'}</td>
                        <td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-cyan-400 text-xs capitalize">{detalle.cita.metodo_pago}</td>
                        <td className="px-3 py-3 text-right text-orange-400 text-xs">{aplicaBold ? `${porcentajeBold}%` : '-'}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.comisionBold.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-purple-400 text-xs">{detalle.porcentajeProfesional}%</td>
                        <td className="px-3 py-3 text-right text-purple-400 font-semibold">${detalle.gananciaProfesional.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.saldo.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {(() => {
              const { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-6 gap-3">
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-xs text-blue-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-blue-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">💳 Total Comisión Bold</p>
                      <p className="text-lg font-bold text-orange-400">${totalComisionBold.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                      <p className="text-xs text-purple-300 mb-1">💵 Total Ganancia Profesionales</p>
                      <p className="text-lg font-bold text-purple-400">${totalGananciaProfesionales.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-xs text-green-300 mb-1">💰 Total Saldo Salón</p>
                      <p className="text-lg font-bold text-green-400">${totalSaldos.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-3">
                      <p className="text-xs text-cyan-300 mb-1">📊 Total Citas</p>
                      <p className="text-lg font-bold text-cyan-400">{detalleCitas.length}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← Modal de Detalle - TOTAL GANADO PROFESIONALES */}
      {detalleModalOpen && tipoDetalle === 'ganado' && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">💵 Detalle de Ganancia Profesionales</h2>
                <p className="text-sm opacity-90 mt-1">
                  {profesionalSeleccionado === 0
                    ? 'Todas las Citas'
                    : profesionalSeleccionado === null 
                      ? 'Sin Profesional' 
                      : profesionales.find(p => p.id === profesionalSeleccionado)?.nombre} 
                  {' | '}
                  {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                </p>
              </div>
              <button
                onClick={() => setDetalleModalOpen(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabla */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Código</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Servicio</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Profesional</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-300">Hora Inicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-green-300">Valor Servicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-300">Método Pago</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">% Bold</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">Valor Bold</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">% Profesional</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Ganancia Profesional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {detalleCitas.map((detalle) => {
                    const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
                    const aplicaBold = detalle.cita.metodo_pago === 'bold' && detalle.cita.pago_estado === 'pagado';
                    
                    return (
                      <tr key={detalle.cita.id} className="hover:bg-gray-700/50">
                        <td className="px-3 py-3 text-xs font-mono text-blue-400">{detalle.cita.codigo_reserva}</td>
                        <td className="px-3 py-3 text-gray-300">{formatDate(detalle.cita.fecha)}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.servicio_nombre}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.profesional_nombre || 'Sin asignar'}</td>
                        <td className="px-3 py-3 text-right text-cyan-400 text-xs">{formatHora(detalle.cita.hora_inicio)}</td>
                        <td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-cyan-400 text-xs capitalize">{detalle.cita.metodo_pago}</td>
                        <td className="px-3 py-3 text-right text-orange-400 text-xs">{aplicaBold ? `${porcentajeBold}%` : '-'}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.comisionBold.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-purple-400 text-xs">{detalle.porcentajeProfesional}%</td>
                        <td className="px-3 py-3 text-right text-purple-400 font-semibold">${detalle.gananciaProfesional.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {(() => {
              const { totalComisionBold, totalGananciaProfesionales, totalServicios } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-5 gap-3">
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-xs text-green-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-green-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">💳 Total Comisión Bold</p>
                      <p className="text-lg font-bold text-orange-400">${totalComisionBold.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                      <p className="text-xs text-purple-300 mb-1">💵 Total Ganancia Profesionales</p>
                      <p className="text-lg font-bold text-purple-400">${totalGananciaProfesionales.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-3">
                      <p className="text-xs text-cyan-300 mb-1">📊 Total Citas</p>
                      <p className="text-lg font-bold text-cyan-400">{detalleCitas.length}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← Modal de Detalle - TOTAL ABONOS */}
      {detalleModalOpen && tipoDetalle === 'abonos' && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">💳 Detalle de Total Abonos</h2>
                <p className="text-sm opacity-90 mt-1">
                  {profesionalSeleccionado === 0
                    ? 'Todas las Citas'
                    : profesionalSeleccionado === null 
                      ? 'Sin Profesional' 
                      : profesionales.find(p => p.id === profesionalSeleccionado)?.nombre} 
                  {' | '}
                  {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                </p>
              </div>
              <button
                onClick={() => setDetalleModalOpen(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabla */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Cliente</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-cyan-300">Método Pago</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Valor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Estado Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {detalleCitas.filter(d => d.cita.pago_estado === 'pagado').map((detalle) => (
                    <tr key={detalle.cita.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-xs font-mono text-blue-400">{detalle.cita.codigo_reserva}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(detalle.cita.fecha)}</td>
                      <td className="px-4 py-3 text-gray-300">{detalle.cita.servicio_nombre}</td>
                      <td className="px-4 py-3 text-gray-300">{detalle.cita.cliente_nombre}</td>
                      <td className="px-4 py-3 text-right text-cyan-400 text-xs capitalize">{detalle.cita.metodo_pago}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right"><span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">Pagado</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {(() => {
              const citasPagadas = detalleCitas.filter(d => d.cita.pago_estado === 'pagado');
              const totalPagado = citasPagadas.reduce((sum, d) => sum + d.precioTotal, 0);
              
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="flex justify-end">
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 min-w-[300px]">
                      <p className="text-xs text-green-300 mb-1">💳 Total Abonos</p>
                      <p className="text-2xl font-bold text-green-400">${totalPagado.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← Modales existentes */}
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