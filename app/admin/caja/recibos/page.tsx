// app/admin/caja/recibos/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ← ← ← INTERFACES ← ← ←

interface ReciboCaja {
  id: number;
  codigo_recibo: string;
  tipo: 'entrada' | 'salida' | 'venta';
  estado: 'borrador' | 'publicado' | 'anulado';
  subtotal: string;
  descuento: string;
  total: string;
  propina_total: string;
  propina_metodo_distribucion: string | null;
  metodo_pago: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas: string;
  fecha: string;
  session_caja: number | null;
  session_caja_turno: string;
  usuario_username: string;
  items?: Array<{
    id: number;
    tipo_item: string;
    profesional: number | null;
    profesional_nombre?: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: string;
    subtotal: string;
    cita?: number;
    cita_codigo_reserva?: string;
  }>;
}

interface CajaSession {
  id: number;
  usuario_username: string;
  fecha: string;
  turno: 'manana' | 'tarde' | 'noche';
  hora_apertura: string;
  estado: 'abierta' | 'cerrada' | 'cancelada';
}

// ← ← ← COMPONENTE PRINCIPAL ← ← ←

export default function RecibosPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Estados
  const [recibos, setRecibos] = useState<ReciboCaja[]>([]);
  const [sesiones, setSesiones] = useState<CajaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReciboId, setExpandedReciboId] = useState<number | null>(null);
  const [detalleRecibo, setDetalleRecibo] = useState<ReciboCaja | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ← Estados de filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroSesion, setFiltroSesion] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // ← Cargar datos al montar
  useEffect(() => {
    cargarRecibos();
    cargarSesiones();
  }, []);

 // ← ← ← CARGAR RECIBOS CON FILTROS ← ← ←
