// components/admin/ProfesionalesTab.tsx
'use client';
import { useState, useEffect } from 'react';
import EditCitaModal from './EditCitaModal';
import ProfessionalModal from '../booking/ProfessionalModal';
import PaymentMethodModal from '../booking/PaymentMethodModal';
import ProductoModal, { ProductoSeleccionado } from './ProductoModal';

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
  total_productos?: number;  // ← NUEVO: Total de productos de la cita
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  foto?: string | null;
  porcentaje_global?: number | string;
  foto_url?: string | null;
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
  comisionBold: number;  // ← Ahora es "Impuesto" para todos los métodos
  porcentajeProfesional: number;
  gananciaProfesional: number;
  saldo: number;
  horasCita: number;
  totalProductos: number;  // ← NUEVO
}

interface MetodoPago {
  id: number | string;
  banco: string;
  nombre?: string;
}

interface CitaProductoForm {
  productoId: number;
  productoNombre: string;
  productoMarca: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
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
  
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<number | null>(0);
  
  // ← Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profesionalModalOpen, setProfesionalModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  
  // ← NUEVO: Modal de productos para citas
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [citaParaProductos, setCitaParaProductos] = useState<Cita | null>(null);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState<CitaProductoForm[]>([]);
  
  // ← Cita seleccionada para editar
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [citaEditandoId, setCitaEditandoId] = useState<number | null>(null);

  // ← Totales
  const [totalGenerado, setTotalGenerado] = useState<number>(0);
  const [totalGanado, setTotalGanado] = useState<number>(0);
  const [totalAbonos, setTotalAbonos] = useState<number>(0);
  const [totalProductos, setTotalProductos] = useState<number>(0);  // ← NUEVO
  
  // ← Datos calculados
  const [datosCalculados, setDatosCalculados] = useState<{
    detalles: DetalleCita[];
    generado: number;
    ganado: number;
    abonos: number;
    productos: number;
  } | null>(null);
  
