// app\admin\servicios\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ServicioProfesionalesModal from '@/components/admin/ServicioProfesionalesModal';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  icono?: string | null;
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
  profesionales_count?: number;
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
  const [mostrarInactivos, setMostrarInactivos] = useState(true);
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);

  const [modalProfesionalesAbierto, setModalProfesionalesAbierto] = useState(false);
  const [servicioParaProfesionales, setServicioParaProfesionales] = useState<Servicio | null>(null);
  
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

  const abrirModalProfesionales = (servicio: Servicio) => {
    setServicioParaProfesionales(servicio);
    setModalProfesionalesAbierto(true);
  };
  
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [serviciosPorPagina, setServiciosPorPagina] = useState(20);

  useEffect(() => {
    cargarServicios();
    cargarCategorias();
  }, [mostrarInactivos]);

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
      
      let todosLosServicios: Servicio[] = [];
      let url: string = `${apiUrl}/servicios/?ordering=nombre&page_size=1000`;
      if (mostrarInactivos) {
        url += '&incluir_inactivos=true';
      }
      let pageCount = 0;
      const maxPages = 20;
      
      while (url && pageCount < maxPages) {
        pageCount++;
        const correctedUrl = url
          .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
          .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''));
        
        const res: Response = await fetch(correctedUrl, {
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
        
        if (data.results && Array.isArray(data.results)) {
          todosLosServicios = [...todosLosServicios, ...data.results];
          
          if (data.next) {
            url = data.next
              .replace('https://179.43.112.64', apiUrl.replace('/api', ''))
              .replace('http://179.43.112.64:8080', apiUrl.replace('/api', ''));
          } else {
            url = '';
          }
        } else if (Array.isArray(data)) {
          todosLosServicios = data;
          break;
        } else {
          break;
        }
      }
      
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
    
    setModoEdicion(true);
    setServicioSeleccionado(servicio);
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      descripcion_corta: servicio.descripcion_corta,
      categoria: servicio.categoria ?? 0,
      tipo_precio: servicio.tipo_precio,
      precio_min: servicio.precio_min,
      precio_max: servicio.precio_max ?? '',
      duracion: servicio.duracion ?? '',
      sesiones_incluidas: servicio.sesiones_incluidas ?? 1,
      es_medico: servicio.es_medico ?? false,
      requiere_valoracion: servicio.requiere_valoracion ?? false,
      disponible_salon: servicio.disponible_salon ?? true,
      disponible_domicilio: servicio.disponible_domicilio ?? false,
      adicional_domicilio: servicio.adicional_domicilio ?? '0',
      destacado: servicio.destacado ?? false,
      disponible: servicio.disponible ?? true,
    });
    
    setImagenPreview(servicio.imagen_url ?? null);
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
          if (typeof value === 'boolean') {
            datosFormData.append(key, value ? '1' : '0');
          } else if (typeof value === 'number') {
            datosFormData.append(key, value.toString());
          } else {
            datosFormData.append(key, String(value));
          }
        }
      });
      
      if (imagenFile) {
        datosFormData.append('imagen', imagenFile);
      }

      let res: Response;
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

  const serviciosFiltrados = servicios.filter((servicio: Servicio) => {
    // ← CORREGIR: Optional chaining para evitar null.toString()
    if (filtroCategoria !== 'todas' && servicio.categoria?.toString() !== filtroCategoria) {
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
      const coincideDescripcion = (servicio.descripcion || '').toLowerCase().includes(busquedaLower);
      const coincideCategoria = (servicio.categoria_nombre || '').toLowerCase().includes(busquedaLower);
      
      if (!coincideNombre && !coincideDescripcion && !coincideCategoria) {
        return false;
      }
    }
    
    return true;
  });

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              {categorias.map((cat: Categoria) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

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

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        {serviciosPaginados.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl shadow-lg">
            📭 No hay servicios que mostrar
          </div>
        ) : (
          serviciosPaginados.map((servicio) => (
            <div key={servicio.id} className="flex flex-col">
              {/* Card con información sobre la imagen */}
              <div
                onClick={() => abrirModalEditar(servicio)}
                className={`relative h-48 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-105 ${
                  !servicio.disponible ? 'opacity-75 ring-2 ring-red-400' : 'ring-1 ring-gray-200'
                }`}
              >
                {servicio.imagen_url ? (
                  <img 
                    src={getCorrectImageUrl(servicio.imagen_url) || ''} 
                    alt={servicio.nombre} 
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                
                <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                  <div className="flex flex-wrap gap-1">
                    {servicio.destacado && (
                      <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full">⭐</span>
                    )}
                    {!servicio.disponible && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">INACTIVO</span>
                    )}
                    {servicio.es_medico && (
                      <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full">🩺</span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm line-clamp-2 leading-tight">{servicio.nombre}</h3>
                    <p className="text-xs text-gray-300 line-clamp-1">
                      {servicio.categoria_nombre ? (
                        <>📁 {servicio.categoria_nombre}</>
                      ) : (
                        <span className="text-yellow-300/80">⚠️ Sin categoría</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-green-400">
                        {servicio.tipo_precio === 'rango' 
                          ? `${formatPrice(servicio.precio_min)} - ${formatPrice(servicio.precio_max || '0')}`
                          : formatPrice(servicio.precio_min)
                        }
                      </span>
                      <span className="text-[10px] text-gray-300">{servicio.duracion || 'N/A'}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {servicio.disponible_salon && (
                        <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-[9px] rounded">🏠</span>
                      )}
                      {servicio.disponible_domicilio && (
                        <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-[9px] rounded">🚗</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              
              {/* Botones de acción FUERA de la card */}
              <div className="flex items-center justify-between gap-1 mt-2 px-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModalProfesionales(servicio);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors flex items-center justify-center gap-1"
                  title="Gestionar profesionales"
                >
                  👥 {servicio.profesionales_count ?? 0}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModalEditar(servicio);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                  title="Editar"
                >
                  ✏️
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarServicio(servicio);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
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

      {/* ← MODAL COMPACTO SIN SCROLL */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Header compacto */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">
                  {modoEdicion ? '✏️ Editar' : '➕ Nuevo'}
                </h2>
                <p className="text-xs opacity-90">
                  {servicioSeleccionado?.nombre || 'Servicio'}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido compacto - Grid 3 columnas */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3">
                {/* Columna 1: Datos básicos */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Nombre del servicio"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Categoría *</label>
                    <select
                      value={formData.categoria ?? 0}
                      onChange={(e) => handleInputChange('categoria', Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={0}>Seleccionar...</option>
                      {categorias.map((cat: Categoria) => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Tipo Precio</label>
                    <select
                      value={formData.tipo_precio}
                      onChange={(e) => handleInputChange('tipo_precio', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="fijo">Fijo</option>
                      <option value="rango">Rango</option>
                      <option value="desde">Desde</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Precio Mín *</label>
                    <input
                      type="number"
                      value={formData.precio_min}
                      onChange={(e) => handleInputChange('precio_min', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Precio Max</label>
                    <input
                      type="number"
                      value={formData.precio_max ?? ''}
                      onChange={(e) => handleInputChange('precio_max', e.target.value)}
                      disabled={formData.tipo_precio !== 'rango'}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Columna 2: Detalles */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Duración</label>
                    <input
                      type="text"
                      value={formData.duracion ?? ''}
                      onChange={(e) => handleInputChange('duracion', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Ej: 45 min"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Sesiones</label>
                    <input
                      type="number"
                      value={formData.sesiones_incluidas ?? ''}
                      onChange={(e) => handleInputChange('sesiones_incluidas', Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Desc. Corta</label>
                    <input
                      type="text"
                      value={formData.descripcion_corta ?? ''}
                      onChange={(e) => handleInputChange('descripcion_corta', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Breve descripción"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Imagen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    {imagenPreview && (
                      <img 
                        src={getCorrectImageUrl(imagenPreview) || ''} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded mt-2"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>

                {/* Columna 3: Descripciones y opciones */}
                <div className="space-y-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formData.descripcion ?? ''}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 resize-none"
                      placeholder="Descripción detallada"
                    />
                  </div>
                  
                  {/* Checkboxes compactos */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.es_medico}
                        onChange={(e) => handleInputChange('es_medico', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700">🩺 Médico</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.requiere_valoracion}
                        onChange={(e) => handleInputChange('requiere_valoracion', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700">⭐ Valora</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.destacado}
                        onChange={(e) => handleInputChange('destacado', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700">⭐ Destacado</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.disponible_salon}
                        onChange={(e) => handleInputChange('disponible_salon', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700">🏠 Salón</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.disponible_domicilio}
                        onChange={(e) => handleInputChange('disponible_domicilio', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700">🚗 Domicilio</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={formData.disponible}
                        onChange={(e) => handleInputChange('disponible', e.target.checked)}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span className="text-[10px] text-gray-700 font-semibold">✅ Activo</span>
                    </label>
                  </div>
                  
                  {formData.disponible_domicilio && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Adic. Domicilio</label>
                      <input
                        type="number"
                        value={formData.adicional_domicilio ?? ''}
                        onChange={(e) => handleInputChange('adicional_domicilio', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer compacto */}
            <div className="sticky bottom-0 bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl flex gap-2 flex-shrink-0">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarServicio}
                disabled={guardando}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {modalProfesionalesAbierto && servicioParaProfesionales && (
        <ServicioProfesionalesModal
          isOpen={modalProfesionalesAbierto}
          onClose={() => {
            setModalProfesionalesAbierto(false);
            setServicioParaProfesionales(null);
          }}
          servicioId={servicioParaProfesionales.id}
          servicioNombre={servicioParaProfesionales.nombre}
          onProfesionalesUpdated={() => cargarServicios()}
        />
      )}
    </div>
  );
}