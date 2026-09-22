// components/admin/CotizacionForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { generarPDFCotizacion } from '@/utils/pdfGenerator';

interface Servicio {
  id: number;
  nombre: string;
  precio_min: number;
  precio_max?: number;
  duracion?: string;
  categoria_nombre?: string;
  imagen_url?: string;
}

interface ServicioDetalle {
  id: number;
  cantidad: number;
  precio: number;
}

interface CotizacionData {
  id?: number;
  codigo_cotizacion?: string;
  nombre_completo: string;
  whatsapp: string;
  correo_electronico: string;
  fecha_aproximada?: string;
  detalles_adicionales?: string;
  servicios_interes: string;
  servicios_detalle?: string; // ← ← ← NUEVO
  presupuesto_aproximado?: number;
  descuento?: number; // ← ← ← NUEVO
  estado?: string;
  valor_total?: number;
}

interface CotizacionFormProps {
  cotizacionInicial?: CotizacionData | null;
  esEdicion?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CotizacionForm({ 
  cotizacionInicial, 
  esEdicion = false,
  onSuccess,
  onCancel 
}: CotizacionFormProps) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<Map<number, {cantidad: number, precio: number}>>(new Map());
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(esEdicion);
  
  // Datos del cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [fechaAproximada, setFechaAproximada] = useState('');
  const [mensajeAdicional, setMensajeAdicional] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [notas, setNotas] = useState('Gracias por confiar en DZSALON.\nEsta cotización tiene una validez de 15 días.');
  const [incluirTerminos, setIncluirTerminos] = useState(false);

  // Cargar servicios disponibles
  useEffect(() => {
    cargarServicios();
  }, []);

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

  // Cargar datos si es edición
  useEffect(() => {
    if (cotizacionInicial && esEdicion && servicios.length > 0) {
      setClienteNombre(cotizacionInicial.nombre_completo || '');
      setClienteTelefono(cotizacionInicial.whatsapp || '');
      setClienteEmail(cotizacionInicial.correo_electronico || '');
      setFechaAproximada(cotizacionInicial.fecha_aproximada || '');
      setMensajeAdicional(cotizacionInicial.detalles_adicionales || '');
      setNotas(cotizacionInicial.detalles_adicionales || notas);
      
      // ← ← ← CARGAR DESCUENTO ← ← ←
      if (cotizacionInicial.descuento !== undefined) {
        const subtotal = Number(cotizacionInicial.presupuesto_aproximado || 0) + Number(cotizacionInicial.descuento || 0);
        const porcentajeDescuento = subtotal > 0 ? (Number(cotizacionInicial.descuento || 0) / subtotal) * 100 : 0;
        setDescuento(porcentajeDescuento);
      }
      
      // ← ← ← CARGAR SERVICIOS DETALLE (valores personalizados) ← ← ←
      if (cotizacionInicial.servicios_detalle) {
        try {
          const detalles: ServicioDetalle[] = JSON.parse(cotizacionInicial.servicios_detalle);
          const nuevasSeleccionadas = new Map<number, {cantidad: number, precio: number}>();
          
          detalles.forEach(detalle => {
            nuevasSeleccionadas.set(detalle.id, {
              cantidad: detalle.cantidad,
              precio: detalle.precio
            });
          });
          
          setServiciosSeleccionados(nuevasSeleccionadas);
        } catch (err) {
          console.error('Error parseando servicios_detalle:', err);
          // Fallback: usar servicios_interes
          if (cotizacionInicial.servicios_interes) {
            const partes = cotizacionInicial.servicios_interes.split(',').map(s => s.trim());
            const nuevasSeleccionadas = new Map<number, {cantidad: number, precio: number}>();
            
            partes.forEach(parte => {
              const idNum = parseInt(parte);
              const servicioEncontrado = servicios.find(s => s.id === idNum);
              
              if (servicioEncontrado) {
                nuevasSeleccionadas.set(servicioEncontrado.id, {
                  cantidad: 1,
                  precio: servicioEncontrado.precio_min
                });
              }
            });
            
            setServiciosSeleccionados(nuevasSeleccionadas);
          }
        }
      } else if (cotizacionInicial.servicios_interes) {
        // Fallback si no hay servicios_detalle
        const partes = cotizacionInicial.servicios_interes.split(',').map(s => s.trim());
        const nuevasSeleccionadas = new Map<number, {cantidad: number, precio: number}>();
        
        partes.forEach(parte => {
          const idNum = parseInt(parte);
          const servicioEncontrado = servicios.find(s => s.id === idNum);
          
          if (servicioEncontrado) {
            nuevasSeleccionadas.set(servicioEncontrado.id, {
              cantidad: 1,
              precio: servicioEncontrado.precio_min
            });
          }
        });
        
        setServiciosSeleccionados(nuevasSeleccionadas);
      }
      
      setCargandoDatos(false);
    } else if (!esEdicion) {
      setCargandoDatos(false);
    }
  }, [cotizacionInicial, esEdicion, servicios]);