  // ← Detalles para el modal
  const [detalleCitas, setDetalleCitas] = useState<DetalleCita[]>([]);
  const [tipoDetalle, setTipoDetalle] = useState<'generado' | 'ganado' | 'abonos'>('generado');

  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Cargar citas y profesionales al montar o cambiar fechas
  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  // ← Recalcular totales cuando cambien los datos necesarios
  useEffect(() => {
    if (citas.length > 0 && serviciosProfesionales.length > 0 && Object.keys(configuracion).length > 0) {
      calcularTotales(citas, serviciosProfesionales, configuracion);
    }
  }, [citas, serviciosProfesionales, configuracion, profesionalSeleccionado]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      
      // Cargar citas con total_productos
      const citasUrl = `${apiUrl}/citas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&ordering=fecha,hora_inicio`;
      
      const citasRes = await fetch(citasUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let citasList: Cita[] = [];
      if (citasRes.ok) {
        const data = await citasRes.json();
        citasList = Array.isArray(data) ? data : (data.results || []);
      }
      
      // Cargar profesionales
      const profsUrl = `${apiUrl}/profesionales/?activo=true&ordering=nombre`;
      const profsRes = await fetch(profsUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let profsList: Profesional[] = [];
      if (profsRes.ok) {
        const data = await profsRes.json();
        profsList = Array.isArray(data) ? data : (data.results || []);
      }
      
      // Cargar servicios-profesionales
      const spUrl = `${apiUrl}/servicios-profesionales/?activo=true`;
      const spRes = await fetch(spUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let spList: ServicioProfesional[] = [];
      if (spRes.ok) {
        const data = await spRes.json();
        spList = Array.isArray(data) ? data : (data.results || []);
      }
      
      // Cargar configuración
      const configUrl = `${apiUrl}/configuracion/activa/`;
      const configRes = await fetch(configUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let configData: Configuracion = {};
      if (configRes.ok) {
        configData = await configRes.json();
      }
      
      setCitas(citasList);
      setProfesionales(profsList);
      setServiciosProfesionales(spList);
      setConfiguracion(configData);
      
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
    } finally {
      setLoading(false);
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

  // ← ← ← ACTUALIZADO: Calcular detalles de ganancias para cada cita ← ← ←
  const calcularDetallesCitas = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion): DetalleCita[] => {
    const porcentajeBold = parseFloat(String(configData.porcentaje_bold || 3.5));
    
    return citasList.map(cita => {
      const precioTotal = parseFloat(cita.precio_total) || 0;
      const totalProductos = cita.total_productos || 0;
      
      // ← ← ← IMPUESTO: Se cobra el % configurado a TODOS los métodos de pago ← ← ←
      const comisionBold = precioTotal * (porcentajeBold / 100);
      
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
      
      // ← ← ← NUEVA FÓRMULA: (precio - impuesto - productos) × %profesional ← ← ←
      const baseCalculable = precioTotal - comisionBold - totalProductos;
      const gananciaProfesional = baseCalculable * (porcentajeProf / 100);
      
      // Saldo para el salón
      const saldo = precioTotal - comisionBold - gananciaProfesional - totalProductos;
      
      // Horas de la cita
      const horasCita = calcularHorasCita(cita.hora_inicio, cita.hora_fin);
      
      return {
        cita,
        precioTotal,
        comisionBold,
        porcentajeProfesional: porcentajeProf,
        gananciaProfesional,
        saldo,
        horasCita,
        totalProductos  // ← NUEVO
      };
    });
  };

  // ← ← ← ACTUALIZADO: Calcular totales según profesional seleccionado ← ← ←
  const calcularTotales = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion) => {
    const citasFiltradas = getCitasFiltradas(citasList);
    const detalles = calcularDetallesCitas(citasFiltradas, spList, configData);
    
    let generado = 0;
    let ganado = 0;
    let abonos = 0;
    let productos = 0;
    
    for (const detalle of detalles) {
      generado += detalle.precioTotal;
      ganado += detalle.gananciaProfesional;
      productos += detalle.totalProductos;
      
      if (detalle.cita.pago_estado === 'pagado') {
        abonos += detalle.precioTotal;
      }
    }
    
    setTotalGenerado(generado);
    setTotalGanado(ganado);
    setTotalAbonos(abonos);
    setTotalProductos(productos);  // ← NUEVO
    setDetalleCitas(detalles);
    setDatosCalculados({ detalles, generado, ganado, abonos, productos });
  };

  // ← Obtener citas filtradas por profesional seleccionado
  const getCitasFiltradas = (citasList: Cita[]): Cita[] => {
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

  // ← ← ← NUEVO: Abrir modal de productos para una cita ← ← ←
const handleOpenProductosModal = async (cita: Cita) => {
  setCitaParaProductos(cita);
  setCitaEditandoId(cita.id);
  setLoadingProductos(true);
  
  try {
    // ← Cargar productos existentes de la cita
    const res = await fetch(`${apiUrl}/cita-productos/?cita=${cita.id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (res.ok) {
      const data = await res.json();
      const productosData = Array.isArray(data) ? data : (data.results || []);
      
      // Convertir a formato ProductoSeleccionado
      const productosExistentes: ProductoSeleccionado[] = productosData.map((p: any) => ({
        productoId: p.producto,
        productoNombre: p.producto_nombre,
        productoMarca: p.producto_marca,
        cantidad: p.cantidad,
        precioUnitario: parseFloat(p.precio_unitario),
        precioBase: parseFloat(p.precio_unitario), // Se podría obtener del producto real
        subtotal: parseFloat(p.subtotal),
        stockDisponible: 999 // Valor temporal, se actualizará en el modal
      }));
      
      setProductosSeleccionados(productosExistentes);
    }
  } catch (err) {
    console.error('❌ Error cargando productos:', err);
  } finally {
    setLoadingProductos(false);
    setProductoModalOpen(true);  // ← Abrir modal DESPUÉS de cargar
  }
};

  // ← ← ← NUEVO: Manejar selección de productos ← ← ←
  const handleProductosSeleccionados = async (productos: ProductoSeleccionado[]) => {
    if (!citaParaProductos?.id) return;
    
    try {
      // Eliminar productos existentes
      const existentesRes = await fetch(`${apiUrl}/cita-productos/?cita=${citaParaProductos.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (existentesRes.ok) {
        const existentes = await existentesRes.json();
        const existentesList = Array.isArray(existentes) ? existentes : (existentes.results || []);
        
        for (const prod of existentesList) {
          await fetch(`${apiUrl}/cita-productos/${prod.id}/`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
        }
      }

      // Crear nuevos productos
      for (const prod of productos) {
        await fetch(`${apiUrl}/cita-productos/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            cita: citaParaProductos.id,
            producto: prod.productoId,
            cantidad: prod.cantidad,
            precio_unitario: prod.precioUnitario,
          }),
        });
      }

      // Recargar datos
      await cargarDatos();
      alert('✅ Productos actualizados');
      
    } catch (err) {
      console.error('❌ Error guardando productos:', err);
      alert('Error al guardar los productos');
    } finally {
      setProductoModalOpen(false);
      setCitaParaProductos(null);
    }
  };

  // ← Obtener totales del modal
  const obtenerTotalesModal = () => {
    const totalComisionBold = detalleCitas.reduce((sum, d) => sum + d.comisionBold, 0);
    const totalGananciaProfesionales = detalleCitas.reduce((sum, d) => sum + d.gananciaProfesional, 0);
    const totalSaldos = detalleCitas.reduce((sum, d) => sum + d.saldo, 0);
    const totalServicios = detalleCitas.reduce((sum, d) => sum + d.precioTotal, 0);
    const totalHoras = detalleCitas.reduce((sum, d) => sum + d.horasCita, 0);
    const totalProductos = detalleCitas.reduce((sum, d) => sum + d.totalProductos, 0);
    
    return { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios, totalHoras, totalProductos };
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
    return horaStr;
  };

  // ← Formatear horas
  const formatHoras = (horas: number): string => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return `${h}h ${m}m`;
  };

  // ← Formatear moneda
  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
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
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setEditModalOpen(true);
  };

  // ← Actualizar cita después de editar
  const handleCitaUpdated = (citaActualizada: Cita) => {
    setCitas(prev => prev.map(c => c.id === citaActualizada.id ? citaActualizada : c));
    setEditModalOpen(false);
    setCitaSeleccionada(null);
    setCitaEditandoId(null);
  };

  // ← Abrir modal de profesional
  const handleSelectProfesional = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setProfesionalModalOpen(true);
  };

  // ← Actualizar profesional
  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!citaEditandoId) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      
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
        
        setCitas(prev => prev.map(c => 
          c.id === citaEditandoId 
            ? { ...c, profesional: profesional.id, profesional_nombre: profesional.nombre }
            : c
        ));
      }
      
    } catch (err: any) {
      console.error('❌ ERROR:', err);
      alert('Error al asignar profesional: ' + err.message);
    } finally {
      setProfesionalModalOpen(false);
      setCitaSeleccionada(null);
      setCitaEditandoId(null);
    }
  };

  // ← Abrir modal de método de pago
  const handleSelectMetodoPago = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setPagoModalOpen(true);
  };

  // ← Actualizar método de pago
  const handleMetodoPagoSelected = async (metodo: MetodoPago) => {
    if (!citaEditandoId || !citaSeleccionada) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      
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
        setCitas(prev => prev.map(c => 
          c.id === citaEditandoId 
            ? { ...c, metodo_pago: metodoPagoValue, estado: 'completada', pago_estado: 'pagado' }
            : c
        ));
        
        alert(`✅ Pago registrado: ${metodo.banco}`);
      }
      
    } catch (err: any) {
      console.error('❌ ERROR:', err);
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
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          
          {/* Fecha Inicio - Compacto */}
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              📅 Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin - Compacto */}
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              📅 Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* ← 1. TOTAL GENERADO - Card Compacta */}
          <button
            onClick={() => abrirModalDetalle('generado')}
            className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-lg p-2 border border-blue-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-blue-300 text-[9px] font-semibold mb-0.5 leading-tight">
              💰 Generado
            </p>
            <p className="text-base font-bold text-blue-400 leading-tight">
              ${totalGenerado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </button>

          {/* ← 2. TOTAL IMPUESTOS - Card Compacta */}
          <button
            onClick={() => abrirModalDetalle('generado')}
            className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-lg p-2 border border-orange-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-orange-300 text-[9px] font-semibold mb-0.5 leading-tight">
              🧾 Impuestos
            </p>
            <p className="text-base font-bold text-orange-400 leading-tight">
              ${(datosCalculados?.detalles.reduce((sum, d) => sum + d.comisionBold, 0) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[8px] text-orange-300/70 leading-tight">
              ({parseFloat(String(configuracion.porcentaje_bold || 3.5))}%)
            </p>
          </button>

          {/* ← 3. TOTAL PRODUCTOS - Card Compacta */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-2 border border-purple-700 flex flex-col justify-center min-h-[70px]">
            <p className="text-purple-300 text-[9px] font-semibold mb-0.5 leading-tight">
              📦 Productos
            </p>
            <p className="text-base font-bold text-purple-400 leading-tight">
              ${totalProductos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* ← 4. TOTAL GANADO - Card Compacta (Última) */}
          <button
            onClick={() => abrirModalDetalle('ganado')}
            className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-2 border border-green-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-green-300 text-[9px] font-semibold mb-0.5 leading-tight">
              💵 Ganado Prof.
            </p>
            <p className="text-base font-bold text-green-400 leading-tight">
              ${totalGanado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </button>

        </div>
      </div>

      {/* ========== GRID DE DOS COLUMNAS ========== */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* ========== COLUMNA IZQUIERDA - PROFESIONALES ========== */}
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
        
        // ← ← ← CÁLCULOS PARA EL PROFESIONAL ← ← ←
        const totalGanadoProfesional = detallesDelProfesional.reduce((sum, d) => sum + d.gananciaProfesional, 0);
        const totalProductosProfesional = detallesDelProfesional.reduce((sum, d) => sum + d.totalProductos, 0);
        const totalImpuestosProfesional = detallesDelProfesional.reduce((sum, d) => sum + d.comisionBold, 0);  // ← NUEVO
        const totalServiciosProfesional = detallesDelProfesional.reduce((sum, d) => sum + d.precioTotal, 0);
        
        // ← Foto de fondo con fallback
        const fotoUrl = profesional.foto_url || profesional.foto || null;
        const backgroundStyle = fotoUrl 
          ? { backgroundImage: `url(${fotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: '#374151' };  // Fallback gris oscuro

        return (
          <button
            key={profesional.id}
            onClick={() => setProfesionalSeleccionado(profesional.id)}
            className={`w-full rounded-xl border-2 transition-all text-left overflow-hidden relative min-h-[140px] ${
              profesionalSeleccionado === profesional.id
                ? 'border-blue-400 ring-2 ring-blue-400/50'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            style={backgroundStyle}  // ← Aplicar foto como fondo
          >
            {/* ← Overlay oscuro para legibilidad del texto */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30"></div>
            
            {/* ← Contenido sobre la imagen */}
            <div className="relative z-10 p-4 h-full flex flex-col justify-between">
              
              {/* Header: Nombre y Especialidad */}
              <div>
                <p className="text-sm font-bold text-white truncate drop-shadow-lg">
                  {profesional.titulo} {profesional.nombre}
                </p>
                <p className="text-xs text-gray-300 truncate drop-shadow">
                  {profesional.especialidad}
                </p>
              </div>

              {/* Stats en grid compacto */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Citas */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-300">Citas</p>
                  <p className="text-sm font-bold text-white">{citasDelProfesional.length}</p>
                </div>
                
                {/* Ganado */}
                <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-2 text-center">
                  <p className="text-[10px] text-green-300">Ganado</p>
                  <p className="text-sm font-bold text-green-400">${totalGanadoProfesional.toLocaleString('es-CO', { notation: 'compact' })}</p>
                </div>
                
                {/* ← NUEVO: Impuestos */}
                <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-2 text-center">
                  <p className="text-[10px] text-orange-300">🧾 Impuestos</p>
                  <p className="text-sm font-bold text-orange-400">${totalImpuestosProfesional.toLocaleString('es-CO', { notation: 'compact' })}</p>
                </div>
                
                {/* Productos */}
                <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg p-2 text-center">
                  <p className="text-[10px] text-purple-300">📦 Productos</p>
                  <p className="text-sm font-bold text-purple-400">${totalProductosProfesional.toLocaleString('es-CO', { notation: 'compact' })}</p>
                </div>
              </div>

        {/* Footer: Porcentaje del profesional */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            %{profesional.porcentaje_global || 50} para ti
          </span>
          {citasDelProfesional.length > 0 && (
            <span className="text-[10px] text-blue-300 font-medium">
              ${totalServiciosProfesional.toLocaleString('es-CO', { notation: 'compact' })} generados
            </span>
          )}
        </div>
      </div>

      {/* ← Indicador visual de selección */}
      {profesionalSeleccionado === profesional.id && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
      )}
    </button>
  );
})}
            </div>
          </div>
        </div>

        {/* ========== COLUMNA DERECHA - CITAS ========== */}
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
                            <p className="text-xs text-orange-400">
                              🧾 Impuesto (${porcentajeBold}%): ${detalle.comisionBold.toLocaleString()}
                            </p>
                            {detalle.totalProductos > 0 && (
                              <p className="text-xs text-orange-400">
                                📦 Productos: ${detalle.totalProductos.toLocaleString()}
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
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            cita.profesional_nombre
                              ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300'
                              : 'bg-gray-800 border border-gray-600 text-gray-400'
                          }`}
                        >
                          <span className={cita.profesional_nombre ? 'text-blue-400' : 'text-gray-500'}>👨‍⚕️</span>
                          <span className="truncate flex-1 mx-2 font-semibold">
                            {cita.profesional_nombre || 'Sin profesional'}
                          </span>
                          <span className={cita.profesional_nombre ? 'text-blue-300' : 'text-gray-500'}>✏️</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMetodoPago(cita);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            cita.pago_estado === 'pagado'
                              ? 'bg-green-600/20 border border-green-500/50 text-green-300'
                              : 'bg-gray-800 border border-gray-600 text-gray-400'
                          }`}
                        >
                          <span className={cita.pago_estado === 'pagado' ? 'text-green-400' : 'text-gray-500'}>💳</span>
                          <span className="truncate flex-1 mx-2 font-semibold capitalize">
                            {cita.pago_estado === 'pagado' ? `Pago: ${cita.metodo_pago}` : 'Pendiente pago'}
                          </span>
                          <span className={cita.pago_estado === 'pagado' ? 'text-green-300' : 'text-gray-500'}>✏️</span>
                        </button>

                        {/* ← ← ← NUEVO: Botón Productos ← ← ← */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductosModal(cita);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            cita.total_productos && cita.total_productos > 0
                              ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300'
                              : 'bg-gray-800 border border-gray-600 text-gray-400'
                          }`}
                        >
                          <span className={cita.total_productos && cita.total_productos > 0 ? 'text-purple-400' : 'text-gray-500'}>📦</span>
                          <span className="truncate flex-1 mx-2 font-semibold">
                            Productos {cita.total_productos && cita.total_productos > 0 && `(${formatMoney(cita.total_productos)})`}
                          </span>
                          <span className={cita.total_productos && cita.total_productos > 0 ? 'text-purple-300' : 'text-gray-500'}>✏️</span>
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

      {/* ← ← ← Modal de Detalle - TOTAL GENERADO (ACTUALIZADO) ← ← ← */}
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
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300"> Productos</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">🧾 Impuesto</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Ganancia Prof.</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-green-300">Saldo Salón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {detalleCitas.map((detalle) => {
                    const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
                    
                    return (
                      <tr key={detalle.cita.id} className="hover:bg-gray-700/50">
                        <td className="px-3 py-3 text-xs font-mono text-blue-400">{detalle.cita.codigo_reserva}</td>
                        <td className="px-3 py-3 text-gray-300">{formatDate(detalle.cita.fecha)}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.servicio_nombre}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.cliente_nombre}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.profesional_nombre || 'Sin asignar'}</td>
                        <td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.totalProductos.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.comisionBold.toLocaleString()} ({porcentajeBold}%)</td>
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
              const { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios, totalProductos } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-5 gap-3">
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <p className="text-xs text-blue-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-blue-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">📦 Total Productos</p>
                      <p className="text-lg font-bold text-orange-400">${totalProductos.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">🧾 Total Impuesto ({parseFloat(String(configuracion.porcentaje_bold || 3.5))}%)</p>
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
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← ← ← Modal de Detalle - GANANCIA PROFESIONALES (ACTUALIZADO) ← ← ← */}
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
                    <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-300">Hora Inicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-green-300">Valor Servicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">📦 Productos</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">🧾 Impuesto</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Ganancia Profesional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {detalleCitas.map((detalle) => {
                    const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
                    
                    return (
                      <tr key={detalle.cita.id} className="hover:bg-gray-700/50">
                        <td className="px-3 py-3 text-xs font-mono text-blue-400">{detalle.cita.codigo_reserva}</td>
                        <td className="px-3 py-3 text-gray-300">{formatDate(detalle.cita.fecha)}</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.servicio_nombre}</td>
                        <td className="px-3 py-3 text-right text-cyan-400 text-xs">{formatHora(detalle.cita.hora_inicio)}</td>
                        <td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.totalProductos.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.comisionBold.toLocaleString()} ({porcentajeBold}%)</td>
                        <td className="px-3 py-3 text-right text-purple-400 font-semibold">${detalle.gananciaProfesional.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {(() => {
              const { totalComisionBold, totalGananciaProfesionales, totalServicios, totalProductos } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-xs text-green-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-green-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">📦 Total Productos</p>
                      <p className="text-lg font-bold text-orange-400">${totalProductos.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                      <p className="text-xs text-orange-300 mb-1">🧾 Total Impuesto ({parseFloat(String(configuracion.porcentaje_bold || 3.5))}%)</p>
                      <p className="text-lg font-bold text-orange-400">${totalComisionBold.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                      <p className="text-xs text-purple-300 mb-1">💵 Total Ganancia Profesionales</p>
                      <p className="text-lg font-bold text-purple-400">${totalGananciaProfesionales.toLocaleString('es-CO')}</p>
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

      {/* ← ← ← NUEVO: ProductoModal para Citas ← ← ← */}
      {productoModalOpen && citaParaProductos && (
        <ProductoModal
          isOpen={productoModalOpen}
          onClose={() => {
            setProductoModalOpen(false);
            setCitaParaProductos(null);
            setCitaEditandoId(null);
            setProductosSeleccionados([]);  // ← Limpiar al cerrar
          }}
          onSelect={handleProductosSeleccionados}
          apiUrl={apiUrl}
          token={token || undefined}
          productosExistentes={productosSeleccionados.map(p => ({
            productoId: p.productoId,
            productoNombre: p.productoNombre,
            productoMarca: p.productoMarca,
            cantidad: p.cantidad,
            precioUnitario: p.precioUnitario,
            precioBase: p.precioUnitario,  // ← AGREGAR: precioBase (requerido por ProductoSeleccionado)
            subtotal: p.subtotal,
            stockDisponible: 999  // ← AGREGAR: stockDisponible (requerido por ProductoSeleccionado)
          }))}
        />
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