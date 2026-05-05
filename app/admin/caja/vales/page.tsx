// app/admin/caja/vales/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ← ← ← INTERFACES ← ← ←
interface Profesional {
  id: number;
  nombre: string;
  telefono_whatsapp?: string;
  activo: boolean;
}

interface ValeEmpleado {
  id: number;
  codigo_vale: string;
  profesional: number;
  profesional_nombre: string;
  monto: string | number;
  fecha: string;
  estado: 'registrado' | 'pagado' | 'cancelado';
  session_caja: number | null;
  session_caja_turno?: string;
  usuario_registra_username: string;
  notas: string;
  notificacion_whatsapp_enviada: boolean;
  descuento_en_nomina: boolean;
  // ← ← ← CAMPOS DE SALDO (read-only) ← ← ←
  saldo_ganado_mes: number;
  total_vales_pendientes: number;
  saldo_disponible_vales: number;
  // ← ← ← NUEVO: Método de pago ← ← ←
  metodo_pago?: string;
  metodo_pago_display?: string;
}

interface CajaSession {
  id: number;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  turno: string;
  fecha: string;
}

// ← ← ← NUEVO: Opciones de método de pago para vales ← ← ←
const METODOS_PAGO_VALE = [
  { value: 'efectivo', label: '💵 Efectivo', color: 'bg-green-600' },
  { value: 'transferencia', label: '🏦 Transferencia', color: 'bg-blue-600' },
  { value: 'nequi', label: '📱 Nequi', color: 'bg-purple-600' },
  { value: 'daviplata', label: '📱 Daviplata', color: 'bg-pink-600' },
  { value: 'bold', label: '💳 Bold', color: 'bg-indigo-600' },
  { value: 'tarjeta', label: '💳 Tarjeta en sitio', color: 'bg-orange-600' },
  { value: 'caja_menor', label: '📦 Caja menor', color: 'bg-teal-600' },
] as const;

