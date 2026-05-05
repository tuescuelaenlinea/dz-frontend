// app/admin/productos/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ← ← ← INTERFACES ← ← ←

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  descripcion: string;
  linea: number | null;
  linea_nombre: string | null;
  codigo_barras: string;
  costo: string;
  precio_venta: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  imagen: string | null;
  imagen_url: string | null;
  disponible: boolean;
  creado: string;
  actualizado: string;
}

interface Linea {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

interface FormData {
  nombre: string;
  marca: string;
  descripcion: string;
  linea: string;
  codigo_barras: string;
  costo: string;
  precio_venta: string;
  stock_actual: string;
  stock_minimo: string;
  activo: boolean;
  imagen: File | null;
}

interface LineaFormData {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// ← ← ← COMPONENTE PRINCIPAL ← ← ←

export default function AdminProductosPage() {
  const router = useRouter();
  
  // ← Estados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lineaFilter, setLineaFilter] = useState<string>('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  
  // ← Modal states - Producto
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    marca: '',
    descripcion: '',
    linea: '',
    codigo_barras: '',
    costo: '',
    precio_venta: '',
    stock_actual: '0',
    stock_minimo: '5',
    activo: true,
    imagen: null,
  });
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  // ← Modal states - Línea
  const [modalLineaAbierto, setModalLineaAbierto] = useState(false);
  const [lineaFormData, setLineaFormData] = useState<LineaFormData>({
    nombre: '',
    descripcion: '',
    activo: true,
  });
  const [guardandoLinea, setGuardandoLinea] = useState(false);

  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Cargar datos al montar
  useEffect(() => {
    cargarProductos();
    cargarLineas();
  }, []);

  // ← Cargar productos
  const cargarProductos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (soloBajoStock) params.append('stock_bajo', 'true');
      
