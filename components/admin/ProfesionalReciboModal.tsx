// components/admin/ProfesionalReciboModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProfessionalModal from '@/components/booking/ProfessionalModal';

// ← ← ← INTERFACES ← ← ←
interface Servicio {
  id: number;
  nombre: string;
  precio_min: string | number;
  categoria_nombre: string;
  duracion?: string;
  imagen_url?: string | null;
}

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string | number;
  stock_actual: number;
  categoria_nombre: string;
  imagen_url?: string | null;
}

interface Profesional {
  id: number;
  nombre: string;
}

interface ReciboItem {
  id: string;
  tipo: 'servicio' | 'producto';
  servicioId?: number;
  productoId?: number;
  descripcion: string;
  categoria?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  duracion?: string;
  profesionalId?: number;
  profesionalNombre?: string;
  citaId?: number;
  codigoReserva?: string;
  esNuevo?: boolean;
  imageUrl?: string | null;
}

interface ProfesionalReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCajaId?: number;
  reciboParaEditarId: number;
  apiUrl?: string;
  token?: string | null;
  onReciboActualizado?: (recibo: any) => void;
}

const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0);
};

export default function ProfesionalReciboModal({
  isOpen,
  onClose,
  sessionCajaId,
  reciboParaEditarId,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  onReciboActualizado,
}: ProfesionalReciboModalProps) {
  // ← Estados
  const [items, setItems] = useState<ReciboItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecibo, setLoadingRecibo] = useState(false);

  // ← Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'servicio' | 'producto'>('servicio');
  const [searchResults, setSearchResults] = useState<(Servicio | Producto)[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // ← Modal de profesional
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [itemParaProfesional, setItemParaProfesional] = useState<ReciboItem | null>(null);

  // ← Datos del cliente (simplificado)
  const [clienteNombre, setClienteNombre] = useState('Cliente');

  // ← Cargar recibo existente
  useEffect(() => {
    if (isOpen && reciboParaEditarId) {
      cargarRecibo();
    }
  }, [isOpen, reciboParaEditarId]);

  const cargarRecibo = async () => {
    setLoadingRecibo(true);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboParaEditarId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const recibo = await res.json();
        setClienteNombre(recibo.cliente_nombre || 'Cliente');

        // Mapear items existentes
        if (recibo.items && Array.isArray(recibo.items)) {
          const itemsMapeados: ReciboItem[] = recibo.items.map((item: any) => {
            let servicioId: number | undefined;
            if (item.tipo_item === 'servicio') {
              if (item.servicio_id) servicioId = item.servicio_id;
              else if (item.cita && typeof item.cita === 'object' && item.cita.servicio) {
                servicioId = typeof item.cita.servicio === 'object' ? item.cita.servicio.id : item.cita.servicio;
              }
            }

            const citaId = item.tipo_item === 'servicio'
              ? (item.cita && typeof item.cita === 'object' ? item.cita.id : item.cita_id || item.cita)
              : undefined;

            const profesionalId = item.profesional
              ? (typeof item.profesional === 'object' ? item.profesional.id : item.profesional)
              : undefined;

            const productoId = item.tipo_item === 'producto'
              ? (item.producto && typeof item.producto === 'object' ? item.producto.id : item.producto_id || item.producto)
              : undefined;

            return {
              id: String(item.id || ''),
              tipo: item.tipo_item as 'servicio' | 'producto',
              servicioId,
              productoId,
              descripcion: item.descripcion || 'Sin descripción',
              cantidad: item.cantidad || 1,
              precioUnitario: parseFloat(item.precio_unitario) || 0,
              subtotal: parseFloat(item.subtotal) || 0,
              profesionalId,
              profesionalNombre: item.profesional_nombre || undefined,
              citaId,
              codigoReserva: item.codigo_reserva_cita || undefined,
              esNuevo: false,
              imageUrl: item.imagen_url || null,
            };
          });
          setItems(itemsMapeados);
        }
      }
    } catch (err) {
      console.error('❌ Error cargando recibo:', err);
    } finally {
      setLoadingRecibo(false);
    }
  };

  // ← Búsqueda con debounce
  useEffect(() => {
    if (!isOpen || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const endpoint = searchType === 'servicio'
          ? `${apiUrl}/servicios/?search=${encodeURIComponent(searchTerm)}&disponible=true&incluir_solo_caja=true`
          : `${apiUrl}/productos/buscar/?search=${encodeURIComponent(searchTerm)}&disponibles=true`;
        const res = await fetch(endpoint, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error('❌ Error buscando:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchType, isOpen, apiUrl, token]);

  // ← Agregar item (creando cita para servicios)
  const agregarItem = async (itemData: Servicio | Producto, tipo: 'servicio' | 'producto') => {
    try {
      if (tipo === 'servicio') {
        const servicio = itemData as Servicio;
        const precio = typeof servicio.precio_min === 'string'
          ? parseFloat(servicio.precio_min) : servicio.precio_min;

        setLoading(true);

        // 1. Crear cita en backend
        const resCita = await fetch(`${apiUrl}/citas/crear-para-recibo/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            servicio_id: servicio.id,
            profesional_id: undefined,
            fecha_cita: new Date().toISOString().split('T')[0],
            hora_inicio: new Date().toTimeString().substring(0, 5),
            precio_total: precio,
            cliente_nombre: clienteNombre,
            cliente_telefono: 'No proporcionado',
            cliente_email: 'no@proporcionado.com',
            notas: ''
          })
        });

        if (!resCita.ok) {
          const error = await resCita.json();
          throw new Error(error.error || 'Error creando cita');
        }

        const { cita_id, codigo_reserva } = await resCita.json();

        // 2. Agregar item con cita creada
        const nuevoItem: ReciboItem = {
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'servicio',
          servicioId: servicio.id,
          citaId: cita_id,
          codigoReserva: codigo_reserva,
          descripcion: servicio.nombre,
          categoria: servicio.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          duracion: servicio.duracion,
          profesionalId: undefined,
          profesionalNombre: undefined,
          imageUrl: servicio.imagen_url,
          esNuevo: true,
        };
        setItems(prev => [...prev, nuevoItem]);
        console.log(`✅ Servicio agregado con cita ${codigo_reserva}`);
      } else {
        const producto = itemData as Producto;
        const precio = typeof producto.precio_venta === 'string'
          ? parseFloat(producto.precio_venta) : producto.precio_venta;

        const nuevoItem: ReciboItem = {
          id: `producto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'producto',
          productoId: producto.id,
          descripcion: producto.nombre,
          categoria: producto.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          imageUrl: producto.imagen_url,
          esNuevo: true,
        };
        setItems(prev => [...prev, nuevoItem]);
      }
      setSearchTerm('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('❌ Error agregando item:', err);
      alert(`⚠️ No se pudo agregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ← Actualizar cantidad
  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * item.precioUnitario
        };
      }
      return item;
    }));
  };

  // ← Actualizar precio
  const actualizarPrecio = (itemId: string, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          precioUnitario: nuevoPrecio,
          subtotal: item.cantidad * nuevoPrecio
        };
      }
      return item;
    }));
  };

  // ← Remover item
  const removerItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Si tiene cita, eliminarla del backend
    if (item.citaId) {
      const confirmar = window.confirm(
        `⚠️ ¿Eliminar este servicio?\n• ${item.descripcion}\n• Cita: ${item.codigoReserva || `#${item.citaId}`}\n\nLa cita también será eliminada.`
      );
      if (!confirmar) return;

      try {
        await fetch(`${apiUrl}/citas/${item.citaId}/`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
      } catch (err) {
        console.warn('⚠️ No se pudo eliminar la cita');
      }
    }

    // Eliminar del backend si es item existente
    if (item.id && !isNaN(parseInt(item.id)) && reciboParaEditarId) {
      try {
        await fetch(`${apiUrl}/caja/recibos/${reciboParaEditarId}/items/${item.id}/`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
      } catch (err) {
        console.warn('⚠️ No se pudo eliminar el item del backend');
      }
    }

    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // ← Asignar profesional
  const handleOpenProfessionalModal = (item: ReciboItem) => {
    setItemParaProfesional(item);
    setShowProfessionalModal(true);
  };

  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!itemParaProfesional) return;
    const itemId = itemParaProfesional.id;
    const citaId = itemParaProfesional.citaId;

    try {
      // 1. Actualizar estado local
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, profesionalId: profesional.id, profesionalNombre: profesional.nombre }
          : item
      ));

      // 2. Actualizar cita en backend
      if (citaId) {
        await fetch(`${apiUrl}/citas/${citaId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ profesional: profesional.id })
        });
      }

      setShowProfessionalModal(false);
      setItemParaProfesional(null);
    } catch (err: any) {
      console.error('❌ Error asignando profesional:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // ← ← ← GUARDAR: Actualizar recibo como borrador ← ← ←
  const handleGuardar = async () => {
    if (items.length === 0) {
      alert('⚠️ Agrega al menos un item al recibo');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        tipo: 'venta',
        estado: 'borrador',
        subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
        descuento: 0,
        total: items.reduce((sum, item) => sum + item.subtotal, 0),
        propina_total: 0,
        propina_metodo_distribucion: null,
        metodo_pago: 'bold',
        session_caja: sessionCajaId,
        cliente_nombre: clienteNombre,
        cliente_telefono: 'No proporcionado',
        cliente_email: 'no@proporcionado.com',
        notas: '',
        items_data: items.map(item => {
          const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
          return {
            ...(itemIdNum && { id: itemIdNum }),
            tipo_item: item.tipo,
            ...(item.servicioId && item.citaId && /^\d+$/.test(String(item.citaId)) && { cita_id: Number(item.citaId) }),
            ...(item.servicioId && item.profesionalId && /^\d+$/.test(String(item.profesionalId)) && { profesional_id: Number(item.profesionalId) }),
            ...(item.productoId && /^\d+$/.test(String(item.productoId)) && { producto_id: Number(item.productoId) }),
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            subtotal: item.subtotal,
            propina_item: 0
          };
        })
      };

      const res = await fetch(`${apiUrl}/caja/recibos/${reciboParaEditarId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || JSON.stringify(error));
      }

      const reciboActualizado = await res.json();
      console.log('✅ Recibo actualizado:', reciboActualizado.codigo_recibo);

      // Disparar evento para que el padre recargue
      window.dispatchEvent(new CustomEvent('cajaReciboActualizado', {
        detail: reciboActualizado
      }));

      if (onReciboActualizado) {
        onReciboActualizado(reciboActualizado);
      }

      onClose();
    } catch (err: any) {
      console.error('❌ Error guardando recibo:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl my-8 max-h-[95vh] flex flex-col">
        {/* ← Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              🛍️ Nueva Venta
            </h2>
            <p className="text-sm opacity-90 mt-1">
              Agrega servicios y productos al recibo
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadingRecibo ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Cargando recibo...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ← Columna 1: Búsqueda */}
              <div className="space-y-4">
                {/* Cliente */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    👤 Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Nombre del cliente"
                  />
                </div>

                {/* Búsqueda */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    🔍 Agregar Items
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSearchType('servicio')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'servicio'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Servicios
                    </button>
                    <button
                      onClick={() => setSearchType('producto')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'producto'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Productos
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Buscar ${searchType === 'servicio' ? 'servicios' : 'productos'}...`}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                      autoFocus
                    />
                    {loadingSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Resultados */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-64 overflow-y-auto border border-gray-700 rounded-lg">
                      {searchResults.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => agregarItem(item, searchType)}
                          className="w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                        >
                          <p className="font-medium text-white text-sm">{item.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {item.categoria_nombre || item.marca} • {formatMoney(
                              typeof item.precio_min === 'string' ? parseFloat(item.precio_min) :
                              typeof item.precio_venta === 'string' ? parseFloat(item.precio_venta) :
                              (item.precio_min || item.precio_venta || 0)
                            )}
                          </p>
                          {item.stock_actual !== undefined && (
                            <p className={`text-xs ${item.stock_actual > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Stock: {item.stock_actual}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ← Columna 2: Items del recibo */}
              <div className="bg-gray-900 rounded-xl border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold text-white">
                    📦 Items del Recibo ({items.length})
                  </h3>
                </div>
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      Busca y agrega servicios o productos de la izquierda
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`bg-gray-800 rounded-lg p-3 border transition-colors ${
                            item.tipo === 'servicio'
                              ? (item.profesionalId
                                  ? 'border-gray-700'
                                  : 'border-red-500/50 cursor-pointer hover:border-red-500')
                              : 'border-gray-700'
                          }`}
                          onClick={() => item.tipo === 'servicio' && !item.profesionalId && handleOpenProfessionalModal(item)}
                        >
                          {/* Fila principal */}
                          <div className="flex items-center justify-between gap-2 text-xs">
                            {/* Código de reserva */}
                            {item.tipo === 'servicio' && item.codigoReserva && (
                              <span className="font-mono text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                                {item.codigoReserva}
                              </span>
                            )}

                            {/* Badge NUEVO */}
                            {item.esNuevo && (
                              <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
                                ✨ Nuevo
                              </span>
                            )}

                            {/* Descripción */}
                            <span className="font-medium text-white truncate flex-1" title={item.descripcion}>
                              {item.descripcion}
                            </span>

                            {/* Profesional */}
                            {item.tipo === 'servicio' && (
                              <span
                                className={`text-[10px] truncate max-w-24 flex items-center gap-1 ${
                                  item.profesionalNombre ? 'text-blue-400' : 'text-red-400'
                                }`}
                                title={item.profesionalNombre || 'Click para asignar profesional'}
                              >
                                {item.profesionalNombre ? '👨' : '⚠️'}
                                <span className="truncate">{item.profesionalNombre || 'Asignar'}</span>
                              </span>
                            )}

                            {/* Cantidad × Precio = Subtotal */}
                            <div className="flex items-center gap-2 text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={item.cantidad}
                                onChange={(e) => actualizarCantidad(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                                onFocus={(e) => e.target.select()}
                                className="w-12 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs text-center focus:border-blue-500 focus:outline-none"
                                title="Cantidad"
                              />
                              <span className="text-gray-500">×</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={item.precioUnitario}
                                onChange={(e) => actualizarPrecio(item.id, Math.max(0, parseFloat(e.target.value) || 0))}
                                onFocus={(e) => e.target.select()}
                                className="w-20 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white text-xs text-right focus:border-green-500 focus:outline-none"
                                title="Precio Unitario"
                              />
                              <span className="text-gray-500">=</span>
                              <span className="font-semibold text-green-400 text-xs">
                                {formatMoney(item.subtotal)}
                              </span>
                            </div>

                            {/* Botón eliminar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removerItem(item.id);
                              }}
                              className="text-red-400 hover:text-red-300 p-1 shrink-0 transition-colors"
                              title="Eliminar item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          {/* Info adicional */}
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                            {item.tipo === 'servicio' && !item.citaId && (
                              <span className="text-yellow-400">⚠️ Sin cita</span>
                            )}
                            {item.tipo === 'producto' && (
                              <span>📦 Producto</span>
                            )}
                            {item.tipo === 'servicio' && item.citaId && (
                              <span className="text-[10px] text-orange-400 bg-orange-900/30 px-1 rounded flex items-center gap-1">
                                📅 Cita vinculada
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ← Footer */}
        <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || items.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>💾 Guardar Venta</>
            )}
          </button>
        </div>
      </div>

      {/* ← Modal de profesional */}
      {showProfessionalModal && itemParaProfesional && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => {
            setShowProfessionalModal(false);
            setItemParaProfesional(null);
          }}
          onSelect={handleProfesionalSelected}
          servicioId={itemParaProfesional.tipo === 'servicio' ? (itemParaProfesional.servicioId || undefined) : undefined}
          profesionalSeleccionadoId={itemParaProfesional.profesionalId || undefined}
        />
      )}
    </div>
  );
}