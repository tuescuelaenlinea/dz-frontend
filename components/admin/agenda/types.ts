// components/admin/agenda/types.ts

export interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  titulo?: string;
  foto_url?: string | null;
  activo: boolean;
  orden: number;
}

export interface HorarioProfesional {
  id: number;
  profesional: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface ProfesionalConHorario extends Profesional {
  horarios_dia: HorarioProfesional[];
  trabaja_hoy: boolean;
}

export interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  metodo_pago: string;
  precio_total: string;
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado';
  pago_acumulado: string | number;
  estado_pago_detalle: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  notas_cliente?: string;
  notas_internas?: string;
  total_productos?: number;
  productos_asignados?: any[];
  monto_propina?: number;
  base_para_impuesto?: number;
  servicio_requiere_valoracion?: boolean;
}

export interface AgendaDiaResponse {
  fecha: string;
  dia_semana: string;
  profesionales: ProfesionalConHorario[];
  citas: Cita[];
  total_citas: number;
}

export interface SlotHorario {
  hora: string; // "08:00", "08:30", etc.
  label: string; // "8:00 AM", "8:30 AM", etc.
}

export interface CitaPosicionada extends Cita {
  filaInicio: number;
  filasOcupadas: number;
  columna: number;
}

export type VistaAgenda = 'dia' | 'semana' | 'mes';

export interface ModalCrearCitaData {
  fecha: string;
  hora: string;
  profesionalId: number;
}