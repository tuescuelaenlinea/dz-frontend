'use client';
import { useState, useEffect } from 'react';

interface CitaDetail {
  id: number;
  codigo_reserva: string;
  servicio_nombre: string;
  profesional_nombre: string | null;
  profesional_id: number | null;  // ← AGREGAR ESTO
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  precio_total: string;
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado';
  comprobante_pago_url: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  notas_cliente: string;
  total_abonado?: string;
}

interface CitaDetailModalProps {
  cita: CitaDetail;
  isOpen: boolean;
  onClose: () => void;
  onPay: (citaId: number) => void;
  onConfirmWithProfessional: (citaId: number) => void;
  onConfirmWithAdmin: (citaId: number) => void;
}

export default function CitaDetailModal({
  cita,
  isOpen,
  onClose,
  onPay,
  onConfirmWithProfessional,
  onConfirmWithAdmin,
}: CitaDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'pago' | 'acciones'>('resumen');
  
  // ← NUEVOS ESTADOS PARA PAGOS
  const [pagosCita, setPagosCita] = useState<any[]>([]);
  const [totalAbonado, setTotalAbonado] = useState<number>(0);
  const [loadingPagos, setLoadingPagos] = useState(false);

  if (!isOpen) return null;

  const formatPrice = (price: string) => `$${parseInt(price).toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const calcularSaldoPendiente = () => {
    const total = parseInt(cita.precio_total) || 0;
    return total - totalAbonado;
  };

  // ← CARGAR PAGOS DE LA CITA AL ABRIR MODAL
  useEffect(() => {
    if (isOpen && cita?.id) {
      const loadPagos = async () => {
        try {
          setLoadingPagos(true);
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
          const token = localStorage.getItem('token');
          
          const res = await fetch(`${apiUrl}/citas/${cita.id}/pagos/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          
          if (res.ok) {
            const data = await res.json();
            setPagosCita(data.pagos || []);
            
            const total = (data.pagos || [])
              .filter((p: any) => p.estado === 'exitoso' || p.estado === 'pendiente')
              .reduce((sum: number, p: any) => sum + parseFloat(p.monto || 0), 0);
            
            setTotalAbonado(total);
          }
        } catch (err) {
          console.error('Error cargando pagos:', err);
          if (cita.total_abonado) {
            setTotalAbonado(parseFloat(cita.total_abonado));
          }
        } finally {
          setLoadingPagos(false);
        }
      };
      loadPagos();
    }
  }, [isOpen, cita?.id, cita?.total_abonado]);

  // ← NUEVA FUNCIÓN: Enviar WhatsApp al Profesional (igual que en CitasContent)
  // ← FUNCIÓN: Enviar WhatsApp al Profesional (consulta datos completos)
