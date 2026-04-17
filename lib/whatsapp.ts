// lib/whatsapp.ts

/**
 * Limpia y valida número de teléfono para WhatsApp
 * @param phone - Número en cualquier formato: '+57 300 123 4567', '3001234567', etc.
 * @returns Número en formato internacional sin símbolos: '573001234567'
 */
export function formatPhoneNumber(phone: string): string {
  // 1. Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // 2. Si empieza con 00, reemplazar por el código de país apropiado
  if (cleaned.startsWith('00')) {
    return cleaned.replace('00', '');
  }
  
  // 3. Si empieza con +, ya fue removido por el paso 1
  
  // 4. Si NO tiene código de país (menos de 10 dígitos para Colombia), agregar 57
  //    Ajusta esta lógica según tu país principal
  if (cleaned.length < 10 && !cleaned.startsWith('57')) {
    return `57${cleaned}`;
  }
  
  // 5. Si ya tiene código de país, retornar tal cual
  return cleaned;
}

/**
 * Construye URL de WhatsApp compatible con todos los dispositivos
 * @param phoneNumber - Número en formato internacional: '573001234567'
 * @param message - Mensaje con saltos de línea usando \n
 * @returns Objeto con URLs para diferentes métodos de apertura
 */
export function buildWhatsAppUrls(phoneNumber: string, message: string) {
  const phone = formatPhoneNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  
  return {
    // URL estándar (más compatible)
    standard: `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`,
    
    // URL corta (wa.me) - algunos dispositivos la prefieren
    short: `https://wa.me/${phone}?text=${encodedMessage}`,
    
    // Intent URL para Android (abre app directamente si está instalada)
    androidIntent: `intent://send?phone=${phone}&text=${encodedMessage}#Intent;scheme=https;package=com.whatsapp;end`,
    
    // Universal Link para iOS
    iosUniversal: `whatsapp://send?phone=${phone}&text=${encodedMessage}`,
  };
}

/**
 * Intenta abrir WhatsApp con múltiples estrategias de fallback
 * @param phoneNumber - Número del destinatario
 * @param message - Mensaje a enviar
 * @returns Promise<boolean> - true si logró abrir, false si falló
 */
export async function openWhatsAppWithFallback(
  phoneNumber: string, 
  message: string
): Promise<boolean> {
  const urls = buildWhatsAppUrls(phoneNumber, message);
  
  // Estrategia 1: Intentar con window.open y URL estándar
  try {
    const popup = window.open(urls.standard, '_blank', 'noopener,noreferrer');
    
    // Verificar si el popup fue bloqueado
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      console.warn('⚠️ Popup bloqueado, intentando fallback...');
      throw new Error('Popup blocked');
    }
    
    // Esperar un poco para ver si se abrió
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Si el popup sigue abierto, asumimos éxito
    if (!popup.closed) {
      console.log('✅ WhatsApp abierto con window.open');
      return true;
    }
  } catch (err) {
    console.warn('⚠️ window.open falló, probando fallback...');
  }
  
  // Estrategia 2: Redirección directa (más compatible con móviles)
  try {
    // Para móviles, redirigir directamente en la misma ventana
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      console.log('📱 Dispositivo móvil detectado, usando redirección directa');
      window.location.href = urls.standard;
      return true;
    }
    
    // Para desktop, intentar con la URL corta
    window.location.href = urls.short;
    return true;
  } catch (err) {
    console.error('❌ Fallback de redirección también falló:', err);
  }
  
  // Si todo falla, retornar false para que el frontend maneje el error
  return false;
}

/**
 * Función completa: enviar notificación al admin por WhatsApp
 * @param citaData - Datos de la cita para incluir en el mensaje
 * @param apiUrl - URL base de la API (opcional)
 * @param onOpenSuccess - Callback opcional si se abre exitosamente
 * @param onOpenError - Callback opcional si falla la apertura
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
    
    // 2. Construir mensaje COMPACTO y compatible
    // Usar \n para saltos de línea (encodeURIComponent los maneja)
    const mensaje = 
      `🔔 *NUEVA RESERVA DZ Salón* 🔔\n` +
      `📋 ${citaData.codigo_reserva}\n` +
      `👤 ${citaData.cliente_nombre}\n` +
      `💇 ${citaData.servicio_nombre}\n` +
      `📅 ${citaData.fecha} ${citaData.hora_inicio}\n` +
      `💰 $${parseInt(citaData.precio_total).toLocaleString('es-CO')}\n` +
      `✅ Confirmada - Gestionar`;
    
    // 3. Intentar abrir WhatsApp con fallbacks
    const exito = await openWhatsAppWithFallback(whatsappAdmin, mensaje);
    
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

/**
 * Hook React opcional para manejar estado de apertura de WhatsApp
 * Uso: const { open, loading, error } = useWhatsAppNotifier();
 */
export function useWhatsAppNotifier() {
  // Esta es una plantilla - implementar si necesitas estado React
  // Por ahora, usar la función asíncrita directa es suficiente
  return {
    enviar: enviarNotificacionAdminWhatsApp,
  };
}