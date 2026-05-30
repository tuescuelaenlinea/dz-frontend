// components/admin/ReciboImpresionModal.tsx
'use client';

import { useState, useEffect } from 'react';

// ← ← ← INTERFACES ← ← ←
interface PagoRelacionado {
  id: number;
  tipo: 'abono' | 'pago';
  monto: number;
  metodo_pago: string;
  metodo_pago_display: string;
  fecha: string;
  referencia: string;
  notas?: string;
  creado_por?: string | null;
  // Campos específicos para abonos
  recibo?: number;
  // Campos específicos para pagos
  origen_tipo?: string;
  origen_tipo_display?: string;
  descripcion_item?: string;
  tabla?: 'abonos' | 'pagos';  // ← ← ← CLAVE: Identifica la tabla para edición
}

export interface AbonoRecibo {
  id: number;
  recibo: number;
  monto: number | string;
  metodo_pago: 'nequi' | 'transferencia' | 'efectivo' | 'daviplata' | 'bold' | 'tarjeta' | 'caja_menor';
  metodo_pago_display: string;
  fecha_abono: string;
  referencia_externa?: string;
  notas?: string;
  creado_por?: number;
}

interface ReciboImpresionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recibo: ReciboCaja | null;
  formatMoney: (value: string | number) => string;
  formatDate: (dateStr: string) => string;
  
  apiUrl?: string;
  token?: string | null;
  cargarAbonosInternamente?: boolean;
  abonos?: AbonoRecibo[];
}

interface ReciboCaja {
  id: number;
  codigo_recibo: string;
  tipo: 'entrada' | 'salida' | 'venta';
  estado: 'borrador' | 'publicado' | 'anulado';
  subtotal: string;
  descuento: string;
  total: string;
  propina_total: string;
  metodo_pago: string;
  session_caja_turno: string;
  session_caja_id?: number | null; 
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  fecha: string;
  notas?: string;
  items?: Array<{
    id: number;
    tipo_item: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: string;
    subtotal: string;
    profesional?: number | null;
    profesional_nombre?: string | null;
    cita?: number | null;
    producto?: number | null;
  }>;
  distribuciones_propina?: Array<{
    id: number;
    profesional: number;
    profesional_nombre: string;
    monto_propina: string;
  }>;
}

