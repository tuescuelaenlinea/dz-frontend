// components/admin/ReciboImpresionModal.tsx
'use client';

import { useState, useEffect } from 'react';
//import { ReciboCaja } from '@/app/admin/caja/page';

// ← ← ← INTERFAZ PARA ABONOS ← ← ←
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
  
  // ← ← ← NUEVAS PROPS PARA CARGA INTERNA DE ABONOS ← ← ←
  apiUrl?: string;
  token?: string | null;
  cargarAbonosInternamente?: boolean;  // ← Controla si carga abonos automáticamente
  
  // ← ← ← MANTIENE COMPATIBILIDAD: abonos como prop opcional ← ← ←
  abonos?: AbonoRecibo[];
}

// ← ← ← INTERFAZ LOCAL PARA ReciboCaja (COMPLETA Y SINCRONIZADA) ← ← ←
interface ReciboCaja {
  id: number;
  codigo_recibo: string;
  tipo: 'entrada' | 'salida' | 'venta';
  estado: 'borrador' | 'publicado' | 'anulado';
  
  // ← ← ← TOTALES ← ← ←
  subtotal: string;
  descuento: string;
  total: string;
  propina_total: string;
  
  // ← ← ← MÉTODO Y SESIÓN ← ← ←
  metodo_pago: string;
  session_caja_turno: string;
  
  // ← ← ← CAMPOS DE CLIENTE (CRÍTICOS - AGREGAR ESTOS) ← ← ←
  cliente_nombre: string;
  cliente_telefono: string;  // ← ← ← AGREGAR (FALTABA)
  cliente_email: string;     // ← ← ← AGREGAR (FALTABA)
  
  // ← ← ← FECHAS Y NOTAS ← ← ←
  fecha: string;
  notas?: string;
  
  // ← ← ← ITEMS ANIDADOS ← ← ←
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
  
