// app/admin/cotizaciones/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import EnviarCotizacionModal from '@/components/admin/EnviarCotizacionModal';
import { generarPDFCotizacion } from '@/utils/pdfGenerator';
import { useRouter } from 'next/navigation'; 

interface Cotizacion {
  id: number;
  codigo_cotizacion: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  servicios_interes: string;
  fecha_aproximada: string;
  presupuesto_aproximado: number;
  detalles_adicionales: string;
  foto_referencia_url: string | null;
  estado: 'nueva' | 'en_seguimiento' | 'aceptada' | 'perdida';
  fecha_creacion: string;
  ultimo_contacto: string;
  proximo_seguimiento: string;
  valor_total: number;
}

type EstadoFiltro = 'todas' | 'nuevas' | 'en_seguimiento' | 'aceptadas' | 'perdidas';

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todas');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [showEnviarModal, setShowEnviarModal] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<Cotizacion | null>(null);
  const router = useRouter();

  useEffect(() => {
    cargarCotizaciones();
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

  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    // Filtro por estado
    if (estadoFiltro === 'nuevas' && cot.estado !== 'nueva') return false;
    if (estadoFiltro === 'en_seguimiento' && cot.estado !== 'en_seguimiento') return false;
    if (estadoFiltro === 'aceptadas' && cot.estado !== 'aceptada') return false;
    if (estadoFiltro === 'perdidas' && cot.estado !== 'perdida') return false;
    
    // Filtro por búsqueda
    if (busquedaCliente.trim()) {
      const search = busquedaCliente.toLowerCase();
      return (
        cot.cliente_nombre.toLowerCase().includes(search) ||
        cot.cliente_email.toLowerCase().includes(search) ||
        cot.cliente_telefono.includes(search)
      );
    }
    
    return true;
  });

  const getContadorPorEstado = (estado: string) => {
    if (estado === 'todas') return cotizaciones.length;
    return cotizaciones.filter(c => c.estado === estado.replace('en_seguimiento', 'en_seguimiento')).length;
  };

  const handleEditarCotizacion = (cotizacion: Cotizacion) => {
    // Redirigir a la vista de edición/creación    
      router.push(`/admin/cotizaciones/nueva?edit=${cotizacion.id}`);
  };

  const handleEnviarCotizacion = (cotizacion: Cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setShowEnviarModal(true);
  };

  const handleGenerarPDF = (cotizacion: Cotizacion) => {
  // Transformar Cotizacion a CotizacionPDF
  const servicios = (cotizacion.servicios_interes || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const valorUnitario = servicios.length > 0 
    ? (cotizacion.valor_total || cotizacion.presupuesto_aproximado || 0) / servicios.length 
    : 0;
  
  const subtotal = servicios.length * valorUnitario;
  const descuento = subtotal * 0.10; // 10% de descuento por defecto
  const total = subtotal - descuento;

  generarPDFCotizacion({
    id: cotizacion.id,
    codigo_cotizacion: cotizacion.codigo_cotizacion || `COT-${cotizacion.id}`,
    cliente_nombre: cotizacion.cliente_nombre,
    cliente_telefono: cotizacion.cliente_telefono,
    cliente_email: cotizacion.cliente_email,
    fecha_creacion: cotizacion.fecha_creacion || new Date().toISOString(),
    servicios: servicios.map(nombre => ({
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
            onClick={() => router.push('/admin/cotizaciones/nueva')}  // ← ← ← CAMBIO: Usar router.push
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Servicio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Último contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Próximo seguimiento</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cotizacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                        <div>
                          <p className="font-medium text-gray-900">{cotizacion.cliente_nombre}</p>
                          <p className="text-sm text-gray-500">{cotizacion.cliente_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{cotizacion.servicios_interes}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          ${cotizacion.valor_total?.toLocaleString('es-CO') || cotizacion.presupuesto_aproximado?.toLocaleString('es-CO') || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cotizacion.estado)}`}>
                          {getEstadoLabel(cotizacion.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(cotizacion.ultimo_contacto).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {cotizacion.proximo_seguimiento ? (
                          <span className={cotizacion.proximo_seguimiento === 'Hoy' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {cotizacion.proximo_seguimiento === 'Hoy' ? 'Hoy' : new Date(cotizacion.proximo_seguimiento).toLocaleDateString('es-CO')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
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