// components/admin/CalcularComisionesModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

// ← ← ← INTERFACES CON VALIDACIÓN DE TIPOS ← ← ←
interface ComisionCalculada {
  cita_id: number;
  servicio_nombre: string;
  fecha_cita: string;
  codigo_reserva: string;
  base_servicio: number;
  descuento_bold: number;
  base_productos: number;
  descuento_asignado: number;
  base_calculo: number;
  porcentaje_aplicado: number;
  monto_comision: number;
}

interface ComisionesResponse {
  profesional: string;
  rango: { inicio: string; fin: string };
  comisiones: ComisionCalculada[];
  total_comisiones: number;
}

interface Profesional {
  id: number;
  nombre: string;
}

interface ValePendiente {
  id: number;
  codigo_vale: string;
  monto: string | number;
  fecha: string;
  notas: string;
}

interface PagarComisionesResponse {
  mensaje: string;
  recibo_codigo: string;
  recibo_id?: number;
  monto_neto: number;
  citas_procesadas?: number[];
  comisiones_pagadas?: number;
  metodo_pago?: string;
  [key: string]: unknown;
}

// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
// ← ← ← PROPS: onPagoExitoso AHORA ES OPCIONAL ← ← ←
// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
interface CalcularComisionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPagoExitoso?: (reciboCodigo: string) => void;  // ← OPCIONAL
  apiUrl: string;
  token: string | null;
  sessionCajaId?: number;
  profesionalId?: number;
}

// ← ← ← NUEVO: Opciones de método de pago (const para inmutabilidad)
const METODOS_PAGO = [
  { value: 'efectivo', label: '💵 Efectivo', color: 'bg-green-600' },
  { value: 'transferencia', label: '🏦 Transferencia', color: 'bg-blue-600' },
  { value: 'nequi', label: '📱 Nequi', color: 'bg-purple-600' },
  { value: 'daviplata', label: '📱 Daviplata', color: 'bg-pink-600' },
  { value: 'bold', label: '💳 Bold', color: 'bg-indigo-600' },
  { value: 'tarjeta', label: '💳 Tarjeta en sitio', color: 'bg-orange-600' },
] as const;

type MetodoPagoValue = typeof METODOS_PAGO[number]['value'];

// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
// ← ← ← VALIDACIÓN DEFENSIVA: Helpers robustos ← ← ←
// ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←

/**
 * Valida que un ID sea un número entero positivo válido
 */
const isValidId = (id: unknown): id is number => {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
};

/**
 * Valida que un array contenga solo IDs válidos
 */
const filterValidIds = (ids: unknown[]): number[] => {
  return ids.filter(isValidId);
};

/**
 * Parsea un valor monetario de forma segura (string o number)
 */
const parseMoney = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * ← ← ← CLAVE: Maneja respuestas de API con validación defensiva completa
 */
async function safeApiResponse<T = unknown>(
  response: Response,
  expectedFields?: string[]
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  
  const { status, headers } = response;
  const contentType = headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  // ← ← ← CASO: Respuesta no exitosa
  if (!response.ok) {
    let errorMessage = `Error ${status}`;
    
    if (isJson) {
      try {
        const errorData = await response.json();
        // Extraer mensaje de error de múltiples posibles ubicaciones
        errorMessage = 
          errorData?.error || 
          errorData?.detail || 
          errorData?.message || 
          errorData?.non_field_errors?.[0] ||
          JSON.stringify(errorData).slice(0, 200);
      } catch (parseError) {
        errorMessage = 'Error al procesar la respuesta del servidor';
        console.error('❌ Error parseando JSON de error:', parseError);
      }
    } else {
      // ← ← ← HTML error (500, 404, etc.)
      try {
        const text = await response.text();
        console.error(`❌ Respuesta no JSON [${status}]:`, text.substring(0, 300));
        
        // Mensajes específicos por status code
        const statusMessages: Record<number, string> = {
          400: 'Solicitud inválida. Verifica los datos enviados.',
          401: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
          403: 'No tienes permisos para realizar esta acción.',
          404: 'Recurso no encontrado.',
          500: 'Error interno del servidor. Contacta al administrador.',
          502: 'Servidor temporalmente no disponible.',
          503: 'Servicio en mantenimiento. Intenta más tarde.',
        };
        errorMessage = statusMessages[status] || `Error ${status}: ${text.substring(0, 100)}`;
      } catch {
        errorMessage = `Error ${status}: Respuesta no legible`;
      }
    }
    
    return { ok: false, error: errorMessage, status };
  }
  
  // ← ← ← CASO: Respuesta exitosa - validar JSON
  if (isJson) {
    try {
      const data = await response.json();
      
      // ← ← ← Validación de estructura básica (si se especifican campos esperados)
      if (expectedFields?.length && typeof data === 'object' && data !== null) {
        const missingFields = expectedFields.filter(field => !(field in data));
        if (missingFields.length > 0) {
          console.warn('⚠️ Campos faltantes en respuesta:', missingFields);
          // No fallamos, solo advertimos (tolerante)
        }
      }
      
      return { ok: true, data: data as T, status };
    } catch (parseError) {
      console.error('❌ Error parseando JSON exitoso:', parseError);
      return { ok: false, error: 'Respuesta del servidor con formato inválido', status };
    }
  }
  
  // ← ← ← CASO: Respuesta vacía o formato no soportado
  if (status === 204) {
    return { ok: true, data: {} as T, status };
  }
  
  return { ok: false, error: 'Formato de respuesta no soportado', status };
}

