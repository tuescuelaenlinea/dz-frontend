// app/admin/caja/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CajaReciboModal from '@/components/admin/CajaReciboModal';

// ← ← ← INTERFACES ← ← ←

interface CajaSession {
  id: number;
  usuario: number;
  usuario_username: string;
  fecha: string;
  turno: 'manana' | 'tarde' | 'noche';
  hora_apertura: string;
  hora_cierre: string | null;
  saldo_inicial: string;
  saldo_final: string | null;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  observaciones_apertura: string;
  observaciones_cierre: string;
  total_entradas: string;
  total_salidas: string;
  total_ventas: string;
  saldo_esperado: string;
  creado: string;
}

interface ReciboCaja {
  id: number;
  codigo_recibo: string;
  tipo: 'entrada' | 'salida' | 'venta';
  estado: 'borrador' | 'publicado' | 'anulado';
  subtotal: string;
  descuento: string;
  total: string;
  propina_total: string;
  metodo_pago: string;
  cliente_nombre: string;
  fecha: string;
  session_caja_turno: string;
  items?: Array<{
    id: number;
    tipo_item: string;
    profesional: number | null;
    descripcion: string;
    cantidad: number;
    subtotal: string;
  }>;
}

interface ValeEmpleado {
  id: number;
  codigo_vale: string;
  profesional: number;
  profesional_nombre: string;
  monto: string;
  fecha: string;
  estado: 'registrado' | 'pagado' | 'cancelado';
  notificacion_whatsapp_enviada: boolean;
}

interface CajaCategoria {
  id: number;
  nombre: string;
  tipo: 'entrada' | 'salida' | 'ambos';
  color: string;
}

// ← ← ← COMPONENTE PRINCIPAL ← ← ←

