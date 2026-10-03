/**
 * components/admin/agenda/utils.ts
 * Genera un código de reserva con prefijo específico para el frontend.
 * Formato: PREFIJO-YYYYMMDD-XXXX (ej: ADM-20231026-A7B9)
 */
export const generarCodigoReservaFrontend = (prefijo: 'ADM' | 'PRO'): string => {
  const fecha = new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  
  // Genera 4 caracteres alfanuméricos aleatorios en mayúsculas
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefijo}-${yyyy}${mm}${dd}-${random}`;
};