      const res = await fetch(`${apiUrl}/productos/?${params.toString()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.results || []);
        setProductos(lista);
      }
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
      alert('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // ← Cargar líneas
  const cargarLineas = async () => {
    try {
      const res = await fetch(`${apiUrl}/lineas/?activo=true&ordering=nombre`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setLineas(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando líneas:', err);
    }
  };

  // ← Crear nueva línea
  const crearLinea = async () => {
    if (!lineaFormData.nombre.trim()) {
      alert('❌ El nombre de la línea es obligatorio');
      return;
    }

    setGuardandoLinea(true);
    
    try {
      const res = await fetch(`${apiUrl}/lineas/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineaFormData),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || error.error || 'Error al crear línea');
      }

      const nuevaLinea = await res.json();
      setLineas([...lineas, nuevaLinea]);
      
      // Seleccionar automáticamente la nueva línea en el formulario de producto
      setFormData(prev => ({ ...prev, linea: nuevaLinea.id.toString() }));
      
      alert('✅ Línea creada exitosamente');
      setModalLineaAbierto(false);
      setLineaFormData({ nombre: '', descripcion: '', activo: true });
      
    } catch (err: any) {
      console.error('❌ Error creando línea:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardandoLinea(false);
    }
  };

  // ← Abrir modal para crear línea
  const abrirModalLinea = () => {
    setLineaFormData({ nombre: '', descripcion: '', activo: true });
    setModalLineaAbierto(true);
  };

  // ← Filtrar productos
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchSearch = searchTerm === '' || 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchLinea = lineaFilter === '' || 
        String(p.linea) === lineaFilter;
      
      const matchStock = !soloBajoStock || 
        p.stock_actual <= p.stock_minimo;
      
      return matchSearch && matchLinea && matchStock;
    });
  }, [productos, searchTerm, lineaFilter, soloBajoStock]);

  // ← Abrir modal para crear producto
  const abrirModalCrear = () => {
    setEditandoId(null);
    setFormData({
      nombre: '',
      marca: '',
      descripcion: '',
      linea: '',
      codigo_barras: '',
      costo: '',
      precio_venta: '',
      stock_actual: '0',
      stock_minimo: '5',
      activo: true,
      imagen: null,
    });
    setImagenPreview(null);
    setModalProductoAbierto(true);
  };

  // ← Abrir modal para editar producto
  const abrirModalEditar = (producto: Producto) => {
    setEditandoId(producto.id);
    setFormData({
      nombre: producto.nombre,
      marca: producto.marca,
      descripcion: producto.descripcion,
      linea: producto.linea?.toString() || '',
      codigo_barras: producto.codigo_barras,
      costo: producto.costo,
      precio_venta: producto.precio_venta,
      stock_actual: producto.stock_actual.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      activo: producto.activo,
      imagen: null,
    });
    setImagenPreview(producto.imagen_url);
    setModalProductoAbierto(true);
  };

  // ← Manejar cambio de imagen
  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imagen: file }));
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ← Guardar producto
  const guardarProducto = async () => {
    // Validaciones
    if (!formData.nombre.trim()) {
      alert('❌ El nombre es obligatorio');
      return;
    }
    if (!formData.marca.trim()) {
      alert('❌ La marca es obligatoria');
      return;
    }
    if (parseFloat(formData.precio_venta) <= 0) {
      alert('❌ El precio de venta debe ser mayor a 0');
      return;
    }

    setGuardando(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Campos de texto
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'imagen' && value !== null && value !== '') {
          if (typeof value === 'boolean') {
            formDataToSend.append(key, value.toString());
          } else {
            formDataToSend.append(key, value);
          }
        }
      });
      
      // Imagen si se seleccionó
      if (formData.imagen) {
        formDataToSend.append('imagen', formData.imagen);
      }

      let res: Response;
      let url: string;
      let method: string;

      if (editandoId) {
        // Editar existente
        url = `${apiUrl}/productos/${editandoId}/`;
        method = 'PATCH';
      } else {
        // Crear nuevo
        url = `${apiUrl}/productos/`;
        method = 'POST';
      }

      res = await fetch(url, {
        method,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || error.error || 'Error al guardar');
      }

      alert(`✅ Producto ${editandoId ? 'actualizado' : 'creado'} exitosamente`);
      setModalProductoAbierto(false);
      cargarProductos();
      
    } catch (err: any) {
      console.error('❌ Error guardando:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // ← Eliminar producto
  const eliminarProducto = async (producto: Producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}"?\n\n⚠️ Esta acción no se puede deshacer.`)) {
      return;
    }

    setEliminandoId(producto.id);
    
    try {
      const res = await fetch(`${apiUrl}/productos/${producto.id}/`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error('Error al eliminar');
      }

      alert('✅ Producto eliminado exitosamente');
      cargarProductos();
      
    } catch (err: any) {
      console.error('❌ Error eliminando:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setEliminandoId(null);
    }
  };

  // ← Toggle activo/inactivo
  const toggleActivo = async (producto: Producto) => {
    try {
      const res = await fetch(`${apiUrl}/productos/${producto.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !producto.activo }),
      });

      if (res.ok) {
        cargarProductos();
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  // ← Formatear moneda
  const formatMoney = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num);
  };

  // ← Cerrar modal producto
  const cerrarModalProducto = () => {
    setModalProductoAbierto(false);
    setEditandoId(null);
    setImagenPreview(null);
  };

  // ← Cerrar modal línea
  const cerrarModalLinea = () => {
    setModalLineaAbierto(false);
    setLineaFormData({ nombre: '', descripcion: '', activo: true });
  };

  // ← ← ← RENDER ← ← ←

  if (loading && productos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* ← Header */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">📦 Gestión de Productos</h1>
          <p className="text-gray-600 mt-1">Administra el catálogo y controla el inventario</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Volver
          </button>
          <button
            onClick={abrirModalCrear}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* ← Filtros y Búsqueda */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Buscador */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, marca o código de barras..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Filtro por línea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📂 Línea</label>
            <select
              value={lineaFilter}
              onChange={(e) => setLineaFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas</option>
              {lineas.map(linea => (
                <option key={linea.id} value={linea.id}>{linea.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro stock bajo */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soloBajoStock}
                onChange={(e) => setSoloBajoStock(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">⚠️ Solo bajo stock</span>
            </label>
          </div>
        </div>
      </div>

      {/* ← Stats de Inventario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Productos</p>
          <p className="text-2xl font-bold text-gray-900">{productos.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-green-600">
            {productos.filter(p => p.activo).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">⚠️ Bajo Stock</p>
          <p className="text-2xl font-bold text-orange-600">
            {productos.filter(p => p.stock_actual <= p.stock_minimo).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">📦 Agotados</p>
          <p className="text-2xl font-bold text-red-600">
            {productos.filter(p => p.stock_actual === 0).length}
          </p>
        </div>
      </div>

      {/* ← Tabla de Productos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Producto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden md:table-cell">Marca</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 hidden lg:table-cell">Línea</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Precio</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Stock</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {searchTerm || lineaFilter || soloBajoStock 
                      ? 'No se encontraron productos con los filtros aplicados'
                      : 'No hay productos registrados'}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => {
                  const stockBajo = producto.stock_actual <= producto.stock_minimo;
                  const agotado = producto.stock_actual === 0;
                  
                  return (
                    <tr 
                      key={producto.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => abrirModalEditar(producto)}
                    >
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {producto.imagen_url ? (
                              <img 
                                src={producto.imagen_url} 
                                alt={producto.nombre}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-gray-400 text-lg">📦</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{producto.nombre}</p>
                            {producto.codigo_barras && (
                              <p className="text-xs text-gray-500 font-mono">{producto.codigo_barras}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Marca */}
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{producto.marca}</td>

                      {/* Línea */}
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                        {producto.linea_nombre || 'Sin línea'}
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-right font-semibold text-purple-600">
                        {formatMoney(producto.precio_venta)}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-semibold ${
                            agotado ? 'text-red-600' : stockBajo ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {producto.stock_actual}
                          </span>
                          {stockBajo && !agotado && (
                            <span className="text-xs text-orange-500">
                              Mín: {producto.stock_minimo}
                            </span>
                          )}
                          {agotado && (
                            <span className="text-xs text-red-500 font-medium">AGOTADO</span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActivo(producto);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            producto.activo
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {producto.activo ? '✓ Activo' : '✗ Inactivo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarProducto(producto);
                            }}
                            disabled={eliminandoId === producto.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {eliminandoId === producto.id ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
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

      {/* ← Modal Crear/Editar Producto */}
      {modalProductoAbierto && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {editandoId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                </h2>
              </div>
              <button
                onClick={cerrarModalProducto}
                disabled={guardando}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4">
              <div className="grid grid-cols-12 gap-4">
                
                {/* COLUMNA IZQUIERDA: Imagen */}
                <div className="col-span-12 md:col-span-4 space-y-3">
                  
                  {/* Preview de Imagen */}
                  <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-2">
                    {imagenPreview ? (
                      <div className="relative group">
                        <img 
                          src={imagenPreview} 
                          alt="Vista previa"
                          className="w-full h-40 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Cambiar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gray-100 rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">📦</span>
                        <span className="text-xs mt-1">Sin imagen</span>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagenChange}
                      disabled={guardando}
                      className="mt-2 w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                    />
                  </div>

                  {/* Estado */}
                  <div className="bg-white rounded-lg border border-gray-200 p-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                        disabled={guardando}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Activo</span>
                    </label>
                  </div>
                </div>

                {/* COLUMNA DERECHA: Formulario */}
                <div className="col-span-12 md:col-span-8 space-y-3">
                  
                  {/* Fila 1: Nombre y Marca */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        disabled={guardando}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm"
                        placeholder="Shampoo Keratina"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Marca *</label>
                      <input
                        type="text"
                        value={formData.marca}
                        onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                        disabled={guardando}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm"
                        placeholder="L'Oréal"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Línea y Código */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Línea</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.linea}
                          onChange={(e) => setFormData(prev => ({ ...prev, linea: e.target.value }))}
                          disabled={guardando}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm"
                        >
                          <option value="">Sin línea</option>
                          {lineas.map(linea => (
                            <option key={linea.id} value={linea.id}>{linea.nombre}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={abrirModalLinea}
                          disabled={guardando}
                          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                          title="Agregar nueva línea"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Código Barras</label>
                      <input
                        type="text"
                        value={formData.codigo_barras}
                        onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                        disabled={guardando}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm font-mono"
                        placeholder="7701234567890"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Precios */}
                  <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">💵 Costo</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-purple-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.costo}
                            onChange={(e) => setFormData(prev => ({ ...prev, costo: e.target.value }))}
                            disabled={guardando}
                            className="w-full pl-6 pr-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">💵 Precio Venta *</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-purple-500 text-sm">$</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.precio_venta}
                            onChange={(e) => setFormData(prev => ({ ...prev, precio_venta: e.target.value }))}
                            disabled={guardando}
                            className="w-full pl-6 pr-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm font-semibold"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 4: Inventario */}
                  <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-orange-700 mb-1">📦 Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_actual}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_actual: e.target.value }))}
                          disabled={guardando}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-orange-700 mb-1">⚠️ Mínimo</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_minimo}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_minimo: e.target.value }))}
                          disabled={guardando}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      disabled={guardando}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 text-sm resize-none"
                      placeholder="Describe el producto..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl flex gap-2">
              <button
                onClick={cerrarModalProducto}
                disabled={guardando}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                disabled={guardando}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {guardando ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{editandoId ? 'Actualizar' : 'Crear'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← Modal Crear Línea */}
      {modalLineaAbierto && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
              <h2 className="text-lg font-bold">➕ Nueva Línea de Producto</h2>
              <button
                onClick={cerrarModalLinea}
                disabled={guardandoLinea}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={lineaFormData.nombre}
                  onChange={(e) => setLineaFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  disabled={guardandoLinea}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder="Ej: Cuidado del Cabello"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={lineaFormData.descripcion}
                  onChange={(e) => setLineaFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  disabled={guardandoLinea}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none"
                  placeholder="Describe la línea de productos..."
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lineaFormData.activo}
                    onChange={(e) => setLineaFormData(prev => ({ ...prev, activo: e.target.checked }))}
                    disabled={guardandoLinea}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-blue-700">Línea activa</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl flex gap-2">
              <button
                onClick={cerrarModalLinea}
                disabled={guardandoLinea}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={crearLinea}
                disabled={guardandoLinea}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {guardandoLinea ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Crear Línea</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}