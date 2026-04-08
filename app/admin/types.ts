// ==========================================
// TIPOS COMPARTIDOS - PANEL ADMIN
// ==========================================

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  orden?: number;
  activo?: boolean;
}

export interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  descripcion_corta: string;
  categoria: number;
  categoria_nombre: string;
  tipo_precio: 'fijo' | 'rango' | 'desde';
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  sesiones_incluidas: number;
  es_medico: boolean;
  requiere_valoracion: boolean;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio: string;
  destacado: boolean;
  disponible: boolean;
  imagen: string | null;
  imagen_url: string | null;
}

export interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  titulo: string;
  bio: string;
  es_medico: boolean;
  es_responsable: boolean;
  foto: string | null;
  foto_url: string | null;
  instagram: string;
  activo: boolean;
  orden: number;
  telefono_whatsapp: string;
  email_notificaciones: string;
  activo_reservas: boolean;
  servicios?: number[];
}

export interface Horario {
  id: number;
  profesional: number;
  profesional_nombre: string;
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  dia_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
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
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado';
  precio_total: string;
  pago_acumulado: string;
  estado_pago_detalle: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  notas_cliente: string;
  fecha_reserva: string;
}

export interface Pago {
  id: number;
  codigo_pago: string;
  monto: string;
  metodo_pago: 'bold' | 'efectivo' | 'transferencia' | 'nequi' | 'daviplata' | 'otro';
  estado: 'pendiente' | 'procesando' | 'exitoso' | 'fallido' | 'reembolsado' | 'cancelado';
  origen_tipo: 'cita' | 'producto' | 'membresia' | 'donacion' | 'reembolso' | 'ajuste' | 'otro';
  origen_id: number;
  usuario: number | null;
  registrado_por: number | null;
  referencia_externa: string | null;
  comprobante: string | null;
  comprobante_url: string | null;
  notas: string | null;
  creado_en: 'frontend' | 'admin' | 'api' | 'webhook' | 'otro';
  fecha_pago: string;
  actualizado_en: string;
  cliente_nombre?: string;
  cliente_email?: string;
  servicio_nombre?: string;
  cita_codigo?: string;
}