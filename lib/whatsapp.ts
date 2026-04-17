// lib/whatsapp.ts

/**
 * Limpia y valida número de teléfono para WhatsApp
 * @param phone - Número en cualquier formato
 * @returns Número en formato internacional: '573001234567'
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    return cleaned.replace('00', '');
  }
  if (cleaned.length < 10 && !cleaned.startsWith('57')) {
    return `57${cleaned}`;
  }
  return cleaned;
}

/**
 * Construye URL de WhatsApp compatible
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const phone = formatPhoneNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
}

/**
 * Abre WhatsApp SIEMPRE en nueva ventana/pestaña
 * NUNCA usa window.location.href para no navegar fuera de la página actual
 * @param phoneNumber - Número del destinatario
 * @param message - Mensaje a enviar
 * @returns boolean - true si logró abrir, false si fue bloqueado
 */
export function openWhatsAppInNewWindow(phoneNumber: string, message: string): boolean {
  const url = buildWhatsAppUrl(phoneNumber, message);
  
  // ← SIEMPRE usar window.open con _blank, NUNCA window.location.href
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    console.warn('⚠️ El navegador bloqueó la ventana de WhatsApp');
    return false;
  }
  
  console.log('✅ WhatsApp abierto en nueva ventana');
  return true;
}

/**
 * Función completa: enviar notificación al admin por WhatsApp
 * @param citaData - Datos de la cita
 * @param apiUrl - URL base de la API
 * @param onOpenSuccess - Callback si se abre exitosamente
 * @param onOpenError - Callback si falla
 */
export async function enviarNotificacionAdminWhatsApp(
  citaData: {
    codigo_reserva: string;
    cliente_nombre: string;
    cliente_telefono: string;
    servicio_nombre: string;
    fecha: string;
    hora_inicio: string;
    precio_total: string;
  },
  apiUrl?: string,
  onOpenSuccess?: () => void,
  onOpenError?: () => void
): Promise<boolean> {
  try {
    const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    // 1. Obtener WhatsApp del admin desde configuración
    const configRes = await fetch(`${baseUrl}/configuracion/activa/`);
    if (!configRes.ok) {
      console.warn('⚠️ No se pudo cargar configuración para WhatsApp');
      onOpenError?.();
      return false;
    }
    
    const configData = await configRes.json();
    const config = configData.results?.[0] || configData;
    const whatsappAdmin = config?.whatsapp;
    
    if (!whatsappAdmin) {
      console.warn('⚠️ No hay WhatsApp de administración configurado');
      onOpenError?.();
      return false;
    }
    
    // 2. Construir mensaje COMPACTO
    const mensaje = 
      `🔔 *NUEVA RESERVA DZ Salón* 🔔\n` +
      `📋 ${citaData.codigo_reserva}\n` +
      `👤 ${citaData.cliente_nombre}\n` +
      `💇 ${citaData.servicio_nombre}\n` +
      `📅 ${citaData.fecha} ${citaData.hora_inicio}\n` +
      `💰 $${parseInt(citaData.precio_total).toLocaleString('es-CO')}\n` +
      `✅ Confirmada - Gestionar`;
    
    // 3. Abrir WhatsApp en NUEVA VENTANA (nunca navegar fuera)
    const exito = openWhatsAppInNewWindow(whatsappAdmin, mensaje);
    
    if (exito) {
      console.log('📱 Notificación WhatsApp enviada al admin');
      onOpenSuccess?.();
      return true;
    } else {
      console.warn('⚠️ No se pudo abrir WhatsApp automáticamente');
      onOpenError?.();
      return false;
    }
    
  } catch (err) {
    console.error('❌ Error en enviarNotificacionAdminWhatsApp:', err);
    onOpenError?.();
    return false;
  }
}