export default function ReciboImpresionModal({
  isOpen,
  onClose,
  recibo,
  formatMoney,
  formatDate,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  cargarAbonosInternamente = true,
  abonos: abonosExternos = [],
}: ReciboImpresionModalProps) {
  
  // ← ← ← ESTADOS PARA ABONOS INTERNOS ← ← ←
  const [abonosInternos, setAbonosInternos] = useState<AbonoRecibo[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [errorAbonos, setErrorAbonos] = useState<string | null>(null);

  // ← ← ← ESTADOS PARA PAGOS RELACIONADOS ← ← ←
  const [pagosRelacionados, setPagosRelacionados] = useState<PagoRelacionado[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  // ← ← ← ESTADOS PARA EDICIÓN DE ABONOS ← ← ←
  const [abonoEditandoId, setAbonoEditandoId] = useState<number | null>(null);
  const [metodoTemporalAbono, setMetodoTemporalAbono] = useState<string>('');

  // ← ← ← ESTADOS PARA EDICIÓN DE REGISTROS UNIFICADOS ← ← ←
  const [registroEditandoId, setRegistroEditandoId] = useState<string | null>(null);
  const [metodoTemporalRegistro, setMetodoTemporalRegistro] = useState('');

  // ← ← ← DETERMINAR QUÉ ABONOS USAR ← ← ←
  const abonos = cargarAbonosInternamente ? abonosInternos : abonosExternos;

  // ← ← ← OPCIONES DE MÉTODO DE PAGO ← ← ←
  const OPCIONES_METODO = [
    { value: 'efectivo', label: '💵 Efectivo' },
    { value: 'transferencia', label: '🏦 Transferencia' },
    { value: 'nequi', label: '📱 Nequi' },
    { value: 'daviplata', label: '📱 Daviplata' },
    { value: 'bold', label: '💳 Bold' },
    { value: 'tarjeta', label: '💳 Tarjeta' },  
    { value: 'caja_menor', label: '📦 Caja menor' },  
  ] as const;

  // ← ← ← FUNCIÓN: Cargar pagos y abonos unificados ← ← ←
  const cargarPagosRelacionados = async (reciboId: number) => {
    if (!reciboId) return;
    
    setLoadingPagos(true);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/pagos-relacionados/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // ← ← ← UNIFICAR Y MAPEAR CON TABLA CORRECTA ← ← ←
        const abonosMapeados = (data.abonos || []).map((a: any) => ({
          ...a,
          tipo: 'abono' as const,
          tabla: 'abonos' as const,  // ← ← ← CLAVE: Identificar tabla
        }));
        
        const pagosMapeados = (data.pagos || []).map((p: any) => ({
          ...p,
          tipo: 'pago' as const,
          tabla: 'pagos' as const,  // ← ← ← CLAVE: Identificar tabla
        }));
        
        // ← ← ← UNIFICAR Y ORDENAR POR FECHA DESCENDENTE ← ← ←
        const todos = [...abonosMapeados, ...pagosMapeados]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        
        setPagosRelacionados(todos);
        console.log(`✅ Pagos/Abonos cargados: ${todos.length} registros`);
      }
    } catch (err) {
      console.error('❌ Error cargando pagos relacionados:', err);
      setPagosRelacionados([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  // ← ← ← EFECTO: Cargar pagos cuando cambie el recibo ← ← ←
  useEffect(() => {
    if (recibo?.id && isOpen) {
      cargarPagosRelacionados(recibo.id);
    } else {
      setPagosRelacionados([]);
    }
  }, [recibo?.id, isOpen]);

  // ← ← ← EFECTO: Cargar abonos internos si corresponde ← ← ←
  useEffect(() => {
    if (!isOpen || !recibo?.id || !cargarAbonosInternamente) {
      setAbonosInternos([]);
      setErrorAbonos(null);
      return;
    }

    const cargarAbonos = async () => {
      setLoadingAbonos(true);
      setErrorAbonos(null);
      
      try {
        const res = await fetch(`${apiUrl}/caja/abonos/resumen/${recibo.id}/`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        
        const data = await res.json();
        setAbonosInternos(data.abonos || []);
        
      } catch (err: any) {
        console.error('❌ Error cargando abonos:', err);
        setErrorAbonos(err.message || 'Error al cargar abonos');
        setAbonosInternos([]);
      } finally {
        setLoadingAbonos(false);
      }
    };

    cargarAbonos();
  }, [isOpen, recibo?.id, cargarAbonosInternamente, apiUrl, token]);

  // ← ← ← RESETear estados al cerrar modal ← ← ←
  useEffect(() => {
    if (!isOpen) {
      setAbonosInternos([]);
      setLoadingAbonos(false);
      setErrorAbonos(null);
      setPagosRelacionados([]);
    }
  }, [isOpen]);

  // ← ← ← HELPER: Icono según método de pago ← ← ←
  const getMetodoIcon = (metodo: string) => {
    const icons: Record<string, string> = {
      'efectivo': '💵', 'transferencia': '🏦', 'nequi': '📱',
      'daviplata': '📱', 'bold': '💳', 'tarjeta': '💳',
      'tarjeta_sitio': '💳', 'pendiente': '⏳',
    };
    return icons[metodo] || '💰';
  };

  // ← ← ← HELPER: Label amigable para método de pago ← ← ←
  const getMetodoLabel = (metodo: string) => {
    const opciones: Record<string, string> = {
      efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
      nequi: '📱 Nequi', daviplata: '📱 Daviplata',
      bold: '💳 Bold', tarjeta: '💳 Tarjeta',
      caja_menor: '📦 Caja menor',
    };
    return opciones[metodo] || metodo;
  };

  // ← ← ← HELPER: Formatear hora ← ← ←
  const formatTime = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return ''; }
  };

  // ← ← ← HELPER: Calcular total abonado ← ← ←
  const calcularTotalAbonado = () => {
    return abonos.reduce((sum, a) => sum + parseFloat(String(a.monto)), 0);
  };

  // ═══════════════════════════════════════════════════════════════
  // ← ← ← FUNCIONES PARA EDITAR MÉTODO DE PAGO DE ABONOS ← ← ←
  // ═══════════════════════════════════════════════════════════════
  
  const handleGuardarMetodoAbono = async (abonoId: number, nuevoMetodo: string) => {
    if (!nuevoMetodo) { setAbonoEditandoId(null); return; }
    
    try {
      const res = await fetch(`${apiUrl}/caja/abonos/${abonoId}/actualizar-metodo-pago/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ metodo_pago: nuevoMetodo })
      });
      
      if (res.ok) {
        console.log(`✅ Método de abono actualizado: ${nuevoMetodo}`);
        
        // ← ← ← ACTUALIZAR ESTADO LOCAL ← ← ←
        setAbonosInternos(prev => prev.map(a =>
          a.id === abonoId 
            ? { ...a, metodo_pago: nuevoMetodo as AbonoRecibo['metodo_pago'] } 
            : a
        ));
        
        // ← ← ← ACTUALIZAR PAGOS RELACIONADOS SI EXISTE ← ← ←
        setPagosRelacionados(prev => prev.map(r =>
          r.tabla === 'abonos' && r.id === abonoId
            ? { ...r, metodo_pago: nuevoMetodo }
            : r
        ));
        
        // ← ← ← DISPARAR EVENTO PARA PADRE ← ← ←
        window.dispatchEvent(new CustomEvent('abonoActualizado', {
          detail: { id: abonoId, metodo_pago: nuevoMetodo }
        }));
        
        setAbonoEditandoId(null);
      } else {
        console.error('❌ Error actualizando método de abono');
        setMetodoTemporalAbono('');
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      setMetodoTemporalAbono('');
    } finally {
      setAbonoEditandoId(null);
    }
  };

  const handleClicMetodoAbono = (abono: AbonoRecibo, e: React.MouseEvent) => {
    e.stopPropagation();
    setAbonoEditandoId(abono.id);
    setMetodoTemporalAbono(abono.metodo_pago);
  };

  // ═══════════════════════════════════════════════════════════════
  // ← ← ← FUNCIONES PARA EDITAR MÉTODO DE REGISTROS UNIFICADOS ← ← ←
  // ═══════════════════════════════════════════════════════════════
  
  const handleClicMetodoRegistro = (registro: PagoRelacionado, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegistroEditandoId(`${registro.tabla}-${registro.id}`);
    setMetodoTemporalRegistro(registro.metodo_pago);
  };

  const handleGuardarMetodoRegistro = async (
    id: number, 
    tabla: 'abonos' | 'pagos', 
    nuevoMetodo: string
  ) => {
    if (!nuevoMetodo) { setRegistroEditandoId(null); return; }
    
    try {
      // ← ← ← CLAVE: Endpoint dinámico según tabla ← ← ←
      const endpoint = tabla === 'abonos' 
        ? `${apiUrl}/caja/abonos/${id}/actualizar-metodo-pago/`
        : `${apiUrl}/pagos/${id}/actualizar-metodo-pago/`;
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ metodo_pago: nuevoMetodo })
      });
      
      if (res.ok) {
        console.log(`✅ Método actualizado en ${tabla}: ${nuevoMetodo}`);
        
        // ← ← ← ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE ← ← ←
        setPagosRelacionados(prev => prev.map(r =>
          r.tabla === tabla && r.id === id
            ? { ...r, metodo_pago: nuevoMetodo }
            : r
        ));
        
        // ← ← ← DISPARAR EVENTO GLOBAL ← ← ←
        window.dispatchEvent(new CustomEvent('metodoPagoActualizado', {
          detail: { id, tabla, metodo_pago: nuevoMetodo }
        }));
        
        setRegistroEditandoId(null);
      } else {
        console.error(`❌ Error actualizando método en ${tabla}`);
        setMetodoTemporalRegistro('');
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      setMetodoTemporalRegistro('');
    } finally {
      setRegistroEditandoId(null);
    }
  };

  // ← ← ← HELPER: Badge por tipo de registro ← ← ←
  const getTipoBadgeClass = (registro: PagoRelacionado) => {
    if (registro.tipo === 'abono') {
      return 'bg-blue-900/50 text-blue-300 border-blue-700';
    }
    
    // Para pagos, diferenciar por origen_tipo
    switch (registro.origen_tipo) {
      case 'ajuste':
      case 'vale':
        return 'bg-orange-900/50 text-orange-300 border-orange-700'; // Vales
      case 'comision_empleado':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-700'; // Comisiones
      case 'cita':
        return 'bg-purple-900/50 text-purple-300 border-purple-700'; // Ventas directas
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  // ← ← ← FUNCIÓN DE IMPRESIÓN ← ← ←
  const handlePrint = () => {
    const printContent = document.getElementById('recibo-para-imprimir');
    if (!printContent) return;

    const ventanaImpresion = window.open('', '_blank', 'width=400,height=900');
    if (!ventanaImpresion) return;

    // ← ← ← GENERAR HTML DE ABONOS PARA IMPRESIÓN ← ← ←
    const abonosPrintHTML = abonos && abonos.length > 0 ? `
      <div style="margin-top:12px; padding-top:10px; border-top:1px dashed #999;">
        <div style="font-size:10px; color:#555; margin-bottom:6px; font-weight:bold;">
          💰 Pagos registrados:
        </div>
        ${abonos.map((abono: AbonoRecibo) => `
          <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px; color:#666;">
            <span>• ${getMetodoLabel(abono.metodo_pago)} ${abono.referencia_externa ? `(${abono.referencia_externa.substring(0,8)}...)` : ''}</span>
            <span style="font-weight:600; color:#22c55e;">${formatMoney(abono.monto)}</span>
          </div>
        `).join('')}
        <div style="font-size:9px; color:#999; margin-top:4px; text-align:right;">
          Total abonado: ${formatMoney(calcularTotalAbonado())}
        </div>
      </div>
    ` : '';

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo ${recibo?.codigo_recibo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 11px; 
            color: #000;
            max-width: 320px;
            margin: 0 auto;
            padding: 15px;
            background: #fff;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 12px; 
            margin-bottom: 12px; 
          }
          .header h1 { font-size: 18px; margin-bottom: 4px; font-weight: bold; }
          .header p { font-size: 10px; color: #555; margin: 2px 0; }
          .info { margin-bottom: 12px; }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 4px; 
            font-size: 11px; 
          }
          .info-row .label { color: #555; }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 12px 0; 
            font-size: 11px;
          }
          .items-table th { 
            border-bottom: 2px solid #000; 
            padding: 6px 4px; 
            text-align: left; 
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
          }
          .items-table td { 
            padding: 4px 4px; 
            border-bottom: 1px dotted #999; 
          }
          .items-table td:last-child { text-align: right; font-weight: 600; }
          .totals { 
            border-top: 2px dashed #000; 
            padding-top: 10px; 
            margin-top: 10px; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 4px; 
            font-size: 11px;
          }
          .total-row.grand { 
            font-size: 15px; 
            font-weight: bold; 
            border-top: 2px solid #000; 
            padding-top: 8px; 
            margin-top: 8px; 
          }
          .abonos-section {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px dashed #999;
          }
          .abonos-title {
            font-size: 10px;
            color: #555;
            margin-bottom: 6px;
            font-weight: bold;
          }
          .abono-item {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-bottom: 3px;
            color: #666;
          }
          .abono-item .monto {
            font-weight: 600;
            color: #22c55e;
          }
          .abonos-total {
            font-size: 9px;
            color: #999;
            margin-top: 4px;
            text-align: right;
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            border-top: 2px dashed #000; 
            padding-top: 12px; 
          }
          .footer p { font-size: 10px; color: #555; margin: 3px 0; }
          .badge { 
            display: inline-block; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: bold;
            text-transform: uppercase;
          }
          .badge-publicado { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .badge-borrador { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .badge-anulado { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏦 DZ Salón & Spa</h1>
          <p>Dorian Zambrano - Peluquería y Spa</p>
          <p>+57 315 707 2678</p>
          <p>www.dorianzambrano.com</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span class="label">Recibo:</span>
            <span><strong>${recibo?.codigo_recibo}</strong></span>
          </div>
          <div class="info-row">
            <span class="label">Fecha:</span>
            <span>${recibo?.fecha ? formatDate(recibo.fecha) : ''}</span>
          </div>
          <div class="info-row">
            <span class="label">Estado:</span>
            <span class="badge badge-${recibo?.estado}">${recibo?.estado}</span>
          </div>
          ${recibo?.cliente_nombre ? `
          <div class="info-row">
            <span class="label">Cliente:</span>
            <span>${recibo.cliente_nombre}</span>
          </div>` : ''}
          ${recibo?.cliente_telefono ? `
          <div class="info-row">
            <span class="label">Teléfono:</span>
            <span>${recibo.cliente_telefono}</span>
          </div>` : ''}
          ${recibo?.session_caja_turno ? `
          <div class="info-row">
            <span class="label">Turno:</span>
            <span class="capitalize">${recibo.session_caja_turno}</span>
          </div>` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width:35px;">Cant</th>
              <th>Descripción</th>
              <th style="text-align:right; width:75px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(recibo?.items || []).map((item: any) => `
              <tr>
                <td style="text-align:center;">${item.cantidad}</td>
                <td>${item.descripcion}${item.profesional_nombre ? `<br/><small style="color:#666">👨 ${item.profesional_nombre}</small>` : ''}</td>
                <td>${formatMoney(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatMoney(recibo?.subtotal || 0)}</span>
          </div>
          ${recibo?.descuento && parseFloat(recibo.descuento) > 0 ? `
          <div class="total-row">
            <span>Descuento:</span>
            <span style="color:#dc3545;">-${formatMoney(recibo.descuento)}</span>
          </div>` : ''}
          ${recibo?.propina_total && parseFloat(recibo.propina_total) > 0 ? `
          <div class="total-row">
            <span>Propina:</span>
            <span style="color:#6f42c1;">+${formatMoney(recibo.propina_total)}</span>
          </div>` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>${formatMoney(recibo?.total || 0)}</span>
          </div>
        </div>

        ${abonosPrintHTML}

        ${recibo?.notas ? `
        <div style="margin-top:12px; padding:8px; background:#f8f9fa; border-radius:4px; border:1px solid #e9ecef;">
          <strong style="font-size:10px; color:#555;">Notas:</strong>
          <p style="font-size:11px; margin-top:4px;">${recibo.notas}</p>
        </div>` : ''}

        <div class="footer">
          <p style="font-weight:bold;">¡Gracias por su visita!</p>
          <p>www.dorianzambrano.com</p>
          <p style="margin-top:8px; font-size:9px; color:#888;">
            Impreso: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
          </p>
        </div>
      </body>
      </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
    }, 500);
  };

  if (!isOpen || !recibo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 max-h-[95vh] flex flex-col">
        
        {/* ← Header del modal */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📋 Recibo: {recibo.codigo_recibo}
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {formatDate(recibo.fecha)} • {recibo.estado}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← Contenido del recibo (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4" id="recibo-para-imprimir">
          
          {/* ← Header del recibo */}
          <div className="text-center border-b-2 border-dashed border-gray-600 pb-4 mb-4">
            <h1 className="text-xl font-bold text-white">🏦 DZ Salón & Spa</h1>
            <p className="text-xs text-gray-400 mt-1">Dorian Zambrano - Peluquería y Spa</p>
            <p className="text-xs text-gray-500">+57 315 707 2678</p>
          </div>

          {/* ← Info básica */}
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Recibo:</span>
              <span className="font-mono font-bold text-white">{recibo.codigo_recibo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fecha:</span>
              <span className="text-white">{formatDate(recibo.fecha)}</span>
            </div>
           {/* <div className="flex justify-between items-center">
              <span className="text-gray-400">Estado:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                recibo.estado === 'publicado' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                recibo.estado === 'borrador' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                'bg-red-900/50 text-red-400 border border-red-700'
              }`}>
                {recibo.estado}
              </span>
            </div>*/}
            {recibo.cliente_nombre && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="text-white">{recibo.cliente_nombre}</span>
              </div>
            )}
            {recibo.cliente_telefono && (
              <div className="flex justify-between">
                <span className="text-gray-400">Teléfono:</span>
                <span className="text-white">{recibo.cliente_telefono}</span>
              </div>
            )}
            {recibo.session_caja_turno && (
              <div className="flex justify-between">
                <span className="text-gray-400">Turno:</span>
                <span className="text-white capitalize">{recibo.session_caja_turno}  {recibo.session_caja_id}</span>
              </div>
            )}
          </div>

          {/* ← Items */}
          {recibo.items && recibo.items.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                📦 Items ({recibo.items.length})
              </p>
              <div className="space-y-2">
                {recibo.items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-start justify-between p-2 bg-gray-900/50 rounded border border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300 bg-gray-700 px-1.5 py-0.5 rounded">
                          {item.cantidad}x
                        </span>
                        <p className="text-sm text-white truncate" title={item.descripcion}>
                          {item.descripcion}
                        </p>
                      </div>
                      {item.profesional_nombre && (
                        <p className="text-xs text-blue-400 mt-1 ml-8">
                          👨 {item.profesional_nombre}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-green-400 whitespace-nowrap ml-3">
                      {formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ← Totales */}
          <div className="border-t-2 border-dashed border-gray-600 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal:</span>
              <span className="text-white">{formatMoney(recibo.subtotal)}</span>
            </div>
            {parseFloat(recibo.descuento) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Descuento:</span>
                <span className="text-red-400">-{formatMoney(recibo.descuento)}</span>
              </div>
            )}
            {parseFloat(recibo.propina_total) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">💎 Propina:</span>
                <span className="text-purple-400">+{formatMoney(recibo.propina_total)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-600 pt-3 mt-3">
              <span className="text-base font-bold text-gray-300">TOTAL:</span>
              <span className="text-xl font-bold text-green-400">
                {formatMoney(recibo.total)}
              </span>
            </div>
          </div>

          {/* ← ← ← SECCIÓN DE ABONOS (CON ESTADOS DE CARGA) ← ← ← */}
         {/* {cargarAbonosInternamente && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-600">
              {loadingAbonos ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-xs text-gray-400">Cargando abonos...</span>
                </div>
              ) : errorAbonos ? (
                <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                  ⚠️ {errorAbonos}
                </p>
              ) : abonos.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                    💰 Pagos registrados:
                  </p>
                  <div className="space-y-1.5">
                    {abonos.map((abono) => (
                      <div 
                        key={abono.id}
                        className="flex items-center justify-between text-xs text-gray-300 group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-500">•</span>
                          
                          {/* ← ← ← MÉTODO DE PAGO EDITABLE PARA ABONOS ← ← ← */}
                         {/* {abonoEditandoId === abono.id ? (
                            <select
                              value={metodoTemporalAbono}
                              onChange={(e) => setMetodoTemporalAbono(e.target.value)}
                              onBlur={() => handleGuardarMetodoAbono(abono.id, metodoTemporalAbono)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="bg-gray-700 border border-blue-500 text-blue-400 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize min-w-[100px]"
                            >
                              {OPCIONES_METODO.map((opcion) => (
                                <option key={opcion.value} value={opcion.value}>
                                  {opcion.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={(e) => handleClicMetodoAbono(abono, e)}
                              className="capitalize text-left hover:text-blue-300 hover:underline transition-colors truncate"
                              title="Click para cambiar método de pago"
                            >
                              {getMetodoLabel(abono.metodo_pago)}
                            </button>
                          )}
                          
                          {abono.referencia_externa && (
                            <span className="text-gray-600 text-[10px] truncate max-w-[80px]" title={abono.referencia_externa}>
                              ({abono.referencia_externa.substring(0, 8)}{abono.referencia_externa.length > 8 ? '...' : ''})
                            </span>
                          )}
                          <span className="text-gray-600 text-[10px] whitespace-nowrap">
                            {new Date(abono.fecha_abono).toLocaleDateString('es-CO', {
                              day: '2-digit', month: '2-digit'
                            })} {formatTime(abono.fecha_abono)}
                          </span>
                        </div>
                        <span className="font-semibold text-green-400 whitespace-nowrap ml-2">
                          {formatMoney(abono.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between text-[10px] text-gray-500">
                    <span>Total abonado:</span>
                    <span className="text-gray-400">
                      {formatMoney(calcularTotalAbonado())}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 italic">Sin pagos registrados</p>
              )}
            </div>
          )}*/}

          {/* ← ← ← SECCIÓN DE PAGOS RELACIONADOS UNIFICADOS ← ← ← */}
          {pagosRelacionados?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-600">
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                💰 Historial de Pagos:
              </p>
              
              <div className="space-y-1.5">
                {pagosRelacionados.map((registro) => {
                  const keyRegistro = `${registro.tabla}-${registro.id}`;
                  const esEditando = registroEditandoId === keyRegistro;
                  
                  return (
                    <div 
                      key={keyRegistro}
                      className="flex items-center justify-between text-xs text-gray-300 group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gray-500">•</span>
                        
                        {/* ← ← ← BADGE DE TIPO CON COLOR DIFERENCIADO ← ← ← 
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTipoBadgeClass(registro)}`}>
                          {registro.tipo === 'abono' ? 'Abono' : 
                           registro.origen_tipo_display || registro.origen_tipo || 'Pago'}
                        </span>*/}
                        
                        {/* ← ← ← MÉTODO DE PAGO EDITABLE PARA REGISTROS UNIFICADOS ← ← ← */}
                        {esEditando ? (
                          <select
                            value={metodoTemporalRegistro}
                            onChange={(e) => setMetodoTemporalRegistro(e.target.value)}
                            onBlur={() => handleGuardarMetodoRegistro(registro.id, registro.tabla!, metodoTemporalRegistro)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="bg-gray-700 border border-blue-500 text-blue-400 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize min-w-[100px]"
                          >
                            {OPCIONES_METODO.map((opcion) => (
                              <option key={opcion.value} value={opcion.value}>
                                {opcion.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={(e) => handleClicMetodoRegistro(registro, e)}
                            className="capitalize text-left hover:text-blue-300 hover:underline transition-colors truncate"
                            title="Click para cambiar método de pago"
                          >
                            {getMetodoLabel(registro.metodo_pago)}
                          </button>
                        )}
                        
                        {/* Referencia */}
                        {registro.referencia && (
                          <span className="text-gray-500 text-[10px] truncate max-w-[60px]" title={registro.referencia}>
                            ({registro.referencia.substring(0, 6)}...)
                          </span>
                        )}
                        
                        {/* Fecha */}
                        <span className="text-gray-500 text-[10px] whitespace-nowrap">
                          {new Date(registro.fecha).toLocaleDateString('es-CO', {
                            day: '2-digit', month: '2-digit'
                          })} {formatTime(registro.fecha)}
                        </span>
                      </div>
                      
                      {/* Monto */}
                      <span className="font-bold text-green-400 whitespace-nowrap ml-2">
                        {formatMoney(registro.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* ← ← ← TOTAL GENERAL ← ← ← */}
              <div className="mt-3 pt-2 border-t border-gray-700/50 flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Total registrado:</span>
                <span className="text-green-400 font-bold">
                  {formatMoney(pagosRelacionados.reduce((sum, r) => sum + parseFloat(String(r.monto)), 0))}
                </span>
              </div>
            </div>
          )}

          {/* ← Notas */}
          {recibo.notas && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-600">
              <p className="text-xs font-semibold text-gray-400 mb-1">📝 Notas</p>
              <p className="text-sm text-white bg-gray-900/30 p-2 rounded">{recibo.notas}</p>
            </div>
          )}
        </div>

        {/* ← Footer con acciones */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex gap-3 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            disabled={loadingAbonos && cargarAbonosInternamente}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAbonos && cargarAbonosInternamente ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Cargando...
              </>
            ) : (
              <>🖨️ Imprimir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}