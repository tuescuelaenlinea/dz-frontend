// app\admin\servicios\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  icono?: string | null;  // ← AGREGADO: propiedad opcional
}

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  descripcion_corta: string;
  categoria: number;
  categoria_nombre: string;
  tipo_precio: 'fijo' | 'rango' | 'desde';
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  sesiones_incluidas: number;
  es_medico: boolean;
  requiere_valoracion: boolean;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio: string;
  destacado: boolean;
  disponible: boolean;
  imagen: string | null;
  imagen_url: string | null;
}

export default function AdminServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroDisponible, setFiltroDisponible] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<Partial<Servicio>>({
    nombre: '',
    descripcion: '',
    descripcion_corta: '',
    categoria: 0,
    tipo_precio: 'fijo',
    precio_min: '',
    precio_max: '',
    duracion: '',
    sesiones_incluidas: 1,
    es_medico: false,
    requiere_valoracion: false,
    disponible_salon: true,
    disponible_domicilio: false,
    adicional_domicilio: '0',
    destacado: false,
    disponible: true,
  });
  
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [serviciosPorPagina, setServiciosPorPagina] = useState(20);

  useEffect(() => {
    cargarServicios();
    cargarCategorias();
  }, []);

  // Resetear paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroCategoria, filtroDisponible, busqueda]);

