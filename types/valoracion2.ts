// types/valoracion.ts

export type TipoSeccion = 
  | 'foto_opciones'
  | 'foto_descripcion'
  | 'pregunta_opciones'
  | 'pregunta_texto'
  | 'subir_foto';

export interface ValoracionOpcion {
  id: number;
  titulo: string;
  descripcion?: string;
  foto_url?: string;
  valor_adicional: number;
  orden: number;
  activo: boolean;
}

export interface ValoracionSeccion {
  id: number;
  tipo: TipoSeccion;
  titulo: string;
  instruccion?: string;
  orden: number;
  obligatoria: boolean;
  seleccion_multiple: boolean;
  condicion_visible?: {
    seccion_id: number;
    opcion_id: number;
  };
  opciones: ValoracionOpcion[];
}

export interface ValoracionConfig {
  id: number;
  servicio: number;
  titulo: string;
  descripcion?: string;
  secciones: ValoracionSeccion[];
}

export interface RespuestaValoracion {
  seccion: number;
  opcion_seleccionada?: number | number[];
  respuesta_texto?: string;
  foto_subida?: File;
}

export interface CalculoValoracion {
  servicio_id: number;
  servicio_nombre: string;
  precio_base: number;
  precio_adicional: number;
  precio_total: number;
  precio_total_formateado: string;
  desglose: Array<{
    seccion_id: number;
    seccion_titulo: string;
    opciones_seleccionadas: Array<{
      opcion_id: number;
      titulo: string;
      valor: number;
    }>;
    subtotal: number;
  }>;
  mensaje: string;
  secciones_completadas: number;
  total_secciones: number;
}