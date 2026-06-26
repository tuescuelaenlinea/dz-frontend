'use client';

import { useState, useEffect, useCallback } from 'react';
import ProfesionalReciboModal from '@/components/admin/ProfesionalReciboModal';

// ← ← ← INTERFACES ← ← ←
interface CajaSession {
  id: number;
  usuario: number;
  usuario_username: string;
  fecha: string;
  turno: 'manana' | 'tarde' | 'noche';
  hora_apertura: string;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  saldo_inicial: string;
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
  session_caja: number;
  session_caja_turno: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  fecha: string;
  notas?: string;
  items?: Array<{
    id: number;
    tipo_item: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: string;
    subtotal: string;
    profesional?: number | null;
    profesional_nombre?: string | null;
    cita?: number | null;
    producto?: number | null;
  }>;
}

// ← ← ← NUEVA INTERFAZ: ValeEmpleado ← ← ←
interface ValeEmpleado {
  id: number;
  codigo_vale: string;
  profesional: number;
  profesional_nombre: string;
  monto: string;
  fecha: string;
  estado: 'registrado' | 'pagado' | 'cancelado';
  notificacion_whatsapp_enviada: boolean;
  metodo_pago?: string;
  metodo_pago_display?: string;
  session_caja?: number | null;
  notas?: string;
}

// ← ← ← NUEVA INTERFAZ: Profesional (para select de vales) ← ← ←
interface Profesional {
  id: number;
  nombre: string;
  telefono_whatsapp?: string;
  activo: boolean;
}

// ← ← ← HELPERS ← ← ←
const formatMoney = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num || 0);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota'
  });
};

// ← ← ← CONSTANTE: Opciones de método de pago para vales ← ← ←
const METODOS_PAGO_VALE = [
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'nequi', label: '📱 Nequi' },
  { value: 'daviplata', label: '📱 Daviplata' },
  { value: 'bold', label: '💳 Bold' },
  { value: 'tarjeta', label: '💳 Tarjeta en sitio' },
  { value: 'caja_menor', label: '📦 Caja menor' },
] as const;

export default function ProfesionalCajaPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Estados principales
  const [sessionActiva, setSessionActiva] = useState<CajaSession | null>(null);
  const [recibos, setRecibos] = useState<ReciboCaja[]>([]);
  const [loading, setLoading] = useState(true);

  // ← Modales de recibos
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [reciboEditarId, setReciboEditarId] = useState<number | null>(null);

  // ← Acordeón de detalle
  const [reciboExpandido, setReciboExpandido] = useState<number | null>(null);
  const [detalleRecibo, setDetalleRecibo] = useState<ReciboCaja | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ← Toggle para mostrar/ocultar valores
  const [valoresDesbloqueados, setValoresDesbloqueados] = useState(false);

  // ← ← ← NUEVOS ESTADOS PARA VALES ← ← ←
  const [valesPendientes, setValesPendientes] = useState<ValeEmpleado[]>([]);
  const [valesSesion, setValesSesion] = useState<ValeEmpleado[]>([]);
  const [loadingVales, setLoadingVales] = useState(false);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [valeExpandido, setValeExpandido] = useState<number | null>(null);

  // ← Estados para modal de crear vale
  const [modalNuevoValeOpen, setModalNuevoValeOpen] = useState(false);
  const [nuevoVale, setNuevoVale] = useState({
    profesional: '',
    monto: '',
    session_caja: '',
    metodo_pago: 'bold',
    notas: '',
    notificar_whatsapp: false
  });
  const [validacionSaldo, setValidacionSaldo] = useState<{
    disponible: number | null;
    limite: number | null;
    excedido: boolean;
  } | null>(null);
  const [loadingVale, setLoadingVale] = useState(false);

  // ← Cargar sesión activa y recibos
