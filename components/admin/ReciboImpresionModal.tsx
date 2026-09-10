// components/admin/ReciboImpresionModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection'; 

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
  origen_tipo?: string;
  origen_tipo_display?: string;
  descripcion_item?: string;
  tabla?: 'abonos' | 'pagos';
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
  
  const [abonosInternos, setAbonosInternos] = useState<AbonoRecibo[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [errorAbonos, setErrorAbonos] = useState<string | null>(null);
  const [pagosRelacionados, setPagosRelacionados] = useState<PagoRelacionado[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [registroEditandoId, setRegistroEditandoId] = useState<string | null>(null);
  const [metodoTemporalRegistro, setMetodoTemporalRegistro] = useState('');
  const { isAndroid } = useDeviceDetection();
  const [isPrinting, setIsPrinting] = useState(false);

  const abonos = cargarAbonosInternamente ? abonosInternos : abonosExternos;

  const OPCIONES_METODO = [
    { value: 'efectivo', label: '💵 Efectivo' },
    { value: 'transferencia', label: '🏦 Transferencia' },
    { value: 'nequi', label: '📱 Nequi' },
    { value: 'daviplata', label: '📱 Daviplata' },
    { value: 'bold', label: '💳 Bold' },
    { value: 'tarjeta', label: '💳 Tarjeta' },  
    { value: 'caja_menor', label: '📦 Caja menor' },  
  ] as const;

  const cargarPagosRelacionados = async (reciboId: number) => {
    if (!reciboId) return;
    setLoadingPagos(true);
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/pagos-relacionados/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const abonosMapeados = (data.abonos || []).map((a: any) => ({ ...a, tipo: 'abono' as const, tabla: 'abonos' as const }));
        const pagosMapeados = (data.pagos || []).map((p: any) => ({ ...p, tipo: 'pago' as const, tabla: 'pagos' as const }));
        
        const todos = [...abonosMapeados, ...pagosMapeados]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        
        setPagosRelacionados(todos);
      }
    } catch (err) {
      console.error('❌ Error cargando pagos relacionados:', err);
      setPagosRelacionados([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  useEffect(() => {
    if (recibo?.id && isOpen) {
      cargarPagosRelacionados(recibo.id);
    } else {
      setPagosRelacionados([]);
    }
  }, [recibo?.id, isOpen]);

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

  useEffect(() => {
    if (!isOpen) {
      setAbonosInternos([]);
      setLoadingAbonos(false);
      setErrorAbonos(null);
      setPagosRelacionados([]);
    }
  }, [isOpen]);

  const getMetodoLabel = (metodo: string) => {
    const opciones: Record<string, string> = {
      efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
      nequi: '📱 Nequi', daviplata: '📱 Daviplata',
      bold: '💳 Bold', tarjeta: '💳 Tarjeta',
      caja_menor: '📦 Caja menor',
    };
    return opciones[metodo] || metodo;
  };

  const formatTime = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return ''; }
  };

  const handleClicMetodoRegistro = (registro: PagoRelacionado, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegistroEditandoId(`${registro.tabla}-${registro.id}`);
    setMetodoTemporalRegistro(registro.metodo_pago);
  };

  const handleGuardarMetodoRegistro = async (id: number, tabla: 'abonos' | 'pagos', nuevoMetodo: string) => {
    if (!nuevoMetodo) { setRegistroEditandoId(null); return; }
    try {
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
        setPagosRelacionados(prev => prev.map(r =>
          r.tabla === tabla && r.id === id ? { ...r, metodo_pago: nuevoMetodo } : r
        ));
        window.dispatchEvent(new CustomEvent('metodoPagoActualizado', {
          detail: { id, tabla, metodo_pago: nuevoMetodo }
        }));
        setRegistroEditandoId(null);
      } else {
        setMetodoTemporalRegistro('');
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
      setMetodoTemporalRegistro('');
    } finally {
      setRegistroEditandoId(null);
    }
  };

    // ← ← ← FUNCIÓN: Generar texto plano con comandos ESC/POS para Android ← ← ←
  const generarTextoTermico = () => {
     if (!recibo) return ""; 
    let texto = "DZ SALON & SPA\n";
    texto += "Dorian Zambrano - Peluquería y Spa\n";
    texto += "+57 315 707 2678\n";
    texto += "--------------------------------\n";
    texto += `Recibo: ${recibo.codigo_recibo}\n`;
    texto += `Fecha: ${formatDate(recibo.fecha)}\n`;
    if (recibo.cliente_nombre) texto += `Cliente: ${recibo.cliente_nombre}\n`;
    if (recibo.session_caja_turno) texto += `Turno: ${recibo.session_caja_turno}\n`;
    texto += "--------------------------------\n";

    (recibo.items || []).forEach((item: any) => {
      // Truncar descripción a 22 caracteres para que quepa en 80mm
      const desc = item.descripcion.length > 22 ? item.descripcion.substring(0, 22) + '...' : item.descripcion;
      const precio = formatMoney(item.subtotal).replace('$', '').replace('.', '').trim();
      texto += `${item.cantidad}x ${desc.padEnd(22)} $${precio}\n`;
      if (item.profesional_nombre) {
        texto += `   👨 ${item.profesional_nombre}\n`;
      }
    });

    texto += "--------------------------------\n";
    texto += `Subtotal: ${formatMoney(recibo.subtotal || 0)}\n`;
    if (parseFloat(recibo.descuento) > 0) {
      texto += `Descuento: -${formatMoney(recibo.descuento)}\n`;
    }
    if (parseFloat(recibo.propina_total) > 0) {
      texto += `Propina: +${formatMoney(recibo.propina_total)}\n`;
    }
    texto += "================================\n";
    texto += `TOTAL: ${formatMoney(recibo.total || 0)}\n`;
    texto += "================================\n";

    if (pagosRelacionados.length > 0) {
      texto += "HISTORIAL DE PAGOS:\n";
      pagosRelacionados.forEach((p) => {
        texto += `- ${getMetodoLabel(p.metodo_pago)}: ${formatMoney(p.monto)}\n`;
      });
      texto += "--------------------------------\n";
    }

    if (recibo.notas) {
      texto += `Notas: ${recibo.notas}\n`;
      texto += "--------------------------------\n";
    }

    texto += "¡Gracias por su visita!\n";
    texto += new Date().toLocaleString('es-CO') + "\n";
    texto += "\n\n\n"; // Espacio en blanco antes del corte
    
    // ← ← ← COMANDO ESC/POS PARA CORTE DE PAPEL (Hex: 1D 56 00) ← ← ←
    texto += "\x1D\x56\x00"; 

    return texto;
  };

    // ← ← ← FUNCIÓN DE IMPRESIÓN HÍBRIDA (Android vs Desktop) ← ← ←
  const handlePrint = async () => {
    if (!recibo) return;
    setIsPrinting(true);

    try {
      if (isAndroid) {
        // ==========================================
        // OPCIÓN A: BACKEND BRIDGE (Android)
        // ==========================================
        const textoImpresion = generarTextoTermico();
        
        // ⚠️ IMPORTANTE: Asegúrate de que esta URL coincida con la que creaste en urls.py        
        const endpointImpresion = `${apiUrl}/imprimir-ticket/`;

        const res = await fetch(endpointImpresion, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ texto: textoImpresion })
        });

        if (res.ok) {
          alert('✅ Enviado a impresión térmica exitosamente');
          onClose(); // Opcional: cerrar el modal después de imprimir
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert(`❌ Error de impresión: ${errorData.error || 'Verifica que la impresora esté encendida y en la red'}`);
        }

      } else {
        // ==========================================
        // OPCIÓN B: WINDOW.PRINT (Windows / Desktop)
        // ==========================================
        const ventanaImpresion = window.open('', '_blank', 'width=400,height=900');
        if (!ventanaImpresion) {
          alert('⚠️ Permite las ventanas emergentes para imprimir');
          return;
        }

        const abonosPrintHTML = pagosRelacionados.length > 0 ? `
          <div class="abonos-section">
            <div class="abonos-title">💰 Historial de Pagos:</div>
            ${pagosRelacionados.map((p) => `
              <div class="abono-item">
                <span>• ${getMetodoLabel(p.metodo_pago)} ${p.referencia ? `(${p.referencia.substring(0,6)}...)` : ''}</span>
                <span class="monto">${formatMoney(p.monto)}</span>
              </div>
            `).join('')}
            <div class="abonos-total">
              Total registrado: ${formatMoney(pagosRelacionados.reduce((sum, r) => sum + parseFloat(String(r.monto)), 0))}
            </div>
          </div>
        ` : '';

        ventanaImpresion.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Recibo ${recibo.codigo_recibo}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                color: #000;
                width: 72mm;
                margin: 0 auto;
                padding: 5mm;
                background: #fff;
              }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
              .header h1 { font-size: 16px; margin-bottom: 2px; font-weight: bold; }
              .header p { font-size: 10px; color: #333; margin: 1px 0; }
              .info { margin-bottom: 8px; font-size: 11px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .info-row .label { color: #555; }
              .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
              .items-table th { border-bottom: 1px solid #000; padding: 4px 2px; text-align: left; font-size: 10px; }
              .items-table td { padding: 3px 2px; border-bottom: 1px dotted #999; }
              .items-table td:last-child { text-align: right; font-weight: 600; }
              .totals { border-top: 2px dashed #000; padding-top: 6px; margin-top: 6px; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
              .total-row.grand { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
              .abonos-section { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #999; }
              .abonos-title { font-size: 10px; color: #333; margin-bottom: 4px; font-weight: bold; }
              .abono-item { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; color: #444; }
              .abono-item .monto { font-weight: 600; color: #000; }
              .abonos-total { font-size: 9px; color: #666; margin-top: 4px; text-align: right; }
              .footer { text-align: center; margin-top: 12px; border-top: 2px dashed #000; padding-top: 8px; }
              .footer p { font-size: 10px; color: #333; margin: 2px 0; }
              @media print {
                @page { size: 80mm auto; margin: 0; }
                body { padding: 0; width: 100%; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🏦 DZ Salón & Spa</h1>
              <p>Dorian Zambrano - Peluquería y Spa</p>
              <p>+57 315 707 2678</p>
            </div>
            <div class="info">
              <div class="info-row"><span class="label">Recibo:</span><span><strong>${recibo.codigo_recibo}</strong></span></div>
              <div class="info-row"><span class="label">Fecha:</span><span>${recibo.fecha ? formatDate(recibo.fecha) : ''}</span></div>
              ${recibo.cliente_nombre ? `<div class="info-row"><span class="label">Cliente:</span><span>${recibo.cliente_nombre}</span></div>` : ''}
              ${recibo.session_caja_turno ? `<div class="info-row"><span class="label">Turno:</span><span>${recibo.session_caja_turno}</span></div>` : ''}
            </div>
            <table class="items-table">
              <thead><tr><th style="width:30px;">Cant</th><th>Descripción</th><th style="text-align:right; width:70px;">Total</th></tr></thead>
              <tbody>
                ${(recibo.items || []).map((item: any) => `
                  <tr>
                    <td style="text-align:center;">${item.cantidad}</td>
                    <td>${item.descripcion}${item.profesional_nombre ? `<br/><small style="color:#555">👨 ${item.profesional_nombre}</small>` : ''}</td>
                    <td>${formatMoney(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-row"><span>Subtotal:</span><span>${formatMoney(recibo.subtotal || 0)}</span></div>
              ${recibo.descuento && parseFloat(recibo.descuento) > 0 ? `<div class="total-row"><span>Descuento:</span><span>-${formatMoney(recibo.descuento)}</span></div>` : ''}
              ${recibo.propina_total && parseFloat(recibo.propina_total) > 0 ? `<div class="total-row"><span>Propina:</span><span>+${formatMoney(recibo.propina_total)}</span></div>` : ''}
              <div class="total-row grand"><span>TOTAL:</span><span>${formatMoney(recibo.total || 0)}</span></div>
            </div>
            ${abonosPrintHTML}
            ${recibo.notas ? `<div style="margin-top:8px; padding:6px; background:#f8f9fa; border:1px solid #e9ecef; font-size:10px;"><strong>Notas:</strong> ${recibo.notas}</div>` : ''}
            <div class="footer">
              <p style="font-weight:bold;">¡Gracias por su visita!</p>
              <p style="font-size:9px; color:#666; margin-top:4px;">Impreso: ${new Date().toLocaleString('es-CO')}</p>
            </div>
          </body>
          </html>
        `);

        ventanaImpresion.document.close();
        ventanaImpresion.focus();
        
        setTimeout(() => {
          ventanaImpresion.print();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Error en impresión:', err);
      alert('⚠️ No se pudo procesar la solicitud de impresión');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen || !recibo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 max-h-[95vh] flex flex-col">
        
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

        <div className="flex-1 overflow-y-auto p-4" id="recibo-para-imprimir">
          <div className="text-center border-b-2 border-dashed border-gray-600 pb-4 mb-4">
            <h1 className="text-xl font-bold text-white">🏦 DZ Salón & Spa</h1>
            <p className="text-xs text-gray-400 mt-1">Dorian Zambrano - Peluquería y Spa</p>
            <p className="text-xs text-gray-500">+57 315 707 2678</p>
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Recibo:</span>
              <span className="font-mono font-bold text-white">{recibo.codigo_recibo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fecha:</span>
              <span className="text-white">{formatDate(recibo.fecha)}</span>
            </div>
            {recibo.cliente_nombre && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="text-white">{recibo.cliente_nombre}</span>
              </div>
            )}
            {recibo.session_caja_turno && (
              <div className="flex justify-between">
                <span className="text-gray-400">Turno:</span>
                <span className="text-white capitalize">{recibo.session_caja_turno}</span>
              </div>
            )}
          </div>

          {recibo.items && recibo.items.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                📦 Items ({recibo.items.length})
              </p>
              <div className="space-y-2">
                {recibo.items.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-2 bg-gray-900/50 rounded border border-gray-700">
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
                    <div key={keyRegistro} className="flex items-center justify-between text-xs text-gray-300 group">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gray-500">•</span>
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
                        {registro.referencia && (
                          <span className="text-gray-500 text-[10px] truncate max-w-[60px]" title={registro.referencia}>
                            ({registro.referencia.substring(0, 6)}...)
                          </span>
                        )}
                        <span className="text-gray-500 text-[10px] whitespace-nowrap">
                          {new Date(registro.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })} {formatTime(registro.fecha)}
                        </span>
                      </div>
                      <span className="font-bold text-green-400 whitespace-nowrap ml-2">
                        {formatMoney(registro.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-700/50 flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Total registrado:</span>
                <span className="text-green-400 font-bold">
                  {formatMoney(pagosRelacionados.reduce((sum, r) => sum + parseFloat(String(r.monto)), 0))}
                </span>
              </div>
            </div>
          )}

          {recibo.notas && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-600">
              <p className="text-xs font-semibold text-gray-400 mb-1">📝 Notas</p>
              <p className="text-sm text-white bg-gray-900/30 p-2 rounded">{recibo.notas}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex gap-3 no-print">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting || (loadingAbonos && cargarAbonosInternamente)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Imprimiendo...
              </>
            ) : (
              <>
                {/* Ícono diferente según el dispositivo */}
                {isAndroid ? '📡' : '🖨️'} 
                {isAndroid ? 'Imprimir (Red)' : 'Imprimir'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}