export default function CajaPage() {
  const router = useRouter();
  
  // ← Estados
  const [sessionActiva, setSessionActiva] = useState<CajaSession | null>(null);
  const [recibosRecientes, setRecibosRecientes] = useState<ReciboCaja[]>([]);
  const [valesPendientes, setValesPendientes] = useState<ValeEmpleado[]>([]);
  const [categorias, setCategorias] = useState<CajaCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ← Modales
  const [modalAbrirCajaOpen, setModalAbrirCajaOpen] = useState(false);
  const [modalCerrarCajaOpen, setModalCerrarCajaOpen] = useState(false);
  const [modalNuevoReciboOpen, setModalNuevoReciboOpen] = useState(false);
  const [modalNuevoValeOpen, setModalNuevoValeOpen] = useState(false);
  const [modalEditarReciboOpen, setModalEditarReciboOpen] = useState(false);
  const [reciboEditarId, setReciboEditarId] = useState<number | null>(null);

  // ← ← ← NUEVOS ESTADOS PARA ACORDEÓN DE DETALLE ← ← ←
  const [reciboExpandido, setReciboExpandido] = useState<number | null>(null);
  const [detalleRecibo, setDetalleRecibo] = useState<ReciboCaja | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  // ← Formulario abrir caja
  const [formDataAbrir, setFormDataAbrir] = useState({
    fecha: new Date().toISOString().split('T')[0],
    turno: 'manana' as const,
    saldo_inicial: '',
    observaciones_apertura: ''
  });

  // ← Formulario cerrar caja
  const [formDataCerrar, setFormDataCerrar] = useState({
    saldo_final: '',
    observaciones_cierre: ''
  });
  
  // ← ← ← AGREGAR ESTA FUNCIÓN EN CajaPage ← ← ←
  const handleEditarRecibo = (recibo: any) => {
    console.log('✏️ [CajaPage] Editar recibo:', recibo.codigo_recibo);
    
    // Disparar evento para abrir modal en CajaReciboModal
    window.dispatchEvent(new CustomEvent('abrirReciboBorrador', {
      detail: { reciboId: recibo.id }
    }));
  };
  
  // ← ← ← NUEVAS FUNCIONES PARA VALIDACIÓN Y REDIRECCIÓN ← ← ←
  
  // Validar servicios con profesional (solo informativa)
  const validarServiciosParaPublicar = (items: any[]) => {
    return items.filter((item: any) => 
      item.tipo_item === 'servicio' && !item.profesional
    );
  };

  // Mostrar alerta informativa con opción de redirigir
  const mostrarAlertaAsignarProfesionales = (servicios: any[], reciboId: number) => {
    const lista = servicios.map((s: any) => `• ${s.descripcion} (${s.cantidad}x)`).join('\n');
    
    const confirmar = window.confirm(
      `ℹ️ Información para publicar\n\n` +
      `Hay ${servicios.length} servicio(s) que requieren profesional asignado:\n${lista}\n\n` +
      `¿Deseas ir a "Control de Citas" para asignar los profesionales ahora?\n\n` +
      `• "Aceptar": Ir a asignar profesionales\n` +
      `• "Cancelar": Seguir en Caja (podrás publicar después)`
    );
    
    if (confirmar) {
      // Redirigir a Control de Citas usando CustomEvent
      // AdminPage debe escuchar este evento y hacer setActiveTab('control')
      window.dispatchEvent(new CustomEvent('redirigirAsignarProfesionales', {
        detail: { reciboId, origen: 'caja' }
      }));
    }
    // Si cancela, simplemente cierra la alerta y permite continuar
  };

  // Calcular distribución manual para propina
  const calcularDistribucionManualCaja = (items: any[], propinaTotal: number) => {
    const profesionalesUnicos = Array.from(
      new Set(
        items
          .filter((item: any) => item.tipo_item === 'servicio' && item.profesional)
          .map((item: any) => item.profesional)
      )
    );
    
    if (profesionalesUnicos.length === 0 || propinaTotal === 0) return [];
    
    const distribucion: Array<{
      profesional: number;
      monto: number;
      porcentaje: number;
    }> = [];
    let montoRestante = propinaTotal;
    
    profesionalesUnicos.forEach((profId: number, index: number) => {
      if (index === profesionalesUnicos.length - 1) {
        // Último profesional recibe el residuo para evitar errores de redondeo
        distribucion.push({
          profesional: profId,
          monto: Math.round(montoRestante),
          porcentaje: Math.round((montoRestante / propinaTotal) * 100)
        });
      } else {
        // Calcular proporción basada en subtotal del profesional
        const subtotalProfesional = items
          .filter((item: any) => item.tipo_item === 'servicio' && item.profesional === profId)
          .reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
        
        const subtotalTotal = items
          .filter((item: any) => item.tipo_item === 'servicio')
          .reduce((sum: number, item: any) => sum + parseFloat(item.subtotal), 0);
        
        const porcentaje = subtotalTotal > 0 ? (subtotalProfesional / subtotalTotal) * 100 : 0;
        const monto = Math.round((porcentaje / 100) * propinaTotal);
        
        distribucion.push({
          profesional: profId,
          monto: monto,
          porcentaje: Math.round(porcentaje)
        });
        
        montoRestante -= monto;
      }
    });
    
    return distribucion;
  };

  // ← ← ← FUNCIÓN: Cargar detalle completo de un recibo con sus items ← ← ←
const cargarDetalleRecibo = async (reciboId: number) => {
  // Si ya está cargado este recibo, solo alternar visibilidad
  if (reciboExpandido === reciboId) {
    setReciboExpandido(null);
    setDetalleRecibo(null);
    return;
  }
  
  setLoadingDetalle(true);
  try {
    const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!res.ok) throw new Error('Error cargando detalle');
    
    const data = await res.json();
    setDetalleRecibo(data);
    setReciboExpandido(reciboId);
  } catch (err) {
    console.error('❌ Error cargando detalle:', err);
    alert('⚠️ No se pudo cargar el detalle del recibo');
  } finally {
    setLoadingDetalle(false);
  }
};

