// lib/api/costosFijos.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';

export interface CostoFijoMensual {
  id: number;
  nombre: string;
  categoria: string;
  categoria_display: string;
  descripcion: string;
  monto: string;
  monto_proyectado: string | null;
  frecuencia: string;
  frecuencia_display: string;
  mes_referencia: number;
  mes_nombre: string;
  anio_referencia: number;
  dia_pago: number;
  fecha_pago_real: string | null;
  metodo_pago: string;
  metodo_pago_display: string;
  proveedor: string;
  referencia_pago: string;
  estado: string;
  estado_display: string;
  es_recurrente: boolean;
  es_esencial: boolean;
  es_vencido: boolean;
  dias_para_vencer: number | null;
  recibo_caja: number | null;
  recibo_codigo: string | null;
  session_caja: number | null;
  notas: string;
  registrado_por: number | null;
  registrado_por_username: string | null;
  creado: string;
  actualizado: string;
  proyeccion_anual: number;
}

export interface ResumenMensual {
  periodo: {
    mes: number;
    mes_nombre: string;
    anio: number;
  };
  totales: {
    total: number;
    pagado: number;
    pendiente: number;
    proyectado: number;
    porcentaje_ejecucion: number;
  };
  cantidades: {
    total: number;
    pagados: number;
    pendientes: number;
    proyectados: number;
  };
  por_categoria: Array<{
    categoria: string;
    categoria_display: string;
    total: number;
    cantidad: number;
  }>;
  top_costos: CostoFijoMensual[];
}

export interface ProyeccionAnual {
  anio: number;
  total_anual: number;
  promedio_mensual: number;
  por_mes: Array<{
    mes: number;
    mes_nombre: string;
    total: number;
    pagado: number;
    pendiente: number;
    cantidad: number;
  }>;
  por_categoria: Array<{
    categoria: string;
    categoria_display: string;
    total: number;
    cantidad: number;
    porcentaje: number;
  }>;
}

// Obtener token
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_token');
  }
  return null;
};

// Headers con autenticación
const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Listar costos fijos
export async function getCostosFijos(params?: {
  mes?: number;
  anio?: number;
  categoria?: string;
  estado?: string;
  es_recurrente?: boolean;
  es_esencial?: boolean;
}): Promise<CostoFijoMensual[]> {
  const searchParams = new URLSearchParams();
  
  if (params?.mes) searchParams.append('mes', params.mes.toString());
  if (params?.anio) searchParams.append('anio', params.anio.toString());
  if (params?.categoria) searchParams.append('categoria', params.categoria);
  if (params?.estado) searchParams.append('estado', params.estado);
  if (params?.es_recurrente !== undefined) searchParams.append('es_recurrente', params.es_recurrente.toString());
  if (params?.es_esencial !== undefined) searchParams.append('es_esencial', params.es_esencial.toString());

  const res = await fetch(`${API_URL}/costos-fijos/?${searchParams.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Error al cargar costos fijos');
  
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

// Crear costo fijo
export async function createCostoFijo(data: Partial<CostoFijoMensual>): Promise<CostoFijoMensual> {
  const res = await fetch(`${API_URL}/costos-fijos/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Error al crear costo fijo');
  }

  return res.json();
}

// Actualizar costo fijo
export async function updateCostoFijo(id: number, data: Partial<CostoFijoMensual>): Promise<CostoFijoMensual> {
  const res = await fetch(`${API_URL}/costos-fijos/${id}/`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Error al actualizar costo fijo');
  }

  return res.json();
}

// Eliminar costo fijo
export async function deleteCostoFijo(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/costos-fijos/${id}/`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error('Error al eliminar costo fijo');
}

// Marcar como pagado
export async function marcarComoPagado(
  id: number,
  data: {
    fecha_pago_real?: string;
    recibo_caja_id?: number;
    referencia_pago?: string;
    notas?: string;
  }
): Promise<CostoFijoMensual> {
  const res = await fetch(`${API_URL}/costos-fijos/${id}/marcar-pagado/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al marcar como pagado');
  }

  const result = await res.json();
  return result.costo;
}

// Proyectar para próximo mes
export async function proyectarCosto(
  id: number,
  data: {
    monto_proyectado?: number;
    mes_referencia?: number;
    anio_referencia?: number;
  }
): Promise<CostoFijoMensual> {
  const res = await fetch(`${API_URL}/costos-fijos/${id}/proyectar/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al proyectar costo');
  }

  const result = await res.json();
  return result.proyeccion;
}

// Obtener resumen mensual
export async function getResumenMensual(mes?: number, anio?: number): Promise<ResumenMensual> {
  const searchParams = new URLSearchParams();
  if (mes) searchParams.append('mes', mes.toString());
  if (anio) searchParams.append('anio', anio.toString());

  const res = await fetch(`${API_URL}/costos-fijos/resumen-mensual/?${searchParams.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Error al cargar resumen mensual');
  return res.json();
}

// Obtener proyección anual
export async function getProyeccionAnual(anio?: number): Promise<ProyeccionAnual> {
  const searchParams = new URLSearchParams();
  if (anio) searchParams.append('anio', anio.toString());

  const res = await fetch(`${API_URL}/costos-fijos/proyeccion-anual/?${searchParams.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Error al cargar proyección anual');
  return res.json();
}

// Obtener costos por categoría
export async function getCostosPorCategoria(mes?: number, anio?: number) {
  const searchParams = new URLSearchParams();
  if (mes) searchParams.append('mes', mes.toString());
  if (anio) searchParams.append('anio', anio.toString());

  const res = await fetch(`${API_URL}/costos-fijos/por-categoria/?${searchParams.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Error al cargar costos por categoría');
  return res.json();
}

// Replicar costos recurrentes
export async function replicarCostosRecurrentes(
  mes_destino: number,
  anio_destino: number
): Promise<{
  mensaje: string;
  periodo_destino: { mes: number; mes_nombre: string; anio: number };
  resumen: { creados: number; omitidos: number; errores: number };
  errores: string[] | null;
}> {
  const res = await fetch(`${API_URL}/costos-fijos/replicar-recurrentes/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ mes_destino, anio_destino }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al replicar costos');
  }

  return res.json();
}