const cargarDatos = useCallback(async () => {
  setLoading(true);
  try {
    // 1. Obtener sesión activa global
    const resSession = await fetch(`${apiUrl}/caja/sesiones/activa-global/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    let sessionData: any = null;
    
    if (resSession.ok) {
      sessionData = await resSession.json();
      console.log('✅ [ProfesionalCajaPage] Sesión activa global encontrada:', {
        id: sessionData.id,
        usuario: sessionData.usuario_username,
        turno: sessionData.turno,
        fecha: sessionData.fecha
      });
      setSessionActiva(sessionData);
    } else if (resSession.status === 404) {
      console.log('ℹ️ [ProfesionalCajaPage] No hay sesión de caja activa en el sistema');
      setSessionActiva(null);
    }
    
    // ← ← ← CLAVE: Cargar recibos DESPUÉS de obtener la sesión (fuera del if/else) ← ← ←
    if (sessionData) {
      console.log(`📦 [ProfesionalCajaPage] Cargando recibos para sesión ID: ${sessionData.id}`);
      
      const resRecibos = await fetch(
        `${apiUrl}/caja/recibos/para-sesion-activa/?session_id=${sessionData.id}&estado=borrador,publicado&ordering=-fecha&limit=50`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      
      if (resRecibos.ok) {
        const data = await resRecibos.json();
        const todos = Array.isArray(data) ? data : (data.results || []);
        console.log(`✅ [ProfesionalCajaPage] ${todos.length} recibos cargados`);
        setRecibos(todos);
      } else {
        console.error('❌ Error cargando recibos:', resRecibos.status);
        setRecibos([]);
      }
    } else {
      // Si no hay sesión activa, cargar solo borradores sin sesión
      console.log('📦 [ProfesionalCajaPage] Sin sesión activa, cargando solo borradores');
      const resRecibos = await fetch(
        `${apiUrl}/caja/recibos/?estado=borrador&ordering=-fecha&limit=50`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      
      if (resRecibos.ok) {
        const data = await resRecibos.json();
        const todos = Array.isArray(data) ? data : (data.results || []);
        setRecibos(todos);
      } else {
        setRecibos([]);
      }
    }
  } catch (err) {
    console.error('❌ Error cargando datos:', err);
    setRecibos([]);
  } finally {
    setLoading(false);
  }
}, [apiUrl, token]);

  useEffect(() => {
    cargarDatos();
    cargarVales();
    cargarProfesionalesParaVales();
  }, [cargarDatos]);

  
    // ← Escuchar eventos
  useEffect(() => {
    const handleReciboCreado = () => { 
      console.log('🔄 [ProfesionalCajaPage] Evento reciboCreado recibido, recargando...');
      cargarDatos(); 
      cargarVales(); 
    };
    const handleReciboActualizado = () => { 
      console.log('🔄 [ProfesionalCajaPage] Evento cajaReciboActualizado recibido, recargando...');
      cargarDatos(); 
      cargarVales(); 
    };
    // ← ← ← NUEVO: Escuchar cuando se abre/cierra sesión de caja
    const handleSesionCambiada = () => {
      console.log('🔄 [ProfesionalCajaPage] Evento sesionCambiada recibido, recargando...');
      cargarDatos();
    };
    
    window.addEventListener('reciboCreado', handleReciboCreado as EventListener);
    window.addEventListener('cajaReciboActualizado', handleReciboActualizado as EventListener);
    window.addEventListener('sesionCambiada', handleSesionCambiada as EventListener);
    
    return () => {
      window.removeEventListener('reciboCreado', handleReciboCreado as EventListener);
      window.removeEventListener('cajaReciboActualizado', handleReciboActualizado as EventListener);
      window.removeEventListener('sesionCambiada', handleSesionCambiada as EventListener);
    };
  }, [cargarDatos]);

  // ← Escuchar evento para abrir recibo borrador
  useEffect(() => {
    const handleAbrirReciboBorrador = (event: CustomEvent) => {
      const { reciboId } = event.detail;
      console.log('📦 [ProfesionalCajaPage] Abriendo recibo borrador:', reciboId);
      setReciboEditarId(reciboId);
      setModalEditarOpen(true);
    };

    window.addEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
    return () => {
      window.removeEventListener('abrirReciboBorrador', handleAbrirReciboBorrador as EventListener);
    };
  }, []);

  // ← Cargar detalle de un recibo
  const cargarDetalleRecibo = async (reciboId: number) => {
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
      if (res.ok) {
        const data = await res.json();
        setDetalleRecibo(data);
        setReciboExpandido(reciboId);
      }
    } catch (err) {
      console.error('❌ Error cargando detalle:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ← ← ← NUEVAS FUNCIONES PARA VALES ← ← ←
  
  // ← Cargar vales (sesión + pendientes)
  // ← ← ← FUNCIÓN: Cargar vales (SOLO del profesional logueado) ← ← ←
const cargarVales = async () => {
  setLoadingVales(true);
  try {
    const sessionId = sessionActiva?.id;
    console.log('🎫 [cargarVales] sessionId:', sessionId);

    // ← ← ← CLAVE: Obtener el ID del profesional logueado ← ← ←
    let profesionalId: number | null = null;
    
    try {
      const resProf = await fetch(`${apiUrl}/profesional-user/mis-profesionales/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (resProf.ok) {
        const dataProf = await resProf.json();
        if (dataProf.profesionales && dataProf.profesionales.length > 0) {
          profesionalId = dataProf.profesionales[0].profesional_id;
          console.log(`✅ [cargarVales] Profesional logueado ID: ${profesionalId}`);
        }
      }
    } catch (err) {
      console.warn('⚠️ No se pudo obtener el profesional logueado:', err);
    }

    // Si no hay profesional logueado, no cargar vales
    if (!profesionalId) {
      console.warn('⚠️ No hay profesional logueado, mostrando solo vales sin filtro');
      setValesSesion([]);
      setValesPendientes([]);
      setLoadingVales(false);
      return;
    }

    // ← ← ← CARGAR VALES DE LA SESIÓN (SOLO del profesional logueado) ← ← ←
    if (sessionId) {
      const urlSesion = `${apiUrl}/caja/vales/?session_caja=${sessionId}&profesional=${profesionalId}&ordering=-fecha&limit=50`;
      console.log('📡 Fetch vales de sesión:', urlSesion);
      const resSesion = await fetch(urlSesion, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (resSesion.ok) {
        const data = await resSesion.json();
        setValesSesion(Array.isArray(data) ? data : (data.results || []));
      } else {
        setValesSesion([]);
      }
    } else {
      setValesSesion([]);
    }

    // ← ← ← CARGAR VALES PENDIENTES GLOBALES (SOLO del profesional logueado) ← ← ←
    const urlPendientes = `${apiUrl}/caja/vales/?estado=registrado&profesional=${profesionalId}&ordering=-fecha&limit=100`;
    console.log('📡 Fetch vales pendientes globales:', urlPendientes);
    const resPendientes = await fetch(urlPendientes, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (resPendientes.ok) {
      const data = await resPendientes.json();
      const todosPendientes = Array.isArray(data) ? data : (data.results || []);
      // Filtrar solo los que NO están ya en valesSesion para evitar duplicados visuales
      const idsEnSesion = new Set(valesSesion.map(v => v.id));
      const pendientesFiltrados = todosPendientes.filter((v: ValeEmpleado) => !idsEnSesion.has(v.id));
      setValesPendientes(pendientesFiltrados);
      console.log(`✅ Vales pendientes cargados: ${pendientesFiltrados.length} (total API: ${todosPendientes.length})`);
    } else {
      console.error('❌ Error cargando vales pendientes:', resPendientes.status);
      setValesPendientes([]);
    }
  } catch (err) {
    console.error('❌ Error cargando vales:', err);
    setValesSesion([]);
    setValesPendientes([]);
  } finally {
    setLoadingVales(false);
  }
};

  // ← Cargar profesionales para select de vales
  const cargarProfesionalesParaVales = async () => {
    try {
      const res = await fetch(`${apiUrl}/profesionales/?activo=true&ordering=nombre`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setProfesionales(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando profesionales para vales:', err);
    }
  };

  // ← Validar saldo del profesional
  const validarSaldoProfesional = async (profesionalId: string, montoIntento: number) => {
    if (!profesionalId || !montoIntento) {
      setValidacionSaldo(null);
      return { valido: true, disponible: null, limite: null, excedido: false };
    }
    try {
      const res = await fetch(`${apiUrl}/caja/vales/?profesional=${profesionalId}&limit=1`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const primerVale = Array.isArray(data) ? data[0] : (data.results?.[0]);
        if (primerVale?.saldo_disponible_vales !== undefined) {
          const disponible = primerVale.saldo_disponible_vales;
          const limite = primerVale.saldo_ganado_mes * 0.50;
          const excedido = disponible !== null && montoIntento > disponible;
          setValidacionSaldo({ disponible, limite, excedido });
          return { valido: !excedido, disponible, limite, excedido };
        }
      }
      return { valido: true, disponible: null, limite: null, excedido: false };
    } catch (err) {
      return { valido: true, disponible: null, limite: null, excedido: false };
    }
  };

  // ← Validar saldo al cambiar profesional o monto
  useEffect(() => {
    if (!nuevoVale.profesional || !nuevoVale.monto) {
      setValidacionSaldo(null);
      return;
    }
    const montoNum = parseFloat(nuevoVale.monto);
    if (isNaN(montoNum) || montoNum <= 0) return;
    const timer = setTimeout(() => {
      validarSaldoProfesional(nuevoVale.profesional, montoNum);
    }, 500);
    return () => clearTimeout(timer);
  }, [nuevoVale.profesional, nuevoVale.monto]);

  // ← Crear nuevo vale
  const handleCrearVale = async () => {
    if (!nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja) {
      alert('⚠️ Completa todos los campos obligatorios');
      return;
    }
    const montoNum = parseFloat(nuevoVale.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('⚠️ Ingresa un monto válido mayor a 0');
      return;
    }
    const validacion = await validarSaldoProfesional(nuevoVale.profesional, montoNum);
    if (!validacion) {
      alert('⚠️ No se pudo validar el saldo. Intenta nuevamente.');
      return;
    }
    if (validacion.excedido) {
      alert(`⚠️ El monto excede el saldo disponible ($${validacion.disponible?.toLocaleString('es-CO') || 'N/A'})`);
      return;
    }
    setLoadingVale(true);
    try {
      const payload = {
        profesional: parseInt(nuevoVale.profesional),
        monto: montoNum,
        session_caja: parseInt(nuevoVale.session_caja),
        metodo_pago: nuevoVale.metodo_pago,
        notas: nuevoVale.notas || '',
        notificacion_whatsapp_enviada: nuevoVale.notificar_whatsapp
      };
      const res = await fetch(`${apiUrl}/caja/vales/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.monto?.[0] || error.detail || 'Error creando vale');
      }
      const valeCreado = await res.json();
      if (nuevoVale.notificar_whatsapp) {
        try {
          await fetch(`${apiUrl}/caja/vales/${valeCreado.id}/notificar/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
        } catch (err) {
          console.warn('⚠️ No se pudo enviar notificación WhatsApp');
        }
      }
      alert(`✅ Vale ${valeCreado.codigo_vale} creado exitosamente`);
      setModalNuevoValeOpen(false);
      setNuevoVale({
        profesional: '',
        monto: '',
        session_caja: sessionActiva?.id?.toString() || '',
        metodo_pago: 'bold',
        notas: '',
        notificar_whatsapp: false
      });
      setValidacionSaldo(null);
      cargarVales();
      cargarDatos();
    } catch (err: any) {
      console.error('❌ Error creando vale:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoadingVale(false);
    }
  };

  // ← Cancelar vale
  const handleCancelarVale = async (vale: ValeEmpleado) => {
    if (!confirm(`¿Estás seguro de cancelar el vale ${vale.codigo_vale}?\nEsta acción no se puede deshacer.`)) return;
    const motivo = prompt('Motivo de cancelación (opcional):') || '';
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/cancelar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ motivo })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || 'Error cancelando vale');
      }
      alert(`✅ Vale ${vale.codigo_vale} cancelado`);
      cargarVales();
    } catch (err: any) {
      console.error('❌ Error cancelando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Marcar vale como pagado
  const handlePagarVale = async (vale: ValeEmpleado) => {
    if (!confirm(`¿Marcar vale ${vale.codigo_vale} como pagado?\nEsto registrará el descuento en nómina.`)) return;
    const metodoPago = prompt('Método de pago (nomina/efectivo/transferencia):', 'nomina') || 'nomina';
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/pagar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ metodo_pago: metodoPago })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.detail || 'Error pagando vale');
      }
      alert(`✅ Vale ${vale.codigo_vale} marcado como pagado`);
      cargarVales();
      cargarDatos();
    } catch (err: any) {
      console.error('❌ Error pagando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Enviar notificación WhatsApp
  const handleNotificarVale = async (vale: ValeEmpleado) => {
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/notificar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        alert('📱 Notificación WhatsApp enviada');
        cargarVales();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error enviando notificación');
      }
    } catch (err: any) {
      console.error('❌ Error notificando:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando caja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ← Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            🏦 Ventas de la Sesión
          </h1>
          <p className="text-gray-400 mt-1">
            Recibos y vales de la sesión activa actual
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge de sesión activa */}
          {sessionActiva && (
            <span className="px-3 py-1 text-xs rounded-full border bg-green-500/20 text-green-400 border-green-500/50 flex items-center gap-1.5 font-mono">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              SESIÓN ACTIVA
              <span className="text-gray-400">•</span>
              <span>Turno {sessionActiva.turno}</span>
            </span>
          )}

          {/* Botón desbloquear valores 
          <button
            onClick={() => setValoresDesbloqueados(!valoresDesbloqueados)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border ${
              valoresDesbloqueados
                ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400 hover:bg-yellow-600/30'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
            }`}
            title={valoresDesbloqueados ? 'Ocultar valores financieros' : 'Mostrar valores financieros'}
          >
            {valoresDesbloqueados ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Valores visibles
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Mostrar valores
              </>
            )}
          </button>*/}

          {/* Botón actualizar */}
          <button
            onClick={() => { cargarDatos(); cargarVales(); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* ← Alerta sin sesión activa */}
      {!sessionActiva && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-bold text-red-400 mb-2">
            No hay sesión de caja activa
          </h3>
          <p className="text-gray-400 mb-4">
            No se encontró ninguna sesión de caja abierta en el sistema.
          </p>
          <button
            onClick={() => cargarDatos()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            🔄 Reintentar
          </button>
        </div>
      )}

      {/* ← ← ← GRID PRINCIPAL: 2 COLUMNAS ← ← ← */}
      {sessionActiva && (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* ← ← ← COLUMNA IZQUIERDA: RECIBOS (60%) ← ← ← */}
          <div className="lg:col-span-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  🛍️ Recibos de Venta
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    {recibos.length}
                  </span>
                </h3>
              </div>

              <div className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto space-y-2">
                {recibos.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-gray-400">
                      No hay recibos de venta en esta sesión
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Ve al tab "Nueva Venta" para crear un recibo
                    </p>
                  </div>
                ) : (
                  recibos.map((recibo) => {
                    const isExpanded = reciboExpandido === recibo.id;
                    const isLoading = loadingDetalle && isExpanded;

                    return (
                      <div key={recibo.id} className="border border-gray-700 rounded-lg overflow-hidden">
                        {/* Cabecera (Click para expandir) */}
                        <div
                          onClick={() => cargarDetalleRecibo(recibo.id)}
                          className={`p-3 cursor-pointer transition-all ${
                            recibo.estado === 'borrador'
                              ? 'bg-yellow-500/10 hover:bg-yellow-500/20'
                              : 'bg-blue-500/10 hover:bg-blue-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <svg
                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>

                              <div>
                                <p className="font-mono text-sm font-bold text-white">
                                  {recibo.codigo_recibo}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {recibo.cliente_nombre || 'Sin cliente'} • {formatDate(recibo.fecha)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              {/* Total (oculto por defecto) 
                              {valoresDesbloqueados ? (
                                <p className="font-bold text-green-400">
                                  {formatMoney(recibo.total)}
                                </p>
                              ) : (
                                <p className="font-bold text-gray-500">
                                  $ ••••••
                                </p>
                              )}*/}

                              {/* Badge de estado */}
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                recibo.estado === 'borrador'
                                  ? 'bg-yellow-900/50 text-yellow-400'
                                  : recibo.estado === 'publicado'
                                  ? 'bg-green-900/50 text-green-400'
                                  : 'bg-red-900/50 text-red-400'
                              }`}>
                                {recibo.estado === 'borrador' ? '⏳ Borrador' :
                                 recibo.estado === 'publicado' ? '✅ Publicado' : '❌ Anulado'}
                              </span>

                              {/* Botón editar */}
                              {recibo.estado === 'borrador' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReciboEditarId(recibo.id);
                                    setModalEditarOpen(true);
                                  }}
                                  className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded transition-colors"
                                  title="Editar recibo"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Detalle expandible */}
                        {isExpanded && (
                          <div className="bg-gray-900 border-t border-gray-700">
                            {isLoading ? (
                              <div className="p-4 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-sm text-gray-400">Cargando detalle...</span>
                              </div>
                            ) : detalleRecibo ? (
                              <div className="p-4 space-y-3">
                                {/* Items */}
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
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                              item.tipo_item === 'servicio'
                                                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                                                : 'bg-purple-900/50 text-purple-300 border border-purple-700'
                                            }`}>
                                              {item.tipo_item === 'servicio' ? '🔧' : '📦'}
                                            </span>
                                            <div className="min-w-0">
                                              <p className="text-sm text-white truncate" title={item.descripcion}>
                                                {item.descripcion}
                                              </p>
                                              {item.profesional_nombre && (
                                                <p className="text-xs text-blue-400">
                                                  👨 {item.profesional_nombre}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400">
                                              {item.cantidad}x{' '}
                                              {/*{valoresDesbloqueados
                                                ? formatMoney(item.precio_unitario)
                                                : '$•••'}*/}
                                            </p>
                                            {/*<p className="text-sm font-bold text-green-400">
                                              {valoresDesbloqueados
                                                ? formatMoney(item.subtotal)
                                                : '$••••'}
                                            </p>*/}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Totales (ocultos por defecto) 
                                {valoresDesbloqueados && (*/}
                                  <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border border-green-700/50 space-y-2">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div className="flex justify-between">
                                        {/*<span className="text-gray-400">💰 Subtotal:</span>
                                        <span className="text-white font-semibold">
                                          {formatMoney(detalleRecibo.subtotal)}
                                        </span>*/}
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">🏷️ Descuento:</span>
                                        <span className="text-orange-400 font-semibold">
                                          -{formatMoney(detalleRecibo.descuento)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div className="flex justify-between">
                                      {/*  <span className="text-gray-400">💳 Método:</span>
                                        <span className="text-blue-400 font-semibold capitalize">
                                          {detalleRecibo.metodo_pago || 'N/A'}
                                        </span>*/}
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">💎 Propina:</span>
                                        <span className="text-purple-400 font-semibold">
                                          +{formatMoney(detalleRecibo.propina_total)}
                                        </span>
                                      </div>
                                    </div>
                                    {/*<div className="border-t border-gray-700 pt-3 mt-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-gray-300">TOTAL:</span>
                                        <span className="text-2xl font-bold text-green-400">
                                          {formatMoney(detalleRecibo.total)}
                                        </span>
                                      </div>
                                    </div>*/}
                                  </div>
                                {/*)}*/}

                                {/* Mensaje si los valores están ocultos 
                                {!valoresDesbloqueados && (
                                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-sm">
                                      🔒 Los valores financieros están ocultos.
                                    </p>
                                    <button
                                      onClick={() => setValoresDesbloqueados(true)}
                                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                                    >
                                      Haz clic aquí para mostrarlos
                                    </button>
                                  </div>
                                )}*/}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-sm">
                                Error cargando detalle
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ← ← ← COLUMNA DERECHA: VALES (40%) ← ← ← */}
          <div className="lg:col-span-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  🎫 Vales
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                    {valesSesion.length + valesPendientes.length}
                  </span>
                </h3>
                <button
                  onClick={() => {
                    setNuevoVale(prev => ({
                      ...prev,
                      session_caja: sessionActiva?.id?.toString() || ''
                    }));
                    setModalNuevoValeOpen(true);
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo
                </button>
              </div>

              <div className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                {loadingVales ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                    <span className="ml-2 text-sm text-gray-400">Cargando vales...</span>
                  </div>
                ) : (valesSesion.length === 0 && valesPendientes.length === 0) ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎫</div>
                    <p className="text-gray-400 text-sm">
                      No hay vales registrados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* ← ← ← SECCIÓN: VALES DE LA SESIÓN ACTUAL ← ← ← */}
                    {valesSesion.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                          De esta sesión ({valesSesion.length})
                        </h4>
                        <div className="space-y-2">
                          {valesSesion.map((vale) => {
                            const isExpanded = valeExpandido === vale.id;
                            return (
                              <div key={vale.id} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
                                {/* Encabezado del Acordeón */}
                                <div
                                  onClick={() => setValeExpandido(isExpanded ? null : vale.id)}
                                  className="p-3 cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span className="font-medium text-white text-sm truncate">
                                      {vale.profesional_nombre}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-cyan-400">
                                    {formatMoney(vale.monto)}
                                  </span>
                                </div>

                                {/* Contenido Expandido */}
                                {isExpanded && (
                                  <div className="p-3 bg-gray-800/50 border-t border-gray-700 space-y-3">
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Código:</span>
                                        <span className="text-white font-mono">{vale.codigo_vale}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Método:</span>
                                        <span className="text-white">{vale.metodo_pago_display || vale.metodo_pago}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Fecha:</span>
                                        <span className="text-white">
                                          {new Date(vale.fecha).toLocaleDateString('es-CO', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-start">
                                        <span className="text-gray-400">Estado:</span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          vale.estado === 'registrado'
                                            ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                                            : vale.estado === 'pagado'
                                            ? 'bg-green-900/50 text-green-400 border border-green-700'
                                            : 'bg-red-900/50 text-red-400 border border-red-700'
                                        }`}>
                                          {vale.estado === 'registrado' ? 'Registrado' :
                                           vale.estado === 'pagado' ? '✅ Pagado' : '❌ Cancelado'}
                                        </span>
                                      </div>
                                      {vale.notas && (
                                        <div className="pt-2 border-t border-gray-700">
                                          <span className="text-gray-400 block mb-1">Notas:</span>
                                          <span className="text-gray-300 text-xs">{vale.notas}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Botones de acción */}
                                    {vale.estado === 'registrado' && (
                                      <div className="flex gap-2 pt-2 border-t border-gray-700">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handlePagarVale(vale); }}
                                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                        >
                                          💰 Pagar
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleCancelarVale(vale); }}
                                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                        >
                                          ❌ Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ← ← ← SECCIÓN: VALES PENDIENTES GLOBALES ← ← ← */}
                    {valesPendientes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                          Pendientes globales ({valesPendientes.length})
                        </h4>
                        <div className="space-y-2">
                          {valesPendientes.map((vale) => {
                            const isExpanded = valeExpandido === vale.id;
                            return (
                              <div key={vale.id} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
                                <div
                                  onClick={() => setValeExpandido(isExpanded ? null : vale.id)}
                                  className="p-3 cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span className="font-medium text-white text-sm truncate">
                                      {vale.profesional_nombre}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-yellow-400">
                                    {formatMoney(vale.monto)}
                                  </span>
                                </div>

                                {isExpanded && (
                                  <div className="p-3 bg-gray-800/50 border-t border-gray-700 space-y-3">
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Código:</span>
                                        <span className="text-white font-mono">{vale.codigo_vale}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Sesión:</span>
                                        <span className="text-yellow-300">
                                          #{vale.session_caja || 'Sin sesión'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Método:</span>
                                        <span className="text-white">{vale.metodo_pago_display || vale.metodo_pago}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Fecha:</span>
                                        <span className="text-white">
                                          {new Date(vale.fecha).toLocaleDateString('es-CO', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-start">
                                        <span className="text-gray-400">Estado:</span>
                                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700">
                                          Registrado
                                        </span>
                                      </div>
                                      {vale.notas && (
                                        <div className="pt-2 border-t border-gray-700">
                                          <span className="text-gray-400 block mb-1">Notas:</span>
                                          <span className="text-gray-300 text-xs">{vale.notas}</span>
                                        </div>
                                      )}
                                    </div>

                                    {vale.estado === 'registrado' && (
                                      <div className="flex gap-2 pt-2 border-t border-gray-700">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handlePagarVale(vale); }}
                                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                        >
                                          💰 Pagar
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleCancelarVale(vale); }}
                                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                        >
                                          ❌ Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← MODAL: Editar Recibo (AHORA USA ProfesionalReciboModal) ← ← ← */}
      {modalEditarOpen && reciboEditarId && sessionActiva && (
        <ProfesionalReciboModal
          isOpen={modalEditarOpen}
          onClose={() => {
            setModalEditarOpen(false);
            setReciboEditarId(null);
            cargarDatos();
          }}
          sessionCajaId={sessionActiva.id}
          reciboParaEditarId={reciboEditarId}
          apiUrl={apiUrl}
          token={token}
          onReciboActualizado={() => {
            cargarDatos();
            setModalEditarOpen(false);
            setReciboEditarId(null);
          }}
        />
      )}

      {/* ← ← ← MODAL: CREAR/EDITAR VALE ← ← ← */}
      {modalNuevoValeOpen && sessionActiva && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🎫 Nuevo Vale</h3>
              <p className="text-sm text-gray-400 mt-1">
                Anticipo a empleado
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Profesional */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  👤 Profesional *
                </label>
                <select
                  value={nuevoVale.profesional}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, profesional: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Seleccionar profesional...</option>
                  {profesionales.filter(p => p.activo).map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  💰 Monto *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={nuevoVale.monto}
                    onChange={(e) => setNuevoVale(prev => ({ ...prev, monto: e.target.value }))}
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                {/* Validación de saldo */}
                {validacionSaldo && (
                  <div className={`mt-2 text-xs p-2 rounded ${
                    validacionSaldo.excedido
                      ? 'bg-red-900/30 text-red-400 border border-red-700'
                      : 'bg-green-900/30 text-green-400 border border-green-700'
                  }`}>
                    <p>💡 Límite: 50% del saldo ganado del mes</p>
                    <p>
                      Disponible: {
                        validacionSaldo.disponible !== null
                          ? formatMoney(validacionSaldo.disponible)
                          : 'Calculando...'
                      }
                    </p>
                    {validacionSaldo.excedido && (
                      <p className="font-semibold mt-1">⚠️ Monto excede el límite</p>
                    )}
                  </div>
                )}
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  💳 Método de Pago *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {METODOS_PAGO_VALE.map((metodo) => (
                    <button
                      key={metodo.value}
                      type="button"
                      onClick={() => setNuevoVale(prev => ({ ...prev, metodo_pago: metodo.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 border-2 ${
                        nuevoVale.metodo_pago === metodo.value
                          ? 'bg-orange-600 border-white text-white shadow-lg scale-[1.02]'
                          : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                      }`}
                    >
                      {metodo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  📝 Notas (opcional)
                </label>
                <textarea
                  value={nuevoVale.notas}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
                  placeholder="Motivo del anticipo..."
                />
              </div>

              {/* Notificación WhatsApp */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevoVale.notificar_whatsapp}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, notificar_whatsapp: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">
                  📱 Enviar notificación WhatsApp al profesional
                </span>
              </label>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setModalNuevoValeOpen(false);
                  setNuevoVale({
                    profesional: '',
                    monto: '',
                    session_caja: sessionActiva?.id?.toString() || '',
                    metodo_pago: 'bold',
                    notas: '',
                    notificar_whatsapp: false
                  });
                  setValidacionSaldo(null);
                }}
                disabled={loadingVale}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearVale}
                disabled={loadingVale || !nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja || validacionSaldo?.excedido}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingVale ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  '✅ Crear Vale'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}