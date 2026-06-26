'use client';
// components/admin/MiAgendaTab.tsx
import { useState, useEffect } from 'react';
import EditCitaModal from './EditCitaModal';
import ProfessionalModal from '../booking/ProfessionalModal';
import PaymentMethodModal from '../booking/PaymentMethodModal';
import ProductoModal, { ProductoSeleccionado } from './ProductoModal';
import HorarioSemanalModal from './HorarioSemanalModal';
import ResumenValoracionCitaModal from '@/components/reservas/ResumenValoracionCitaModal';

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
  total_productos?: number;
  monto_propina?: number;
  base_para_impuesto?: number;
  servicio_requiere_valoracion?: boolean;
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
  montoPropina: number;
  baseParaImpuesto: number;
  comisionBold: number;
  porcentajeProfesional: number;
  gananciaProfesional: number;
  saldo: number;
  horasCita: number;
  totalProductos: number;
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

export default function MiAgendaTab() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [serviciosProfesionales, setServiciosProfesionales] = useState<ServicioProfesional[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>({});
  const [loading, setLoading] = useState(false);

  // ← ← ← NUEVO: Estado para el profesional logueado ← ← ←
  const [miProfesional, setMiProfesional] = useState<Profesional | null>(null);
  const [loadingMiProfesional, setLoadingMiProfesional] = useState(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

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
  
  // ← Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profesionalModalOpen, setProfesionalModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [citaParaProductos, setCitaParaProductos] = useState<Cita | null>(null);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState<CitaProductoForm[]>([]);
  
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [citaEditandoId, setCitaEditandoId] = useState<number | null>(null);

  // ← Totales
  const [totalGenerado, setTotalGenerado] = useState<number>(0);
  const [totalGanado, setTotalGanado] = useState<number>(0);
  const [totalAbonos, setTotalAbonos] = useState<number>(0);
  const [totalProductos, setTotalProductos] = useState<number>(0);
  
  const [datosCalculados, setDatosCalculados] = useState<{
    detalles: DetalleCita[];
    generado: number;
    ganado: number;
    abonos: number;
    productos: number;
  } | null>(null);
  
  const [detalleCitas, setDetalleCitas] = useState<DetalleCita[]>([]);
  const [tipoDetalle, setTipoDetalle] = useState<'generado' | 'ganado' | 'abonos'>('generado');

  const [modalResumenValoracionOpen, setModalResumenValoracionOpen] = useState(false);
  const [citaParaVerValoracion, setCitaParaVerValoracion] = useState<number | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const [modalHorarioSemanaOpen, setModalHorarioSemanaOpen] = useState(false);
  const [profesionalParaHorario, setProfesionalParaHorario] = useState<any | null>(null);

  // ← ← ← NUEVO: Detectar el profesional logueado al montar el componente ← ← ←
  // ← ← ← SIMPLIFICADO: El profesional se detecta automáticamente en el backend ← ← ←
  // Ya no necesitamos detectar el profesional manualmente
  // El estado miProfesional se poblará desde la respuesta de mis-citas
  /*useEffect(() => {
    const detectarMiProfesional = async () => {
      setLoadingMiProfesional(true);
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          console.warn('⚠️ No hay token, no se puede detectar profesional');
          setLoadingMiProfesional(false);
          return;
        }

        // 1. Obtener los profesionales a los que tengo acceso
        const res = await fetch(`${apiUrl}/profesional-user/mis-profesionales/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          console.error('❌ Error obteniendo mis profesionales:', res.status);
          setLoadingMiProfesional(false);
          return;
        }

        const data = await res.json();
        const profesionales = data.profesionales || [];

        if (profesionales.length === 0) {
          console.warn('⚠️ No tienes profesionales asociados');
          setLoadingMiProfesional(false);
          return;
        }

        // 2. Tomar el primer profesional (si hay múltiples, se podría mostrar selector)
        const miProf = profesionales[0];
        console.log('✅ Profesional detectado:', miProf);

        // 3. Cargar los datos completos del profesional
        const profRes = await fetch(`${apiUrl}/profesionales/${miProf.profesional_id}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profRes.ok) {
          const profData = await profRes.json();
          setMiProfesional(profData);
        } else {
          // Fallback: crear objeto con datos mínimos
          setMiProfesional({
            id: miProf.profesional_id,
            nombre: miProf.profesional_nombre,
            titulo: '',
            especialidad: miProf.profesional_especialidad || '',
            foto: null,
            foto_url: null,
            porcentaje_global: 50
          });
        }

      } catch (err) {
        console.error('❌ Error detectando profesional:', err);
      } finally {
        setLoadingMiProfesional(false);
      }
    };

    detectarMiProfesional();
  }, [apiUrl]);*/

  // ← Cargar citas y profesionales al montar o cambiar fechas/búsqueda
useEffect(() => {
  cargarDatos();
}, [fechaInicio, fechaFin, debouncedSearch]);

  // ← ← ← Debounce para búsqueda en tiempo real (500ms) ← ← ←
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 500);
  return () => clearTimeout(timer);
}, [searchTerm]);