const enviarWhatsAppAlProfesional = async (citaId: number, profesionalId?: number) => {
  try {
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    // ← CONSULTAR DATOS COMPLETOS DE LA CITA (igual que en CitasContent)
    const citaRes = await fetch(`${apiUrl}/citas/${citaId}/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const citaData = await citaRes.json();
    
    // Usar el profesional_id de la cita si no se pasó como parámetro
    const profId = profesionalId || citaData.profesional;
    
    if (!profId) {
      alert('⚠️ Esta cita no tiene profesional asignado');
      return;
    }
    
    // Obtener datos del profesional
    const profsRes = await fetch(`${apiUrl}/profesionales/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    const profs = await profsRes.json();
    let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
    const profesional = profesionalesList.find((p: any) => p.id === profId);
    
    if (!profesional?.telefono_whatsapp) {
      console.error('Profesional sin WhatsApp:', profesional);
      alert('⚠️ El profesional no tiene WhatsApp registrado en el sistema');
      return;
    }
    
    const mensaje = `*✅ CONFIRMACIÓN DE CITA*%0A%0A` +
      `*Código:* ${citaData.codigo_reserva}%0A` +
      `*Cliente:* ${citaData.cliente_nombre}%0A` +
      `*Teléfono:* ${citaData.cliente_telefono}%0A` +
      `*Servicio:* ${citaData.servicio_nombre}%0A` +
      `*Fecha:* ${citaData.fecha}%0A` +
      `*Hora:* ${citaData.hora_inicio}%0A%0A` +
      `El cliente confirma su reserva. Por favor preparar el servicio.`;
    
    const telefonoLimpio = profesional.telefono_whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
  } catch (err) {
    console.error('Error enviando WhatsApp:', err);
    alert('Error al enviar la notificación');
  }
};

  // ← NUEVA FUNCIÓN: Enviar WhatsApp al Administrador
  const enviarWhatsAppAlAdministrador = async (citaId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // Obtener configuración del sitio (tiene el WhatsApp del admin)
      const configRes = await fetch(`${apiUrl}/configuracion/activa/`);
      const config = await configRes.json();
      
      const whatsappAdmin = config.whatsapp;
      if (!whatsappAdmin) {
        alert('⚠️ No hay WhatsApp de administración configurado');
        return;
      }
      
      // Obtener datos actualizados de la cita
      const citaRes = await fetch(`${apiUrl}/citas/${citaId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const citaData = await citaRes.json();
      
      const mensaje = `*🔔 SOLICITUD DE CONFIRMACIÓN*%0A%0A` +
        `*Código:* ${citaData.codigo_reserva}%0A` +
        `*Cliente:* ${citaData.cliente_nombre}%0A` +
        `*Teléfono:* ${citaData.cliente_telefono}%0A` +
        `*Servicio:* ${citaData.servicio_nombre}%0A` +
        `*Fecha:* ${citaData.fecha}%0A` +
        `*Hora:* ${citaData.hora_inicio}%0A` +
        `*Total:* $${citaData.precio_total}%0A%0A` +
        `El cliente solicita confirmación de su reserva. Por favor revisar y confirmar.`;
      
      const telefonoLimpio = whatsappAdmin.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
      
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
    } catch (err) {
      console.error('Error enviando WhatsApp al admin:', err);
      alert('Error al enviar la notificación');
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📋 Detalle de Reserva</h2>
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
            { key: 'resumen', label: '📄 Resumen', icon: '📄' },
            { key: 'pago', label: '💳 Pago', icon: '💳' },
            { key: 'acciones', label: '⚡ Acciones', icon: '⚡' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Servicio</h3>
                <p className="text-lg">{cita.servicio_nombre}</p>
                {cita.profesional_nombre && (
                  <p className="text-sm text-gray-600 mt-1">
                    👨‍⚕️ Profesional: {cita.profesional_nombre}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">📅 Fecha</p>
                  <p className="font-medium">{formatDate(cita.fecha)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">🕐 Hora</p>
                  <p className="font-medium">{cita.hora_inicio} - {cita.hora_fin}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
                <p className="font-medium">{cita.cliente_nombre}</p>
                <p className="text-sm text-gray-600">📱 {cita.cliente_telefono}</p>
                {cita.notas_cliente && (
                  <p className="text-sm text-gray-500 mt-2 italic">📝 "{cita.notas_cliente}"</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Estado:</span>
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
            </div>
          )}

          {/* TAB: PAGO */}
          {activeTab === 'pago' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Método de Pago</p>
                <p className="font-medium capitalize">
                  {cita.metodo_pago === 'bold' ? '💳 Bold (Tarjeta/PSE)' :
                   cita.metodo_pago === 'efectivo' ? '🏦 Transferencia/Efectivo' :
                   '⏰ Pagar después'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Estado de Pago</p>
                <p className={`font-medium ${
                  cita.pago_estado === 'pagado' ? 'text-green-600' :
                  cita.pago_estado === 'reembolsado' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {cita.pago_estado === 'pagado' ? '✅ Pagado' :
                   cita.pago_estado === 'reembolsado' ? '🔄 Reembolsado' :
                   '⏳ Pendiente'}
                </p>
              </div>

              {/* ← Totales */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">{formatPrice(cita.precio_total)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Abonado:</span>
                    {loadingPagos ? (
                      <span className="text-gray-400 text-sm">Cargando...</span>
                    ) : (
                      <span className="font-bold text-green-600">
                        {formatPrice(totalAbonado.toString())}
                      </span>
                    )}
                  </div>
                  
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Saldo Pendiente:</span>
                    <span className={`font-bold text-lg ${
                      calcularSaldoPendiente() > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatPrice(calcularSaldoPendiente().toString())}
                    </span>
                  </div>
                </div>
              </div>

              {/* ← Lista de Pagos */}
              {pagosCita.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">📜 Historial de Pagos:</p>
                  <div className="space-y-2">
                    {pagosCita.map((pago: any) => (
                      <div key={pago.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{pago.metodo_pago_display}</span>
                          <span className="text-gray-400 text-xs ml-2">
                            {new Date(pago.fecha_pago).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-medium ${
                            pago.estado === 'exitoso' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {formatPrice(pago.monto)}
                          </span>
                          <span className="text-gray-400 text-xs block">
                            {pago.estado_display}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cita.comprobante_pago_url && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">📎 Comprobante de Pago</p>
                  <a
                    href={cita.comprobante_pago_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver comprobante →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACCIONES */}
          {activeTab === 'acciones' && (
            <div className="space-y-4">
              {calcularSaldoPendiente() > 0 && (
                <button
                  onClick={() => onPay(cita.id)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pagar Saldo Pendiente
                </button>
              )}

             {/* {cita.estado === 'pendiente' && cita.profesional_id && (*/}
                <button
                  onClick={() => enviarWhatsAppAlProfesional(cita.id)}  // ← SIN profesional_id
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Confirmar con Profesional (WhatsApp)
                </button>
              {/* )}*/}

              {/* {cita.estado === 'pendiente' && (*/}
                <button
                  onClick={() => enviarWhatsAppAlAdministrador(cita.id)}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Confirmar con Administración (WhatsApp)
                </button>
              {/* )}*/}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-1">ℹ️ Información:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>El pago se procesa de forma segura a través de Bold</li>
                  <li>La confirmación con el profesional envía una notificación por WhatsApp</li>
                  <li>La confirmación con administración requiere revisión manual</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
          {calcularSaldoPendiente() > 0 && (
            <button
              onClick={() => onPay(cita.id)}
              className="flex-[4] py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pagar Saldo Pendiente
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}