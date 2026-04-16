'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CitaDetailAdminModal from '@/components/admin/CitaDetailAdminModal';

interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_id: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado' | 'parcial'; 
  precio_total: string;
  pago_acumulado: string;
  estado_pago_detalle: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  notas_cliente: string;
  fecha_reserva: string; 
}

export default function AdminCitasPage() {
  const router = useRouter();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [filtroPago, setFiltroPago] = useState<string>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal de detalle
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [citaParaDetalle, setCitaParaDetalle] = useState<Cita | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  // ← ESTADOS PARA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const [citasPorPagina, setCitasPorPagina] = useState(20);

  useEffect(() => {
    cargarCitas();
  }, []);

  // ← Resetear paginación cuando cambien los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, filtroPago, filtroFecha, busqueda]);

const cargarCitas = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    let todasLasCitas: Cita[] = [];
    let url: string | null = `${apiUrl}/citas/?ordering=-fecha,-hora_inicio&page_size=100`;
    
    while (url) {
      // ← AGREGAR ANOTACIÓN DE TIPO EXPLÍCITA: Response
      const res: Response = await fetch(url, {
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
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.results) {
        todasLasCitas = [...todasLasCitas, ...data.results];
        url = data.next;
        console.log(`📄 Página cargada. Total acumulado: ${todasLasCitas.length}`);
      } else if (Array.isArray(data)) {
        todasLasCitas = data;
        url = null;
      } else {
        url = null;
      }
    }
    
    console.log(`✅ Total de citas cargadas: ${todasLasCitas.length}`);
    setCitas(todasLasCitas);
  } catch (err: any) {
    console.error('❌ Error cargando citas:', err);
    setError(err.message || 'Error al cargar citas');
  } finally {
    setLoading(false);
  }
};

  const actualizarEstadoCita = async (citaId: number, nuevoEstado: string) => {
    if (!confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstado}"?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const cita = citas.find(c => c.id === citaId);
      if (!cita) return;
      
      const res = await fetch(`${apiUrl}/citas/${citaId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          estado: nuevoEstado,
          servicio: cita.servicio,
          profesional: cita.profesional,
          fecha: cita.fecha,
          hora_inicio: cita.hora_inicio,
          hora_fin: cita.hora_fin,
          precio_total: cita.precio_total,
          cliente_nombre: cita.cliente_nombre,
          cliente_telefono: cita.cliente_telefono,
          cliente_email: cita.cliente_email,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al actualizar estado');
      }

      alert(`✅ Cita ${nuevoEstado} exitosamente`);
      cargarCitas();
      setModalAbierto(false);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };
  const abrirDetalleCita = (cita: Cita) => {
  setCitaParaDetalle(cita);
  setModalDetalleAbierto(true);
};

  const citasFiltradas = citas.filter((cita) => {
    if (filtroEstado !== 'todas' && cita.estado !== filtroEstado) {
      return false;
    }
    
    if (filtroPago !== 'todos' && cita.pago_estado !== filtroPago) {
      return false;
    }
    
    if (filtroFecha && cita.fecha !== filtroFecha) {
      return false;
    }
    
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const coincideNombre = cita.cliente_nombre.toLowerCase().includes(busquedaLower);
      const coincideCodigo = cita.codigo_reserva.toLowerCase().includes(busquedaLower);
      const coincideTelefono = cita.cliente_telefono.includes(busqueda);
      const coincideServicio = cita.servicio_nombre.toLowerCase().includes(busquedaLower);
      
      if (!coincideNombre && !coincideCodigo && !coincideTelefono && !coincideServicio) {
        return false;
      }
    }
    
    return true;
  });

  // ← CÁLCULO DE PAGINACIÓN
  const indiceUltimaCita = paginaActual * citasPorPagina;
  const indicePrimeraCita = indiceUltimaCita - citasPorPagina;
  const citasPaginadas = citasFiltradas.slice(indicePrimeraCita, indiceUltimaCita);
  const totalPaginas = Math.ceil(citasFiltradas.length / citasPorPagina);

  // ← FUNCIONES DE NAVEGACIÓN
  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-blue-100 text-blue-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pendiente: '⏳ Pendiente',
      confirmada: '✅ Confirmada',
      completada: '✨ Completada',
      cancelada: '❌ Cancelada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const getPagoBadge = (pagoEstado: string, pagoDetalle: string) => {
    if (pagoDetalle === 'pagado') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✅ Pagado</span>;
    }
    if (pagoDetalle === 'parcial') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">⚠️ Parcial</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">⏳ Pendiente</span>;
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
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">📅 Gestión de Citas</h1>
        <p className="text-gray-600 mt-2">Administra todas las reservas del salón</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código, teléfono o servicio..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          {/* Filtro por Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pago</label>
            <select
              value={filtroPago}
              onChange={(e) => setFiltroPago(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              {/*<option value="parcial">Parcial</option>*/}
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>

          {/* Filtro por Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botón limpiar filtros */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{citasFiltradas.length}</strong> de <strong>{citas.length}</strong> citas
          </p>
          <button
            onClick={() => {
              setFiltroEstado('todas');
              setFiltroPago('todos');
              setFiltroFecha('');
              setBusqueda('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesional</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {citasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    📭 No hay citas que mostrar
                  </td>
                </tr>
              ) : (
                citasPaginadas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-gray-50 transition-colors cursor-pointer"  onClick={() => abrirDetalleCita(cita)}>                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">{cita.codigo_reserva}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cita.cliente_nombre}</div>
                      <div className="text-sm text-gray-500">{cita.cliente_telefono}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cita.servicio_nombre}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cita.profesional_nombre || 'Sin asignar'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(cita.fecha)}</div>
                      <div className="text-sm text-gray-500">{cita.hora_inicio} - {cita.hora_fin}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(cita.estado)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getPagoBadge(cita.pago_estado, cita.estado_pago_detalle)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(cita.precio_total)}</div>
                      {parseFloat(cita.pago_acumulado) > 0 && (
                        <div className="text-xs text-green-600">
                          Abonado: {formatPrice(cita.pago_acumulado)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalleCita(cita);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          👁️ Detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ← CONTROLES DE PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Información */}
            <div className="text-sm text-gray-600">
              Mostrando <strong>{indicePrimeraCita + 1}</strong> a{' '}
              <strong>{Math.min(indiceUltimaCita, citasFiltradas.length)}</strong> de{' '}
              <strong>{citasFiltradas.length}</strong> citas
            </div>

            {/* Citas por página */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={citasPorPagina}
                onChange={(e) => {
                  setCitasPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Botones de navegación */}
            <div className="flex items-center gap-2">
              <button
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>

              {/* Números de página */}
              <div className="hidden md:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => i + 1).map((pagina) => (
                  <button
                    key={pagina}
                    onClick={() => irAPagina(pagina)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      paginaActual === pagina
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pagina}
                  </button>
                ))}
                {totalPaginas > 10 && <span className="px-2 text-gray-500">...</span>}
              </div>

              <button
                onClick={paginaSiguiente}
                disabled={paginaActual === totalPaginas}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {modalAbierto && citaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">📋 Detalle de Cita</h2>
                <p className="text-sm opacity-90">Código: {citaSeleccionada.codigo_reserva}</p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">👤 Cliente</h3>
                <p className="text-lg">{citaSeleccionada.cliente_nombre}</p>
                <p className="text-sm text-gray-600">📱 {citaSeleccionada.cliente_telefono}</p>
                <p className="text-sm text-gray-600">✉️ {citaSeleccionada.cliente_email}</p>
                {citaSeleccionada.notas_cliente && (
                  <p className="text-sm text-gray-500 mt-2 italic">📝 "{citaSeleccionada.notas_cliente}"</p>
                )}
              </div>

              {/* Servicio y Profesional */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💇 Servicio</h3>
                  <p className="text-gray-900">{citaSeleccionada.servicio_nombre}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">👨‍⚕️ Profesional</h3>
                  <p className="text-gray-900">{citaSeleccionada.profesional_nombre || 'Sin asignar'}</p>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📅 Fecha y Hora</h3>
                <p className="text-gray-900">{formatDate(citaSeleccionada.fecha)}</p>
                <p className="text-gray-600">{citaSeleccionada.hora_inicio} - {citaSeleccionada.hora_fin}</p>
              </div>

              {/* Estado y Pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Estado</h3>
                  {getStatusBadge(citaSeleccionada.estado)}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Pago</h3>
                  {getPagoBadge(citaSeleccionada.pago_estado, citaSeleccionada.estado_pago_detalle)}
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">{formatPrice(citaSeleccionada.precio_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abonado:</span>
                    <span className="font-bold text-green-600">{formatPrice(citaSeleccionada.pago_acumulado)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Saldo Pendiente:</span>
                    <span className="font-bold text-red-600">
                      {formatPrice((parseFloat(citaSeleccionada.precio_total) - parseFloat(citaSeleccionada.pago_acumulado)).toString())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-3">⚡ Acciones</h3>
                <div className="grid grid-cols-2 gap-3">
                  {citaSeleccionada.estado === 'pendiente' && (
                    <>
                      <button
                        onClick={() => actualizarEstadoCita(citaSeleccionada.id, 'confirmada')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        ✅ Confirmar
                      </button>
                      <button
                        onClick={() => actualizarEstadoCita(citaSeleccionada.id, 'cancelada')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        ❌ Cancelar
                      </button>
                    </>
                  )}
                  {citaSeleccionada.estado === 'confirmada' && (
                    <button
                      onClick={() => actualizarEstadoCita(citaSeleccionada.id, 'completada')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✨ Marcar como Completada
                    </button>
                  )}
                  {citaSeleccionada.estado === 'cancelada' && (
                    <button
                      onClick={() => actualizarEstadoCita(citaSeleccionada.id, 'pendiente')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      🔄 Reactivar
                    </button>
                  )}
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
      {/* Al final del return, antes del último </div>: */}
      {modalDetalleAbierto && citaParaDetalle && (
        <CitaDetailAdminModal
          cita={citaParaDetalle}
          isOpen={modalDetalleAbierto}
          onClose={() => {
            setModalDetalleAbierto(false);
            setCitaParaDetalle(null);
          }}
          onCitaUpdated={() => {
            cargarCitas();  // Refrescar lista después de editar
          }}
        />
      )}
    </div>
  );
}