  // ← ← ← DISTRIBUCIONES DE PROPINA ← ← ←
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
  cargarAbonosInternamente = true,  // ← Por defecto carga internamente
  abonos: abonosExternos = [],
}: ReciboImpresionModalProps) {
  
  // ← ← ← ESTADOS INTERNOS PARA CARGA DE ABONOS ← ← ←
  const [abonosInternos, setAbonosInternos] = useState<AbonoRecibo[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [errorAbonos, setErrorAbonos] = useState<string | null>(null);

  // ← ← ← DETERMINAR QUÉ ABONOS USAR ← ← ←
  const abonos = cargarAbonosInternamente ? abonosInternos : abonosExternos;

  // ← ← ← EFECTO: Cargar abonos cuando el modal se abre y hay recibo ← ← ←
  useEffect(() => {
    if (!isOpen || !recibo?.id || !cargarAbonosInternamente) {
      // Limpiar estados si no se debe cargar o no hay recibo
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
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        setAbonosInternos(data.abonos || []);
        
      } catch (err: any) {
        console.error('❌ Error cargando abonos para impresión:', err);
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
    }
  }, [isOpen]);

  if (!isOpen || !recibo) return null;

  // ← ← ← HELPER: Formatear hora de abono ← ← ←
  const formatAbonoTime = (fechaAbono: string) => {
    try {
      return new Date(fechaAbono).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '';
    }
  };

  // ← ← ← HELPER: Label amigable para método de pago ← ← ←
  const getMetodoLabel = (metodo: string) => {
    const labels: Record<string, string> = {
      efectivo: '💵 Efectivo',
      transferencia: '🏦 Transferencia',
      nequi: '📱 Nequi',
      daviplata: '📱 Daviplata',
      bold: '💳 Bold',
      tarjeta: '💳 Tarjeta',
      caja_menor: '📦 Caja menor',
    };
    return labels[metodo] || metodo;
  };

  // ← ← ← HELPER: Calcular total abonado ← ← ←
  const calcularTotalAbonado = () => {
    return abonos.reduce((sum, a) => sum + parseFloat(String(a.monto)), 0);
  };

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
        <title>Recibo ${recibo.codigo_recibo}</title>
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
            <span><strong>${recibo.codigo_recibo}</strong></span>
          </div>
          <div class="info-row">
            <span class="label">Fecha:</span>
            <span>${formatDate(recibo.fecha)}</span>
          </div>
          <div class="info-row">
            <span class="label">Estado:</span>
            <span class="badge badge-${recibo.estado}">${recibo.estado}</span>
          </div>
          ${recibo.cliente_nombre ? `
          <div class="info-row">
            <span class="label">Cliente:</span>
            <span>${recibo.cliente_nombre}</span>
          </div>` : ''}
          ${recibo.cliente_telefono ? `
          <div class="info-row">
            <span class="label">Teléfono:</span>
            <span>${recibo.cliente_telefono}</span>
          </div>` : ''}
          
          
          
          ${recibo.session_caja_turno ? `
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
            ${(recibo.items || []).map((item: any) => `
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
            <span>${formatMoney(recibo.subtotal)}</span>
          </div>
          ${parseFloat(recibo.descuento) > 0 ? `
          <div class="total-row">
            <span>Descuento:</span>
            <span style="color:#dc3545;">-${formatMoney(recibo.descuento)}</span>
          </div>` : ''}
          ${parseFloat(recibo.propina_total) > 0 ? `
          <div class="total-row">
            <span>Propina:</span>
            <span style="color:#6f42c1;">+${formatMoney(recibo.propina_total)}</span>
          </div>` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>${formatMoney(recibo.total)}</span>
          </div>
        </div>

        ${abonosPrintHTML}

        ${recibo.notas ? `
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
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Estado:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                recibo.estado === 'publicado' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                recibo.estado === 'borrador' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                'bg-red-900/50 text-red-400 border border-red-700'
              }`}>
                {recibo.estado}
              </span>
            </div>
            {recibo.cliente_nombre && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="text-white">{recibo.cliente_nombre}</span>
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
          {cargarAbonosInternamente && (
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
                        className="flex items-center justify-between text-xs text-gray-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">•</span>
                          <span className="capitalize">{getMetodoLabel(abono.metodo_pago)}</span>
                          {abono.referencia_externa && (
                            <span className="text-gray-600 text-[10px]" title={abono.referencia_externa}>
                              ({abono.referencia_externa.substring(0, 10)}{abono.referencia_externa.length > 10 ? '...' : ''})
                            </span>
                          )}
                          <span className="text-gray-600 text-[10px]">
                            {new Date(abono.fecha_abono).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit'
                            })} {formatAbonoTime(abono.fecha_abono)}
                          </span>
                        </div>
                        <span className="font-semibold text-green-400">
                          {formatMoney(abono.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* ← ← ← SUBTOTAL DE ABONOS ← ← ← */}
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between text-[10px] text-gray-500">
                    <span>Total abonado:</span>
                    <span className="text-gray-400">
                      {formatMoney(calcularTotalAbonado())}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Sin pagos registrados
                </p>
              )}
            </div>
          )}

          {/* ← ← ← MODO EXTERNO: Mostrar abonos si se pasan como prop ← ← ← */}
          {!cargarAbonosInternamente && abonosExternos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-600">
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                💰 Pagos registrados:
              </p>
              <div className="space-y-1.5">
                {abonosExternos.map((abono) => (
                  <div 
                    key={abono.id}
                    className="flex items-center justify-between text-xs text-gray-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">•</span>
                      <span className="capitalize">{getMetodoLabel(abono.metodo_pago)}</span>
                      {abono.referencia_externa && (
                        <span className="text-gray-600 text-[10px]" title={abono.referencia_externa}>
                          ({abono.referencia_externa.substring(0, 10)}{abono.referencia_externa.length > 10 ? '...' : ''})
                        </span>
                      )}
                      <span className="text-gray-600 text-[10px]">
                        {new Date(abono.fecha_abono).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit'
                        })} {formatAbonoTime(abono.fecha_abono)}
                      </span>
                    </div>
                    <span className="font-semibold text-green-400">
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
              <>
                🖨️ Imprimir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}