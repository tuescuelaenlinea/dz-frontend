// ✅ @/lib/dateUtils.ts
export const formatDateWithTimezone = (dateStr: string, timezone: string = 'America/Bogota'): { start: string; end: string } => {
  // Crear fecha en zona horaria local para el inicio del día (00:00:00)
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Inicio del día en zona horaria local
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Fin del día en zona horaria local (23:59:59)
  const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  
  // Convertir a ISO string para enviar al backend en UTC
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
};

// ← Alternativa más simple: usar offset manual para Colombia (UTC-5)
export const formatDateForAPI = (dateStr: string, isEnd: boolean = false): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  if (isEnd) {
    // Fin del día: 23:59:59 en hora local Colombia (UTC-5)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59-05:00`;
  }
  // Inicio del día: 00:00:00 en hora local Colombia (UTC-5)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-05:00`;
};