// ← ← ← FUNCIÓN AUXILIAR: Renderizar badge de tipo de item ← ← ←
const getTipoItemBadge = (tipo: string, profesional?: string | null) => {
  const base = "px-2 py-0.5 rounded text-xs font-medium";
  
  if (tipo === 'servicio') {
    return `${base} ${profesional 
      ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
      : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'}`;
  }
  if (tipo === 'producto') {
    return `${base} bg-purple-900/50 text-purple-300 border border-purple-700`;
  }
  return `${base} bg-gray-700 text-gray-300`;
};

  // ← ← ← NUEVA FUNCIÓN: Publicar recibo con validaciones ← ← ←
  const handlePublicarRecibo = async (reciboId: number) => {
    try {
      // 1. Obtener detalles actuales del recibo
      const resDetalle = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!resDetalle.ok) throw new Error('Error cargando recibo');
      const recibo = await resDetalle.json();
      
      // 2. Validación INFORMATIVA: servicios sin profesional
      const serviciosSinProfesional = validarServiciosParaPublicar(recibo.items || []);
      
      if (serviciosSinProfesional.length > 0) {
        mostrarAlertaAsignarProfesionales(serviciosSinProfesional, reciboId);
        // No retornar: permitir que el usuario decida continuar o no
        // Si cancela la alerta, puede intentar publicar igual
      }
      
      // 3. Preparar payload para método manual
      const payload: any = {};
      if (recibo.propina_metodo_distribucion === 'manual' && recibo.propina_total > 0) {
        payload.distribucion = calcularDistribucionManualCaja(
          recibo.items, 
          parseFloat(recibo.propina_total)
        );
      }
      
      // 4. Llamar endpoint publicar
      const resPublicar = await fetch(`${apiUrl}/caja/recibos/${reciboId}/publicar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (!resPublicar.ok) {
        const errorData = await resPublicar.json();
        
        // Manejar error backend: servicios sin profesional
        if (errorData.servicios_sin_profesional) {
          mostrarAlertaAsignarProfesionales(errorData.servicios_sin_profesional, reciboId);
          return;
        }
        
        throw new Error(errorData.detail || 'Error al publicar');
      }
      
      const resultado = await resPublicar.json();
      
      // 5. Éxito: mostrar confirmación
      alert(`✅ Recibo ${resultado.recibo.codigo_recibo} publicado exitosamente`);
      
      // 6. Actualizar UI: recargar lista de recibos
      await cargarRecibosRecientes();
      
    } catch (err: any) {
      console.error('❌ Error publicando recibo:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };
  
  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← ← ← AGREGAR: Escuchar evento para abrir recibo borrador ← ← ←
    useEffect(() => {
      const handleAbrirReciboBorrador = (event: CustomEvent) => {
        const { reciboId } = event.detail;
        console.log('📦 [CajaPage] Abriendo recibo borrador ID:', reciboId);
        
        // Aquí podrías:
        // 1. Abrir el modal CajaReciboModal con reciboId
        // 2. O redirigir a una ruta de edición específica
        
        // Por ahora, abrimos el modal existente pasando el ID
        setModalEditarReciboOpen(true);
        setReciboEditarId(reciboId);
      };

      window.addEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
      
      return () => {
        window.removeEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
      };
    }, []);

  // ← Cargar datos al montar
  useEffect(() => {
    cargarDatosCaja();
  }, []);

  // ← Cargar datos principales
  const cargarDatosCaja = async () => {
    setLoading(true);
    try {
      await Promise.all([
        cargarSessionActiva(),
        cargarRecibosRecientes(),
        cargarValesPendientes(),
        cargarCategorias()
      ]);
    } catch (err) {
      console.error('❌ Error cargando datos de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← Cargar sesión activa
  const cargarSessionActiva = async () => {
    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/activa/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessionActiva(data);
      }
    } catch (err) {
      console.error('❌ Error cargando sesión activa:', err);
    }
  };

  // ← Cargar recibos recientes
  const cargarRecibosRecientes = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/caja/recibos/?ordering=-fecha&limit=10`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setRecibosRecientes(Array.isArray(data) ? data.slice(0, 10) : (data.results || []).slice(0, 10));
      }
    } catch (err) {
      console.error('❌ Error cargando recibos:', err);
    }
  };

  // ← Cargar vales pendientes
  const cargarValesPendientes = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/caja/vales/?estado=registrado&ordering=-fecha&limit=5`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setValesPendientes(Array.isArray(data) ? data.slice(0, 5) : (data.results || []).slice(0, 5));
      }
    } catch (err) {
      console.error('❌ Error cargando vales:', err);
    }
  };

  // ← Cargar categorías
  const cargarCategorias = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/caja/categorias/?activo=true`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando categorías:', err);
    }
  };

  // ← Abrir nueva sesión de caja
  const handleAbrirCaja = async () => {
    if (!formDataAbrir.saldo_inicial) {
      alert('⚠️ Ingresa el saldo inicial');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/abrir/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formDataAbrir,
          saldo_inicial: parseFloat(formDataAbrir.saldo_inicial)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSessionActiva(data);
        setModalAbrirCajaOpen(false);
        alert('✅ Caja abierta exitosamente');
        cargarDatosCaja();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.detail || 'No se pudo abrir la caja'}`);
      }
    } catch (err: any) {
      console.error('❌ Error abriendo caja:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Cerrar sesión de caja
  const handleCerrarCaja = async () => {
    if (!sessionActiva || !formDataCerrar.saldo_final) {
      alert('⚠️ Ingresa el saldo final');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/${sessionActiva.id}/cerrar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          saldo_final: parseFloat(formDataCerrar.saldo_final),
          observaciones_cierre: formDataCerrar.observaciones_cierre
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSessionActiva(null);
        setModalCerrarCajaOpen(false);
        alert(`✅ Caja cerrada. Diferencia: ${data.diferencia}`);
        cargarDatosCaja();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.detail || 'No se pudo cerrar la caja'}`);
      }
    } catch (err: any) {
      console.error('❌ Error cerrando caja:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Formatear moneda
  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  // ← Formatear fecha
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ← Obtener color por tipo de recibo
  const getReciboColor = (tipo: string, estado: string): string => {
    if (estado === 'anulado') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (estado === 'borrador') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    
    switch (tipo) {
      case 'entrada': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'salida': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'venta': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // ← Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
      {/* ← Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">🏦 Módulo de Caja</h1>
          <p className="text-gray-400 mt-1">Gestión de sesiones, recibos y vales</p>
        </div>
        <div className="flex gap-3">
          {/*<button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-gray-400 hover:text-white font-medium"
          >
            ← Volver
          </button>*/}
          {!sessionActiva ? (
            <button
              onClick={() => setModalAbrirCajaOpen(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Abrir Caja
            </button>
          ) : (
            <button
              onClick={() => setModalCerrarCajaOpen(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Caja
            </button>
          )}
        </div>
      </div>

      {/* ← Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sesión Activa */}
        <div className={`rounded-xl p-4 border ${
          sessionActiva 
            ? 'bg-green-900/30 border-green-700' 
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className="text-sm text-gray-400">Estado de Caja</p>
          <p className={`text-lg font-bold ${sessionActiva ? 'text-green-400' : 'text-gray-500'}`}>
            {sessionActiva ? '🟢 Abierta' : '🔴 Cerrada'}
          </p>
          {sessionActiva && (
            <p className="text-xs text-gray-400 mt-1">
              Turno: {sessionActiva.turno}
            </p>
          )}
        </div>

        {/* Saldo Actual */}
        <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700">
          <p className="text-sm text-blue-300">Saldo Esperado</p>
          <p className="text-lg font-bold text-blue-400">
            {sessionActiva ? formatMoney(sessionActiva.saldo_esperado) : '$0'}
          </p>
        </div>

        {/* Ventas del Turno */}
        <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
          <p className="text-sm text-purple-300">Ventas Hoy</p>
          <p className="text-lg font-bold text-purple-400">
            {sessionActiva ? formatMoney(sessionActiva.total_ventas) : '$0'}
          </p>
        </div>

        {/* Vales Pendientes */}
        <div className="bg-orange-900/30 rounded-xl p-4 border border-orange-700">
          <p className="text-sm text-orange-300">Vales Pendientes</p>
          <p className="text-lg font-bold text-orange-400">
            {valesPendientes.length}
          </p>
        </div>
      </div>

      {/* ← Acciones Rápidas */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">⚡ Acciones Rápidas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          <button
            onClick={() => setModalNuevoReciboOpen(true)}
            disabled={!sessionActiva}
            className="p-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 text-xl">📝</span>
              </div>
              <div>
                <p className="font-medium text-white">Nuevo Recibo</p>
                <p className="text-xs text-gray-400">Venta, entrada o salida</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setModalNuevoValeOpen(true)}
            disabled={!sessionActiva}
            className="p-4 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-400 text-xl">🎫</span>
              </div>
              <div>
                <p className="font-medium text-white">Nuevo Vale</p>
                <p className="text-xs text-gray-400">Anticipo a empleado</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/caja/recibos')}
            className="p-4 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 text-xl">📋</span>
              </div>
              <div>
                <p className="font-medium text-white">Ver Recibos</p>
                <p className="text-xs text-gray-400">Listado completo</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/caja/reportes')}
            className="p-4 bg-gray-900 hover:bg-gray-700 rounded-lg border border-gray-600 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-400 text-xl">📊</span>
              </div>
              <div>
                <p className="font-medium text-white">Reportes</p>
                <p className="text-xs text-gray-400">Estadísticas y export</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ← Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ← Columna Izquierda: Recibos Recientes CON ACORDEÓN ← ← ← */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">📋 Recibos Recientes</h3>
              <button
                onClick={() => router.push('/admin/caja/recibos')}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Ver todos →
              </button>
            </div>
            
            <div className="p-4">
              {recibosRecientes.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  No hay recibos recientes
                </p>
              ) : (
                <div className="space-y-2">
                  {recibosRecientes.map((recibo) => (
                    <div key={recibo.id} className="border border-gray-700 rounded-lg overflow-hidden">
                      
                      {/* ← ← ← CABECERA DEL RECIBO (Siempre visible) ← ← ← */}
                      <div
                        onClick={() => cargarDetalleRecibo(recibo.id)}
                        className={`p-3 ${getReciboColor(recibo.tipo, recibo.estado)} ${
                          recibo.estado === 'borrador' ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'
                        } transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* ← ← ← ICONO DE EXPANSIÓN ← ← ← */}
                            <button 
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white transition-transform"
                              style={{ transform: reciboExpandido === recibo.id ? 'rotate(180deg)' : 'none' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            <div>
                              <p className="font-mono text-sm font-bold">
                                {recibo.codigo_recibo}
                              </p>
                              <p className="text-xs text-gray-400">
                                {recibo.cliente_nombre || 'Sin cliente'} • {formatDate(recibo.fecha)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold">
                              {formatMoney(recibo.total)}
                            </p>
                            <p className="text-xs capitalize">
                              {recibo.tipo} • {recibo.metodo_pago}
                            </p>
                          </div>
                        </div>
                        
                        {recibo.propina_total && parseFloat(recibo.propina_total) > 0 && (
                          <p className="text-xs text-purple-400 mt-1 ml-9">
                            💎 Propina: {formatMoney(recibo.propina_total)}
                          </p>
                        )}
                        
                        
                      </div>
                      
                     {/* ← ← ← DETALLE EXPANDIBLE (ACORDEÓN) ← ← ← */}
                      {reciboExpandido === recibo.id && (
                        <div className="bg-gray-900 border-t border-gray-700">
                          {loadingDetalle && reciboExpandido === recibo.id ? (
                            <div className="p-4 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                              <span className="ml-2 text-sm text-gray-400">Cargando detalle...</span>
                            </div>
                          ) : detalleRecibo?.id === recibo.id ? (
                            <div className="p-4 space-y-3">
                              
                              {/* ← ← ← LISTA DE ITEMS ← ← ← */}
                              {detalleRecibo.items && detalleRecibo.items.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                                    <span>📦</span> Items ({detalleRecibo.items.length})
                                  </p>
                                  <div className="space-y-2">
                                    {detalleRecibo.items.map((item: any) => (
                                      <div 
                                        key={item.id} 
                                        className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          {/* Badge de tipo */}
                                          <span className={getTipoItemBadge(item.tipo_item, item.profesional_nombre)}>
                                            {item.tipo_item === 'servicio' ? '🔧' : '📦'}
                                          </span>
                                          
                                          {/* Descripción */}
                                          <div className="min-w-0">
                                            <p className="text-sm text-white truncate" title={item.descripcion}>
                                              {item.descripcion}
                                            </p>
                                            {item.profesional_nombre && (
                                              <p className="text-xs text-blue-400">
                                                👨 {item.profesional_nombre}
                                              </p>
                                            )}
                                            {/* ← ← ← CÓDIGO DE RESERVA DE LA CITA ← ← ← */}
                                            {item.tipo_item === 'servicio' && item.cita && (
                                              <p className="text-xs text-purple-400 font-mono">
                                                📅 {item.codigo_reserva_cita || `Cita #${item.cita}`}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Cantidad y subtotal */}
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-xs text-gray-400">
                                            {item.cantidad}x {formatMoney(item.precio_unitario)}
                                          </p>
                                          <p className="text-sm font-bold text-green-400">
                                            {formatMoney(item.subtotal)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* ← ← ← TOTAL DESTACADO CON TODA LA INFORMACIÓN ← ← ← */}
                              <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-700/50 space-y-2">
                                {/* Fila 1: Subtotal y Descuento */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">💰 Subtotal:</span>
                                    <span className="text-white font-semibold">{formatMoney(detalleRecibo.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">🏷️ Descuento:</span>
                                    <span className="text-orange-400 font-semibold">
                                      {parseFloat(detalleRecibo.descuento) > 0 
                                        ? `-${formatMoney(detalleRecibo.descuento)}` 
                                        : '$ 0'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Fila 2: Propina y Método de Pago */}
                                <div className="grid grid-cols-2 gap-4 text-sm">                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">💳 Método:</span>
                                    <span className="text-blue-400 font-semibold capitalize">
                                      {detalleRecibo.metodo_pago || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">💎 Propina:</span>
                                    <span className="text-purple-400 font-semibold">
                                      {parseFloat(detalleRecibo.propina_total) > 0 
                                        ? `+${formatMoney(detalleRecibo.propina_total)}` 
                                        : '$ 0'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Fila 3: TOTAL (grande y destacado) */}
                                <div className="border-t border-gray-700 pt-3 mt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-gray-300">TOTAL:</span>
                                    <span className="text-2xl font-bold text-green-400">
                                      {formatMoney(detalleRecibo.total)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* ← ← ← ACCIONES PARA BORRADOR ← ← ← */}
                              {detalleRecibo.estado === 'borrador' && (
                                <div className="mt-4 pt-3 border-t border-gray-700 flex gap-2">
                                  <button
                                    onClick={() => {
                                      setReciboEditarId(detalleRecibo.id);
                                      setModalEditarReciboOpen(true);
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    ✏️ Editar Recibo
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePublicarRecibo(detalleRecibo.id);
                                    }}
                                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    📤 Publicar
                                  </button>
                                </div>
                              )}
                              
                              {/* ← ← ← ACCIONES PARA PUBLICADO ← ← ← */}
                              {detalleRecibo.estado === 'publicado' && (
                                <div className="mt-4 pt-3 border-t border-gray-700">
                                  <p className="text-center text-sm text-green-400 font-medium">
                                    ✅ Recibo publicado - No se pueden editar items
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-400 text-sm">
                              Error cargando detalle
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ← Columna Derecha: Vales y Session Info */}
        <div className="space-y-6">
          
          {/* Session Info */}
          {sessionActiva && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold text-white mb-4">📊 Resumen del Turno</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Apertura:</span>
                  <span className="text-white">{formatDate(sessionActiva.hora_apertura)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Saldo Inicial:</span>
                  <span className="text-white">{formatMoney(sessionActiva.saldo_inicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entradas:</span>
                  <span className="text-green-400">+{formatMoney(sessionActiva.total_entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Salidas:</span>
                  <span className="text-orange-400">-{formatMoney(sessionActiva.total_salidas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ventas:</span>
                  <span className="text-blue-400">+{formatMoney(sessionActiva.total_ventas)}</span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">Saldo Esperado:</span>
                    <span className="text-blue-400">{formatMoney(sessionActiva.saldo_esperado)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vales Pendientes */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">🎫 Vales Pendientes</h3>
            </div>
            <div className="p-4">
              {valesPendientes.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">
                  No hay vales pendientes
                </p>
              ) : (
                <div className="space-y-3">
                  {valesPendientes.map((vale) => (
                    <div key={vale.id} className="p-3 bg-gray-900 rounded-lg border border-orange-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-orange-400">
                          {vale.codigo_vale}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(vale.fecha).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      <p className="font-medium text-white text-sm">
                        {vale.profesional_nombre}
                      </p>
                      <p className="text-lg font-bold text-orange-400">
                        {formatMoney(vale.monto)}
                      </p>
                      {!vale.notificacion_whatsapp_enviada && (
                        <button
                          onClick={() => {
                            // Aquí iría la lógica para enviar WhatsApp
                            alert('📱 Notificación WhatsApp enviada');
                          }}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          📱 Enviar recordatorio
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* ← ← ← MODAL: Abrir Caja ← ← ← */}
      {modalAbrirCajaOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🔓 Abrir Nueva Caja</h3>
              <p className="text-sm text-gray-400 mt-1">
                Registra el inicio de tu turno
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📅 Fecha
                </label>
                <input
                  type="date"
                  value={formDataAbrir.fecha}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  🔄 Turno
                </label>
                <select
                  value={formDataAbrir.turno}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, turno: e.target.value as any }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="manana">Mañana (6am - 2pm)</option>
                  <option value="tarde">Tarde (2pm - 10pm)</option>
                  <option value="noche">Noche (10pm - 6am)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  💰 Saldo Inicial *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDataAbrir.saldo_inicial}
                    onChange={(e) => setFormDataAbrir(prev => ({ ...prev, saldo_inicial: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dinero en caja al iniciar el turno
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📝 Observaciones
                </label>
                <textarea
                  value={formDataAbrir.observaciones_apertura}
                  onChange={(e) => setFormDataAbrir(prev => ({ ...prev, observaciones_apertura: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalAbrirCajaOpen(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirCaja}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Cerrar Caja ← ← ← */}
      {modalCerrarCajaOpen && sessionActiva && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🔒 Cerrar Caja</h3>
              <p className="text-sm text-gray-400 mt-1">
                Turno: {sessionActiva.turno} • {formatDate(sessionActiva.hora_apertura)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Resumen */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Saldo Inicial:</span>
                  <span>{formatMoney(sessionActiva.saldo_inicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">+ Entradas:</span>
                  <span className="text-green-400">{formatMoney(sessionActiva.total_entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">+ Ventas:</span>
                  <span className="text-blue-400">{formatMoney(sessionActiva.total_ventas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">- Salidas:</span>
                  <span className="text-orange-400">-{formatMoney(sessionActiva.total_salidas)}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-300">Saldo Esperado:</span>
                    <span className="text-blue-400">{formatMoney(sessionActiva.saldo_esperado)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  💰 Saldo Final Real *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formDataCerrar.saldo_final}
                    onChange={(e) => setFormDataCerrar(prev => ({ ...prev, saldo_final: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dinero que contaste físicamente
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  📝 Observaciones de Cierre
                </label>
                <textarea
                  value={formDataCerrar.observaciones_cierre}
                  onChange={(e) => setFormDataCerrar(prev => ({ ...prev, observaciones_cierre: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none resize-none"
                  placeholder="Notas del cierre..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setModalCerrarCajaOpen(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Cerrar Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Editar Recibo Borrador ← ← ← */}
      {modalEditarReciboOpen && reciboEditarId && (
        <CajaReciboModal
          isOpen={modalEditarReciboOpen}
          onClose={() => {
            setModalEditarReciboOpen(false);
            setReciboEditarId(null);
          }}
          sessionCajaId={sessionActiva?.id}
          reciboParaEditarId={reciboEditarId}  // ← ← ← PARA EDICIÓN: ID del recibo
          apiUrl={apiUrl}
          token={token}
          onReciboActualizado={(recibo) => {
            // Recargar datos después de editar
            cargarDatosCaja();
            setModalEditarReciboOpen(false);
            setReciboEditarId(null);
          }}
        />
      )}

      {modalNuevoValeOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🎫 Nuevo Vale</h3>
            </div>
            <div className="p-6 text-center text-gray-400">
              <p>🚧 En desarrollo: Modal de vale a empleado</p>
              <p className="text-sm mt-2">Próximamente: Seleccionar profesional y monto</p>
            </div>
            <div className="p-6 border-t border-gray-700 text-right">
              <button
                onClick={() => setModalNuevoValeOpen(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Nuevo Recibo Compuesto ← ← ← CORREGIDO ← ← ← */}
      {modalNuevoReciboOpen && sessionActiva && (
        <CajaReciboModal
          isOpen={modalNuevoReciboOpen}  // ← ← ← CORREGIDO: Usar modalNuevoReciboOpen
          onClose={() => {
            setModalNuevoReciboOpen(false);  // ← ← ← CORREGIDO: Cerrar modalNuevoReciboOpen
            // NO tocar reciboEditarId aquí
          }}
          sessionCajaId={sessionActiva?.id}
          reciboParaEditarId={null}  // ← ← ← CORREGIDO: null para recibo NUEVO
          apiUrl={apiUrl}
          token={token}
          onReciboCreado={(recibo) => {  // ← ← ← CORREGIDO: Usar onReciboCreado
            // Recargar datos después de crear
            cargarDatosCaja();
            setModalNuevoReciboOpen(false);  // ← ← ← CORREGIDO: Cerrar modalNuevoReciboOpen
          }}
        />
      )}
    </div>
  );
}