// components/admin/TareasModule/types.ts

export type EstadoTarea = 'pendiente' | 'en_seguimiento' | 'finalizada';

export interface Tarea {
  id: string;              // UUID o timestamp para unicidad
  titulo: string;          // Texto de la tarea
  descripcion?: string;
  estado: EstadoTarea;     // Estado actual
  fecha_creacion: Date;    // Fecha de creación (internamente Date)
  fecha_actualizacion?: Date; // Fecha de último cambio de estado
  orden?: number;          // Para ordenamiento personalizado (opcional)
}

export interface TareasModuleProps {
  apiUrl?: string;         // Base URL para API (opcional, para persistencia)
  token?: string | null;   // Token de autenticación (opcional)
  onTareaFinalizada?: (tarea: Tarea) => void; // Callback cuando se finaliza
  filtroInicial?: EstadoTarea | 'todas'; // Estado inicial del filtro  
  className?: string;  // ← Para permitir estilos personalizados desde el padre
}

export interface TareaFormData {
  titulo: string;
  descripcion?: string;
  orden?: number;
}