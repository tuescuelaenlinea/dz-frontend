// src/lib/shareUtils.ts

/**
 * Genera un enlace compartible para reservar un servicio con valoración pre-abierta
 */
export function generateServiceShareUrl(servicio: {
  id: number;
  nombre: string;
  precio_min: string;
  duracion: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dzsalon.com';
  
  const params = new URLSearchParams({
    servicio: servicio.id.toString(),
    nombre: servicio.nombre,
    precio: servicio.precio_min,
    duracion: servicio.duracion.replace(/\D/g, ''), // Solo números
    valoracion: 'true', // ← CLAVE: Esto abre el modal automáticamente
  });
  
  return `${baseUrl}/citas?${params.toString()}`;
}

/**
 * Abre WhatsApp con un mensaje prellenado
 * @param phone Número en formato internacional (ej: "573001234567")
 * @param message Mensaje a enviar
 */
export function openWhatsApp(phone: string, message: string) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
  
  // Intentar abrir en nueva pestaña
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Combina ambas funciones para compartir un servicio por WhatsApp
 */
export function shareServiceViaWhatsApp(servicio: {
  id: number;
  nombre: string;
  precio_min: string;
  duracion: string;
}, phone: string = '') {
  const shareUrl = generateServiceShareUrl(servicio);
  
  const message = `Hola! 👋 Realiza la valoración de tu servicio aquí:\n\n` +
    `✨ *${servicio.nombre}*\n` +
    `💰 Desde $${parseInt(servicio.precio_min).toLocaleString()}\n` +
    `⏱️ ${servicio.duracion}\n\n` +
    `📅 Agenda tu cita aquí:\n${shareUrl}\n\n` +
    `_Enviado desde DZ Salón - https://dzsalon.com`;
  
  openWhatsApp(phone, message);
}