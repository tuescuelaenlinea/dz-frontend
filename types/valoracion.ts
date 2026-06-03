// types/valoracion.ts

export type TipoSeccion = 
  | 'foto_opciones'
  | 'foto_descripcion'
  | 'pregunta_opciones'
  | 'pregunta_texto'
  | 'subir_foto';

export interface ValoracionOpcion {
  id?: number;
  titulo: string;
  descripcion?: string;
  foto?: string | File;
  foto_url?: string;
  valor_adicional: number;
  orden: number;
  activo: boolean;
}

export interface ValoracionSeccion {
  id?: number;
  tipo: TipoSeccion;
  titulo: string;
  instruccion?: string;
  orden: number;
  obligatoria: boolean;
  seleccion_multiple: boolean;
  condicion_visible?: {
    seccion_id: number;
    opcion_id?: number;  // ← ← ← AGREGAR el signo ? aquí
  };
  opciones: ValoracionOpcion[];
}

export interface ValoracionConfig {
  id?: number;
  servicio: number;
  titulo: string;
  descripcion?: string;
  activo: boolean;
  secciones: ValoracionSeccion[];
}

export interface RespuestaValoracion {
  seccion: number;
  opcion_seleccionada?: number | number[];
  respuesta_texto?: string;
  foto_subida?: File | string;
}