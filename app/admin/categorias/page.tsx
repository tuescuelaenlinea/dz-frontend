// app\admin\categorias\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// ← AGREGAR: Import del modal de asignación de servicios
import CategoryServicesModal from '@/components/admin/CategoryServicesModal';

// ← ACTUALIZAR: Interfaz con campo opcional para contador
interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  orden: number;
  activo: boolean;
  // ← NUEVO: Campo opcional para contador de servicios (puede no venir del backend)
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
  
  // Modal principal (crear/editar categoría)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null);
  
  // ← NUEVO: Estados para modal de asignación de servicios
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

  // Íconos disponibles (emojis)
  const iconosDisponibles = [
    '✂️', '💇', '💅', '💄', '🧖', '🧘', '💆', '👁️', '👄', '🦶',
    '🎨', '🌟', '⭐', '🔥', '💎', '👑', '🌸', '🌺', '🌹', '💐',
    '🏆', '🎯', '✨', '💫', '🌈', '🦋', '🐝', '🌿', '🍃', '🌱',
    '💜', '💙', '💚', '💛', '🧡', '❤️', '🤍', '🖤', '💖', '💗',
  ];

  useEffect(() => {
    cargarCategorias();
  }, []);

  // Resetear paginación al filtrar
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
      
      console.log('📦 Categorías cargadas:', categoriasList.length);
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
      orden: categorias.length > 0 ? Math.max(...categorias.map(c => c.orden)) + 1 : 0,
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

  // ← NUEVA FUNCIÓN: Abrir modal de asignación de servicios
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

  // ← FUNCIÓN PARA CORREGIR URLs DE IMÁGENES
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
    
    console.log('💾 Guardando categoría...', { modoEdicion, formData });
    
    let res: Response;
    let url: string;
    
    if (modoEdicion && categoriaSeleccionada) {
      url = `${apiUrl}/categorias/${categoriaSeleccionada.id}/`;
      console.log('🔗 URL:', url, '(PATCH + JSON)');
      
      const datosJson: any = {
        nombre: formData.nombre,
        orden: formData.orden,
        activo: formData.activo,
      };
      
      if (formData.icono) {
        datosJson.icono = formData.icono;
      }
      
      if (imagenFile) {
        console.log('📎 Imagen nueva detectada, usando FormData solo para imagen...');
        const formDataImagen = new FormData();
        formDataImagen.append('imagen', imagenFile);
        
        const resImagen = await fetch(url, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formDataImagen,
        });
        
        if (!resImagen.ok) {
          console.error('❌ Error actualizando imagen:', resImagen.status);
        }
      }
      
      res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosJson),
      });
      
    } else {
      url = `${apiUrl}/categorias/`;
      console.log('🔗 URL:', url, '(POST + FormData)');
      
      const datosFormData = new FormData();
      if (formData.nombre) datosFormData.append('nombre', formData.nombre);
      if (formData.icono) datosFormData.append('icono', formData.icono);
      if (formData.orden !== undefined) datosFormData.append('orden', formData.orden.toString());
      if (formData.activo !== undefined) datosFormData.append('activo', formData.activo.toString());
      if (imagenFile) datosFormData.append('imagen', imagenFile);
      
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: datosFormData,
      });
    }

    console.log('📥 Response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ Error del backend:', errorData);
      
      let errorMessage = `Error ${res.status}: `;
      if (errorData.nombre) {
        errorMessage += `Nombre: ${Array.isArray(errorData.nombre) ? errorData.nombre.join(', ') : errorData.nombre}`;
      } else if (errorData.detail) {
        errorMessage += errorData.detail;
      } else {
        errorMessage += 'Error al guardar categoría';
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log('✅ Categoría guardada:', data);
    
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
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`)) {
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

  // Filtros
  const categoriasFiltradas = categorias.filter((cat) => {
    if (filtroActivo !== 'todos') {
      const activo = filtroActivo === 'si';
      if (cat.activo !== activo) return false;
    }
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      return cat.nombre.toLowerCase().includes(busquedaLower);
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

      {/* Tabla de Categorías */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ícono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imagen</th>
                {/* ← NUEVA COLUMNA: Servicios */}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicios</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoriasPaginadas.length === 0 ? (
                <tr>
                  {/* ← Actualizar colSpan a 7 por la nueva columna */}
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    📭 No hay categorías registradas
                  </td>
                </tr>
              ) : (
                categoriasPaginadas.map((categoria) => (
                  <tr key={categoria.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">#{categoria.orden}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-2xl">{categoria.icono || '📁'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{categoria.nombre}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {categoria.imagen_url ? (
                        <img 
                          src={getCorrectImageUrl(categoria.imagen_url) || ''} 
                          alt={categoria.nombre} 
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Sin imagen</span>
                      )}
                    </td>
                    {/* ← NUEVA CELDA: Botón para abrir modal de servicios */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalServicios(categoria)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                        title="Gestionar servicios de esta categoría"
                      >
                        🛠️ {categoria.servicios_count ?? 0} servicios
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleActivo(categoria)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          categoria.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {categoria.activo ? '✅ Activa' : '⏸️ Inactiva'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalEditar(categoria)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => eliminarCategoria(categoria)}
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

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {modoEdicion ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
                </h2>
                <p className="text-sm opacity-90">
                  {modoEdicion ? 'Actualiza la información' : 'Crea una nueva categoría'}
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
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre ?? ''}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Peluquería, Estética, Uñas..."
                />
              </div>

              {/* Ícono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ícono</label>
                <div className="grid grid-cols-10 gap-2 mb-2">
                  {iconosDisponibles.map((icono) => (
                    <button
                      key={icono}
                      type="button"
                      onClick={() => handleInputChange('icono', icono)}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        formData.icono === icono
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.icono ?? ''}
                  onChange={(e) => handleInputChange('icono', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="O escribe un emoji: ✂️"
                />
              </div>

              {/* Orden */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                <input
                  type="number"
                  value={formData.orden ?? ''}
                  onChange={(e) => handleInputChange('orden', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Las categorías con menor orden aparecen primero</p>
              </div>

              {/* Imagen */}
              <div>
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

              {/* Estado */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => handleInputChange('activo', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  ✅ Categoría activa (visible en el sitio)
                </label>
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
                onClick={guardarCategoria}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← NUEVO: Modal de Asignación de Servicios (al final, antes de cerrar el return) */}
      {modalServiciosAbierto && categoriaParaServicios && (
        <CategoryServicesModal
          isOpen={modalServiciosAbierto}
          onClose={() => {
            setModalServiciosAbierto(false);
            setCategoriaParaServicios(null);
          }}
          categoriaId={categoriaParaServicios.id}
          categoriaNombre={categoriaParaServicios.nombre}
          onServicesUpdated={() => {
            // Refrescar lista de categorías para actualizar contador
            cargarCategorias();
          }}
        />
      )}
    </div>
  );
}