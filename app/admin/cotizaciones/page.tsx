// admin/cotizaciones/page.tsx
'use client';
import { useState, useEffect } from 'react';
import EnviarCotizacionModal from '@/components/admin/EnviarCotizacionModal';
import AccionesCotizacionModal from '@/components/admin/AccionesCotizacionModal'; // ← NUEVO
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
  estado: 'pendiente' | 'contactado' | 'cotizado' | 'aprobado' | 'rechazado' | 'perdido';
  fecha_creacion: string;
  ultimo_contacto: string;
  proximo_seguimiento: string;
  valor_total: number;
  descuento?: number;  // ← AGREGAR ESTO
  subtotal?: number;   // ← AGREGAR ESTO
}

type EstadoFiltro = 'todas' | 'nuevas' | 'en_seguimiento' | 'aceptadas' | 'perdidas';

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todas');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  
  // Estados para los modales
  const [showAccionesModal, setShowAccionesModal] = useState(false);
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
  
  // ← ← ← NUEVA FUNCIÓN: Abrir modal de acciones al hacer clic en la fila ← ← ←
  const handleRowClick = (cotizacion: Cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setShowAccionesModal(true);
  };

  const handleEditarCotizacion = (cotizacion: Cotizacion) => {
    router.push(`/admin/cotizaciones/nueva?edit=${cotizacion.id}`);
  };

  const handleGenerarPDF = async (cotizacion: Cotizacion) => {
  try {
    const token = localStorage.getItem('admin_token');
    
    // 1. Obtener detalles completos de la cotización
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/${cotizacion.id}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Error al obtener detalles de la cotización');
    const cotizacionDetalles = await res.json();

    // 2. ← ← ← OBTENER LISTA COMPLETA DE SERVICIOS DEL BACKEND ← ← ←
    const serviciosRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/servicios/?page_size=1000`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const serviciosData = await serviciosRes.json();
    const todosServicios = serviciosData.results || serviciosData;

    // 3. Parsear IDs de servicios interesados
    const serviciosIds = (cotizacionDetalles.servicios_interes || '')
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0)
      .map((id: string) => parseInt(id, 10));

    // 4. Parsear servicios_detalle (valores personalizados)
    let serviciosPersonalizados: Record<number, { cantidad: number; precio: number }> = {};
    if (cotizacionDetalles.servicios_detalle) {
      try {
        const detallesLista = JSON.parse(cotizacionDetalles.servicios_detalle);
        for (const detalle of detallesLista) {
          serviciosPersonalizados[detalle.id] = {
            cantidad: detalle.cantidad || 1,
            precio: Number(detalle.precio) || 0
          };
        }
      } catch (e) {
        console.error('Error parseando servicios_detalle:', e);
      }
    }

    // 5. ← ← ← CONSTRUIR SERVICIOS CON TODOS LOS DATOS NECESARIOS ← ← ←
    const serviciosConDetalles = serviciosIds.map((id: number) => {
      const servicioBD = todosServicios.find((s: any) => s.id === id);
      
      const cantidad = serviciosPersonalizados[id]?.cantidad || 1;
      const precio_unitario = serviciosPersonalizados[id]?.precio || 
                            (servicioBD ? Number(servicioBD.precio_min) : 0);

      return {
        id: id,
        nombre: servicioBD?.nombre || `Servicio ${id}`,
        cantidad: cantidad,
        precio_unitario: precio_unitario,
        total: precio_unitario * cantidad,
        imagen_url: servicioBD?.imagen_url || null,        // ← ← ← AHORA SÍ VIENE
        descripcion_corta: servicioBD?.descripcion_corta || '' // ← ← ← AHORA SÍ VIENE
      };
    });

        // 6. Calcular totales
    const subtotal = serviciosConDetalles.reduce(
      (sum: number, serv: { precio_unitario: number; cantidad: number }) => sum + (serv.precio_unitario * serv.cantidad),
      0
    );
    const descuento = Number(cotizacionDetalles.descuento || 0);
    const total = subtotal - descuento;

    // 7. ← ← ← OBTENER LOGO ← ← ←
    const configRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/configuracion/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const configData = await configRes.json();
    const configuracion = configData.results?.[0] || configData;
    // ← ← ← CLAVE: Construir URL absoluta si es relativa
    let logo_url = configuracion?.logo_url || null;
    if (!logo_url && configuracion?.logo) {
      // Si solo tiene la ruta relativa, construir URL absoluta
      logo_url = `${process.env.NEXT_PUBLIC_API_URL}${configuracion.logo}`;
    }

    // 8. Generar PDF
    generarPDFCotizacion({
      id: cotizacion.id,
      codigo_cotizacion: `COT-${cotizacion.id}`,
      cliente_nombre: cotizacionDetalles.nombre_completo,
      cliente_telefono: cotizacionDetalles.whatsapp,
      cliente_email: cotizacionDetalles.correo_electronico,
      fecha_creacion: cotizacionDetalles.fecha_creacion,
      servicios: serviciosConDetalles,
      subtotal: subtotal,
      descuento: descuento,
      total: total,
      notas: cotizacionDetalles.detalles_adicionales || undefined,
      foto_referencia_url: cotizacionDetalles.foto_referencia_url || undefined,
      logo_url: logo_url,  // ← ← ← PASAR LOGO
      configuracion_salon: configuracion || undefined
    });

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar el PDF. Intente nuevamente.');
  }
};

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-gray-200 text-gray-800',
      'contactado': 'bg-blue-100 text-blue-800',
      'cotizado': 'bg-yellow-100 text-yellow-800',
      'aprobado': 'bg-green-100 text-green-800',
      'rechazado': 'bg-red-100 text-red-800',
      'perdido': 'bg-red-100 text-red-800',
    };
    return colors[estado] || 'bg-gray-200 text-gray-800';
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'contactado': 'Contactado',
      'cotizado': 'Cotizado',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado',
      'perdido': 'Perdido',
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
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* ← ← ← ANCHOS REAJUSTADOS (Sin columna de acciones, suma 12/12) ← ← ← */}
                  <th className="w-1/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tl-xl">Cotización</th>
                  <th className="w-3/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cliente</th>
                  <th className="w-3/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Servicio</th>
                  <th className="w-2/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor</th>
                  <th className="w-2/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="w-1/12 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tr-xl">Contacto</th>
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
                      onClick={() => handleRowClick(cotizacion)} // ← ← ← AHORA ABRE EL MODAL DE ACCIONES
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
                          COT-{cotizacion.id}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate" title={cotizacion.nombre_completo}>
                            {cotizacion.nombre_completo}
                          </p>
                          <p className="text-sm text-gray-500 truncate" title={cotizacion.correo_electronico}>
                            {cotizacion.correo_electronico}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Acciones (se muestra al hacer clic en la fila) */}
      {showAccionesModal && cotizacionSeleccionada && (
        <AccionesCotizacionModal
          cotizacion={cotizacionSeleccionada}
          onClose={() => {
            setShowAccionesModal(false);
            setCotizacionSeleccionada(null); // Se limpia solo si el usuario cierra o hace clic fuera
          }}
          onEditar={() => {
            setShowAccionesModal(false);
            handleEditarCotizacion(cotizacionSeleccionada);
          }}
          onGenerarPDF={() => {
            setShowAccionesModal(false);
            handleGenerarPDF(cotizacionSeleccionada);
          }}
          onEnviar={() => {
            setShowAccionesModal(false); // Cerramos el modal de acciones
            setShowEnviarModal(true);    // Abrimos el modal de envío
            // ¡IMPORTANTE! No llamamos a setCotizacionSeleccionada(null) aquí
            // para que el siguiente modal tenga los datos disponibles.
          }}
        />
      )}

      {/* Modal para enviar cotización */}
      {showEnviarModal && cotizacionSeleccionada && (
        <EnviarCotizacionModal
          cotizacion={cotizacionSeleccionada}
          onClose={() => {
            setShowEnviarModal(false);
            setCotizacionSeleccionada(null); // Ahora sí lo limpiamos al cerrar este modal
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