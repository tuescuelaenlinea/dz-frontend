// components/admin/ProductoModal.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';

export interface ProductoBusqueda {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string;
  stock_actual: number;
  categoria_nombre: string;
  imagen_url: string | null;
}

export interface ProductoSeleccionado {
  productoId: number;
  productoNombre: string;
  productoMarca: string;
  cantidad: number;
  precioUnitario: number;
  precioBase: number;
  subtotal: number;
  stockDisponible: number;
}

interface ProductoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (productos: ProductoSeleccionado[]) => void;
  apiUrl?: string;
  token?: string | null;
  productosExistentes?: ProductoSeleccionado[];
}

export default function ProductoModal({
  isOpen,
  onClose,
  onSelect,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  productosExistentes = []
}: ProductoModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<ProductoBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductoSeleccionado[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [soloDisponibles, setSoloDisponibles] = useState(true);

  // ← ← ← Cargar productos existentes al abrir (para edición)
  useEffect(() => {
    if (isOpen && productosExistentes.length > 0) {
      setSelectedProducts(productosExistentes);
    }
  }, [isOpen, productosExistentes]);

  // ← ← ← Cargar productos automáticamente al abrir modal ← ← ←
  useEffect(() => {
    if (isOpen) {
      buscarProductos();
    }
  }, [isOpen]);

  // ← Búsqueda de productos (debounce)
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      buscarProductos();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, categoriaFilter, soloDisponibles, isOpen]);

  // ← ← ← Función de búsqueda CORREGIDA ← ← ←
  const buscarProductos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (categoriaFilter) params.append('categoria', categoriaFilter);
      if (soloDisponibles) params.append('disponibles', 'true');

      const response = await fetch(
        `${apiUrl}/productos/buscar/?${params.toString()}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProductos(data.results || []);
      }
    } catch (err) {
      console.error('❌ Error buscando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← Agregar producto a la selección
  const agregarProducto = (producto: ProductoBusqueda) => {
    const existente = selectedProducts.find(p => p.productoId === producto.id);
    
    if (existente) {
      if (existente.cantidad < producto.stock_actual) {
        actualizarCantidad(producto.id, existente.cantidad + 1);
      }
      return;
    }

    const nuevo: ProductoSeleccionado = {
      productoId: producto.id,
      productoNombre: producto.nombre,
      productoMarca: producto.marca,
      cantidad: 1,
      precioUnitario: parseFloat(producto.precio_venta),
      precioBase: parseFloat(producto.precio_venta),
      subtotal: parseFloat(producto.precio_venta),
      stockDisponible: producto.stock_actual
    };

    setSelectedProducts(prev => [...prev, nuevo]);
  };

  // ← Actualizar cantidad
  const actualizarCantidad = (productoId: number, cantidad: number) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productoId === productoId) {
        const cantidadMaxima = p.stockDisponible;
        const nuevaCantidad = Math.max(1, Math.min(cantidad, cantidadMaxima));
        
        return {
          ...p,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * p.precioUnitario
        };
      }
      return p;
    }));
  };

  // ← ← ← Actualizar precio unitario (EDITABLE) ← ← ←
  const actualizarPrecio = (productoId: number, precio: number) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productoId === productoId) {
        return {
          ...p,
          precioUnitario: precio,
          subtotal: p.cantidad * precio
        };
      }
      return p;
    }));
  };

  // ← ← ← Usar precio base ← ← ←
  const usarPrecioBase = (productoId: number) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.productoId === productoId) {
        return {
          ...p,
          precioUnitario: p.precioBase,
          subtotal: p.cantidad * p.precioBase
        };
      }
      return p;
    }));
  };

  // ← ← ← Remover producto (ELIMINAR) ← ← ←
  const removerProducto = (productoId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productoId !== productoId));
  };

  // ← Calcular total
  const totalGeneral = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
  }, [selectedProducts]);

  // ← Confirmar selección
  // ← Confirmar selección (CORREGIDO)
const handleConfirmar = () => {
  // ← Si no hay productos, preguntar si quiere eliminar todos
  if (selectedProducts.length === 0) {
    const confirmacion = window.confirm(
      '⚠️ No hay productos seleccionados.\n\n¿Deseas guardar la cita SIN productos? (Se eliminarán todos los productos asignados anteriormente)'
    );
    
    if (!confirmacion) {
      return;  // Cancelar si el usuario no confirma
    }
  }
  
  // ← Si hay productos o confirmó eliminar todos, proceder
  onSelect(selectedProducts);
  onClose();
};

  // ← Cerrar modal
  const handleClose = () => {
    setSelectedProducts([]);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📦 Agregar Productos a la Cita</h2>
            <p className="text-sm opacity-90 mt-1">
              Busca y selecciona productos para esta cita
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Búsqueda y Lista */}
            <div className="space-y-4">
              
              {/* Buscador */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Buscar por nombre, marca o código..."
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 items-center">
                  <select
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Todas las categorías</option>
                    <option value="1">Cabello</option>
                    <option value="2">Rostro</option>
                    <option value="3">Cuerpo</option>
                    <option value="4">Uñas</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={soloDisponibles}
                      onChange={(e) => setSoloDisponibles(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    Solo con stock
                  </label>
                </div>
              </div>

              {/* Lista de productos */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2">Buscando productos...</p>
                  </div>
                ) : productos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron productos' : 'Escribe para buscar productos'}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {productos.map((producto) => {
                      const yaSeleccionado = selectedProducts.find(p => p.productoId === producto.id);
                      const stockAgotado = producto.stock_actual <= 0;
                      
                      return (
                        <li key={producto.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            {/* Imagen */}
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {producto.imagen_url ? (
                                <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <span className="text-gray-400 text-xs">📦</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900 truncate">{producto.nombre}</p>
                                  <p className="text-sm text-gray-500">{producto.marca} • {producto.categoria_nombre}</p>
                                </div>
                                <p className="font-bold text-purple-600">${parseFloat(producto.precio_venta).toLocaleString('es-CO')}</p>
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  stockAgotado 
                                    ? 'bg-red-100 text-red-700' 
                                    : producto.stock_actual <= 3 
                                      ? 'bg-yellow-100 text-yellow-700' 
                                      : 'bg-green-100 text-green-700'
                                }`}>
                                  {stockAgotado ? 'Agotado' : `${producto.stock_actual} disponibles`}
                                </span>
                                
                                {yaSeleccionado && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    ✓ Agregado ({yaSeleccionado.cantidad} un)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Botón agregar */}
                            <button
                              onClick={() => !stockAgotado && agregarProducto(producto)}
                              disabled={stockAgotado}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                stockAgotado
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : yaSeleccionado
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              {yaSeleccionado ? 'Editar' : 'Agregar'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Columna Derecha: Productos Seleccionados */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  🛒 Productos Seleccionados ({selectedProducts.length})
                </h3>

                {selectedProducts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No has seleccionado productos aún
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedProducts.map((item) => (
                      <div key={item.productoId} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.productoNombre}</p>
                            <p className="text-xs text-gray-500">{item.productoMarca}</p>
                          </div>
                          {/* ← ← ← BOTÓN DE ELIMINAR ← ← ← */}
                          <button
                            onClick={() => removerProducto(item.productoId)}
                            className="text-red-500 hover:text-red-700 text-lg p-1"
                            title="Remover producto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {/* Cantidad */}
                          <div>
                            <label className="text-xs text-gray-500">Cantidad</label>
                            <div className="flex items-center gap-1 mt-1">
                              <button
                                onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.stockDisponible}
                                value={item.cantidad}
                                onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value) || 1)}
                                className="w-12 text-center border border-gray-300 rounded py-1 text-sm"
                              />
                              <button
                                onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                                disabled={item.cantidad >= item.stockDisponible}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Precio ← ← ← EDITABLE ← ← ← */}
                          <div>
                            <label className="text-xs text-gray-500">Precio Unit.</label>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={item.precioUnitario}
                                onChange={(e) => actualizarPrecio(item.productoId, parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded py-1 text-sm px-1"
                              />
                            </div>
                            {item.precioUnitario !== item.precioBase && (
                              <button
                                onClick={() => usarPrecioBase(item.productoId)}
                                className="text-xs text-purple-600 hover:underline mt-1"
                              >
                                Usar precio base (${item.precioBase.toLocaleString()})
                              </button>
                            )}
                          </div>

                          {/* Subtotal */}
                          <div>
                            <label className="text-xs text-gray-500">Subtotal</label>
                            <p className="font-semibold text-purple-600 mt-1">
                              ${item.subtotal.toLocaleString('es-CO')}
                            </p>
                          </div>
                        </div>

                        {/* Stock disponible */}
                        <p className="text-xs text-gray-400 mt-2">
                          Stock disponible: {item.stockDisponible}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                {selectedProducts.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Total Productos:</span>
                      <span className="text-xl font-bold text-purple-600">
                        ${totalGeneral.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            //disabled={selectedProducts.length === 0}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar ({selectedProducts.length} productos) • ${totalGeneral.toLocaleString('es-CO')}
          </button>
        </div>
      </div>
    </div>
  );
}