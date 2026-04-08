// app\admin\pagos\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Pago {
  id: number;
  codigo_pago: string;
  monto: string;
  metodo_pago: 'bold' | 'efectivo' | 'transferencia' | 'nequi' | 'daviplata' | 'otro';
  estado: 'pendiente' | 'procesando' | 'exitoso' | 'fallido' | 'reembolsado' | 'cancelado';
  origen_tipo: 'cita' | 'producto' | 'membresia' | 'donacion' | 'reembolso' | 'ajuste' | 'otro';
  origen_id: number;
  usuario: number | null;
  registrado_por: number | null;
  referencia_externa: string | null;
  comprobante: string | null;
  comprobante_url: string | null;
  notas: string | null;
  creado_en: 'frontend' | 'admin' | 'api' | 'webhook' | 'otro';
  fecha_pago: string;
  actualizado_en: string;
  // Campos relacionados (si los incluye el serializer)
  cliente_nombre?: string;
  cliente_email?: string;
  servicio_nombre?: string;
  cita_codigo?: string;
}

export default function AdminPagosPage() {
  const router = useRouter();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('todos');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);
  
  // Actualización de estado
  const [nuevoEstado, setNuevoEstado] = useState<string>('');
  const [notasAdmin, setNotasAdmin] = useState<string>('');
  const [actualizando, setActualizando] = useState(false);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [pagosPorPagina, setPagosPorPagina] = useState(20);

  useEffect(() => {
    cargarPagos();
  }, []);

  // Resetear paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, filtroMetodo, filtroOrigen, filtroFechaDesde, filtroFechaHasta, busqueda]);

  const cargarPagos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // Construir query params
      const params = new URLSearchParams();
      params.append('ordering', '-fecha_pago');
      params.append('page_size', '100');
      
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
      if (filtroMetodo !== 'todos') params.append('metodo_pago', filtroMetodo);
      if (filtroOrigen !== 'todos') params.append('origen_tipo', filtroOrigen);
      if (filtroFechaDesde) params.append('fecha_pago__gte', filtroFechaDesde);
      if (filtroFechaHasta) params.append('fecha_pago__lte', filtroFechaHasta);
      if (busqueda) params.append('search', busqueda);
      
      const res = await fetch(`${apiUrl}/pagos/?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Error al cargar pagos');
      }

      const data = await res.json();
      const pagosList = Array.isArray(data) ? data : (data.results || []);
      // ← DEBUG: Verificar comprobantes
        console.log('📦 Pagos cargados:', pagosList.length);
        const conComprobante = pagosList.filter((p: Pago) => p.comprobante_url);
        console.log(`📄 Con comprobante: ${conComprobante.length}`);
        if (conComprobante.length > 0) {
          console.log('🔗 Primer comprobante URL:', conComprobante[0].comprobante_url);
          console.log('🔗 URL corregida:', getCorrectUrl(conComprobante[0].comprobante_url));
        }

        setPagos(pagosList);
    } catch (err: any) {
      console.error('Error cargando pagos:', err);
      setError(err.message || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalDetalle = (pago: Pago) => {
    setPagoSeleccionado(pago);
    setNuevoEstado(pago.estado);
    setNotasAdmin(pago.notas || '');
    setComprobantePreview(pago.comprobante_url || null);
    setModalAbierto(true);
  };
// ← FUNCIÓN PARA CORREGIR URLs (IP → DOMINIO)
const getCorrectUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const API_DOMAIN = 'https://api.dzsalon.com';
  const IP_PATTERN = /https:\/\/179\.43\.112\.64/;
  
  if (IP_PATTERN.test(url)) {
    return url.replace(IP_PATTERN, API_DOMAIN);
  }
  
  return url;
};

  const actualizarEstadoPago = async () => {
    if (!pagoSeleccionado) return;
    
    try {
      setActualizando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/pagos/${pagoSeleccionado.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: nuevoEstado,
          notas: notasAdmin,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al actualizar');
      }

      alert('✅ Pago actualizado exitosamente');
      setModalAbierto(false);
      cargarPagos();
    } catch (err: any) {
      console.error('Error actualizando pago:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setActualizando(false);
    }
  };

  const descargarComprobante = (url: string | null, filename: string) => {
    if (!url) return;
    
    // Corregir URL si es necesario
    const correctedUrl = url.replace('https://179.43.112.64', 'https://api.dzsalon.com');
    
    window.open(correctedUrl, '_blank');
  };

  // Filtros
  const pagosFiltrados = pagos.filter((pago) => {
    if (filtroEstado !== 'todos' && pago.estado !== filtroEstado) return false;
    if (filtroMetodo !== 'todos' && pago.metodo_pago !== filtroMetodo) return false;
    if (filtroOrigen !== 'todos' && pago.origen_tipo !== filtroOrigen) return false;
    
    if (filtroFechaDesde && pago.fecha_pago < filtroFechaDesde) return false;
    if (filtroFechaHasta && pago.fecha_pago > filtroFechaHasta) return false;
    
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const coincideCodigo = pago.codigo_pago.toLowerCase().includes(busquedaLower);
      const coincideReferencia = pago.referencia_externa?.toLowerCase().includes(busquedaLower);
      const coincideCliente = pago.cliente_nombre?.toLowerCase().includes(busquedaLower);
      const coincideEmail = pago.cliente_email?.toLowerCase().includes(busquedaLower);
      
      if (!coincideCodigo && !coincideReferencia && !coincideCliente && !coincideEmail) {
        return false;
      }
    }
    
    return true;
  });

  // Paginación
  const indiceUltimo = paginaActual * pagosPorPagina;
  const indicePrimero = indiceUltimo - pagosPorPagina;
  const pagosPaginados = pagosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(pagosFiltrados.length / pagosPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      procesando: 'bg-blue-100 text-blue-800',
      exitoso: 'bg-green-100 text-green-800',
      fallido: 'bg-red-100 text-red-800',
      reembolsado: 'bg-purple-100 text-purple-800',
      cancelado: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      pendiente: '⏳ Pendiente',
      procesando: '🔄 Procesando',
      exitoso: '✅ Exitoso',
      fallido: '❌ Fallido',
      reembolsado: '↩️ Reembolsado',
      cancelado: '🚫 Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const getMetodoBadge = (metodo: string) => {
    const icons: Record<string, string> = {
      bold: '💳',
      efectivo: '💵',
      transferencia: '🏦',
      nequi: '📱',
      daviplata: '📲',
      otro: '🔷',
    };
    return (
      <span className="text-sm text-gray-700">
        {icons[metodo] || '🔷'} {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
      </span>
    );
  };

  const getOrigenLabel = (origen: string) => {
    const labels: Record<string, string> = {
      cita: '📅 Cita',
      producto: '🛍️ Producto',
      membresia: '⭐ Membresía',
      donacion: '💝 Donación',
      reembolso: '↩️ Reembolso',
      ajuste: '⚙️ Ajuste',
      otro: '📦 Otro',
    };
    return labels[origen] || origen;
  };

  const getTotalPendiente = () => {
    return pagos
      .filter((p: Pago) => p.estado === 'pendiente')
      .reduce((sum: number, p: Pago) => sum + (parseFloat(p.monto) || 0), 0);
  };

  const getTotalExitoso = () => {
    return pagos
      .filter((p: Pago) => p.estado === 'exitoso')
    .reduce((sum: number, p: Pago) => sum + (parseFloat(p.monto) || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">💰 Gestión de Pagos</h1>
        <p className="text-gray-600 mt-2">Valida comprobantes y administra transacciones</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pagos</p>
              <p className="text-2xl font-bold text-gray-900">{pagos.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes de Validar</p>
              <p className="text-2xl font-bold text-yellow-600">
                {pagos.filter(p => p.estado === 'pendiente').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Exitoso</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(getTotalExitoso().toString())}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Código, referencia, cliente..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="procesando">Procesando</option>
              <option value="exitoso">Exitosos</option>
              <option value="fallido">Fallidos</option>
              <option value="reembolsado">Reembolsados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          {/* Método */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método</label>
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="bold">Bold</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
            </select>
          </div>

          {/* Origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Origen</label>
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="cita">Citas</option>
              <option value="producto">Productos</option>
              <option value="membresia">Membresías</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contador y limpiar */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{pagosFiltrados.length}</strong> de <strong>{pagos.length}</strong> pagos
          </p>
          <button
            onClick={() => {
              setFiltroEstado('todos');
              setFiltroMetodo('todos');
              setFiltroOrigen('todos');
              setFiltroFechaDesde('');
              setFiltroFechaHasta('');
              setBusqueda('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprobante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    📭 No hay pagos que mostrar
                  </td>
                </tr>
              ) : (
                pagosPaginados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-900">{pago.codigo_pago}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pago.cliente_nombre || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{pago.cliente_email || ''}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getMetodoBadge(pago.metodo_pago)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">{formatPrice(pago.monto)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{getOrigenLabel(pago.origen_tipo)}</span>
                      {pago.cita_codigo && (
                        <div className="text-xs text-gray-500">{pago.cita_codigo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getEstadoBadge(pago.estado)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(pago.fecha_pago)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pago.comprobante_url ? (
                        <button
                          onClick={() => descargarComprobante(getCorrectUrl(pago.comprobante_url)!, `comprobante-${pago.codigo_pago}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          title="Click para ver comprobante"
                        >
                          📄 Ver
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Sin comprobante</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalDetalle(pago)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        👁️ Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando <strong>{indicePrimero + 1}</strong> a{' '}
              <strong>{Math.min(indiceUltimo, pagosFiltrados.length)}</strong> de{' '}
              <strong>{pagosFiltrados.length}</strong> pagos
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={pagosPorPagina}
                onChange={(e) => {
                  setPagosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => irAPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {modalAbierto && pagoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">💳 Detalle de Pago</h2>
                <p className="text-sm opacity-90">Código: {pagoSeleccionado.codigo_pago}</p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Información Principal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💰 Monto</h3>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(pagoSeleccionado.monto)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📊 Estado</h3>
                  {getEstadoBadge(pagoSeleccionado.estado)}
                </div>
              </div>

              {/* Cliente y Método */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">👤 Cliente</h3>
                  <p className="text-gray-900">{pagoSeleccionado.cliente_nombre || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{pagoSeleccionado.cliente_email || ''}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💳 Método</h3>
                  {getMetodoBadge(pagoSeleccionado.metodo_pago)}
                  {pagoSeleccionado.referencia_externa && (
                    <p className="text-xs text-gray-500 mt-1">Ref: {pagoSeleccionado.referencia_externa}</p>
                  )}
                </div>
              </div>

              {/* Origen */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📦 Origen del Pago</h3>
                <p className="text-gray-900">{getOrigenLabel(pagoSeleccionado.origen_tipo)}</p>
                <p className="text-sm text-gray-600">ID: {pagoSeleccionado.origen_id}</p>
                {pagoSeleccionado.cita_codigo && (
                  <p className="text-sm text-blue-600">Cita: {pagoSeleccionado.cita_codigo}</p>
                )}
              </div>

              {/* Fecha y Canal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📅 Fecha</h3>
                  <p className="text-gray-900">{formatDate(pagoSeleccionado.fecha_pago)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">🔗 Canal</h3>
                  <p className="text-gray-900 capitalize">{pagoSeleccionado.creado_en}</p>
                </div>
              </div>

             {/* Comprobante */}
              {pagoSeleccionado.comprobante_url && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📄 Comprobante</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => descargarComprobante(getCorrectUrl(pagoSeleccionado.comprobante_url)!, 'comprobante')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      📄 Ver Comprobante
                    </button>
                    {comprobantePreview && (
                      <img 
                        src={getCorrectUrl(comprobantePreview) || ''} 
                        alt="Comprobante" 
                        className="w-20 h-20 object-cover rounded border"
                        onError={(e) => {
                          console.error('❌ Error cargando comprobante:', comprobantePreview);
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        onLoad={() => console.log('✅ Comprobante cargado:', getCorrectUrl(comprobantePreview))}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {pagoSeleccionado.notas && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📝 Notas Internas</h3>
                  <p className="text-sm text-gray-700">{pagoSeleccionado.notas}</p>
                </div>
              )}

              {/* Actualizar Estado (solo si es admin) */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">⚡ Actualizar Estado</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Estado</label>
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendiente">⏳ Pendiente</option>
                      <option value="procesando">🔄 Procesando</option>
                      <option value="exitoso">✅ Exitoso</option>
                      <option value="fallido">❌ Fallido</option>
                      <option value="reembolsado">↩️ Reembolsado</option>
                      <option value="cancelado">🚫 Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Admin</label>
                    <textarea
                      value={notasAdmin}
                      onChange={(e) => setNotasAdmin(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Notas internas sobre este cambio..."
                    />
                  </div>
                  <button
                    onClick={actualizarEstadoPago}
                    disabled={actualizando || nuevoEstado === pagoSeleccionado.estado}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actualizando ? 'Actualizando...' : 'Actualizar Estado'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setModalAbierto(false)}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}