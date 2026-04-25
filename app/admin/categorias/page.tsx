// app\admin\categorias\page.tsx
// app\admin\categorias\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CategoryServicesModal from '@/components/admin/CategoryServicesModal';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  orden: number;
  activo: boolean;
  servicios_count?: number;
}

export default function AdminCategoriasPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Modal principal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null);
  
  // Modal de servicios
  const [modalServiciosAbierto, setModalServiciosAbierto] = useState(false);
  const [categoriaParaServicios, setCategoriaParaServicios] = useState<Categoria | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<Partial<Categoria>>({
    nombre: '',
    icono: '',
    imagen: null,
    orden: 0,
    activo: true,
  });
  
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [categoriasPorPagina, setCategoriasPorPagina] = useState(20);

  const iconosDisponibles = [
    '✂️', '💇', '💅', '💄', '🧖', '🧘', '💆', '👁️', '👄', '🦶',
    '🎨', '🌟', '⭐', '🔥', '💎', '👑', '🌸', '🌺', '🌹', '💐',
    '🏆', '🎯', '✨', '💫', '🌈', '🦋', '🐝', '🌿', '🍃', '🌱',
    '💜', '💙', '💚', '💛', '🧡', '❤️', '🤍', '🖤', '💖', '💗',
  ];

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroActivo, busqueda]);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/categorias/?ordering=orden,nombre`, {
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
        throw new Error('Error al cargar categorías');
      }

      const data = await res.json();
      const categoriasList = Array.isArray(data) ? data : (data.results || []);
      
      setCategorias(categoriasList);
    } catch (err: any) {
      console.error('❌ Error cargando categorías:', err);
      setError(err.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setCategoriaSeleccionada(null);
    setFormData({
      nombre: '',
      icono: '',
      imagen: null,
      orden: categorias.length > 0 ? Math.max(...categorias.map(c => c.orden ?? 0)) + 1 : 0,
      activo: true,
    });
    setImagenFile(null);
    setImagenPreview(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (categoria: Categoria) => {
    setModoEdicion(true);
    setCategoriaSeleccionada(categoria);
    setFormData({
      nombre: categoria.nombre,
      icono: categoria.icono || '',
      imagen: categoria.imagen,
      orden: categoria.orden,
      activo: categoria.activo,
    });
    setImagenPreview(categoria.imagen_url || null);
    setImagenFile(null);
    setModalAbierto(true);
  };

  const abrirModalServicios = (categoria: Categoria) => {
    setCategoriaParaServicios(categoria);
    setModalServiciosAbierto(true);
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
    
    const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
    const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
        .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
        .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
        .replace('http://127.0.0.1:8080', LOCAL_DOMAIN);
    }
    
    if (url.startsWith('/media/')) {
      const baseUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : LOCAL_DOMAIN;
      return `${baseUrl}${url}`;
    }
    
    return url;
  };

  const guardarCategoria = async () => {
    if (!formData.nombre?.trim()) {
      alert('❌ El nombre es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      let res: Response;
      
      if (modoEdicion && categoriaSeleccionada) {
        const datosJson: any = {
          nombre: formData.nombre,
          orden: formData.orden,
          activo: formData.activo,
        };
        if (formData.icono) datosJson.icono = formData.icono;
        
        if (imagenFile) {
          const formDataImagen = new FormData();
          formDataImagen.append('imagen', imagenFile);
          await fetch(`${apiUrl}/categorias/${categoriaSeleccionada.id}/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formDataImagen,
          });
        }
        
        res = await fetch(`${apiUrl}/categorias/${categoriaSeleccionada.id}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(datosJson),
        });
      } else {
        const datosFormData = new FormData();
        if (formData.nombre) datosFormData.append('nombre', formData.nombre);
        if (formData.icono) datosFormData.append('icono', formData.icono);
        if (formData.orden !== undefined) datosFormData.append('orden', formData.orden.toString());
        if (formData.activo !== undefined) datosFormData.append('activo', formData.activo.toString());
        if (imagenFile) datosFormData.append('imagen', imagenFile);
        
        res = await fetch(`${apiUrl}/categorias/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: datosFormData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.nombre?.[0] || 'Error al guardar');
      }

      alert(`✅ Categoría ${modoEdicion ? 'actualizada' : 'creada'} exitosamente`);
      setModalAbierto(false);
      cargarCategorias();
    } catch (err: any) {
      console.error('❌ Error guardando categoría:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCategoria = async (categoria: Categoria) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/categorias/${categoria.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al eliminar categoría');
      }

      alert('✅ Categoría eliminada exitosamente');
      cargarCategorias();
    } catch (err: any) {
      console.error('❌ Error eliminando categoría:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const toggleActivo = async (categoria: Categoria) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res: Response = await fetch(`${apiUrl}/categorias/${categoria.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !categoria.activo }),
      });

      if (res.ok) cargarCategorias();
    } catch (err) {
      console.error('❌ Error actualizando estado:', err);
    }
  };

  // ← CORREGIR: Filtro con optional chaining para null-safety
  const categoriasFiltradas = categorias.filter((cat) => {
    if (filtroActivo !== 'todos') {
      const activo = filtroActivo === 'si';
      if (cat.activo !== activo) return false;
    }
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      return cat.nombre?.toLowerCase().includes(busquedaLower);
    }
    return true;
  });

  // Paginación
  const indiceUltimo = paginaActual * categoriasPorPagina;
  const indicePrimero = indiceUltimo - categoriasPorPagina;
  const categoriasPaginadas = categoriasFiltradas.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(categoriasFiltradas.length / categoriasPorPagina);

  const irAPagina = (pagina: number) => {
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">📁 Gestión de Categorías</h1>
          <p className="text-gray-600 mt-2">Organiza tus servicios por categorías</p>
        </div>
        <button
          onClick={abrirModalCrear}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Categoría
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre de categoría..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="si">Activas</option>
              <option value="no">Inactivas</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando <strong>{categoriasFiltradas.length}</strong> de <strong>{categorias.length}</strong> categorías
          </p>
          <button
            onClick={() => { setFiltroActivo('todos'); setBusqueda(''); }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ← GRID DE CARDS - Nuevo diseño igual que servicios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {categoriasPaginadas.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl shadow-lg">
            📭 No hay categorías registradas
          </div>
        ) : (
          categoriasPaginadas.map((categoria) => (
            <div key={categoria.id} className="flex flex-col">
              {/* Card clickeable para editar */}
              <div
                onClick={() => abrirModalEditar(categoria)}
                className={`relative h-48 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02] ${
                  !categoria.activo ? 'opacity-75 ring-2 ring-red-400' : 'ring-1 ring-gray-200'
                }`}
              >
                {/* Imagen de fondo o fallback */}
                {categoria.imagen_url ? (
                  <img 
                    src={getCorrectImageUrl(categoria.imagen_url)!} 
                    alt={categoria.nombre}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <span className="text-5xl">{categoria.icono || '📁'}</span>
                  </div>
                )}
                
                {/* Overlay para contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                
                {/* Información sobre la imagen */}
                <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                  {/* Badge de estado */}
                  <div className="flex justify-end">
                    {!categoria.activo && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Inactiva</span>
                    )}
                  </div>
                  
                  {/* Info principal */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoria.icono || '📁'}</span>
                      <h3 className="font-bold text-sm leading-tight">{categoria.nombre}</h3>
                    </div>
                    <p className="text-xs text-gray-300">Orden: #{categoria.orden}</p>
                  </div>
                  
                  {/* Badge de servicios */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-300">
                      {categoria.servicios_count ?? 0} servicios
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      categoria.activo ? 'bg-green-500/80' : 'bg-gray-500/80'
                    }`}>
                      {categoria.activo ? '✅' : '⏸️'}
                    </span>
                  </div>
                </div>
                
                {/* Indicador visual de clickeable */}
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              
              {/* Botones de acción FUERA de la card */}
              <div className="flex items-center justify-between gap-1 mt-2 px-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModalServicios(categoria);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors flex items-center justify-center gap-1"
                  title="Gestionar servicios"
                >
                  🛠️ Servicios
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarCategoria(categoria);
                  }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
                  title="Eliminar categoría"
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
              <strong>{Math.min(indiceUltimo, categoriasFiltradas.length)}</strong> de{' '}
              <strong>{categoriasFiltradas.length}</strong> categorías
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Mostrar:</label>
              <select
                value={categoriasPorPagina}
                onChange={(e) => { setCategoriasPorPagina(Number(e.target.value)); setPaginaActual(1); }}
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

      {/* ← MODAL HORIZONTAL TIPO CARNET */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Header compacto */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold">
                  {modoEdicion ? '✏️ Editar' : '➕ Nueva'} Categoría
                </h2>
                <p className="text-xs opacity-90">{categoriaSeleccionada?.nombre || 'Información de la categoría'}</p>
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

            {/* Contenido horizontal tipo carnet */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                
                {/* ← Columna izquierda: Imagen grande */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                  <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                    {imagenPreview ? (
                      <img 
                        src={getCorrectImageUrl(imagenPreview)!} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Subir imagen</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="w-full mt-2 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* ← Columna derecha: Información */}
                <div className="col-span-2 space-y-3">
                  {/* Fila 1: Nombre */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre ?? ''}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Peluquería, Estética..."
                    />
                  </div>

                  {/* Fila 2: Ícono selector */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Ícono</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-8 gap-1 max-h-16 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                        {iconosDisponibles.map((icono) => (
                          <button
                            key={icono}
                            type="button"
                            onClick={() => handleInputChange('icono', icono)}
                            className={`text-lg p-1 rounded transition-colors ${
                              formData.icono === icono
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'hover:bg-gray-200'
                            }`}
                            title={icono}
                          >
                            {icono}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={formData.icono ?? ''}
                        onChange={(e) => handleInputChange('icono', e.target.value)}
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="✏️"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Orden y Estado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Orden</label>
                      <input
                        type="number"
                        value={formData.orden ?? ''}
                        onChange={(e) => handleInputChange('orden', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 w-full">
                        <input
                          type="checkbox"
                          checked={formData.activo}
                          onChange={(e) => handleInputChange('activo', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-[11px] text-gray-700 font-semibold">✅ Activa</span>
                      </label>
                    </div>
                  </div>

                  {/* Vista previa compacta */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="text-[11px] font-semibold text-blue-800 mb-2">👁️ Vista Previa</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{formData.icono || '📁'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formData.nombre || 'Nombre de categoría'}</p>
                        <p className="text-[10px] text-gray-500">Orden: #{formData.orden || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-2xl flex gap-2 flex-shrink-0">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCategoria}
                disabled={guardando}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asignación de Servicios */}
      {modalServiciosAbierto && categoriaParaServicios && (
        <CategoryServicesModal
          isOpen={modalServiciosAbierto}
          onClose={() => {
            setModalServiciosAbierto(false);
            setCategoriaParaServicios(null);
          }}
          categoriaId={categoriaParaServicios.id}
          categoriaNombre={categoriaParaServicios.nombre}
          onServicesUpdated={() => cargarCategorias()}
        />
      )}
    </div>
  );
}