/**
 * ← ← ← VALIDADOR: Verifica que una comisión tenga estructura válida
 */
const isValidComision = (com: unknown): com is ComisionCalculada => {
  if (!com || typeof com !== 'object') return false;
  const c = com as Record<string, unknown>;
  return (
    isValidId(c.cita_id) &&
    typeof c.servicio_nombre === 'string' &&
    typeof c.fecha_cita === 'string' &&
    typeof c.codigo_reserva === 'string' &&
    typeof c.monto_comision === 'number' &&
    !isNaN(c.monto_comision)
  );
};

export default function CalcularComisionesModal({
  isOpen,
  onClose,
  onPagoExitoso,  // ← ← ← Ahora opcional
  apiUrl,
  token
}: CalcularComisionesModalProps) {
  
  // ← ← ← ESTADOS CON VALORES INICIALES SEGUROS
  const [profesionalId, setProfesionalId] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [notasPago, setNotasPago] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoValue>('efectivo');
  
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [comisionesData, setComisionesData] = useState<ComisionesResponse | null>(null);
  const [valesPendientes, setValesPendientes] = useState<ValePendiente[]>([]);
  
  // ← ← ← IDs seleccionados: siempre arrays de números válidos
  const [selectedComisiones, setSelectedComisiones] = useState<number[]>([]);
  const [selectedVales, setSelectedVales] = useState<number[]>([]);
  
  // ← ← ← Estado para errores específicos de UI
  const [uiError, setUiError] = useState<string | null>(null);

  // ← ← ← CLEANUP: Limpiar estados al cerrar modal
  const resetModal = useCallback(() => {
    setComisionesData(null);
    setValesPendientes([]);
    setSelectedComisiones([]);
    setSelectedVales([]);
    setNotasPago('');
    setUiError(null);
    setMetodoPago('efectivo');
  }, []);

  useEffect(() => {
    if (isOpen) {
      cargarProfesionales();
      // ← ← ← Fechas por defecto: mes actual
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaInicio(primerDia.toISOString().split('T')[0]);
      setFechaFin(hoy.toISOString().split('T')[0]);
    } else {
      resetModal();
    }
  }, [isOpen, resetModal]);

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← CARGAR PROFESIONALES CON VALIDACIÓN DEFENSIVA ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const cargarProfesionales = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/profesionales/?activo=true`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(10000)  // ← ← ← Timeout de 10s
      });
      
      const result = await safeApiResponse<Profesional[]>(res);
      
      if (result.ok && result.data) {
        // ← ← ← Filtrar y validar profesionales
        const profesionalesValidos = Array.isArray(result.data) 
          ? result.data.filter(p => isValidId(p.id) && typeof p.nombre === 'string')
          : (result.data as any)?.results 
            ? Array.isArray((result.data as any).results)
              ? (result.data as any).results.filter((p: unknown) => isValidId((p as Profesional)?.id))
              : []
            : [];
        
        setProfesionales(profesionalesValidos);
      } else {
        console.warn('⚠️ No se pudieron cargar profesionales:', result.error);
        setUiError('No se pudieron cargar los profesionales. Intenta recargar la página.');
      }
    } catch (err) {
      console.error('❌ Error de red cargando profesionales:', err);
      setUiError('Error de conexión. Verifica tu conexión a internet.');
    }
  }, [apiUrl, token]);

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← CALCULAR COMISIONES CON VALIDACIÓN EXTENSIVA ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const handleCalcular = async () => {
    setUiError(null);
    
    // ← ← ← VALIDACIONES DE ENTRADA
    if (!profesionalId || !isValidId(parseInt(profesionalId))) {
      setUiError('Selecciona un profesional válido');
      return;
    }
    
    if (!fechaInicio || !fechaFin) {
      setUiError('Selecciona el rango de fechas completo');
      return;
    }
    
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setUiError('La fecha inicial no puede ser posterior a la final');
      return;
    }

    setLoading(true);
    
    try {
      const profesionalIdNum = parseInt(profesionalId);
      
      // ← ← ← 1. Calcular Comisiones
      const resComisiones = await fetch(`${apiUrl}/caja/comisiones/calcular/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          profesional: profesionalIdNum,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        }),
        signal: AbortSignal.timeout(30000)  // ← ← ← Timeout de 30s para cálculo
      });

      const resultComisiones = await safeApiResponse<ComisionesResponse>(
        resComisiones, 
        ['comisiones', 'total_comisiones']
      );
      
      if (!resultComisiones.ok || !resultComisiones.data) {
        throw new Error(resultComisiones.error || 'Error calculando comisiones');
      }
      
      // ← ← ← VALIDAR ESTRUCTURA DE COMISIONES
      const comisionesValidas = (resultComisiones.data.comisiones || [])
        .filter(isValidComision);
      
      if (comisionesValidas.length === 0 && resultComisiones.data.comisiones?.length) {
        console.warn('⚠️ Todas las comisiones fueron filtradas por validación');
      }
      
      const dataValidada: ComisionesResponse = {
        ...resultComisiones.data,
        comisiones: comisionesValidas,
        total_comisiones: comisionesValidas.reduce((sum, c) => sum + c.monto_comision, 0)
      };
      
      setComisionesData(dataValidada);
      setSelectedComisiones(comisionesValidas.map(c => c.cita_id));
      
      // ← ← ← 2. Cargar Vales Pendientes (no bloqueante si falla)
      try {
        const resVales = await fetch(
          `${apiUrl}/caja/vales/?profesional=${profesionalIdNum}&estado=registrado`, 
          { 
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(10000)
          }
        );
        
        const resultVales = await safeApiResponse<ValePendiente[]>(resVales);
        
        if (resultVales.ok && resultVales.data) {
          const valesValidos = Array.isArray(resultVales.data)
            ? resultVales.data.filter(v => 
                isValidId(v.id) && 
                typeof v.monto !== 'undefined' && 
                parseMoney(v.monto) >= 0
              )
            : (resultVales.data as any)?.results 
              ? Array.isArray((resultVales.data as any).results)
                ? (resultVales.data as any).results.filter((v: unknown) => isValidId((v as ValePendiente)?.id))
                : []
              : [];
          
          setValesPendientes(valesValidos);
          // Opción más concisa:
            setSelectedVales(valesValidos.map((v: ValePendiente) => v.id));
        }
      } catch (valesError) {
        console.warn('⚠️ No se pudieron cargar vales (no crítico):', valesError);
        // Continuar sin vales
      }
      
    } catch (err: unknown) {
      console.error('❌ Error en handleCalcular:', err);
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setUiError(message);
      alert(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← PAGAR COMISIONES CON VALIDACIÓN MÁXIMA ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const handlePagar = async () => {
    setUiError(null);
    
    // ← ← ← VALIDAR SELECCIÓN
    const comisionesValidas = filterValidIds(selectedComisiones);
    const valesValidos = filterValidIds(selectedVales);
    
    if (comisionesValidas.length === 0 && valesValidos.length === 0) {
      setUiError('Selecciona al menos una comisión o vale para procesar');
      return;
    }
    
    // ← ← ← VALIDAR MONTO NETO
    const totalComisiones = comisionesData?.comisiones
      ?.filter(c => comisionesValidas.includes(c.cita_id))
      .reduce((sum, c) => sum + c.monto_comision, 0) || 0;
      
    const totalVales = valesPendientes
      .filter(v => valesValidos.includes(v.id))
      .reduce((sum, v) => sum + parseMoney(v.monto), 0);
      
    const montoNeto = totalComisiones - totalVales;
    
    if (montoNeto < 0) {
      setUiError('El monto neto no puede ser negativo. Revisa los vales seleccionados.');
      return;
    }
    
    // ← ← ← CONFIRMACIÓN CON DETALLES
    const metodoLabel = METODOS_PAGO.find(m => m.value === metodoPago)?.label || metodoPago;
    const confirmMessage = `¿Confirmar pago de comisiones?
    
📋 Comisiones: ${comisionesValidas.length} (${formatMoney(totalComisiones)})
🎫 Vales: ${valesValidos.length} (-${formatMoney(totalVales)})
💵 Neto: ${formatMoney(montoNeto)}
💳 Método: ${metodoLabel}

${notasPago ? `📝 Notas: ${notasPago}` : ''}`;

    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    
    try {
      // ← ← ← CONSTRUIR PAYLOAD VALIDADO
      const payload = {
        comisiones_ids: comisionesValidas,
        vales_ids: valesValidos,
        propinas_ids: [],  // ← ← ← Mantener compatibilidad con backend
        notas: notasPago?.trim() || '',
        metodo_pago: metodoPago
      };
      
      // ← ← ← LOG DE AUDITORÍA (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('📦 [ComisionesModal] Payload validado:', {
          ...payload,
          token: token ? '✓' : '✗'
        });
      }

      const res = await fetch(`${apiUrl}/caja/comisiones/pagar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });

      const result = await safeApiResponse<PagarComisionesResponse>(
        res, 
        ['recibo_codigo', 'monto_neto']
      );

      if (result.ok && result.data?.recibo_codigo) {
        const data = result.data;
        
        // ← ← ← MENSAJE DE ÉXITO DETALLADO
        const successMessage = `✅ Pago procesado exitosamente
        
🧾 Recibo: ${data.recibo_codigo}
💵 Monto neto: ${formatMoney(data.monto_neto)}
💳 Método: ${data.metodo_pago || metodoLabel}
📋 Comisiones pagadas: ${data.comisiones_pagadas || comisionesValidas.length}`;
        
        alert(successMessage);
        
        // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
        // ← ← ← CLAVE: onPagoExitoso es OPCIONAL - usar optional chaining
        // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
        onPagoExitoso?.(data.recibo_codigo);
        
        onClose();
      } else {
        // ← ← ← MANEJO DE ERROR DEL BACKEND
        const backendError = result?.error || result?.data?.error || 'Error desconocido del servidor';
        console.error('❌ Error del servidor:', { 
          status: result?.status, 
          error: backendError,
          data: result?.data 
        });
        
        // ← ← ← ERRORES ESPECÍFICOS PARA MEJOR UX
    // ← ← ← CORREGIDO: Verificar que backendError es string antes de usar métodos
    const errorLower = typeof backendError === 'string' ? backendError.toLowerCase() : '';

    if (errorLower.includes('comisión') || errorLower.includes('cita')) {
      setUiError(`Verificación de datos: ${backendError}`);
    } else if (result?.status === 0) {
  setUiError('No se encontraron comisiones válidas para pagar. Verifica el rango de fechas.');
} else {
  // ← ← ← CORREGIDO: Convertir unknown a string ← ← ←
  const errorMessage = typeof backendError === 'string' 
    ? backendError 
    : String(backendError ?? 'Error desconocido');
  
  setUiError(errorMessage);
}

// ← ← ← TAMBIÉN CORREGIR EL THROW ← ← ←
const errorToThrow = typeof backendError === 'string' 
  ? backendError 
  : String(backendError ?? 'Error desconocido');
throw new Error(errorToThrow);
      }
      
    } catch (err: unknown) {
      console.error('❌ Error crítico en handlePagar:', err);
      const message = err instanceof Error 
        ? err.message 
        : 'Error inesperado al procesar el pago';
      
      // ← ← ← NO sobrescribir error específico del backend
      if (!uiError) {
        setUiError(message);
      }
      
      alert(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← HELPERS DE FORMATO SEGUROS ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const formatMoney = useCallback((val: number | string | null | undefined): string => {
    const num = parseMoney(val);
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }, []);

  const formatDate = useCallback((dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }, []);

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← RENDER CONDICIONAL Y UI DEFENSIVA ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  if (!isOpen) return null;

  // ← ← ← CÁLCULOS SEGUROS (con fallbacks)
  const totalComisionesSeleccionadas = comisionesData?.comisiones
    ?.filter(c => selectedComisiones.includes(c.cita_id))
    .reduce((sum, c) => sum + (c.monto_comision || 0), 0) || 0;

  const totalValesSeleccionados = valesPendientes
    .filter(v => selectedVales.includes(v.id))
    .reduce((sum, v) => sum + parseMoney(v.monto), 0);

  const montoNeto = totalComisionesSeleccionadas - totalValesSeleccionados;
  const metodoSeleccionado = METODOS_PAGO.find(m => m.value === metodoPago);

  return (
    <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-gray-700">
        
        {/* ← ← ← HEADER */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">💰 Pagar Comisiones a Empleado</h2>
            <p className="text-sm text-gray-400 mt-1">Selecciona el período y los items a pagar</p>
          </div>
          <button 
            onClick={() => { resetModal(); onClose(); }} 
            className="text-gray-400 hover:text-white text-2xl transition-colors"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ← ← ← ALERTA DE ERROR DE UI (si existe) */}
          {uiError && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span>⚠️</span>
              <span>{uiError}</span>
              <button 
                onClick={() => setUiError(null)}
                className="ml-auto text-red-400 hover:text-red-200"
                aria-label="Cerrar alerta"
              >
                &times;
              </button>
            </div>
          )}
          
          {/* ← ← ← FORMULARIO DE BÚSQUEDA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1">👤 Profesional</label>
              <select
                value={profesionalId}
                onChange={(e) => setProfesionalId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                disabled={loading}
              >
                <option value="">Seleccionar...</option>
                {profesionales.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre || `Profesional #${p.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">📅 Desde</label>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                disabled={loading}
                max={fechaFin || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">📅 Hasta</label>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)} 
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                disabled={loading}
                min={fechaInicio || undefined}
              />
            </div>
            <div className="md:col-span-4">
              <button
                onClick={handleCalcular}
                disabled={loading || !profesionalId || !fechaInicio || !fechaFin}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Calculando...
                  </>
                ) : (
                  '🔍 Calcular Comisiones'
                )}
              </button>
            </div>
          </div>

          {/* ← ← ← RESULTADOS: COMISIONES Y VALES */}
          {comisionesData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ← ← ← LISTA DE COMISIONES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">
                    📋 Comisiones Pendientes ({comisionesData.comisiones?.length || 0})
                  </h3>
                  <span className="text-sm text-blue-400 font-bold">
                    Total: {formatMoney(comisionesData.total_comisiones)}
                  </span>
                </div>
                
                <div className="bg-gray-900 rounded-xl border border-gray-700 max-h-[400px] overflow-y-auto">
                  {!comisionesData.comisiones?.length ? (
                    <p className="p-4 text-center text-gray-500">No hay comisiones pendientes en este rango.</p>
                  ) : (
                    comisionesData.comisiones.map((com) => {
                      // ← ← ← VALIDAR CADA COMISIÓN ANTES DE RENDERIZAR
                      if (!isValidComision(com)) {
                        console.warn('⚠️ Comisión inválida omitida:', com);
                        return null;
                      }
                      
                      const isSelected = selectedComisiones.includes(com.cita_id);
                      return (
                        <label 
                          key={com.cita_id} 
                          className={`flex items-center gap-3 p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-900/10 border-blue-700' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComisiones(prev => [...prev, com.cita_id]);
                              } else {
                                setSelectedComisiones(prev => prev.filter(id => id !== com.cita_id));
                              }
                            }}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-white truncate" title={com.servicio_nombre}>
                                {com.servicio_nombre}
                              </span>
                              <span className="font-bold text-green-400 ml-2 flex-shrink-0">
                                {formatMoney(com.monto_comision)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                              <span>📅 {formatDate(com.fecha_cita)}</span>
                              <span>🔖 {com.codigo_reserva}</span>
                            </div>
                            <div className="text-[10px] text-gray-600 mt-1">
                              Base: {formatMoney(com.base_calculo)} ({com.porcentaje_aplicado}%)
                            </div>
                          </div>
                        </label>
                      );
                    }).filter(Boolean)
                  )}
                </div>
              </div>

              {/* ← ← ← PANEL DERECHO: VALES + RESUMEN */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">
                  🎫 Vales a Descontar ({valesPendientes.length})
                </h3>
                
                <div className="bg-gray-900 rounded-xl border border-gray-700 max-h-[200px] overflow-y-auto mb-4">
                  {valesPendientes.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No hay vales pendientes.</p>
                  ) : (
                    valesPendientes.map((vale) => {
                      // ← ← ← VALIDAR VALE ANTES DE RENDERIZAR
                      if (!isValidId(vale.id)) return null;
                      
                      const isSelected = selectedVales.includes(vale.id);
                      return (
                        <label 
                          key={vale.id} 
                          className={`flex items-center gap-3 p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors ${
                            isSelected ? 'bg-red-900/10 border-red-700' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVales(prev => [...prev, vale.id]);
                              } else {
                                setSelectedVales(prev => prev.filter(id => id !== vale.id));
                              }
                            }}
                            className="w-5 h-5 text-red-600 rounded focus:ring-red-500 bg-gray-700 border-gray-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-white truncate" title={vale.codigo_vale}>
                                {vale.codigo_vale}
                              </span>
                              <span className="font-bold text-red-400 ml-2 flex-shrink-0">
                                -{formatMoney(vale.monto)}
                              </span>
                            </div>
                            {vale.notas && (
                              <div className="text-xs text-gray-500 truncate" title={vale.notas}>
                                {vale.notas}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    }).filter(Boolean)
                  )}
                </div>

                {/* ← ← ← NOTAS DEL PAGO */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">📝 Notas del Pago</label>
                  <textarea
                    value={notasPago}
                    onChange={(e) => setNotasPago(e.target.value)}
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Observaciones (opcional)..."
                  />
                  <span className="text-[10px] text-gray-600">{notasPago.length}/200</span>
                </div>

                {/* ← ← ← SELECTOR DE MÉTODO DE PAGO */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">💳 Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.map((metodo) => (
                      <button
                        key={metodo.value}
                        type="button"
                        onClick={() => !loading && setMetodoPago(metodo.value)}
                        disabled={loading}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          metodoPago === metodo.value
                            ? `${metodo.color} border-white text-white shadow-lg scale-[1.02]`
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
                        }`}
                        aria-pressed={metodoPago === metodo.value}
                      >
                        {metodo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ← ← ← RESUMEN FINANCIERO */}
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Comisiones:</span>
                    <span className="text-green-400 font-bold">{formatMoney(totalComisionesSeleccionadas)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">(-) Vales:</span>
                    <span className="text-red-400 font-bold">-{formatMoney(totalValesSeleccionados)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">💵 Neto a Pagar:</span>
                      <span className={`text-2xl font-bold ${montoNeto >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {formatMoney(montoNeto)}
                      </span>
                    </div>
                    {metodoSeleccionado && (
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        Método: <span className={`font-semibold ${metodoSeleccionado.color.replace('bg-', 'text-')}`}>
                          {metodoSeleccionado.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ← ← ← FOOTER: ACCIONES */}
        <div className="p-6 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex justify-end gap-3">
          <button 
            onClick={() => { resetModal(); onClose(); }} 
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handlePagar}
            disabled={
              loading || 
              montoNeto < 0 || 
              (selectedComisiones.length === 0 && selectedVales.length === 0) ||
              !comisionesData
            }
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Procesando...
              </>
            ) : (
              `✅ Generar Recibo (${metodoSeleccionado?.label || 'Efectivo'})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}