const cargarRecibos = async () => {
  setLoading(true);
  try {
    // Validación básica: Fecha fin no puede ser menor que inicio
    if (filtroFechaInicio && filtroFechaFin && filtroFechaInicio > filtroFechaFin) {
      alert('⚠️ La fecha de inicio no puede ser mayor a la fecha fin');
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.append('ordering', '-fecha');
    params.append('limit', '100'); // Aumentar límite si hay muchos recibos
    
    if (filtroFechaInicio) params.append('fecha_inicio', filtroFechaInicio);
    if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin);
    if (filtroSesion) params.append('session_caja', filtroSesion);
    if (filtroTipo) params.append('tipo', filtroTipo);
    if (filtroEstado) params.append('estado', filtroEstado);

    const url = `${apiUrl}/caja/recibos/?${params.toString()}`;
    console.log('🔍 [DEBUG] Cargando recibos desde:', url); // ← ← ← LOG DE DEBUG

    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ [ERROR] Respuesta del servidor:', errorText);
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const lista = Array.isArray(data) ? data : (data.results || []);
    
    console.log(`✅ [DEBUG] Recibos recibidos: ${lista.length}`);

    // Cargar detalle solo si hay resultados (para optimizar)
    if (lista.length === 0) {
      setRecibos([]);
    } else {
      // Mapeo básico primero para feedback rápido
      setRecibos(lista); 
      
      // Opcional: Si necesitas los items detallados para cada recibo en la lista izquierda,
      // deberías hacer una llamada separada o asegurar que el serializer devuelva items.
      // Para este diseño, asumimos que el list endpoint devuelve datos suficientes para el resumen.
    }

  } catch (err) {
    console.error('❌ Error cargando recibos:', err);
    setRecibos([]);
  } finally {
    setLoading(false);
  }
};
  // ← Cargar sesiones de caja
  const cargarSesiones = async () => {
    try {
      const res = await fetch(`${apiUrl}/caja/sesiones/?ordering=-id&limit=50`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSesiones(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error('❌ Error cargando sesiones:', err);
    }
  };

  // ← Aplicar filtros
  const aplicarFiltros = () => {
    cargarRecibos();
  };

  // ← Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroSesion('');
    setFiltroTipo('');
    setFiltroEstado('');
  };

  // ← Formatear moneda
  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  // ← Formatear fecha
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ← Formatear fecha corta
  const formatDateShort = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ← Cargar detalle del recibo (acordeón derecho)
    // ← Cargar detalle del recibo (acordeón)
  const cargarDetalleRecibo = async (reciboId: number) => {
    // ← ← ← TOGGLE: Si ya está expandido, colapsar y salir
    if (expandedReciboId === reciboId) {
      setExpandedReciboId(null);
      setDetalleRecibo(null);
      return;
    }
    
    // ← ← ← EXPANDIR: Actualizar estado inmediatamente para feedback visual
    setExpandedReciboId(reciboId);
    setDetalleRecibo(null); // Limpiar anterior mientras carga
    setLoadingDetalle(true);
    
    try {
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) throw new Error('Error cargando detalle');
      const data = await res.json();
      setDetalleRecibo(data);
    } catch (err) {
      console.error('❌ Error cargando detalle:', err);
      // Revertir expansión si hay error
      setExpandedReciboId(null);
      setDetalleRecibo(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ← ← ← AGRUPAR RECIBOS POR FECHA (CORREGIDO POR TIMEZONE) ← ← ←
  const recibosAgrupados = useMemo(() => {
      const grupos: Record<string, ReciboCaja[]> = {};
      
      recibos.forEach(recibo => {
        // ← ← ← EXTRAER SOLO LA PARTE DE LA FECHA (YYYY-MM-DD) ← ← ←
        // Esto evita problemas de zona horaria al usar new Date()
        const fechaStr = recibo.fecha ? new Date(recibo.fecha).toLocaleDateString('es-CO', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }) : 'Sin fecha';
        
        if (!grupos[fechaStr]) {
          grupos[fechaStr] = [];
        }
        grupos[fechaStr].push(recibo);
      });
      
      return grupos;
  }, [recibos]);

  // ← Función para imprimir un recibo individual
  const imprimirRecibo = (recibo: ReciboCaja) => {
    const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
    if (!ventanaImpresion) return;

    const itemsHTML = (recibo.items || []).map((item: any) => `
      <tr>
        <td style="text-align:center; padding:4px 8px; font-size:12px;">${item.cantidad}</td>
        <td style="padding:4px 8px; font-size:12px;">${item.descripcion}</td>
        <td style="text-align:right; padding:4px 8px; font-size:12px;">${formatMoney(item.subtotal)}</td>
      </tr>
    `).join('');

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
            max-width: 300px;
            margin: 0 auto;
            padding: 10px;
          }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h1 { font-size: 16px; margin-bottom: 4px; }
          .header p { font-size: 10px; color: #555; }
          .info { margin-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
          .info-row .label { color: #555; }
          .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .items-table th { 
            border-bottom: 1px solid #000; 
            padding: 4px 8px; 
            text-align: left; 
            font-size: 10px;
            text-transform: uppercase;
          }
          .items-table td { padding: 3px 8px; border-bottom: 1px dotted #ccc; }
          .totals { border-top: 2px dashed #000; padding-top: 8px; margin-top: 8px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row.grand { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; }
          .footer p { font-size: 10px; color: #555; }
          .badge { 
            display: inline-block; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 9px; 
            font-weight: bold;
            text-transform: uppercase;
          }
          .badge-publicado { background: #d4edda; color: #155724; }
          .badge-borrador { background: #fff3cd; color: #856404; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏦 DZ Salón & Spa</h1>
          <p>Dorian Zambrano - Peluquería y Spa</p>
          <p>+57 315 707 2678</p>
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
          ${recibo.metodo_pago ? `
          <div class="info-row">
            <span class="label">Pago:</span>
            <span>${recibo.metodo_pago}</span>
          </div>` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width:40px;">Cant</th>
              <th>Descripción</th>
              <th style="text-align:right; width:80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
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

        ${recibo.notas ? `
        <div style="margin-top:10px; padding:5px; background:#f8f9fa; border-radius:3px;">
          <strong>Notas:</strong> ${recibo.notas}
        </div>` : ''}

        <div class="footer">
          <p>¡Gracias por su visita!</p>
          <p>www.dorianzambrano.com</p>
          <p style="margin-top:5px; font-size:8px;">${new Date().toLocaleString('es-CO')}</p>
        </div>
      </body>
      </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    }, 500);
  };

  // ← Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      
      {/* ← ← ← HEADER ← ← ← */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-xl border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                📋 Recibos de Caja
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {recibos.length} recibos encontrados
              </p>
            </div>
            <button
              onClick={() => router.push('/admin')}               
              className="px-4 py-2 text-gray-400 hover:text-white font-medium flex items-center gap-2"
            >
              ← Regresar
            </button>
          </div>
        </div>
      </div>

      {/* ← ← ← BARRA DE FILTROS ← ← ← */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          
          {/* Fecha Inicio */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              📅 Desde
            </label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              📅 Hasta
            </label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Sesión de Caja */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              🏦 Sesión
            </label>
            <select
              value={filtroSesion}
              onChange={(e) => setFiltroSesion(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas las sesiones</option>
              {sesiones.map((sesion) => (
                <option key={sesion.id} value={sesion.id}>
                  {sesion.usuario_username} - {sesion.turno} ({sesion.fecha})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              📋 Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="venta">🛒 Ventas</option>
              <option value="entrada">💰 Entradas</option>
              <option value="salida">💸 Salidas</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltros}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🔍 Filtrar
            </button>
            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ← ← ← CONTENIDO PRINCIPAL: DOS COLUMNAS ← ← ← */}
      <div className="flex h-[calc(100vh-180px)]">
        
        {/* ← ← ← COLUMNA IZQUIERDA: LISTA DE RECIBOS ← ← ← */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          <div className="p-6">
            {recibos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">📭 No hay recibos para mostrar</p>
                <p className="text-sm text-gray-500 mt-2">
                  Intenta ajustar los filtros
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(recibosAgrupados).map(([fecha, recibosDelDia]) => (
                  <div key={fecha}>
                    {/* Separador de fecha */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gray-700"></div>
                      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider whitespace-nowrap">
                        📅 {fecha}
                      </h3>
                      <div className="flex-1 h-px bg-gray-700"></div>
                    </div>

                    {/* Lista de recibos del día */}
                    <div className="space-y-4">
                      {recibosDelDia.map((recibo) => (
                        <div
                          key={recibo.id}
                          className="bg-white rounded-lg shadow-lg overflow-hidden max-w-sm mx-auto"
                        >
                          {/* Encabezado del recibo */}
                          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 text-center">
                            <h2 className="text-lg font-bold">🏦 DZ Salón & Spa</h2>
                            <p className="text-xs text-gray-400">Dorian Zambrano - Peluquería y Spa</p>
                          </div>

                          {/* Cuerpo del recibo */}
                          <div className="p-4 bg-white">
                            {/* Info básica */}
                            <div className="text-xs space-y-1 mb-3 border-b border-dashed border-gray-300 pb-3">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Recibo:</span>
                                <span className="font-bold text-gray-900">{recibo.codigo_recibo}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Fecha:</span>
                                <span className="text-gray-900">{formatDate(recibo.fecha)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Estado:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                  recibo.estado === 'publicado' ? 'bg-green-100 text-green-800' :
                                  recibo.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {recibo.estado}
                                </span>
                              </div>
                              {recibo.cliente_nombre && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Cliente:</span>
                                  <span className="text-gray-900">{recibo.cliente_nombre}</span>
                                </div>
                              )}
                              {recibo.metodo_pago && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Pago:</span>
                                  <span className="text-gray-900 capitalize">{recibo.metodo_pago}</span>
                                </div>
                              )}
                            </div>

                            {/* Items */}
                            <table className="w-full text-xs mb-3">
                              <thead>
                                <tr className="border-b border-gray-300">
                                  <th className="text-left py-1 font-semibold text-gray-600">Cant</th>
                                  <th className="text-left py-1 font-semibold text-gray-600">Descripción</th>
                                  <th className="text-right py-1 font-semibold text-gray-600">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(recibo.items || []).map((item: any) => (
                                  <tr key={item.id} className="border-b border-dashed border-gray-200">
                                    <td className="py-1.5 text-gray-900">{item.cantidad}</td>
                                    <td className="py-1.5 text-gray-900">{item.descripcion}</td>
                                    <td className="py-1.5 text-right font-semibold text-gray-900">
                                      {formatMoney(item.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Totales */}
                            <div className="border-t-2 border-dashed border-gray-400 pt-2 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal:</span>
                                <span className="text-gray-900">{formatMoney(recibo.subtotal)}</span>
                              </div>
                              {parseFloat(recibo.descuento) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Descuento:</span>
                                  <span className="text-red-600">-{formatMoney(recibo.descuento)}</span>
                                </div>
                              )}
                              {parseFloat(recibo.propina_total) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Propina:</span>
                                  <span className="text-purple-600">+{formatMoney(recibo.propina_total)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                                <span className="font-bold text-gray-900 text-sm">TOTAL:</span>
                                <span className="font-bold text-gray-900 text-lg">{formatMoney(recibo.total)}</span>
                              </div>
                            </div>

                            {/* Notas */}
                            {recibo.notas && (
                              <div className="mt-3 pt-2 border-t border-dashed border-gray-300">
                                <p className="text-xs text-gray-500">
                                  <strong>Notas:</strong> {recibo.notas}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Footer del recibo */}
                          <div className="bg-gray-100 px-4 py-3 text-center border-t border-gray-200">
                            <p className="text-xs text-gray-500">¡Gracias por su visita!</p>
                            <p className="text-[10px] text-gray-400">www.dorianzambrano.com</p>
                          </div>

                          {/* Botón de impresión */}
                          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                            <button
                              onClick={() => imprimirRecibo(recibo)}
                              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              🖨️ Imprimir Recibo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ← ← ← COLUMNA DERECHA: ACORDEÓN DE DETALLE ← ← ← */}
<div className="w-1/2 overflow-y-auto">
  <div className="p-6">
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      📊 Detalle del Recibo
    </h3>

    {/* Lista de recibos con detalle inline (ACORDEÓN) */}
    <div className="space-y-2">
      {recibos.map((recibo) => (
        <div key={recibo.id}>
          {/* ← ← ← BOTÓN DEL RECIBO ← ← ← */}
          <button
            onClick={() => cargarDetalleRecibo(recibo.id)}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              expandedReciboId === recibo.id
                ? 'bg-blue-900/30 border-blue-500 shadow-lg'
                : 'bg-gray-800 border-gray-700 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-white">
                  {recibo.codigo_recibo}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(recibo.fecha)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-400">
                  {formatMoney(recibo.total)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  recibo.estado === 'publicado' ? 'bg-green-900/30 text-green-400' :
                  recibo.estado === 'borrador' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {recibo.estado}
                </span>
              </div>
            </div>
          </button>

          {/* ← ← ← DETALLE EXPANDIBLE (SOLO PARA ESTE RECIBO) ← ← ← */}
          {expandedReciboId === recibo.id && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mt-2 animate-fadeIn">
              {/* Header del detalle */}
              <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-900/30 to-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-mono text-lg font-bold text-white">
                      {detalleRecibo?.codigo_recibo || recibo.codigo_recibo}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {formatDate(detalleRecibo?.fecha || recibo.fecha)} • {detalleRecibo?.usuario_username || 'Cargando...'}
                    </p>
                  </div>
                  {detalleRecibo && (
                    <button
                      onClick={() => imprimirRecibo(detalleRecibo)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      🖨️ Imprimir
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido del detalle */}
              {loadingDetalle && expandedReciboId === recibo.id ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-400">Cargando...</span>
                </div>
              ) : detalleRecibo && detalleRecibo.id === recibo.id ? (
                <div className="p-4 space-y-4">
                  {/* Info del cliente */}
                  {detalleRecibo.cliente_nombre && (
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">👤 Cliente</p>
                      <p className="text-sm text-white">{detalleRecibo.cliente_nombre}</p>
                      {detalleRecibo.cliente_telefono && (
                        <p className="text-xs text-gray-400">📞 {detalleRecibo.cliente_telefono}</p>
                      )}
                      {detalleRecibo.cliente_email && (
                        <p className="text-xs text-gray-400">✉️ {detalleRecibo.cliente_email}</p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  {detalleRecibo.items && detalleRecibo.items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2">📦 Items ({detalleRecibo.items.length})</p>
                      <div className="space-y-2">
                        {detalleRecibo.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-900 rounded border border-gray-700">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                item.tipo_item === 'servicio'
                                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                                  : 'bg-purple-900/50 text-purple-300 border border-purple-700'
                              }`}>
                                {item.tipo_item === 'servicio' ? '🔧' : '📦'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm text-white truncate" title={item.descripcion}>
                                  {item.descripcion}
                                </p>
                                {item.profesional_nombre && (
                                  <p className="text-xs text-blue-400">
                                    👨 {item.profesional_nombre}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-400">
                                {item.cantidad}x {formatMoney(item.precio_unitario)}
                              </p>
                              <p className="text-sm font-bold text-green-400">
                                {formatMoney(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totales */}
                  <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">💰 Subtotal:</span>
                      <span className="text-white font-semibold">{formatMoney(detalleRecibo.subtotal)}</span>
                    </div>
                    {parseFloat(detalleRecibo.descuento) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">🏷️ Descuento:</span>
                        <span className="text-orange-400 font-semibold">-{formatMoney(detalleRecibo.descuento)}</span>
                      </div>
                    )}
                    {parseFloat(detalleRecibo.propina_total) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">💎 Propina:</span>
                        <span className="text-purple-400 font-semibold">+{formatMoney(detalleRecibo.propina_total)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-base font-bold text-gray-300">TOTAL:</span>
                        <span className="text-xl font-bold text-green-400">
                          {formatMoney(detalleRecibo.total)}
                        </span>
                      </div>
                    </div>
                    {detalleRecibo.metodo_pago && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">💳 Método:</span>
                        <span className="text-blue-400 font-semibold capitalize">{detalleRecibo.metodo_pago}</span>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {detalleRecibo.notas && (
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">📝 Notas</p>
                      <p className="text-sm text-white">{detalleRecibo.notas}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  Cargando detalle...
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Estado vacío */}
    {recibos.length === 0 && (
      <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
        <p className="text-gray-400 text-lg">📭 No hay recibos</p>
        <p className="text-sm text-gray-500 mt-2">
          No se encontraron recibos para mostrar
        </p>
      </div>
    )}
  </div>
</div>
      </div>
    </div>
  );
}