// types/fidelizacion.ts
export interface FidelizacionDashboard {
  proximos_a_regresar: number;
  en_seguimiento: number;
  en_riesgo: number;
  inactivos: number;
  clientes_vip: number;
  ventas_potenciales: number;
}

export interface ClienteFidelizacion {
  id: number;
  cliente: number | null;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string | null;
  profesional_nombre: string | null;
  fecha_sugerida: string;
  frecuencia_dias: number;
  dias_para_cita: number;
}

export interface PlantillaMensaje {
  id: number;
  nombre: string;
  categoria: string;
  contenido: string;
  es_activa: boolean;
  es_default: boolean;
}

export interface HistorialAutomatizacion {
  id: number;
  cliente_nombre: string;
  tipo: string;
  estado: string;
  fecha_envio: string;
  canal: string;
  mensaje_enviado: string;
}