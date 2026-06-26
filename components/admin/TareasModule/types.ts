// components/admin/TareasModule/types.ts

export type EstadoTarea = 'pendiente' | 'en_seguimiento' | 'finalizada';

export interface Usuario {
  id: number;
  username: string;
  nombre_completo: string;
  email: string;
  is_staff: boolean;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoTarea;
  fecha_creacion: Date;
  fecha_actualizacion?: Date;
  orden?: number;
  
  // ← ← ← NUEVOS CAMPOS ← ← ←
  creada_por?: number;
  creada_por_username?: string;
  creada_por_nombre?: string;
  asignado_a?: number;
  asignado_a_username?: string;
  asignado_a_nombre?: string;
}

export interface TareasModuleProps {
  apiUrl?: string;
  token?: string | null;
  onTareaFinalizada?: (tarea: Tarea) => void;
  filtroInicial?: EstadoTarea | 'todas';
  className?: string;
  
  // ← ← ← NUEVO: Indica si el usuario actual es superusuario ← ← ←
  esSuperusuario?: boolean;
}

export interface TareaFormData {
  titulo: string;
  descripcion?: string;
  orden?: number;
  asignado_a?: number;  // ← ← ← NUEVO
}