export default function ValesPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Estados
  const [vales, setVales] = useState<ValeEmpleado[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [sesionesActivas, setSesionesActivas] = useState<CajaSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ← Estados para filtros
  const [filtroProfesional, setFiltroProfesional] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  
  // ← Estados para modal de creación
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoVale, setNuevoVale] = useState({
    profesional: '',
    monto: '',
    session_caja: '',
    metodo_pago: 'efectivo',  // ← ← ← NUEVO: default efectivo
    notas: '',
    notificar_whatsapp: false
  });
  const [validacionSaldo, setValidacionSaldo] = useState<{
    disponible: number;
    limite: number;
    excedido: boolean;
  } | null>(null);

  // ← ← ← CARGAR DATOS INICIALES ← ← ←
  useEffect(() => {
    cargarVales();
    cargarProfesionales();
    cargarSesionesActivas();
  }, []);

  // ← ← ← CARGAR VALES CON FILTROS ← ← ←
  const cargarVales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('ordering', '-fecha');
      
      if (filtroProfesional) params.append('profesional', filtroProfesional);
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroFechaInicio) params.append('fecha_inicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin);
      
      const res = await fetch(`${apiUrl}/caja/vales/?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) throw new Error('Error cargando vales');
      
      const data = await res.json();
      setVales(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('❌ Error cargando vales:', err);
      alert('⚠️ No se pudieron cargar los vales');
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← CARGAR PROFESIONALES ACTIVOS ← ← ←
  const cargarProfesionales = async () => {
    try {
      const res = await fetch(`${apiUrl}/profesionales/?activo=true&ordering=nombre`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfesionales(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando profesionales:', err);
    }
  };

  // ← ← ← CARGAR SESIONES DE CAJA ACTIVAS ← ← ←
  const cargarSesionesActivas = async () => {
    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/?estado=abierta`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setSesionesActivas(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando sesiones:', err);
    }
  };

  // ← ← ← VALIDAR SALDO DISPONIBLE AL CAMBIAR PROFESIONAL O MONTO ← ← ←
  useEffect(() => {
    if (!nuevoVale.profesional || !nuevoVale.monto) {
      setValidacionSaldo(null);
      return;
    }
    
    const validarSaldo = async () => {
      try {
        // Obtener datos del profesional para calcular límites
        const res = await fetch(`${apiUrl}/caja/vales/?profesional=${nuevoVale.profesional}&limit=1`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          const primerVale = Array.isArray(data) ? data[0] : (data.results?.[0]);
          
          if (primerVale?.saldo_disponible_vales !== undefined) {
            const disponible = primerVale.saldo_disponible_vales;
            const montoIntento = parseFloat(nuevoVale.monto) || 0;
            
            setValidacionSaldo({
              disponible,
              limite: primerVale.saldo_ganado_mes * 0.50,
              excedido: montoIntento > disponible
            });
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo validar saldo:', err);
      }
    };
    
    // Debounce para no hacer llamadas en cada tecla
    const timer = setTimeout(validarSaldo, 500);
    return () => clearTimeout(timer);
  }, [nuevoVale.profesional, nuevoVale.monto]);

  // ← ← ← CREAR NUEVO VALE ← ← ←
  const handleCrearVale = async () => {
    // Validaciones básicas
    if (!nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja) {
      alert('⚠️ Completa todos los campos obligatorios');
      return;
    }
    
    if (validacionSaldo?.excedido) {
      alert(`⚠️ El monto excede el saldo disponible ($${validacionSaldo.disponible.toLocaleString()})`);
      return;
    }
    
    try {
      const payload = {
        profesional: parseInt(nuevoVale.profesional),
        monto: parseFloat(nuevoVale.monto),
        session_caja: parseInt(nuevoVale.session_caja),
        // ← ← ← NUEVO: Incluir método de pago en el payload ← ← ←
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
      
      // ← ← ← ENVIAR NOTIFICACIÓN WHATSAPP SI SE SOLICITÓ ← ← ←
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
      
      alert(`✅ Vale ${valeCreado.codigo_vale} creado exitosamente\nMétodo: ${METODOS_PAGO_VALE.find(m => m.value === nuevoVale.metodo_pago)?.label}`);
      setShowCrearModal(false);
      setNuevoVale({ profesional: '', monto: '', session_caja: '', metodo_pago: 'efectivo', notas: '', notificar_whatsapp: false });
      setValidacionSaldo(null);
      cargarVales(); // Recargar lista
      
    } catch (err: any) {
      console.error('❌ Error creando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← CANCELAR VALE ← ← ←
  const handleCancelarVale = async (valeId: number, codigoVale: string) => {
    if (!confirm(`¿Estás seguro de cancelar el vale ${codigoVale}?`)) return;
    
    const motivo = prompt('Motivo de cancelación (opcional):') || '';
    
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${valeId}/cancelar/`, {
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
      
      alert(`✅ Vale ${codigoVale} cancelado`);
      cargarVales();
      
    } catch (err: any) {
      console.error('❌ Error cancelando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← MARCAR COMO PAGADO ← ← ←
  const handlePagarVale = async (valeId: number, codigoVale: string) => {
    if (!confirm(`¿Marcar vale ${codigoVale} como pagado?`)) return;
    
    const metodoPago = prompt('Método de pago (nomina/efectivo/transferencia):', 'nomina') || 'nomina';
    
    try {
      const res = await fetch(`${apiUrl}/caja/vales/${valeId}/pagar/`, {
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
      
      alert(`✅ Vale ${codigoVale} marcado como pagado`);
      cargarVales();
      
    } catch (err: any) {
      console.error('❌ Error pagando vale:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← FORMATEAR MONEDA ← ← ←
  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  // ← ← ← FORMATEAR FECHA ← ← ←
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ← ← ← COLOR POR ESTADO ← ← ←
  const getEstadoColor = (estado: string): string => {
    switch (estado) {
      case 'registrado': return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'pagado': return 'bg-green-900/30 text-green-400 border-green-700';
      case 'cancelado': return 'bg-red-900/30 text-red-400 border-red-700';
      default: return 'bg-gray-900/30 text-gray-400 border-gray-700';
    }
  };

  // ← ← ← FILTRAR VALES (client-side para demostración) ← ← ←
  const valesFiltrados = useMemo(() => {
    return vales.filter(vale => {
      if (filtroProfesional && vale.profesional.toString() !== filtroProfesional) return false;
      if (filtroEstado && vale.estado !== filtroEstado) return false;
      if (filtroFechaInicio && vale.fecha < filtroFechaInicio) return false;
      if (filtroFechaFin && vale.fecha > filtroFechaFin) return false;
      return true;
    });
  }, [vales, filtroProfesional, filtroEstado, filtroFechaInicio, filtroFechaFin]);

  // ← ← ← RENDERIZADO ← ← ←
  if (loading && vales.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      
      {/* ← ← ← HEADER ← ← ← */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎫 Gestión de Vales</h1>
            <p className="text-sm opacity-90 mt-1">Anticipos a empleados</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-white/80 hover:text-white font-medium"
            >
              ← Volver a Caja
            </button>
            <button
              onClick={() => setShowCrearModal(true)}
              disabled={sesionesActivas.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Vale
            </button>
          </div>
        </div>
      </div>

      {/* ← ← ← FILTROS ← ← ← */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          
          {/* Profesional */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">👤 Profesional</label>
            <select
              value={filtroProfesional}
              onChange={(e) => setFiltroProfesional(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {profesionales.map(prof => (
                <option key={prof.id} value={prof.id}>{prof.nombre}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">📊 Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="registrado">🟡 Registrado</option>
              <option value="pagado">🟢 Pagado</option>
              <option value="cancelado">🔴 Cancelado</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">📅 Desde</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">📅 Hasta</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={cargarVales}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🔍 Aplicar
            </button>
            <button
              onClick={() => {
                setFiltroProfesional('');
                setFiltroEstado('');
                setFiltroFechaInicio('');
                setFiltroFechaFin('');
                cargarVales();
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ← ← ← TABLA DE VALES ← ← ← */}
      <div className="p-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Profesional</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Método</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {valesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      {loading ? 'Cargando...' : 'No hay vales que mostrar'}
                    </td>
                  </tr>
                ) : (
                  valesFiltrados.map((vale) => {
                    const metodoLabel = METODOS_PAGO_VALE.find(m => m.value === vale.metodo_pago)?.label || vale.metodo_pago_display || '-';
                    return (
                      <tr key={vale.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-purple-400">
                          {vale.codigo_vale}
                        </td>
                        <td className="px-4 py-3 text-white">
                          {vale.profesional_nombre}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-400">
                          {formatMoney(vale.monto)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatDate(vale.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getEstadoColor(vale.estado)}`}>
                            {vale.estado === 'registrado' && '🟡 Registrado'}
                            {vale.estado === 'pagado' && '🟢 Pagado'}
                            {vale.estado === 'cancelado' && '🔴 Cancelado'}
                          </span>
                        </td>
                        {/* ← ← ← NUEVA COLUMNA: Método de Pago ← ← ← */}
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                            {metodoLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Botón WhatsApp */}
                            {!vale.notificacion_whatsapp_enviada && vale.estado === 'registrado' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${apiUrl}/caja/vales/${vale.id}/notificar/`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                      }
                                    });
                                    if (res.ok) {
                                      alert('📱 Notificación enviada');
                                      cargarVales();
                                    }
                                  } catch (err) {
                                    alert('❌ No se pudo enviar notificación');
                                  }
                                }}
                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                                title="Enviar notificación WhatsApp"
                              >
                                📱
                              </button>
                            )}
                            
                            {/* Botón Pagar */}
                            {vale.estado === 'registrado' && (
                              <button
                                onClick={() => handlePagarVale(vale.id, vale.codigo_vale)}
                                className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors"
                                title="Marcar como pagado"
                              >
                                💰
                              </button>
                            )}
                            
                            {/* Botón Cancelar */}
                            {vale.estado === 'registrado' && (
                              <button
                                onClick={() => handleCancelarVale(vale.id, vale.codigo_vale)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                                title="Cancelar vale"
                              >
                                🚫
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ← ← ← MODAL: CREAR NUEVO VALE ← ← ← */}
      {showCrearModal && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">🎫 Nuevo Vale</h3>
              <p className="text-sm text-gray-400 mt-1">
                Anticipo a empleados
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
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Seleccionar profesional...</option>
                  {profesionales
                    .filter(p => p.activo)
                    .map(prof => (
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
                    className="w-full px-4 py-3 pl-8 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                
                {/* ← ← ← VALIDACIÓN DE SALDO ← ← ← */}
                {validacionSaldo && (
                  <div className={`mt-2 text-xs p-2 rounded ${
                    validacionSaldo.excedido 
                      ? 'bg-red-900/30 text-red-400 border border-red-700' 
                      : 'bg-green-900/30 text-green-400 border border-green-700'
                  }`}>
                    <p>💡 Límite: 50% del saldo ganado del mes</p>
                    <p>Disponible: {formatMoney(validacionSaldo.disponible)}</p>
                    {validacionSaldo.excedido && (
                      <p className="font-semibold mt-1">⚠️ Monto excede el límite</p>
                    )}
                  </div>
                )}
              </div>

              {/* ← ← ← NUEVO: Selector de Método de Pago ← ← ← */}
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
                          ? `${metodo.color} border-white text-white shadow-lg scale-[1.02]`
                          : 'bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                      }`}
                    >
                      {metodo.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Método usado para entregar el anticipo
                </p>
              </div>

              {/* Sesión de Caja */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  🏦 Sesión de Caja *
                </label>
                <select
                  value={nuevoVale.session_caja}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, session_caja: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  disabled={sesionesActivas.length === 0}
                >
                  <option value="">Seleccionar sesión...</option>
                  {sesionesActivas.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.turno} - {new Date(session.fecha).toLocaleDateString('es-CO')}
                    </option>
                  ))}
                </select>
                {sesionesActivas.length === 0 && (
                  <p className="text-xs text-orange-400 mt-1">
                    ⚠️ No hay sesiones de caja activas. Abre una sesión primero.
                  </p>
                )}
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
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Motivo del anticipo..."
                />
              </div>

              {/* Notificación WhatsApp */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevoVale.notificar_whatsapp}
                  onChange={(e) => setNuevoVale(prev => ({ ...prev, notificar_whatsapp: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">
                  📱 Enviar notificación WhatsApp al profesional
                </span>
              </label>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowCrearModal(false);
                  setNuevoVale({ profesional: '', monto: '', session_caja: '', metodo_pago: 'efectivo', notas: '', notificar_whatsapp: false });
                  setValidacionSaldo(null);
                }}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearVale}
                disabled={!nuevoVale.profesional || !nuevoVale.monto || !nuevoVale.session_caja || validacionSaldo?.excedido}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                ✅ Crear Vale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}