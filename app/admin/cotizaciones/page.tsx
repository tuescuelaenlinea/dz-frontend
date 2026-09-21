// admin/cotizaciones/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import EnviarCotizacionModal from '@/components/admin/EnviarCotizacionModal';
import { generarPDFCotizacion } from '@/utils/pdfGenerator';
import { useRouter } from 'next/navigation'; 

interface Servicio {
  id: number;
  nombre: string;
  precio_min: number;
}

interface Cotizacion {
  id: number;  
  nombre_completo: string;
  whatsapp: string;
  correo_electronico: string;
  servicios_interes: string;
  fecha_aproximada: string;
  presupuesto_aproximado: number;
  detalles_adicionales: string;
  foto_referencia_url: string | null;
  estado: 'pendiente' | 'contactado' | 'cotizado' | 'aprobado' | 'rechazado' | 'perdido'; // ✅ Updated states
  fecha_creacion: string;
  ultimo_contacto: string;
  proximo_seguimiento: string;
  valor_total: number;
}

type EstadoFiltro = 'todas' | 'nuevas' | 'en_seguimiento' | 'aceptadas' | 'perdidas';

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todas');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [showEnviarModal, setShowEnviarModal] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<Cotizacion | null>(null);
  const router = useRouter();

  const cargarServicios = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/servicios/?disponible=true&page_size=100`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setServicios(data.results || data);
    } catch (err) {
      console.error('❌ Error cargando servicios:', err);
    }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      await cargarServicios();
      await cargarCotizaciones();
    };
    cargarTodo();
  }, []);

  const cargarCotizaciones = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setCotizaciones(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('❌ Error cargando cotizaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← NUEVA FUNCIÓN: Convertir IDs de servicios a nombres ← ← ←
  const getNombresServicios = (serviciosInteres: string): string => {
    if (!serviciosInteres) return 'Sin servicios';
    
    const serviciosIds = serviciosInteres
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id));
    
    const nombres = serviciosIds.map(id => {
      const servicio = servicios.find(s => s.id === id);
      return servicio ? servicio.nombre : `Servicio ${id}`;
    });
    
    return nombres.join(', ');
  };

  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    // Mapeo correcto de filtros a los estados reales del modelo
    if (estadoFiltro === 'nuevas' && cot.estado !== 'pendiente') return false;
    if (estadoFiltro === 'en_seguimiento' && cot.estado !== 'contactado' && cot.estado !== 'cotizado') return false;
    if (estadoFiltro === 'aceptadas' && cot.estado !== 'aprobado') return false;
    if (estadoFiltro === 'perdidas' && cot.estado !== 'perdido' && cot.estado !== 'rechazado') return false;
    
    if (busquedaCliente.trim()) {
      const search = busquedaCliente.toLowerCase();
      return (
        (cot.nombre_completo && cot.nombre_completo.toLowerCase().includes(search)) ||
        (cot.correo_electronico && cot.correo_electronico.toLowerCase().includes(search)) ||
        (cot.whatsapp && cot.whatsapp.includes(search))
      );
    }
    
    return true;
  });

  const getContadorPorEstado = (estado: string) => {
    if (estado === 'todas') return cotizaciones.length;
    if (estado === 'nuevas') return cotizaciones.filter(c => c.estado === 'pendiente').length;
    if (estado === 'en_seguimiento') return cotizaciones.filter(c => c.estado === 'contactado' || c.estado === 'cotizado').length;
    if (estado === 'aceptadas') return cotizaciones.filter(c => c.estado === 'aprobado').length;
    if (estado === 'perdidas') return cotizaciones.filter(c => c.estado === 'perdido' || c.estado === 'rechazado').length;
    return 0;
  };
  
  const handleEditarCotizacion = (cotizacion: Cotizacion) => {
    router.push(`/admin/cotizaciones/nueva?edit=${cotizacion.id}`);
  };

  const handleEnviarCotizacion = (cotizacion: Cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setShowEnviarModal(true);
  };

  const handleGenerarPDF = (cotizacion: Cotizacion) => {
    const serviciosIds = (cotizacion.servicios_interes || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id));
    
    const serviciosConNombres = serviciosIds.map(id => {
      const servicio = servicios.find(s => s.id === id);
      return servicio ? servicio.nombre : `Servicio ${id}`;
    }).filter(nombre => nombre.length > 0);
    
    const valorTotal = Number(cotizacion.valor_total || cotizacion.presupuesto_aproximado || 0);
    const valorUnitario = serviciosConNombres.length > 0 ? valorTotal / serviciosConNombres.length : 0;
    
    const subtotal = valorTotal;
    const descuento = subtotal * 0.10;
    const total = subtotal - descuento;

    generarPDFCotizacion({
      id: cotizacion.id,
      codigo_cotizacion: `COT-${cotizacion.id}` || `COT-${cotizacion.id}`,
      cliente_nombre: cotizacion.nombre_completo,
      cliente_telefono: cotizacion.whatsapp,
      cliente_email: cotizacion.correo_electronico,
      fecha_creacion: cotizacion.fecha_creacion || new Date().toISOString(),
      servicios: serviciosConNombres.map(nombre => ({
        nombre,
        cantidad: 1,
        precio_unitario: valorUnitario,
        total: valorUnitario
      })),
      subtotal,
      descuento,
      total,
      notas: cotizacion.detalles_adicionales || 'Gracias por confiar en DZSALON.\nEsta cotización tiene una validez de 15 días.',
      foto_referencia_url: cotizacion.foto_referencia_url ?? undefined
    });
  };

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'nueva': 'bg-gray-200 text-gray-800',
      'en_seguimiento': 'bg-yellow-200 text-yellow-900',
      'aceptada': 'bg-green-200 text-green-900',
      'perdida': 'bg-red-200 text-red-900',
    };
    return colors[estado] || 'bg-gray-200 text-gray-800';
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'nueva': 'Nueva',
      'en_seguimiento': 'En seguimiento',
      'aceptada': 'Aceptada',
      'perdida': 'Perdida',
    };
    return labels[estado] || estado;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seguimiento de cotizaciones</h1>
          <p className="text-gray-600 mt-1">Gestiona y da seguimiento a todas las cotizaciones</p>
        </div>
        
        {/* Botón flotante NUEVA COTIZACIÓN */}
        <button
          onClick={() => router.push('/admin/cotizaciones/nueva')}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-amber-700 hover:to-amber-800 transition-all transform hover:scale-110 z-50"
          title="Nueva Cotización"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs de estado */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'nuevas', label: 'Nuevas' },
              { key: 'en_seguimiento', label: 'En seguimiento' },
              { key: 'aceptadas', label: 'Aceptadas' },
              { key: 'perdidas', label: 'Perdidas' },
            ].map((filtro) => (
              <button
                key={filtro.key}
                onClick={() => setEstadoFiltro(filtro.key as EstadoFiltro)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  estadoFiltro === filtro.key
                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {filtro.label} ({getContadorPorEstado(filtro.key)})
              </button>
            ))}
          </div>

          {/* Campo de búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar cliente..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              className="w-full lg:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabla de cotizaciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">            
            {/* ← ← ← ELIMINADO min-w-[1000px] y agregado table-fixed para respetar anchos ← ← ← */}
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* ← ← ← ANCHOS PROPORCIONALES AÑADIDOS ← ← ← */}
                  <th className="w-1/4 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tl-xl">Cliente</th>
                  <th className="w-1/5 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Servicio</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Último contacto</th>
                  <th className="w-1/6 px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider pr-6 rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cotizacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron cotizaciones
                    </td>
                  </tr>
                ) : (
                  cotizacionesFiltradas.map((cotizacion) => (
                    <tr
                      key={cotizacion.id}
                      onClick={() => handleEditarCotizacion(cotizacion)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {/* ← ← ← TRUNCATE Y TITLE PARA TEXTOS LARGOS ← ← ← */}
                          <p className="font-medium text-gray-900 truncate" title={cotizacion.nombre_completo}>
                            {cotizacion.nombre_completo}
                          </p>
                          <p className="text-sm text-gray-500 truncate" title={cotizacion.correo_electronico}>
                            {cotizacion.correo_electronico}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {/* ← ← ← CORREGIDO: Mostrar nombres de servicios en lugar de IDs ← ← ← */}
                        <p className="text-sm text-gray-900 truncate max-w-xs" title={getNombresServicios(cotizacion.servicios_interes)}>
                          {getNombresServicios(cotizacion.servicios_interes)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          ${Number(cotizacion.valor_total || cotizacion.presupuesto_aproximado || 0).toLocaleString('es-CO', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cotizacion.estado)}`}>
                          {getEstadoLabel(cotizacion.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cotizacion.ultimo_contacto ? new Date(cotizacion.ultimo_contacto).toLocaleDateString('es-CO') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleGenerarPDF(cotizacion)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Generar PDF"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEnviarCotizacion(cotizacion)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Enviar por..."
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para enviar cotización */}
      {showEnviarModal && cotizacionSeleccionada && (
        <EnviarCotizacionModal
          cotizacion={cotizacionSeleccionada}
          onClose={() => {
            setShowEnviarModal(false);
            setCotizacionSeleccionada(null);
          }}
          onSuccess={() => {
            setShowEnviarModal(false);
            setCotizacionSeleccionada(null);
            cargarCotizaciones();
          }}
        />
      )}
    </div>
  );
}