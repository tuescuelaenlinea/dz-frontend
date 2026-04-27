// types/index.ts

// ← ← ← INTERFAZ SERVICIO (DEFINICIÓN ÚNICA) ← ← ←
export interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  
  // ← CAMPOS OPCIONALES (con ?) ← ← ←
  descripcion?: string;
  descripcion_corta?: string;
  tipo_precio?: 'fijo' | 'rango' | 'desde';
  precio_min?: number;
  precio_max?: number;
  duracion?: string;
  sesiones_incluidas?: number;
  es_medico?: boolean;
  requiere_valoracion?: boolean;
  disponible_salon?: boolean;
  disponible_domicilio?: boolean;
  adicional_domicilio?: number;
  destacado?: boolean;
  disponible?: boolean;
  imagen?: string | null;
  imagen_url?: string | null;
  categoria?: number | null;
  categoria_nombre?: string | null;
  profesionales_count?: number;
  creado?: string;
  actualizado?: string;
}

// ← ← ← OTRAS INTERFACES ← ← ←
export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono?: string;
  imagen?: string | null;
  imagen_url?: string | null;
  orden?: number;
  activo?: boolean;
  servicios_count?: number;
}

export interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  titulo?: string;
  bio?: string;
  es_medico?: boolean;
  es_responsable?: boolean;
  foto?: string | null;
  foto_url?: string | null;
  instagram?: string;
  activo?: boolean;
  orden?: number;
  telefono_whatsapp?: string;
  email_notificaciones?: string;
  activo_reservas?: boolean;
  porcentaje_global?: number | string;
}

export interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_id?: number | null;
  servicio: number;
  servicio_nombre: string;
  profesional?: number | null;
  profesional_nombre?: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  metodo_pago: string;
  estado: string;
  pago_estado: string;
  total_productos?: number;
}

// ← Agrega más interfaces según necesites...