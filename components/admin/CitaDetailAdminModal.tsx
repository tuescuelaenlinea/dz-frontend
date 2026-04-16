// components/admin/CitaDetailAdminModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface CitaDetail {
  id: number;
  codigo_reserva: string;
  servicio_nombre: string;
  servicio: number;
  profesional_nombre: string | null;
  profesional_id: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  precio_total: string;
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado' | 'parcial'; 
  estado_pago_detalle?: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas_cliente?: string;
  notas_internas?: string;
}

interface CitaDetailAdminModalProps {
  cita: CitaDetail;
  isOpen: boolean;
  onClose: () => void;
  onCitaUpdated?: () => void;  // Callback para refrescar lista después de editar
}

export default function CitaDetailAdminModal({
  cita,
  isOpen,
  onClose,
  onCitaUpdated,
}: CitaDetailAdminModalProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'pago' | 'acciones'>('resumen');
  
  // Estados para pagos
  const [pagosCita, setPagosCita] = useState<any[]>([]);
  const [totalAbonado, setTotalAbonado] = useState<number>(0);
  const [loadingPagos, setLoadingPagos] = useState(false);

  // Estados para editar precio
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);
  const [mensajePrecio, setMensajePrecio] = useState<string | null>(null);
  const [precioActual, setPrecioActual] = useState<string>(cita.precio_total);

  // Estados para registrar pago
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'nequi' | 'daviplata'>('efectivo');
  const [subirComprobante, setSubirComprobante] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [notasPago, setNotasPago] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [mensajePago, setMensajePago] = useState<string | null>(null);

  // Estados para cambiar estado de cita
  const [nuevoEstado, setNuevoEstado] = useState<string>('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  // Cargar datos al abrir modal
  useEffect(() => {
    if (isOpen && cita?.id) {
      cargarPagos();
      // Resetear estados
      setEditandoPrecio(false);
      setNuevoPrecio(cita.precio_total);
      setPrecioActual(cita.precio_total); 
      setErrorPrecio(null);
      setMensajePrecio(null);
      setMontoPago(calcularSaldoPendiente().toString());
      setErrorPago(null);
      setMensajePago(null);
      setComprobanteFile(null);
      setSubirComprobante(false);
      setNotasPago('');
      setNuevoEstado(cita.estado);
      setErrorEstado(null);
    }
  }, [isOpen, cita?.id]);

  const cargarPagos = async () => {
    try {
      setLoadingPagos(true);
      const data = await api.getCitaPagos(cita.id);
      setPagosCita(data.pagos || []);
      
      const total = (data.pagos || [])
        .filter((p: any) => p.estado === 'exitoso' || p.estado === 'pendiente')
        .reduce((sum: number, p: any) => sum + parseFloat(p.monto || 0), 0);
      
      setTotalAbonado(total);
    } catch (err) {
      console.error('Error cargando pagos:', err);
      setTotalAbonado(0);
    } finally {
      setLoadingPagos(false);
    }
  };
  // ← AGREGAR después de cargarPagos():
  const recargarCita = async () => {
    try {
      const data = await api.getCitaById(cita.id);
      // Actualizar el precio en el estado local
      setNuevoPrecio(data.precio_total);
      // Recargar pagos para actualizar totales
      await cargarPagos();
    } catch (err) {
      console.error('Error recargando cita:', err);
    }
  };
  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const calcularSaldoPendiente = () => {
    const total = parseFloat(precioActual) || 0;
    return total - totalAbonado;
  };

  // ← FUNCIÓN: Actualizar precio de la cita
 const actualizarPrecio = async () => {
  if (!editandoPrecio) return;
  
  const precioNum = parseFloat(nuevoPrecio);
  
  // Validaciones
  if (isNaN(precioNum) || precioNum <= 0) {
    setErrorPrecio('El precio debe ser un número mayor a 0');
    return;
  }
  
  if (precioNum < totalAbonado) {
    setErrorPrecio(`El precio no puede ser menor al total abonado (${formatPrice(totalAbonado)})`);
    return;
  }
  
  if (cita.estado !== 'pendiente') {
    setErrorPrecio('Solo se puede modificar el precio de citas en estado "Pendiente"');
    return;
  }
  
  try {
    setGuardandoPrecio(true);
    setErrorPrecio(null);
    setMensajePrecio(null);
    
    await api.updateCita(cita.id, {
      precio_total: precioNum.toString(),
      servicio: cita.servicio, 
      profesional: cita.profesional_id,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      cliente_nombre: cita.cliente_nombre,
      cliente_telefono: cita.cliente_telefono,
      cliente_email: cita.cliente_email,
    });
    
    // ← CAMBIO: Alert simple + cerrar modal
    alert(`✅ Precio actualizado a ${formatPrice(precioNum)}`);
    
    setEditandoPrecio(false);
    
    // Refrescar lista en página principal
    if (onCitaUpdated) {
      onCitaUpdated();
    }
    
    // ← CAMBIO: Cerrar el modal para que el usuario vea los cambios al reabrir
    onClose();
    
  } catch (err: any) {
    console.error('Error actualizando precio:', err);
    setErrorPrecio(err.message || 'Error al actualizar el precio');
  } finally {
    setGuardandoPrecio(false);
  }
};

  // ← FUNCIÓN: Registrar nuevo pago
  const registrarPago = async () => {
    const montoNum = parseFloat(montoPago);
    
    // Validaciones
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorPago('El monto debe ser un número mayor a 0');
      return;
    }
    
    const saldoPendiente = calcularSaldoPendiente();
    if (montoNum > saldoPendiente + 0.01) {
      setErrorPago(`El monto no puede exceder el saldo pendiente (${formatPrice(saldoPendiente)})`);
      return;
    }
    
    try {
      setGuardandoPago(true);
      setErrorPago(null);
      setMensajePago(null);
      
      // 1. Crear registro de pago
      const pagoData = {
        monto: montoNum,
        metodo_pago: metodoPago,
        estado: 'pendiente',
        origen_tipo: 'cita',
        origen_id: cita.id,
        notas: notasPago || undefined,
      };
      
      const pagoResponse = await api.createPago(pagoData);
      const pagoId = pagoResponse.id;
      
      // 2. Subir comprobante si se seleccionó
      if (subirComprobante && comprobanteFile) {
        await api.subirComprobantePago(pagoId, comprobanteFile);
      }
      
      const mensaje = `✅ Pago de ${formatPrice(montoNum)} registrado exitosamente`;
      setMensajePago(mensaje);
      
      // Resetear formulario
      setMontoPago(calcularSaldoPendiente().toString());
      setNotasPago('');
      setComprobanteFile(null);
      setSubirComprobante(false);
      
      // Recargar historial de pagos
      await cargarPagos();
      
      if (onCitaUpdated) {
        onCitaUpdated();
      }
      
      setTimeout(() => setMensajePago(null), 5000);
      
    } catch (err: any) {
      console.error('Error registrando pago:', err);
      setErrorPago(err.message || 'Error al registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
  };

  // ← FUNCIÓN: Actualizar estado de la cita
  const actualizarEstado = async () => {
    if (nuevoEstado === cita.estado) {
      setErrorEstado('El estado no ha cambiado');
      return;
    }
    
    if (!confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstado}"?`)) {
      return;
    }
    
    try {
      setGuardandoEstado(true);
      setErrorEstado(null);
      
      await api.updateCita(cita.id, {
        estado: nuevoEstado,
        servicio: cita.servicio, 
        profesional: cita.profesional_id,
        fecha: cita.fecha,
        hora_inicio: cita.hora_inicio,
        hora_fin: cita.hora_fin,
        precio_total: cita.precio_total,
        cliente_nombre: cita.cliente_nombre,
        cliente_telefono: cita.cliente_telefono,
        cliente_email: cita.cliente_email,
      });
      
      alert(`✅ Cita ${nuevoEstado} exitosamente`);
      
      if (onCitaUpdated) {
        onCitaUpdated();
      }
      
     // onClose();
      
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      setErrorEstado(err.message || 'Error al actualizar el estado');
    } finally {
      setGuardandoEstado(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const saldoPendiente = calcularSaldoPendiente();
  const puedeEditarPrecio = cita.estado === 'pendiente';
  const porcentajePagado = parseFloat(precioActual) > 0 
    ? (totalAbonado / parseFloat(precioActual)) * 100 
    : 0;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📋 Detalle de Cita (Admin)</h2>
            <p className="text-sm opacity-90">Código: {cita.codigo_reserva}</p>
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'resumen', label: '📄 Resumen' },
            { key: 'pago', label: '💳 Pago' },
            { key: 'acciones', label: '⚡ Acciones' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* TAB: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">👤 Cliente</h3>
                <p className="text-lg">{cita.cliente_nombre}</p>
                <p className="text-sm text-gray-600">📱 {cita.cliente_telefono}</p>
                <p className="text-sm text-gray-600">✉️ {cita.cliente_email}</p>
                {cita.notas_cliente && (
                  <p className="text-sm text-gray-500 mt-2 italic">📝 Notas: "{cita.notas_cliente}"</p>
                )}
              </div>

              {/* Servicio y Profesional */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💇 Servicio</h3>
                  <p className="text-gray-900">{cita.servicio_nombre}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">👨‍️ Profesional</h3>
                  <p className="text-gray-900">{cita.profesional_nombre || 'Sin asignar'}</p>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📅 Fecha y Hora</h3>
                <p className="text-gray-900">{formatDate(cita.fecha)}</p>
                <p className="text-gray-600">{cita.hora_inicio} - {cita.hora_fin}</p>
              </div>

              {/* Estado y Método de Pago */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Estado</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    cita.estado === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                    cita.estado === 'completada' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {cita.estado === 'pendiente' ? '⏳ Pendiente' :
                     cita.estado === 'confirmada' ? '✅ Confirmada' :
                     cita.estado === 'completada' ? '✨ Completada' :
                     '❌ Cancelada'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Método de Pago</h3>
                  <p className="text-gray-900 capitalize">{cita.metodo_pago}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAGO */}
          {activeTab === 'pago' && (
            <div className="space-y-4">
              
              {/* Editar Precio (solo si pendiente) */}
              {puedeEditarPrecio && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">✏️ Editar Precio de la Cita</h4>
                  
                  {mensajePrecio && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-3 text-sm">
                      {mensajePrecio}
                    </div>
                  )}
                  
                  {!editandoPrecio ? (                    
                  <button
                    onClick={(e) => {
                      e.stopPropagation();  // ← AGREGAR
                      setNuevoPrecio(cita.precio_total);
                      setEditandoPrecio(true);
                      setErrorPrecio(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📝 Modificar precio actual ({formatPrice(precioActual)})  {/* ← USAR precioActual */}
                  </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nuevo precio total
                        </label>
                        <input
                          type="number"
                          value={nuevoPrecio}
                          onChange={(e) => setNuevoPrecio(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: 75000"
                          min="0"
                          step="100"
                        />
                        {errorPrecio && (
                          <p className="text-red-600 text-sm mt-1">{errorPrecio}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={actualizarPrecio}
                          disabled={guardandoPrecio}
                          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {guardandoPrecio ? 'Guardando...' : '💾 Guardar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditandoPrecio(false);
                            setErrorPrecio(null);
                          }}
                          className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Totales */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">{formatPrice(precioActual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abonado:</span>
                    {loadingPagos ? (
                      <span className="text-gray-400 text-sm">Cargando...</span>
                    ) : (
                      <span className="font-bold text-green-600">{formatPrice(totalAbonado)}</span>
                    )}
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Saldo Pendiente:</span>
                    <span className={`font-bold text-lg ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPrice(saldoPendiente)}
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progreso de pago</span>
                      <span>{Math.round(porcentajePagado)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          porcentajePagado >= 100 ? 'bg-green-500' :
                          porcentajePagado >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Registrar Pago */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">💰 Registrar Nuevo Pago Manual</h4>
                
                {mensajePago && (
                  <div className="bg-green-100 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm font-medium flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {mensajePago}
                    <button 
                      onClick={() => setMensajePago(null)}
                      className="ml-auto text-green-600 hover:text-green-800"
                      title="Cerrar"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Monto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto del pago - Saldo disponible: {formatPrice(saldoPendiente)}</label>
                    <input
                      type="number"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Ej: 25000"
                      min="0"
                      max={saldoPendiente}
                      step="100"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  
                  {/* Método de pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="efectivo">🏦 Efectivo</option>
                      <option value="transferencia">🔄 Transferencia Bancaria</option>
                      <option value="nequi">📱 Nequi</option>
                      <option value="daviplata">📲 Daviplata</option>
                    </select>
                  </div>
                  
                  {/* Comprobante */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="subirComprobante"
                      checked={subirComprobante}
                      onChange={(e) => setSubirComprobante(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <label htmlFor="subirComprobante" className="text-sm text-gray-700">
                      📎 Adjuntar comprobante (opcional)
                    </label>
                  </div>
                  
                  {subirComprobante && (
                    <div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500"
                      />
                      {comprobanteFile && (
                        <p className="text-xs text-gray-500 mt-1">📄 {comprobanteFile.name}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas (opcional)</label>
                    <textarea
                      value={notasPago}
                      onChange={(e) => setNotasPago(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Notas sobre este pago..."
                    />
                  </div>
                  
                  {errorPago && <p className="text-red-600 text-sm">{errorPago}</p>}
                  
                  <button
                    onClick={registrarPago}
                    disabled={guardandoPago || saldoPendiente <= 0}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {guardandoPago ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Procesando...</>
                    ) : (
                      <>💰 Registrar Pago de {formatPrice(montoPago || '0')}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Historial de Pagos */}
              {pagosCita.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">📜 Historial de Pagos:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {pagosCita.map((pago: any) => (
                      <div key={pago.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{pago.metodo_pago_display}</span>
                          <span className="text-gray-400 text-xs ml-2">
                            {new Date(pago.fecha_pago).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-medium ${pago.estado === 'exitoso' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {formatPrice(pago.monto)}
                          </span>
                          <span className="text-gray-400 text-xs block">{pago.estado_display}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACCIONES */}
          {activeTab === 'acciones' && (
            <div className="space-y-4">
              
              {/* Cambiar estado de la cita */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🔄 Actualizar Estado de la Cita</h4>
                <p className="text-sm text-gray-600 mb-3">Estado actual: <strong>{cita.estado}</strong></p>
                
                {errorEstado && <p className="text-red-600 text-sm mb-3">{errorEstado}</p>}
                
                <div className="space-y-3">
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="confirmada">✅ Confirmada</option>
                    <option value="completada">✨ Completada</option>
                    <option value="cancelada">❌ Cancelada</option>
                  </select>
                  
                  <button
                    onClick={actualizarEstado}
                    disabled={guardandoEstado || nuevoEstado === cita.estado}
                    className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {guardandoEstado ? 'Actualizando...' : '🔄 Actualizar Estado'}
                  </button>
                </div>
              </div>

              {/* Información */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">ℹ️ Información:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>El precio solo se puede editar si la cita está "Pendiente"</li>
                  <li>Los pagos manuales quedan "Pendientes" hasta verificación</li>
                  <li>Si se paga ≥50%, la cita se confirma automáticamente</li>
                  <li>Los comprobantes son opcionales para todos los métodos</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}