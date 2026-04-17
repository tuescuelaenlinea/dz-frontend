// lib/whatsapp.ts

/**
 * Construye URL de WhatsApp compatible con formato de TourDetailClient
 * @param phoneNumber - Número en formato: '573001234567' o '+57 300 123 4567'
 * @param message - Mensaje con saltos de línea usando \n
 * @returns URL lista para window.open()
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  // 1. Limpiar número: quitar todo lo que no sea dígito
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // 2. Asegurar prefijo 57 (solo si no lo tiene)
  const phoneWithCountry = cleaned.startsWith('57') ? cleaned : `57${cleaned}`;
  
  // 3. Codificar mensaje para URL
  const encodedMessage = encodeURIComponent(message);
  
  // 4. Construir URL con formato compatible
  return `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedMessage}`;
}

/**
 * Abre WhatsApp en nueva ventana con validaciones
 * @param url - URL generada por buildWhatsAppUrl
 * @returns boolean - true si se abrió, false si fue bloqueado
 */
export function openWhatsApp(url: string): boolean {
  const whatsappWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
    console.warn('⚠️ El navegador bloqueó la ventana de WhatsApp');
    return false;
  }
  
  return true;
}

/**
 * Función completa: obtener número del admin, construir mensaje y abrir WhatsApp
 * @param citaData - Datos de la cita para incluir en el mensaje
 * @param apiUrl - URL base de la API (opcional, usa default si no se proporciona)
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
  apiUrl?: string
): Promise<boolean> {
  try {
    const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    // 1. Obtener WhatsApp del admin desde configuración
    const configRes = await fetch(`${baseUrl}/configuracion/activa/`);
    if (!configRes.ok) {
      console.warn('⚠️ No se pudo cargar configuración para WhatsApp');
      return false;
    }
    
    const configData = await configRes.json();
    const config = configData.results?.[0] || configData;
    const whatsappAdmin = config?.whatsapp;
    
    if (!whatsappAdmin) {
      console.warn('⚠️ No hay WhatsApp de administración configurado');
      return false;
    }
    
    // 2. Construir mensaje con formato \n (como en TourDetailClient)
    const mensaje = `🔔 *NUEVA RESERVA CONFIRMADA - DZ Salón* 🔔\n\n` +
      `📋 *Código:* ${citaData.codigo_reserva}\n` +
      `👤 *Cliente:* ${citaData.cliente_nombre}\n` +
      `📱 *Teléfono:* ${citaData.cliente_telefono}\n` +
      `💇 *Servicio:* ${citaData.servicio_nombre}\n` +
      `📅 *Fecha:* ${citaData.fecha}\n` +
      `⏰ *Hora:* ${citaData.hora_inicio}\n` +
      `💰 *Total:* $${parseInt(citaData.precio_total).toLocaleString('es-CO')}\n\n` +
      `✅ Pago confirmado - Por favor gestionar la cita.`;
    
    // 3. Construir URL y abrir WhatsApp
    const url = buildWhatsAppUrl(whatsappAdmin, mensaje);
    return openWhatsApp(url);
    
  } catch (err) {
    console.error('❌ Error enviando notificación WhatsApp:', err);
    return false;
  }
}