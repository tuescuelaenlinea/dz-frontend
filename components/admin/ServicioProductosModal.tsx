// components/admin/ServicioProductosModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string;
  stock_actual: number;
  imagen_url?: string | null;
}

interface ProductoPreestablecido {
  id: number;
  producto: number;
  producto_nombre: string;
  producto_marca: string;
  producto_precio_base: string;
  producto_stock: number;
  producto_imagen_url?: string | null;
  cantidad: number;
  precio_unitario: string | null;
  activo: boolean;
  notas: string;
}

interface ServicioProductosModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicioId: number;
  servicioNombre: string;
  onProductosUpdated?: () => void;
}

export default function ServicioProductosModal({
  isOpen,
  onClose,
  servicioId,
  servicioNombre,
  onProductosUpdated
}: ServicioProductosModalProps) {
  const [productosPreestablecidos, setProductosPreestablecidos] = useState<ProductoPreestablecido[]>([]);
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // Formulario para agregar producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState<string>('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarProductosPreestablecidos();
      cargarTodosLosProductos();
    }
  }, [isOpen, servicioId]);

  const cargarProductosPreestablecidos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/servicios/${servicioId}/productos-preestablecidos/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProductosPreestablecidos(data.productos || []);
      }
    } catch (err) {
      console.error('Error cargando productos preestablecidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosLosProductos = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/productos/?activo=true&ordering=nombre`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTodosLosProductos(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  };

  const agregarProducto = async () => {
    if (!productoSeleccionado) {
      alert('Selecciona un producto');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(`${apiUrl}/servicios/${servicioId}/productos-preestablecidos/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producto: productoSeleccionado,
          cantidad: cantidad,
          precio_unitario: precioUnitario ? parseFloat(precioUnitario) : null,
          notas: notas,
          activo: true,
        }),
      });

      if (res.ok) {
        alert('✅ Producto preestablecido agregado');
        setProductoSeleccionado(null);
        setCantidad(1);
        setPrecioUnitario('');
        setNotas('');
        cargarProductosPreestablecidos();
        onProductosUpdated?.();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'Error al agregar producto'}`);
      }
    } catch (err) {
      console.error('Error agregando producto:', err);
      alert('Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = async (preestablecidoId: number, productoNombre: string) => {
    if (!confirm(`¿Eliminar "${productoNombre}" de los productos preestablecidos?`)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(
        `${apiUrl}/servicios/${servicioId}/productos-preestablecidos/${preestablecidoId}/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        alert('✅ Producto eliminado');
        cargarProductosPreestablecidos();
        onProductosUpdated?.();
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.error || 'Error al eliminar'}`);
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
      alert('Error al eliminar producto');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (preestablecido: ProductoPreestablecido) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(
        `${apiUrl}/servicios/${servicioId}/productos-preestablecidos/${preestablecido.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activo: !preestablecido.activo,
          }),
        }
      );

      if (res.ok) {
        cargarProductosPreestablecidos();
      }
    } catch (err) {
      console.error('Error actualizando producto:', err);
    }
  };

  const actualizarCantidad = async (preestablecido: ProductoPreestablecido, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const res = await fetch(
        `${apiUrl}/servicios/${servicioId}/productos-preestablecidos/${preestablecido.id}/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cantidad: nuevaCantidad,
          }),
        }
      );

      if (res.ok) {
        cargarProductosPreestablecidos();
      }
    } catch (err) {
      console.error('Error actualizando cantidad:', err);
    }
  };

  if (!isOpen) return null;

  const productosFiltrados = todosLosProductos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.marca.toLowerCase().includes(busqueda.toLowerCase())
  );

  const productosYaAgregados = productosPreestablecidos.map(p => p.producto);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📦 Productos Preestablecidos</h2>
            <p className="text-sm opacity-90">{servicioNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Lista de productos preestablecidos */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Productos Asignados ({productosPreestablecidos.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : productosPreestablecidos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No hay productos preestablecidos para este servicio
              </div>
            ) : (
              <div className="space-y-2">
                {productosPreestablecidos.map((preestablecido) => (
                  <div
                    key={preestablecido.id}
                    className={`flex items-center gap-4 p-3 border rounded-lg ${
                      preestablecido.activo ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 opacity-60'
                    }`}
                  >
                    {/* Imagen */}
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                      {preestablecido.producto_imagen_url ? (
                        <img
                          src={preestablecido.producto_imagen_url}
                          alt={preestablecido.producto_nombre}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {preestablecido.producto_nombre}
                      </div>
                      <div className="text-xs text-gray-600">
                        {preestablecido.producto_marca} | Stock: {preestablecido.producto_stock}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        Precio base: ${parseFloat(preestablecido.producto_precio_base).toLocaleString('es-CO')}
                        {preestablecido.precio_unitario && (
                          <span className="ml-2 text-green-600 font-semibold">
                            → Especial: ${parseFloat(preestablecido.precio_unitario).toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>
                      {preestablecido.notas && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          📝 {preestablecido.notas}
                        </div>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        value={preestablecido.cantidad}
                        onChange={(e) => actualizarCantidad(preestablecido, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    {/* Toggle activo */}
                    <button
                      onClick={() => toggleActivo(preestablecido)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        preestablecido.activo
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {preestablecido.activo ? '✅ Activo' : '⏸️ Inactivo'}
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => eliminarProducto(preestablecido.id, preestablecido.producto_nombre)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario para agregar nuevo producto */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Agregar Producto</h3>
            
            {/* Búsqueda 
            <div className="mb-4">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto por nombre o marca..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>*/}

            {/* Selector de producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
                <select
                  value={productoSeleccionado || ''}
                  onChange={(e) => {
                    const prodId = parseInt(e.target.value);
                    setProductoSeleccionado(prodId);
                    // Auto-completar precio base
                    const prod = todosLosProductos.find(p => p.id === prodId);
                    if (prod) {
                      setPrecioUnitario(prod.precio_venta);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seleccionar producto...</option>
                  {productosFiltrados
                    .filter(p => !productosYaAgregados.includes(p.id))
                    .map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombre} - {prod.marca} (Stock: {prod.stock_actual})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  placeholder="Dejar vacío para usar precio base"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si se deja vacío, se usará el precio base del producto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Requerido para alisados"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={agregarProducto}
              disabled={loading || !productoSeleccionado}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Agregando...' : '➕ Agregar Producto Preestablecido'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}