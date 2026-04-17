// components/booking/BookingSuccess.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { enviarNotificacionAdminWhatsApp } from '@/lib/whatsapp';

interface BookingSuccessProps {
  citaId: number;
  codigoReserva: string;
  onNewBooking: () => void;
}

interface CitaData {
  profesional: number | null;
  profesional_nombre: string;
  servicio_nombre: string;
  fecha: string;
  hora_inicio: string;
  cliente_nombre: string;
  cliente_telefono: string;
  precio_total: string;
}

interface ProfesionalData {
  id: number;
  nombre: string;
  telefono_whatsapp?: string;
}

export default function BookingSuccess({
  citaId,
  codigoReserva,
  onNewBooking,
}: BookingSuccessProps) {
  const [loading, setLoading] = useState(true);
  const [citaData, setCitaData] = useState<CitaData | null>(null);
  const [profesionalData, setProfesionalData] = useState<ProfesionalData | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [whatsappAdmin, setWhatsappAdmin] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  // ← VALIDACIÓN: Verificar que recibimos los props requeridos
  if (!citaId || !codigoReserva) {
    console.error('❌ [BookingSuccess] Props faltantes:', { citaId, codigoReserva });
    setError('Datos de reserva incompletos. Por favor, verifica tu cita en "Mis Reservas".');
    setLoading(false);
    return;
  }

  // ← GUARD: Verificar si WhatsApp ya se abrió para esta cita
  const whatsappAlreadyOpened = localStorage.getItem(`cita_${citaId}_whatsapp_abierto`);
  if (whatsappAlreadyOpened === 'true') {
    console.log('ℹ️ [BookingSuccess] WhatsApp ya fue abierto anteriormente');
    setLoading(false);
    return;
  }
  
  async function loadData() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← CAMBIO CLAVE: Intentar SIN token primero (para usuarios no registrados)
      // La cita se crea con AllowAny, así que debería ser accesible sin auth
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // ← NUEVO: Delay inicial para asegurar que la cita esté disponible en la BD
      // Esto evita condiciones de carrera en móviles lentos
      if (retryCount === 0) {
        console.log('⏳ [BookingSuccess] Esperando 500ms para que la cita esté disponible...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 1. Obtener datos de la cita (SIN TOKEN por defecto)
      console.log('🔍 [BookingSuccess] Obteniendo cita #', citaId, 'Intento:', retryCount + 1, 'Auth:', 'Público');
      
      const citaRes = await fetch(`${apiUrl}/citas/${citaId}/`, { 
        headers,
        signal: AbortSignal.timeout(15000)  // ← Timeout más largo para móviles
      });
      
      // ← CAMBIO: Si falla 401/403, reintentar CON token (para usuarios registrados)
      if (!citaRes.ok && (citaRes.status === 401 || citaRes.status === 403)) {
        const token = typeof window !== 'undefined' 
          ? (localStorage.getItem('admin_token') || localStorage.getItem('token')) 
          : null;
        
        if (token && retryCount < 2) {
          console.log('🔄 [BookingSuccess] Reintentando con token de usuario...');
          headers['Authorization'] = `Bearer ${token}`;
          setRetryCount(prev => prev + 1);
          return loadData();  // ← Reintentar recursivamente
        }
        
        console.warn('⚠️ [BookingSuccess] No se pudo autenticar, pero continuando...');
        // ← NO retornar error, continuar sin datos del profesional
      }
      
      if (!citaRes.ok) {
        const errorText = await citaRes.text();
        console.error('❌ [BookingSuccess] Error obteniendo cita:', citaRes.status, errorText);
        
        // ← Solo mostrar error si no es 401/403 (esos son esperados para usuarios no registrados)
        if (citaRes.status !== 401 && citaRes.status !== 403) {
          setError('No se pudo cargar la información de la reserva. Intenta nuevamente o verifica en "Mis Citas".');
        }
        setLoading(false);
        return;
      }
      
      const cita: CitaData = await citaRes.json();
      console.log('📋 [BookingSuccess] Datos de la cita cargados:', cita);
      setCitaData(cita);
      
      // 2. Cargar WhatsApp del admin desde configuración (SIN TOKEN)
      async function cargarWhatsappAdmin() {
        try {
          const configRes = await fetch(`${apiUrl}/configuracion/activa/`);
          if (configRes.ok) {
            const configData = await configRes.json();
            const config = configData.results?.[0] || configData;
            if (config?.whatsapp) {
              const phone = config.whatsapp.replace(/\D/g, '');
              const phoneWithCountry = phone.startsWith('57') ? phone : `57${phone}`;
              setWhatsappAdmin(phoneWithCountry);
            }
          }
        } catch (err) {
          console.warn('⚠️ No se pudo cargar WhatsApp del admin');
        }
      }
      
      await cargarWhatsappAdmin();
      
      // 3. Si tiene profesional, obtener sus datos (OPCIONAL, no bloqueante)
      if (cita.profesional) {
        try {
          const profsRes = await fetch(`${apiUrl}/profesionales/`, { headers });
          if (profsRes.ok) {
            const profs = await profsRes.json();
            let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
            const profesional = profesionalesList.find((p: ProfesionalData) => p.id === cita.profesional);
            if (profesional) {
              setProfesionalData(profesional);
            }
          }
        } catch (err) {
          console.warn('⚠️ [BookingSuccess] No se pudo cargar profesional (no crítico):', err);
          // ← NO establecer error, continuar sin datos del profesional
        }
      }
      
      // 4. ENVIAR NOTIFICACIÓN WHATSAPP AL ADMIN
      console.log('📱 [BookingSuccess] Enviando notificación WhatsApp al admin...');
      
      enviarNotificacionAdminWhatsApp(
        {
          codigo_reserva: codigoReserva,
          cliente_nombre: cita.cliente_nombre,
          cliente_telefono: cita.cliente_telefono,
          servicio_nombre: cita.servicio_nombre,
          fecha: cita.fecha,
          hora_inicio: cita.hora_inicio,
          precio_total: cita.precio_total,
        },
        apiUrl,
        () => {
          console.log('✅ WhatsApp abierto exitosamente');
          setWhatsappOpened(true);
          localStorage.setItem(`cita_${citaId}_whatsapp_abierto`, 'true');
        },
        () => {
          console.warn('⚠️ No se pudo abrir WhatsApp automáticamente');
        }
      );
      
      setLoading(false);
      
    } catch (err: any) {
      console.error('❌ [BookingSuccess] Error cargando datos:', err);
      
      if (err.name === 'AbortError') {
        setError('La conexión es lenta. Verifica tu internet e intenta recargar.');
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
      } else {
        setError('Error al cargar la información: ' + err.message);
      }
      setLoading(false);
    }
  }
  
  loadData();
  
}, [citaId, codigoReserva, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
  };

  const openWhatsAppSecure = (url: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('📱 Tu navegador bloqueó la ventana de WhatsApp. Permite ventanas emergentes o haz clic derecho → "Abrir en nueva pestaña".');
      return false;
    }
    
    setWhatsappOpened(true);
    localStorage.setItem(`cita_${citaId}_whatsapp_abierto`, 'true');
    return true;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cargando tu reserva...</h2>
        <p className="text-gray-600">Obteniendo información de tu cita</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Algo salió mal</h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-8 inline-block">
          <p className="text-sm text-blue-600 mb-1">Código de reserva</p>
          <p className="text-2xl font-mono font-bold text-blue-900">{codigoReserva}</p>
        </div>
        
        <div className="space-y-4 max-w-sm mx-auto">
          <button
            onClick={handleRetry}
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            🔄 Reintentar carga
          </button>
          
          <Link
            href="/mis-citas"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            📅 Ver mis citas
          </Link>
          
          <button
            onClick={onNewBooking}
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            ➕ Nueva reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        ¡Reserva confirmada! 🎉
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Tu cita ha sido agendada exitosamente. 
        Te enviaremos un recordatorio 24 horas antes.
      </p>
      
      <div className="bg-blue-50 rounded-lg p-4 mb-8 inline-block">
        <p className="text-sm text-blue-600 mb-1">Código de reserva</p>
        <p className="text-2xl font-mono font-bold text-blue-900">{codigoReserva}</p>
      </div>
      
      {profesionalData && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-8 border border-purple-200">
          <p className="text-sm text-purple-600 mb-2">👨‍⚕️ Profesional asignado</p>
          <p className="text-lg font-bold text-gray-900">{profesionalData.nombre}</p>
          {citaData?.servicio_nombre && (
            <p className="text-sm text-gray-600 mt-1">{citaData.servicio_nombre}</p>
          )}
        </div>
      )}
      
      {whatsappOpened && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-8">
          <p className="text-green-800 font-semibold mb-2">
            📱 WhatsApp abierto en otra ventana
          </p>
          <p className="text-sm text-green-700">
            Notificación enviada al administrador
          </p>
        </div>
      )}
      
      <div className="space-y-4 max-w-sm mx-auto">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openWhatsAppSecure(whatsappUrl, e)}
            className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Ver mensaje al administrador
          </a>
        )}

        {whatsappAdmin && (
          <div className="mt-4">
            <a
              href={`https://api.whatsapp.com/send?phone=${whatsappAdmin}&text=${encodeURIComponent(
                `Hola DZ Salón 👋\nTengo una consulta sobre mi reserva ${codigoReserva}\nServicio: ${citaData?.servicio_nombre || '...'}\nFecha: ${citaData?.fecha || '...'}\n\nQuedo atento/a.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => openWhatsAppSecure(
                `https://api.whatsapp.com/send?phone=${whatsappAdmin}&text=${encodeURIComponent(
                  `Hola DZ Salón 👋\nTengo una consulta sobre mi reserva ${codigoReserva}\nServicio: ${citaData?.servicio_nombre || '...'}\nFecha: ${citaData?.fecha || '...'}\n\nQuedo atento/a.`
                )}`,
                e
              )}
              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 underline"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              ¿No se abrió WhatsApp? Haz clic aquí
            </a>
            <p className="text-xs text-gray-500 mt-1">
              💡 Si no abre, permite ventanas emergentes o haz clic derecho → "Abrir en nueva pestaña"
            </p>
          </div>
        )}
        
        <Link
          href="/mis-citas"
          className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          📅 Ver mis citas
        </Link>
        
        <button
          onClick={onNewBooking}
          className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          ➕ Nueva reserva
        </button>
      </div>
      
      <div className="mt-12 text-sm text-gray-500 space-y-2">
        <p>📍 <strong>Dirección:</strong> Bogotá, Colombia</p>
        <p>🕐 <strong>Horario:</strong> Lunes-Viernes 9AM-7PM, Sábados 9AM-5PM</p>
      </div>
    </div>
  );
}