  const toggleServicio = (servicio: Servicio) => {
    setServiciosSeleccionados(prev => {
      const nuevas = new Map(prev);
      if (nuevas.has(servicio.id)) {
        nuevas.delete(servicio.id);
      } else {
        nuevas.set(servicio.id, {
          cantidad: 1,
          precio: servicio.precio_min
        });
      }
      return nuevas;
    });
  };

  const actualizarCantidad = (servicioId: number, cantidad: number) => {
    setServiciosSeleccionados(prev => {
      const nuevas = new Map(prev);
      const actual = nuevas.get(servicioId);
      if (actual) {
        nuevas.set(servicioId, { ...actual, cantidad: Math.max(1, cantidad) });
      }
      return nuevas;
    });
  };

  const actualizarPrecio = (servicioId: number, nuevoPrecio: number) => {
    setServiciosSeleccionados(prev => {
      const nuevas = new Map(prev);
      const actual = nuevas.get(servicioId);
      if (actual) {
        nuevas.set(servicioId, { ...actual, precio: Math.max(0, nuevoPrecio) });
      }
      return nuevas;
    });
  };

  const serviciosFiltrados = servicios.filter(s => 
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.categoria_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const subtotal = Array.from(serviciosSeleccionados.entries()).reduce((sum, [, data]) => {
    return sum + (data.precio * data.cantidad);
  }, 0);

  const montoDescuento = subtotal * (descuento / 100);
  const total = subtotal - montoDescuento;

  const handleGenerarPDF = () => {
    const cotizacion = {
      id: cotizacionInicial?.id || Date.now(),
      codigo_cotizacion: cotizacionInicial?.codigo_cotizacion || `COT-${Date.now()}`,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      cliente_email: clienteEmail,
      fecha_creacion: new Date().toISOString(),
      servicios: Array.from(serviciosSeleccionados.entries()).map(([id, data]) => {
        const servicio = servicios.find(s => s.id === id);
        return {
          nombre: servicio?.nombre || '',
          cantidad: data.cantidad,
          precio_unitario: data.precio,
          total: data.precio * data.cantidad
        };
      }),
      subtotal,
      descuento: montoDescuento,
      total,
      notas
    };
    
    generarPDFCotizacion(cotizacion);
  };

  const handleGuardar = async () => {
    if (!clienteNombre || !clienteTelefono || !clienteEmail) {
      alert('Por favor completa los datos del cliente');
      return;
    }

    if (serviciosSeleccionados.size === 0) {
      alert('Por favor selecciona al menos un servicio');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const serviciosIds = Array.from(serviciosSeleccionados.keys()).join(',');
      
      // ← ← ← NUEVO: Construir servicios_detalle como JSON ← ← ←
      const serviciosDetalle: ServicioDetalle[] = Array.from(serviciosSeleccionados.entries()).map(([id, data]) => ({
        id,
        cantidad: data.cantidad,
        precio: data.precio
      }));
      
      const payload = {
        nombre_completo: clienteNombre,
        whatsapp: clienteTelefono,
        correo_electronico: clienteEmail,
        fecha_aproximada: fechaAproximada,
        detalles_adicionales: mensajeAdicional,
        servicios_interes: serviciosIds,
        servicios_detalle: JSON.stringify(serviciosDetalle), // ← ← ← NUEVO
        presupuesto_aproximado: total,
        descuento: montoDescuento, // ← ← ← NUEVO: Enviar descuento calculado
        estado: esEdicion ? (cotizacionInicial?.estado || 'pendiente') : 'pendiente',
        valor_total: total
      };

      const url = esEdicion 
        ? `${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/${cotizacionInicial?.id}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/`;
      
      const method = esEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || errorData.message || 'Error al guardar');
      }

      alert(esEdicion ? '✅ Cotización actualizada exitosamente' : '✅ Cotización creada exitosamente');
      onSuccess();
    } catch (err: any) {
      console.error('❌ Error guardando:', err);
      alert(`Error al guardar la cotización: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl border border-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* SECCIÓN 1: Datos del cliente */}
      <div className="col-span-12 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">1. Datos del cliente</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="María Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                🇨 +57
              </span>
              <input
                type="tel"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="300 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="maria.perez@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha aproximada
            </label>
            <input
              type="date"
              value={fechaAproximada}
              onChange={(e) => setFechaAproximada(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje adicional (opcional)
            </label>
            <textarea
              value={mensajeAdicional}
              onChange={(e) => setMensajeAdicional(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="Ej: Me gustaría un cambio de look natural..."
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Selección de servicios */}
      <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">2. Selecciona los servicios</h2>
        
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {serviciosFiltrados.map(servicio => {
            const seleccionado = serviciosSeleccionados.has(servicio.id);
            const datos = serviciosSeleccionados.get(servicio.id);
            
            return (
              <div
                key={servicio.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  seleccionado 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={seleccionado}
                  onChange={() => toggleServicio(servicio)}
                  className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                
                {servicio.imagen_url && (
                  <img 
                    src={servicio.imagen_url} 
                    alt={servicio.nombre}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{servicio.nombre}</p>
                  <p className="text-sm text-gray-600">
                    ${(datos?.precio || servicio.precio_min).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            );
          })}
          {serviciosFiltrados.length === 0 && (
            <p className="text-center text-gray-500 py-8">No se encontraron servicios</p>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: Resumen (EDITABLE) */}
      <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">3. Resumen de la cotización</h2>
        
        {/* Servicios seleccionados con campos editables */}
        <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
          {Array.from(serviciosSeleccionados.entries()).map(([servicioId, datos]) => {
            const servicio = servicios.find(s => s.id === servicioId);
            if (!servicio) return null;
            
            return (
              <div key={servicioId} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                {/* Fila 1: Nombre + Subtotal + Eliminar */}
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-900 flex-1">{servicio.nombre}</p>
                  <p className="text-sm font-bold text-gray-900 mx-3 whitespace-nowrap">
                    ${(datos.precio * datos.cantidad).toLocaleString('es-CO')}
                  </p>
                  <button
                    onClick={() => toggleServicio(servicio)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors flex-shrink-0"
                    title="Quitar servicio"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Fila 2: Cantidad + Precio unitario */}
                <div className="flex items-end gap-4">
                  {/* Cantidad editable */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(servicioId, (datos.cantidad || 1) - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 bg-white"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{datos.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(servicioId, (datos.cantidad || 1) + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 bg-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {/* Precio unitario editable (sin decimales) */}
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Precio unit. ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={Math.round(datos.precio)}
                      onChange={(e) => actualizarPrecio(servicioId, Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-right text-sm border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {serviciosSeleccionados.size === 0 && (
            <p className="text-center text-gray-500 py-4 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No hay servicios seleccionados
            </p>
          )}
        </div>

        {/* Totales */}
        <div className="space-y-2 mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${subtotal.toLocaleString('es-CO')}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Descuento global</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">%</span>
              <input
                type="number"
                value={descuento}
                onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm bg-white"
                min="0"
                max="100"
              />
            </div>
            <span className="font-medium text-red-600">
              -${montoDescuento.toLocaleString('es-CO')}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-gray-300">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-amber-600">
              ${total.toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Notas */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas (aparecen en el PDF)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        {/* Toggle términos */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setIncluirTerminos(!incluirTerminos)}
            className={`w-10 h-6 rounded-full transition-colors ${
              incluirTerminos ? 'bg-amber-600' : 'bg-gray-300'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
              incluirTerminos ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
          <span className="text-sm text-gray-700">Incluir términos y condiciones</span>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={handleGenerarPDF}
            disabled={serviciosSeleccionados.size === 0}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Generar PDF
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={loading || serviciosSeleccionados.size === 0}
              className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {esEdicion ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}