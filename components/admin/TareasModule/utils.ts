// components/admin/TareasModule/utils.ts

import { EstadoTarea } from './types';

/**
 * Formatea fecha para mostrar en UI (timezone Colombia)
 */
export const formatDateColombia = (date: Date): string => {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

/**
 * Convierte string ISO a Date con timezone Colombia
 */
export const parseDateColombia = (isoString: string): Date => {
  const date = new Date(isoString);
  // Ajuste manual si la fecha viene en UTC y queremos hora local Colombia
  return date;
};

/**
 * Badge styles por estado
 */
export const getEstadoBadgeClass = (estado: EstadoTarea): string => {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'en_seguimiento':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'finalizada':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Label amigable para estado
 */
export const getEstadoLabel = (estado: EstadoTarea): string => {
  switch (estado) {
    case 'pendiente': return '⏳ Pendiente';
    case 'en_seguimiento': return '🔄 Seguimiento';
    case 'finalizada': return '✅ Finalizada';
    default: return estado;
  }
};