const cargarServicios = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    console.log('🔄 Cargando servicios con paginación corregida...');
    
    let todosLosServicios: Servicio[] = [];
    
    // ← URL INICIAL CON PAGE_SIZE GRANDE (aunque el backend lo ignore)
    let url: string = `${apiUrl}/servicios/?ordering=nombre&page_size=1000`;
    let pageCount = 0;
    const maxPages = 20; // Límite de seguridad
    
    while (url && pageCount < maxPages) {
      pageCount++;
      console.log(`📡 Página ${pageCount}:`, url);
      
      // ← CORREGIR URL: Reemplazar HTTPS/IP por la apiUrl correcta
      const correctedUrl = url
        .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
        .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''));
      
      console.log(`🔗 URL corregida:`, correctedUrl);
      
      const res: Response = await fetch(correctedUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        console.error(`❌ Error HTTP ${res.status}:`, res.statusText);
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Si es respuesta paginada
      if (data.results && Array.isArray(data.results)) {
        todosLosServicios = [...todosLosServicios, ...data.results];
        console.log(`📄 Página ${pageCount} cargada. Total acumulado: ${todosLosServicios.length}`);
        
        // ← CORREGIR LA URL DE 'next' ANTES DE USARLA
        if (data.next) {
          url = data.next
            .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
            .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''));
          console.log(`🔗 Siguiente página corregida:`, url);
        } else {
          url = ''; // No hay más páginas
          console.log('✅ No hay más páginas');
        }
      } 
      // Si es array directo (no paginado)
      else if (Array.isArray(data)) {
        todosLosServicios = data;
        console.log(`✅ Carga completa (array directo): ${todosLosServicios.length} servicios`);
        break;
      }
      // Formato inesperado
      else {
        console.warn('⚠️ Formato de respuesta inesperado:', data);
        break;
      }
    }
    
    if (pageCount >= maxPages) {
      console.warn(`⚠️ Se alcanzó el límite de ${maxPages} páginas`);
    }
    
    console.log(`✅ Total final de servicios cargados: ${todosLosServicios.length}`);
    setServicios(todosLosServicios);
    
  } catch (err: any) {
    console.error('❌ Error cargando servicios:', err);
    setError(err.message || 'Error al cargar servicios');
  } finally {
    setLoading(false);
  }
};
  const cargarCategorias = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← AGREGAR TIPO EXPLÍCITO: Response
      const res: Response = await fetch(`${apiUrl}/categorias/?activo=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setServicioSeleccionado(null);
    setFormData({
      nombre: '',
      descripcion: '',
      descripcion_corta: '',
      categoria: categorias[0]?.id || 0,
      tipo_precio: 'fijo',
      precio_min: '',
      precio_max: '',
      duracion: '',
      sesiones_incluidas: 1,
      es_medico: false,
      requiere_valoracion: false,
      disponible_salon: true,
      disponible_domicilio: false,
      adicional_domicilio: '0',
      destacado: false,
      disponible: true,
    });
    setImagenFile(null);
    setImagenPreview(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (servicio: Servicio) => {
    console.log('✏️ Editando servicio:', servicio);
    console.log('🖼️ Imagen del servicio:', servicio.imagen, servicio.imagen_url);
    
    setModoEdicion(true);
    setServicioSeleccionado(servicio);
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      descripcion_corta: servicio.descripcion_corta,
      categoria: servicio.categoria,
      tipo_precio: servicio.tipo_precio,
      precio_min: servicio.precio_min,
      precio_max: servicio.precio_max || '',
      duracion: servicio.duracion,
      sesiones_incluidas: servicio.sesiones_incluidas,
      es_medico: servicio.es_medico,
      requiere_valoracion: servicio.requiere_valoracion,
      disponible_salon: servicio.disponible_salon,
      disponible_domicilio: servicio.disponible_domicilio,
      adicional_domicilio: servicio.adicional_domicilio,
      destacado: servicio.destacado,
      disponible: servicio.disponible,
    });
    
    setImagenPreview(servicio.imagen_url || null);
    setImagenFile(null);
    setModalAbierto(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ← FUNCIÓN PARA CORREGIR URLs DE IMÁGENES (IP → DOMINIO)
  const getCorrectImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const API_DOMAIN = 'https://api.dzsalon.com';
    const IP_PATTERN = /https:\/\/179\.43\.112\.64/;
    
    if (IP_PATTERN.test(url)) {
      return url.replace(IP_PATTERN, API_DOMAIN);
    }
    
    return url;
  };

  const guardarServicio = async () => {
    if (!formData.nombre?.trim()) {
      alert('❌ El nombre es obligatorio');
      return;
    }
    if (!formData.categoria) {
      alert('❌ La categoría es obligatoria');
      return;
    }
    if (!formData.precio_min || parseFloat(formData.precio_min) <= 0) {
      alert('❌ El precio mínimo debe ser mayor a 0');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const datosFormData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          datosFormData.append(key, value.toString());
        }
      });
      
      if (imagenFile) {
        datosFormData.append('imagen', imagenFile);
      }

      let res: Response;  // ← AGREGAR TIPO EXPLÍCITO
      if (modoEdicion && servicioSeleccionado) {
        res = await fetch(`${apiUrl}/servicios/${servicioSeleccionado.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: datosFormData,
        });
      } else {
        res = await fetch(`${apiUrl}/servicios/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: datosFormData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.nombre?.[0] || 'Error al guardar');
      }

      alert(`✅ Servicio ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`);
      setModalAbierto(false);
      cargarServicios();
    } catch (err: any) {
      console.error('Error guardando servicio:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarServicio = async (servicio: Servicio) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio "${servicio.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← AGREGAR TIPO EXPLÍCITO: Response
      const res: Response = await fetch(`${apiUrl}/servicios/${servicio.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Error al eliminar servicio');
      }

      alert('✅ Servicio eliminado exitosamente');
      cargarServicios();
    } catch (err: any) {
      console.error('Error eliminando servicio:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // Filtros - ← AGREGAR TIPOS EXPLÍCITOS EN CALLBACKS
  const serviciosFiltrados = servicios.filter((servicio: Servicio) => {
    if (filtroCategoria !== 'todas' && servicio.categoria.toString() !== filtroCategoria) {
      return false;
    }
    
    if (filtroDisponible !== 'todos') {
      const disponible = filtroDisponible === 'si';
      if (servicio.disponible !== disponible) {
        return false;
      }
    }
    
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      const coincideNombre = servicio.nombre.toLowerCase().includes(busquedaLower);
      const coincideDescripcion = servicio.descripcion.toLowerCase().includes(busquedaLower);
      const coincideCategoria = servicio.categoria_nombre.toLowerCase().includes(busquedaLower);
      
      if (!coincideNombre && !coincideDescripcion && !coincideCategoria) {
        return false;
      }
    }
    
    return true;
  });

  // Paginación
  const indiceUltimo = paginaActual * serviciosPorPagina;
  const indicePrimero = indiceUltimo - serviciosPorPagina;
  const serviciosPaginados = serviciosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(serviciosFiltrados.length / serviciosPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">🛠️ Gestión de Servicios</h1>
          <p className="text-gray-600 mt-2">Administra los servicios del salón</p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, descripción o categoría..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              {categorias.map((cat: Categoria) => (  // ← TIPO EXPLÍCITO
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Disponible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroDisponible}
              onChange={(e) => setFiltroDisponible(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="si">Disponibles</option>
              <option value="no">No disponibles</option>
            </select>
          </div>
        </div>

        {/* Contador */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{serviciosFiltrados.length}</strong> de <strong>{servicios.length}</strong> servicios
          </p>
          <button
            onClick={() => {
              setFiltroCategoria('todas');
              setFiltroDisponible('todos');
              setBusqueda('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviciosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    📭 No hay servicios que mostrar
                  </td>
                </tr>
              ) : (
                serviciosPaginados.map((servicio) => (
                  <tr key={servicio.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {servicio.imagen_url ? (
                        <img 
                          src={getCorrectImageUrl(servicio.imagen_url) || ''} 
                          alt={servicio.nombre} 
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            console.error('❌ Error cargando imagen:', servicio.imagen_url);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{servicio.nombre}</div>
                          {servicio.destacado && (
                            <span className="text-xs text-yellow-600">⭐ Destacado</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{servicio.categoria_nombre}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {servicio.tipo_precio === 'rango' 
                          ? `${formatPrice(servicio.precio_min)} - ${formatPrice(servicio.precio_max || '0')}`
                          : formatPrice(servicio.precio_min)
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{servicio.duracion || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          servicio.disponible 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {servicio.disponible ? '✅ Disponible' : '❌ No disponible'}
                        </span>
                        {servicio.es_medico && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            🩺 Médico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalEditar(servicio)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => eliminarServicio(servicio)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Eliminar"
                        >
                          🗑️ Eliminar
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

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando <strong>{indicePrimero + 1}</strong> a{' '}
              <strong>{Math.min(indiceUltimo, serviciosFiltrados.length)}</strong> de{' '}
              <strong>{serviciosFiltrados.length}</strong> servicios
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={serviciosPorPagina}
                onChange={(e) => {
                  setServiciosPorPagina(Number(e.target.value));
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
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {modoEdicion ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
                </h2>
                <p className="text-sm opacity-90">
                  {modoEdicion ? 'Actualiza la información del servicio' : 'Crea un nuevo servicio'}
                </p>
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
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Corte de Cabello Dama"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => handleInputChange('categoria', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Seleccionar...</option>
                    {categorias.map((cat: Categoria) => (  // ← TIPO EXPLÍCITO
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Precio</label>
                  <select
                    value={formData.tipo_precio}
                    onChange={(e) => handleInputChange('tipo_precio', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fijo">Precio Fijo</option>
                    <option value="rango">Rango de Precios</option>
                    <option value="desde">Precio Desde</option>
                  </select>
                </div>

                {/* Precio Mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio Mínimo *</label>
                  <input
                    type="number"
                    value={formData.precio_min}
                    onChange={(e) => handleInputChange('precio_min', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Precio Máximo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Precio Máximo</label>
                  <input
                    type="number"
                    value={formData.precio_max ?? ''}  // ← AGREGAR ?? '' para convertir null a ''
                    onChange={(e) => handleInputChange('precio_max', e.target.value)}
                    disabled={formData.tipo_precio !== 'rango'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="0"
                  />
                </div>

                {/* Duración */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duración</label>
                  <input
                    type="text"
                    value={formData.duracion  ?? ''}
                    onChange={(e) => handleInputChange('duracion', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 60 minutos"
                  />
                </div>

                {/* Sesiones Incluidas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sesiones Incluidas</label>
                  <input
                    type="number"
                    value={formData.sesiones_incluidas  ?? ''}
                    onChange={(e) => handleInputChange('sesiones_incluidas', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>

                {/* Descripción Corta */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción Corta</label>
                  <input
                    type="text"
                    value={formData.descripcion_corta  ?? ''}
                    onChange={(e) => handleInputChange('descripcion_corta', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Breve descripción para listados"
                  />
                </div>

                {/* Descripción Larga */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción Completa</label>
                  <textarea
                    value={formData.descripcion  ?? ''}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción detallada del servicio"
                  />
                </div>

                {/* Imagen */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                  {imagenPreview && (
                    <div className="mb-2">
                      <img 
                        src={getCorrectImageUrl(imagenPreview) || ''} 
                        alt="Vista previa" 
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Checkboxes - Columna 1 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.es_medico}
                      onChange={(e) => handleInputChange('es_medico', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">🩺 Es servicio médico</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requiere_valoracion}
                      onChange={(e) => handleInputChange('requiere_valoracion', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">⭐ Requiere valoración</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.destacado}
                      onChange={(e) => handleInputChange('destacado', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">⭐ Destacado</span>
                  </label>
                </div>

                {/* Checkboxes - Columna 2 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.disponible_salon}
                      onChange={(e) => handleInputChange('disponible_salon', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">🏠 Disponible en salón</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.disponible_domicilio}
                      onChange={(e) => handleInputChange('disponible_domicilio', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">🚗 Disponible a domicilio</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.disponible}
                      onChange={(e) => handleInputChange('disponible', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">✅ Activo/Disponible</span>
                  </label>
                </div>

                {/* Adicional Domicilio */}
                {formData.disponible_domicilio && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adicional a Domicilio</label>
                    <input
                      type="number"
                      value={formData.adicional_domicilio  ?? ''}
                      onChange={(e) => handleInputChange('adicional_domicilio', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarServicio}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}