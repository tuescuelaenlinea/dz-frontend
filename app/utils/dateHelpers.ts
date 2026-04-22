// utils/dateHelpers.ts

/**
 * Obtiene la fecha actual en formato ISO local (YYYY-MM-DD)
 * evitando problemas de zona horaria UTC
 */
export const getLocalDateISOString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha ISO a formato legible en español
 */
export const formatDateES = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-CO', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short' 
  });
};