// ← ← ← Ya no necesitamos este useEffect separado porque está incluido en el anterior ← ← ←

  useEffect(() => {
    if (citas.length > 0 && serviciosProfesionales.length > 0 && Object.keys(configuracion).length > 0) {
      calcularTotales(citas, serviciosProfesionales, configuracion);
    }
  }, [citas, serviciosProfesionales, configuracion]);

  const cargarDatos = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('admin_token');
    
    // ← ← ← NUEVO: Usar endpoint mis-citas que detecta el profesional automáticamente ← ← ←
    let misCitasUrl = `${apiUrl}/citas/mis-citas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    if (debouncedSearch && debouncedSearch.trim()) {
      misCitasUrl += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
    }

    const misCitasRes = await fetch(misCitasUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!misCitasRes.ok) {
      console.error('❌ Error obteniendo mis citas:', misCitasRes.status);
      setCitas([]);
      setLoading(false);
      return;
    }

    const misCitasData = await misCitasRes.json();
    console.log('✅ [MiAgenda] Respuesta de mis-citas:', misCitasData);

        // ← ← ← EXTRAER información del profesional de la respuesta ← ← ←
    if (misCitasData.profesional) {
      setMiProfesional({
        id: misCitasData.profesional.id,
        nombre: misCitasData.profesional.nombre,
        titulo: '',
        especialidad: misCitasData.profesional.especialidad || '',
        foto: null,
        foto_url: null,
        porcentaje_global: 50
      });
      // ← ← ← CLAVE: Marcar que ya se detectó el profesional ← ← ←
      setLoadingMiProfesional(false);
    } else {
      // ← ← ← Si no hay profesional en la respuesta, marcar como detectado pero sin datos ← ← ←
      console.warn('⚠️ [MiAgenda] No se encontró profesional en la respuesta de mis-citas');
      setLoadingMiProfesional(false);
    }

    // ← ← ← EXTRAER citas de la respuesta ← ← ←
    const citasList: Cita[] = misCitasData.citas || [];
    setCitas(citasList);
    
    // ← Cargar profesionales (para mostrar nombres en modales)
    const profsUrl = `${apiUrl}/profesionales/?activo=true&ordering=nombre`;
    const profsRes = await fetch(profsUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    let profsList: Profesional[] = [];
    if (profsRes.ok) {
      const data = await profsRes.json();
      profsList = Array.isArray(data) ? data : (data.results || []);
    }
    
    // ← ← ← Cargar relaciones servicio-profesional con paginación ← ← ←
    let spList: ServicioProfesional[] = [];
    let nextPage: string | null = `${apiUrl}/servicios-profesionales/?activo=true&page_size=100`;
    
    while (nextPage) {
      const normalizedUrl: string = nextPage.replace(
        /https?:\/\/[^/]+\/api/,
        apiUrl
      );
      
      const spRes = await fetch(normalizedUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!spRes.ok) break;
      
      const data = await spRes.json();
      const results = Array.isArray(data) ? data : (data.results || []);
      spList = [...spList, ...results];
      
      if (data.next) {
        nextPage = data.next.replace(/https?:\/\/[^/]+\/api/, apiUrl);
      } else {
        nextPage = null;
      }
    }
    
    // ← Cargar configuración
    const configUrl = `${apiUrl}/configuracion/activa/`;
    const configRes = await fetch(configUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    let configData: Configuracion = {};
    if (configRes.ok) {
      configData = await configRes.json();
    }
    
    setProfesionales(profsList);
    setServiciosProfesionales(spList);
    setConfiguracion(configData);
    
    } catch (err) {
    console.error('❌ Error cargando datos:', err);
    // ← ← ← CLAVE: En caso de error, también marcar que ya se intentó detectar el profesional ← ← ←
    setLoadingMiProfesional(false);
  } finally {
    setLoading(false);
  }
};

  const handleVerValoracion = (citaId: number) => {
    setCitaParaVerValoracion(citaId);
    setModalResumenValoracionOpen(true);
  };

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

  const calcularDetallesCitas = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion): DetalleCita[] => {
    const porcentajeBold = parseFloat(String(configData.porcentaje_bold || 3.5));
    
    return citasList.map(cita => {
      const precioTotal = parseFloat(cita.precio_total) || 0;
      const totalProductos = cita.total_productos || 0;
      const montoPropina = typeof cita.monto_propina === 'number' ? cita.monto_propina : 0;
      const baseParaImpuesto = precioTotal + montoPropina;
      const comisionBold = baseParaImpuesto * (porcentajeBold / 100);
      
      let porcentajeProf = 0;
      if (cita.profesional) {
        const asignacion = spList.find(
          sp => sp.servicio === cita.servicio && sp.profesional === cita.profesional
        );

        if (asignacion && 
            asignacion.precio_especial !== null && 
            asignacion.precio_especial !== undefined) {
          
          const precioEspecialStr = String(asignacion.precio_especial).trim();
          
          if (precioEspecialStr !== '' && !isNaN(parseFloat(precioEspecialStr))) {
            porcentajeProf = parseFloat(precioEspecialStr);
          } else {
            const profesional = profesionales.find(p => p.id === cita.profesional);
            porcentajeProf = parseFloat(String(profesional?.porcentaje_global || 50));
          }
        } else {
          const profesional = profesionales.find(p => p.id === cita.profesional);
          porcentajeProf = parseFloat(String(profesional?.porcentaje_global || 50));
        }
      }
      
      const baseCalculable = precioTotal - comisionBold - totalProductos;
      const gananciaPorServicio = baseCalculable * (porcentajeProf / 100);
      const gananciaProfesional = gananciaPorServicio + montoPropina;
      const saldo = precioTotal - comisionBold - gananciaPorServicio - totalProductos;
      const horasCita = calcularHorasCita(cita.hora_inicio, cita.hora_fin);
      
      return {
        cita,
        precioTotal,
        montoPropina,
        baseParaImpuesto,
        comisionBold,
        porcentajeProfesional: porcentajeProf,
        gananciaProfesional,
        saldo,
        horasCita,
        totalProductos
      };
    });
  };

  const calcularTotales = (citasList: Cita[], spList: ServicioProfesional[], configData: Configuracion) => {
    const detalles = calcularDetallesCitas(citasList, spList, configData);
    
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
    setTotalProductos(productos);
    setDetalleCitas(detalles);
    setDatosCalculados({ detalles, generado, ganado, abonos, productos });
  };

  const abrirModalDetalle = (tipo: 'generado' | 'ganado' | 'abonos') => {
    setTipoDetalle(tipo);
    setDetalleModalOpen(true);
  };

  const handleOpenProductosModal = async (cita: Cita) => {
    setCitaParaProductos(cita);
    setCitaEditandoId(cita.id);
    setLoadingProductos(true);
    
    try {
      const res = await fetch(`${apiUrl}/cita-productos/?cita=${cita.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const productosData = Array.isArray(data) ? data : (data.results || []);
        
        const productosExistentes: ProductoSeleccionado[] = productosData.map((p: any) => ({
          productoId: p.producto,
          productoNombre: p.producto_nombre,
          productoMarca: p.producto_marca,
          cantidad: p.cantidad,
          precioUnitario: parseFloat(p.precio_unitario),
          precioBase: parseFloat(p.precio_unitario),
          subtotal: parseFloat(p.subtotal),
          stockDisponible: 999
        }));
        
        setProductosSeleccionados(productosExistentes);
      }
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
    } finally {
      setLoadingProductos(false);
      setProductoModalOpen(true);
    }
  };

  const handleProductosSeleccionados = async (productos: ProductoSeleccionado[]) => {
    if (!citaParaProductos?.id) return;
    
    try {
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

  const obtenerTotalesModal = () => {
    const totalComisionBold = detalleCitas.reduce((sum, d) => sum + d.comisionBold, 0);
    const totalGananciaProfesionales = detalleCitas.reduce((sum, d) => sum + d.gananciaProfesional, 0);
    const totalSaldos = detalleCitas.reduce((sum, d) => sum + d.saldo, 0);
    const totalServicios = detalleCitas.reduce((sum, d) => sum + d.precioTotal, 0);
    const totalHoras = detalleCitas.reduce((sum, d) => sum + d.horasCita, 0);
    const totalProductos = detalleCitas.reduce((sum, d) => sum + d.totalProductos, 0);
    const totalPropinas = detalleCitas.reduce((sum, d) => sum + d.montoPropina, 0);
    
    return { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios, totalHoras, totalProductos, totalPropinas };
  };

  const formatDate = (fechaStr: string): string => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  const formatHora = (horaStr: string): string => horaStr;

  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEstadoColor = (estado: string): string => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-yellow-600',
      'confirmada': 'bg-blue-600',
      'completada': 'bg-green-600',
      'cancelada': 'bg-red-600'
    };
    return colors[estado] || 'bg-gray-600';
  };

  const handleEditCita = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setEditModalOpen(true);
  };

  const handleCitaUpdated = (citaActualizada: Cita) => {
    setCitas(prev => prev.map(c => c.id === citaActualizada.id ? citaActualizada : c));
    setEditModalOpen(false);
    setCitaSeleccionada(null);
    setCitaEditandoId(null);
  };

  const handleSelectProfesional = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setProfesionalModalOpen(true);
  };

  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!citaEditandoId) return;
    
    try {
      const updateRes = await fetch(`${apiUrl}/citas/${citaEditandoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ profesional: profesional.id }),
      });
      
      if (updateRes.ok) {
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

  const handleSelectMetodoPago = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setPagoModalOpen(true);
  };

  const handleMetodoPagoSelected = async (metodo: MetodoPago) => {
    if (!citaEditandoId || !citaSeleccionada) return;
    
    try {
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

  // ← ← ← ESTADO DE CARGA INICIAL: Detectando profesional ← ← ←
  if (loadingMiProfesional) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Detectando tu perfil de profesional...</p>
        </div>
      </div>
    );
  }

  // ← ← ← SI NO TIENE PROFESIONAL ASOCIADO ← ← ←
  if (!miProfesional && !loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h3 className="text-xl font-bold text-white mb-2">
          No tienes un perfil de profesional asociado
        </h3>
        <p className="text-gray-400 mb-6">
          Para usar esta sección, un administrador debe vincular tu usuario a un perfil de profesional.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 inline-block">
          <p className="text-sm text-gray-300">
            Contacta al administrador del sistema para que asigne tu usuario a un profesional en:
          </p>
          <p className="text-blue-400 font-mono mt-2">
            /admin/profesionales-accesos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== HEADER CON INFO DEL PROFESIONAL ========== */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-xl p-4 border border-blue-700 flex items-center gap-4">
                {/* Foto del profesional */}
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 border-2 border-blue-500">
          {miProfesional && (miProfesional.foto_url || miProfesional.foto) ? (
            <img
              src={miProfesional.foto_url || miProfesional.foto || ''}
              alt={miProfesional.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
              👨‍⚕️
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">
            {miProfesional?.titulo} {miProfesional?.nombre}
          </h2>
          <p className="text-sm text-blue-300">{miProfesional?.especialidad}</p>
          <p className="text-xs text-gray-400 mt-1">
            📅 {fechaInicio === fechaFin 
              ? `Agenda del ${formatDate(fechaInicio)}`
              : `Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`
            }
          </p>
        </div>

        {/* Botón horario semanal */}
        <button
          onClick={() => {
            setProfesionalParaHorario(miProfesional);
            setModalHorarioSemanaOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          title="Ver mi horario semanal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Mi Horario
        </button>
      </div>

      {/* ========== FILTROS DE FECHA Y TOTALES ========== */}
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Fecha Inicio */}
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-300 mb-1">📅 Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-300 mb-1">📅 Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Total Generado */}
          {/*<button
            onClick={() => abrirModalDetalle('generado')}
            className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-lg p-2 border border-blue-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-blue-300 text-[9px] font-semibold mb-0.5 leading-tight">💰 Generado</p>
            <p className="text-base font-bold text-blue-400 leading-tight">
              ${totalGenerado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </button>*/}

          {/* Total Impuestos */}
          <button
            //onClick={() => abrirModalDetalle('generado')}
            className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-lg p-2 border border-orange-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-orange-300 text-[9px] font-semibold mb-0.5 leading-tight">🧾 Impuestos</p>
            <p className="text-base font-bold text-orange-400 leading-tight">
              ${(datosCalculados?.detalles.reduce((sum, d) => sum + d.comisionBold, 0) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[8px] text-orange-300/70 leading-tight">
              ({parseFloat(String(configuracion.porcentaje_bold || 3.5))}%)
            </p>
          </button>

          {/* Total Productos */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-2 border border-purple-700 flex flex-col justify-center min-h-[70px]">
            <p className="text-purple-300 text-[9px] font-semibold mb-0.5 leading-tight">📦 Productos</p>
            <p className="text-base font-bold text-purple-400 leading-tight">
              ${totalProductos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* Total Ganado */}
          <button
            onClick={() => abrirModalDetalle('ganado')}
            className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-2 border border-green-700 flex flex-col justify-center hover:scale-105 transition-transform min-h-[70px]"
          >
            <p className="text-green-300 text-[9px] font-semibold mb-0.5 leading-tight">💵 Mi Ganancia</p>
            <p className="text-base font-bold text-green-400 leading-tight">
              ${totalGanado.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </p>
          </button>
        </div>
      </div>

      {/* ← Barra de búsqueda */}
      <div className="mb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar por cliente, código de recibo, teléfono o servicio..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
              title="Limpiar búsqueda"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {debouncedSearch && (
          <p className="text-xs text-blue-400 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mostrando resultados para: <span className="font-semibold">"{debouncedSearch}"</span>
            <span className="text-gray-500">
              ({citas.length} {citas.length === 1 ? 'cita encontrada' : 'citas encontradas'})
            </span>
          </p>
        )}
      </div>

      {/* ========== GRID DE CITAS (UNA SOLA COLUMNA ANCHA) ========== */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            📋 Mis Citas
          </h2>
          <p className="text-sm text-gray-400">
            {citas.length} {citas.length === 1 ? 'cita' : 'citas'} en este período
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Cargando mis citas...</p>
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-700">
            {debouncedSearch ? (
              <>
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-gray-300 text-lg font-semibold mb-2">
                  No se encontraron resultados
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  No hay citas que coincidan con "<span className="text-blue-400 font-semibold">{debouncedSearch}</span>"
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">📅</div>
                <p className="text-gray-400 text-lg">
                  No tienes citas en este rango de fechas
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {citas.map((cita) => {
              const detalle = detalleCitas.find(d => d.cita.id === cita.id);
              const porcentajeBold = parseFloat(String(configuracion.porcentaje_bold || 3.5));
              
              return (
                <div
                  key={cita.id}
                  //onClick={() => handleEditCita(cita)}
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
                    
                    <div className="mb-2">
                      {cita.servicio_requiere_valoracion ? (
                        <button
                          onClick={() => handleVerValoracion(cita.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors gap-1"
                          title="Ver resumen de valoración"
                        >
                          📋 Valoración ${parseInt(cita.precio_total).toLocaleString()}
                        </button>
                      ) : (
                        <p className="text-2xl font-bold text-green-400">
                          ${parseInt(cita.precio_total).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    {detalle && (
                      <div className="mt-2 space-y-1">
                        {detalle.montoPropina > 0 && (
                          <p className="text-xs text-pink-400 font-medium">
                            💝 Propina: ${detalle.montoPropina.toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-purple-400">
                          💵 Mi Ganancia: ${detalle.gananciaProfesional.toLocaleString()} ({detalle.porcentajeProfesional}%)
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
                    {/*<button
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
                    </button>*/}

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

      {/* ← Modales (igual que ProfesionalesTab pero sin el selector de profesionales) */}
      {detalleModalOpen && tipoDetalle === 'generado' && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">📊 Detalle de Total Generado</h2>
                <p className="text-sm opacity-90 mt-1">
                  {miProfesional?.nombre || 'Sin profesional'} | {formatDate(fechaInicio)} - {formatDate(fechaFin)}
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

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Código</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Servicio</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Cliente</th>
                    {/*<th className="px-3 py-3 text-right text-xs font-semibold text-gray-300">Valor Servicio</th>*/}
                    <th className="px-3 py-3 text-right text-xs font-semibold text-pink-300">💝 Propina</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">📦 Productos</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">🧾 Impuesto</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Mi Ganancia</th>
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
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.servicio_nombre} ({detalle.porcentajeProfesional}%)</td>
                        <td className="px-3 py-3 text-gray-300">{detalle.cita.cliente_nombre}</td>
                        {/*<td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>*/}
                        <td className="px-3 py-3 text-right text-pink-400">${detalle.montoPropina.toLocaleString()}</td>
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

            {(() => {              
              const { totalComisionBold, totalGananciaProfesionales, totalSaldos, totalServicios, totalProductos, totalPropinas } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-6 gap-3">
                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-xs text-green-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-green-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-pink-900/30 border border-pink-700 rounded-lg p-3">
                      <p className="text-xs text-pink-300 mb-1">💝 Total Propinas</p>
                      <p className="text-lg font-bold text-pink-400">${totalPropinas.toLocaleString('es-CO')}</p>
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
                      <p className="text-xs text-purple-300 mb-1">💵 Mi Ganancia Total</p>
                      <p className="text-lg font-bold text-purple-400">${totalGananciaProfesionales.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
                      <p className="text-xs text-emerald-300 mb-1">🏦 Total Saldo Salón</p>
                      <p className="text-lg font-bold text-emerald-400">${totalSaldos.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← Modal de Detalle - GANANCIA (similar al anterior pero más simple) */}
      {detalleModalOpen && tipoDetalle === 'ganado' && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">💵 Detalle de Mi Ganancia</h2>
                <p className="text-sm opacity-90 mt-1">
                  {miProfesional?.nombre} | {formatDate(fechaInicio)} - {formatDate(fechaFin)}
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

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Código</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Fecha</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-300">Servicio</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-300">Hora</th>
                   {/* <th className="px-3 py-3 text-right text-xs font-semibold text-green-300">Valor Servicio</th>*/}
                    <th className="px-3 py-3 text-right text-xs font-semibold text-pink-300">💝 Propina</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">📦 Productos</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-orange-300">🧾 Impuesto</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-purple-300">Mi Ganancia</th>
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
                        {/*<td className="px-3 py-3 text-right text-green-400 font-semibold">${detalle.precioTotal.toLocaleString()}</td>*/}
                        <td className="px-3 py-3 text-right text-pink-400">${detalle.montoPropina.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.totalProductos.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-orange-400">${detalle.comisionBold.toLocaleString()} ({porcentajeBold}%)</td>
                        <td className="px-3 py-3 text-right text-purple-400 font-semibold">${detalle.gananciaProfesional.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(() => {              
              const { totalComisionBold, totalGananciaProfesionales, totalServicios, totalProductos, totalPropinas } = obtenerTotalesModal();
              return (
                <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl">
                  <div className="grid grid-cols-5 gap-3">
                    {/*<div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                      <p className="text-xs text-green-300 mb-1">💰 Total Servicios</p>
                      <p className="text-lg font-bold text-green-400">${totalServicios.toLocaleString('es-CO')}</p>
                    </div>*/}
                    <div className="bg-pink-900/30 border border-pink-700 rounded-lg p-3">
                      <p className="text-xs text-pink-300 mb-1">💝 Total Propinas</p>
                      <p className="text-lg font-bold text-pink-400">${totalPropinas.toLocaleString('es-CO')}</p>
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
                      <p className="text-xs text-purple-300 mb-1">💵 Mi Ganancia Total</p>
                      <p className="text-lg font-bold text-purple-400">${totalGananciaProfesionales.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ← Modales de productos, edición, pago, etc. (igual que ProfesionalesTab) */}
      {productoModalOpen && citaParaProductos && (
        <ProductoModal
          isOpen={productoModalOpen}
          onClose={() => {
            setProductoModalOpen(false);
            setCitaParaProductos(null);
            setCitaEditandoId(null);
            setProductosSeleccionados([]);
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
            precioBase: p.precioUnitario,
            subtotal: p.subtotal,
            stockDisponible: 999
          }))}
        />
      )}

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

      {modalHorarioSemanaOpen && profesionalParaHorario && (
        <HorarioSemanalModal
          isOpen={modalHorarioSemanaOpen}
          onClose={() => {
            setModalHorarioSemanaOpen(false);
            setProfesionalParaHorario(null);
          }}
          profesional={profesionalParaHorario}
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

      {modalResumenValoracionOpen && citaParaVerValoracion && (
        <ResumenValoracionCitaModal
          isOpen={modalResumenValoracionOpen}
          onClose={() => {
            setModalResumenValoracionOpen(false);
            setCitaParaVerValoracion(null);
          }}
          citaId={citaParaVerValoracion}
        />
      )}
    </div>
  );
}