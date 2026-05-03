// components/admin/CitasTab.tsx
'use client';

import { useState, useEffect } from 'react';
import EditCitaModal from './EditCitaModal';
import ProfessionalModal from '../booking/ProfessionalModal';
import PaymentMethodModal from '../booking/PaymentMethodModal';
import ProductoModal, { ProductoSeleccionado } from './ProductoModal';

// ← ← ← NUEVAS INTERFACES ← ← ←
interface CitaProductoForm {
  productoId: number;
  productoNombre: string;
  productoMarca: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_id: number | null;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  metodo_pago: string;
  estado: string;
  pago_estado: string;
  total_productos?: number;
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
}

interface MetodoPago {
  id: number | string;
  banco: string;
  nombre?: string;
}

export default function CitasTab() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [fechaFin, setFechaFin] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // ← Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profesionalModalOpen, setProfesionalModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  
  // ← ← ← NUEVO: Modal de productos para citas ← ← ←
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [productosDeCita, setProductosDeCita] = useState<CitaProductoForm[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  // ← Cita seleccionada para editar
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [citaEditandoId, setCitaEditandoId] = useState<number | null>(null);

  const [totalCobrado, setTotalCobrado] = useState<number>(0);
  const [totalConfirmado, setTotalConfirmado] = useState<number>(0);
  const [totalPendiente, setTotalPendiente] = useState<number>(0);
  const [totalGeneral, setTotalGeneral] = useState<number>(0);
  
  // ← ← ← NUEVO: Total de citas en estado "pendiente" ← ← ←
  const [totalCitasPendientes, setTotalCitasPendientes] = useState<number>(0);
  
  // ← NUEVO: Estado para filtro de citas por estado (AGREGADO 'pendiente')
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendiente' | 'confirmada_pendiente' | 'completada_pagada'>('todas');

  // ← API config
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // ← Cargar citas al montar o cambiar fechas
  useEffect(() => {
    loadCitas();
  }, [fechaInicio, fechaFin]);

  // ← ← ← NUEVO: Cargar productos de una cita ← ← ←
  const cargarProductosDeCita = async (citaId: number) => {
    setLoadingProductos(true);
    try {
      const res = await fetch(`${apiUrl}/cita-productos/?cita=${citaId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        // ← Manejar respuesta paginada o array directo
        const productosData = Array.isArray(data) ? data : (data.results || []);
        
        const productos: CitaProductoForm[] = productosData.map((p: any) => ({
          productoId: p.producto,
          productoNombre: p.producto_nombre,
          productoMarca: p.producto_marca,
          cantidad: p.cantidad,
          precioUnitario: parseFloat(p.precio_unitario),
          subtotal: parseFloat(p.subtotal)
        }));
        
        setProductosDeCita(productos);
      }
    } catch (err) {
      console.error('❌ Error cargando productos de cita:', err);
    } finally {
      setLoadingProductos(false);
    }
  };

  // ← ← ← NUEVO: Calcular total de productos ← ← ←
/*  const totalProductosCita = productosDeCita.reduce(
    (sum, p) => sum + p.subtotal, 
    0
  );
*/
  // ← ← ← NUEVO: Manejar selección desde ProductoModal ← ← ←
  const handleProductosSeleccionados = async (productos: ProductoSeleccionado[]) => {
    if (!citaEditandoId) return;
    
    try {
      // ← 1. Eliminar productos existentes que no están en la nueva selección
      const productosExistentesRes = await fetch(`${apiUrl}/cita-productos/?cita=${citaEditandoId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (productosExistentesRes.ok) {
        const productosExistentesData = await productosExistentesRes.json();
        const existentes = Array.isArray(productosExistentesData) 
          ? productosExistentesData 
          : (productosExistentesData.results || []);
        
        const idsAMantener = productos.map(p => p.productoId);
        
        // Eliminar los que no están en la nueva selección
        for (const prod of existentes) {
          if (!idsAMantener.includes(prod.producto)) {
            await fetch(`${apiUrl}/cita-productos/${prod.id}/`, {
              method: 'DELETE',
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
          }
        }
      }

      // ← 2. Crear/actualizar productos seleccionados
      for (const prod of productos) {
        await fetch(`${apiUrl}/cita-productos/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            cita: citaEditandoId,
            producto: prod.productoId,
            cantidad: prod.cantidad,
            precio_unitario: prod.precioUnitario,
          }),
        });
      }

      // ← 3. Actualizar UI local
      const nuevosProductos: CitaProductoForm[] = productos.map(p => ({
        productoId: p.productoId,
        productoNombre: p.productoNombre,
        productoMarca: p.productoMarca,
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,
        subtotal: p.subtotal
      }));
      
      setProductosDeCita(nuevosProductos);
      
      // ← 4. Recargar citas para actualizar totales en otros tabs
      await loadCitas();
      
    } catch (err) {
      console.error('❌ Error guardando productos:', err);
      alert('Error al guardar los productos');
    }
  };

  const loadCitas = async () => {
    console.log('📅 [CitasTab] Cargando citas...');
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← ← ← CAMBIO: ordering=-id para orden de creación decreciente (más recientes primero)
      const url = `${apiUrl}/citas/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&ordering=-id`;
      console.log(`📡 [CitasTab] Fetching: ${url}`);
      
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        const citasList = Array.isArray(data) ? data : (data.results || []);
        setCitas(citasList);
        
        // ← CALCULAR los 4 totales (AGREGADO: citasPendientes)
        let confirmadoPendientePago = 0;
        let completadoConPago = 0;
        let citasPendientes = 0;  // ← ← ← NUEVO: Contador de citas pendientes
        let general = 0;

        for (const cita of citasList) {
          const precio = parseFloat(cita.precio_total) || 0;
          general += precio;
          
          if (cita.estado === 'confirmada' && cita.pago_estado !== 'pagado') {
            confirmadoPendientePago += precio;
          } else if (cita.estado === 'completada' && cita.pago_estado === 'pagado') {
            completadoConPago += precio;
          } else if (cita.estado === 'pendiente') {  // ← ← ← NUEVO: Contar pendientes
            citasPendientes += 1;  // Contar cantidad de citas, no el monto
          }
        }

        setTotalConfirmado(confirmadoPendientePago);
        setTotalPendiente(completadoConPago);
        setTotalGeneral(general);
        setTotalCitasPendientes(citasPendientes);  // ← ← ← NUEVO: Actualizar estado

        console.log(`✅ [CitasTab] Totales: 
          Pendientes: ${citasPendientes} citas, 
          Confirmadas sin pago=$${confirmadoPendientePago.toLocaleString()}, 
          Completadas con pago=$${completadoConPago.toLocaleString()}, 
          General=$${general.toLocaleString()}`
        );
      } else {
        console.error('❌ [CitasTab] Error cargando citas:', await res.text());
      }
    } catch (err) {
      console.error('❌ [CitasTab] Error crítico:', err);
    } finally {
      setLoading(false);
    }
  };

  // ← Abrir modal de edición
  const handleEditCita = (cita: Cita) => {
    console.log('✏️ [CitasTab] Editar cita:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setEditModalOpen(true);
  };

  // ← Actualizar cita después de editar
  const handleCitaUpdated = (citaActualizada: Cita) => {
    console.log('✅ [CitasTab] Cita actualizada:', citaActualizada.codigo_reserva);
    setCitas(prev => prev.map(c => c.id === citaActualizada.id ? citaActualizada : c));
    setEditModalOpen(false);
    setCitaSeleccionada(null);
    setCitaEditandoId(null);
  };

  // ← Abrir modal de profesional
  const handleSelectProfesional = (cita: Cita) => {
    console.log('👨‍⚕️ [CitasTab] Seleccionar profesional para cita:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setProfesionalModalOpen(true);
  };

   // ← Actualizar profesional (backend + frontend)
  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!citaEditandoId) {
      console.error('❌ [CitasTab] No hay cita seleccionada para actualizar');
      return;
    }
    
    console.log('👨‍⚕️ [CitasTab] Asignando profesional:', profesional.nombre, '(ID:', profesional.id, ')');
    
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const updateRes = await fetch(`${apiUrl}/citas/${citaEditandoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profesional: profesional.id,
        }),
      });
      
      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error('❌ [CitasTab] Error actualizando profesional:', errorText);
        alert('Error al asignar el profesional: ' + errorText);
        return;
      }
      
      const citaActualizada = await updateRes.json();
      console.log('✅ [CitasTab] Profesional asignado en backend:', citaActualizada);
      
      setCitas(prev => prev.map(c => 
        c.id === citaEditandoId 
          ? { 
              ...c, 
              profesional: profesional.id, 
              profesional_nombre: profesional.nombre 
            }
          : c
      ));
      
      console.log('✅ [CitasTab] Profesional actualizado en UI');
      
    } catch (err: any) {
      console.error('❌ [CitasTab] ERROR crítico asignando profesional:', err);
      alert('Error al asignar el profesional: ' + err.message);
    } finally {
      setProfesionalModalOpen(false);
      setCitaSeleccionada(null);
      setCitaEditandoId(null);
    }
  };

  // ← Abrir modal de método de pago
  const handleSelectMetodoPago = (cita: Cita) => {
    console.log('💳 [CitasTab] Seleccionar método de pago para cita:', cita.codigo_reserva);
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    setPagoModalOpen(true);
  };

  // ← Actualizar método de pago + estados + actualizar/crear pago
const handleMetodoPagoSelected = async (metodo: MetodoPago) => {
  if (!citaEditandoId || !citaSeleccionada) {
    console.error('❌ [EditCitaModal] No hay cita seleccionada');
    return;
  }
  
  console.log('💳 [EditCitaModal] Procesando método:', metodo);
  
  try {
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    const esMetodoBase = ['bold', 'efectivo', 'pendiente'].includes(metodo.banco.toLowerCase());
    
    let metodoPagoValue: string;
    let cuentaBancariaId: number | null = null;
    
    if (esMetodoBase) {
      metodoPagoValue = metodo.banco.toLowerCase();
      console.log(`✅ [EditCitaModal] Método base: ${metodoPagoValue}`);
    } else {
      metodoPagoValue = 'efectivo';
      cuentaBancariaId = typeof metodo.id === 'number' ? metodo.id : null;
      console.log(`✅ [EditCitaModal] Cuenta bancaria: ${metodo.banco} → mapeado a 'efectivo', cuenta_id: ${cuentaBancariaId}`);
    }
    
    // ← Payload para actualizar cita
    const payload: any = {
      metodo_pago: metodoPagoValue,
      estado: 'completada',
      pago_estado: 'pagado',
    };
    
    if (cuentaBancariaId) {
      payload.cuenta_bancaria_usada = cuentaBancariaId;
    }
    
    console.log('🔄 [EditCitaModal] Actualizando cita:', payload);
    
    // ← PASO 1: Actualizar cita
    const updateCitaRes = await fetch(`${apiUrl}/citas/${citaEditandoId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    
    if (!updateCitaRes.ok) {
      const errorText = await updateCitaRes.text();
      console.error('❌ [EditCitaModal] Error actualizando cita:', errorText);
      alert('Error al actualizar la cita: ' + errorText);
      return;
    }
    
    const citaActualizada = await updateCitaRes.json();
    console.log('✅ [EditCitaModal] Cita actualizada:', citaActualizada);
    
    // ← ← ← PASO 2: VERIFICAR SI YA EXISTE PAGO PARA ESTA CITA ← ← ←
    console.log('💾 [EditCitaModal] Buscando pago existente para cita...');
    
    const pagosExistentesRes = await fetch(
      `${apiUrl}/pagos/?origen_tipo=cita&origen_id=${citaEditandoId}`,
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      }
    );
    
    let pagoExistente = null;
    if (pagosExistentesRes.ok) {
      const pagosData = await pagosExistentesRes.json();
      const pagosList = Array.isArray(pagosData) ? pagosData : (pagosData.results || []);
      
      // Buscar el primer pago exitoso o pendiente
      pagoExistente = pagosList.find((p: any) => 
        p.estado === 'exitoso' || p.estado === 'pendiente'
      );
      
      console.log('🔍 [EditCitaModal] Pagos encontrados:', pagosList.length);
      if (pagoExistente) {
        console.log('✅ [EditCitaModal] Pago existente encontrado:', pagoExistente.id);
      }
    }
    
    // ← PASO 3: ACTUALIZAR O CREAR PAGO SEGÚN CORRESPONDA
    if (pagoExistente) {
      // ← ACTUALIZAR pago existente (PATCH)
      console.log('🔄 [EditCitaModal] Actualizando pago existente ID:', pagoExistente.id);
      
      const updatePagoRes = await fetch(`${apiUrl}/pagos/${pagoExistente.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          monto: parseFloat(citaSeleccionada.precio_total) || 0,
          metodo_pago: metodoPagoValue,
          estado: 'exitoso',
          referencia_externa: `RESERVA-${citaSeleccionada.codigo_reserva}`,
        }),
      });
      
      if (updatePagoRes.ok) {
        const pagoActualizado = await updatePagoRes.json();
        console.log('✅ [EditCitaModal] Pago actualizado:', pagoActualizado);
      } else {
        console.warn('⚠️ [EditCitaModal] Error actualizando pago:', await updatePagoRes.text());
      }
    } else {
      // ← CREAR nuevo pago (POST)
      console.log('💾 [EditCitaModal] Creando nuevo pago...');
      
      const pagoRes = await fetch(`${apiUrl}/pagos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          monto: parseFloat(citaSeleccionada.precio_total) || 0,
          metodo_pago: metodoPagoValue,
          estado: 'exitoso',
          origen_tipo: 'cita',
          origen_id: citaEditandoId,
          referencia_externa: `RESERVA-${citaSeleccionada.codigo_reserva}`,
        }),
      });
      
      if (pagoRes.ok) {
        const pagoData = await pagoRes.json();
        console.log('✅ [EditCitaModal] Pago creado:', pagoData);
      } else {
        console.warn('⚠️ [EditCitaModal] Error creando pago:', await pagoRes.text());
      }
    }
    
    // ← PASO 4: Actualizar UI
    setCitas(prev => prev.map(c => 
      c.id === citaEditandoId 
        ? { 
            ...c, 
            metodo_pago: metodoPagoValue,
            estado: 'completada',
            pago_estado: 'pagado'
          }
        : c
    ));
    
    console.log('✅ [EditCitaModal] Pago registrado exitosamente');
    alert(`✅ Pago registrado: ${metodo.banco}\nCita completada`);
    
  } catch (err: any) {
    console.error('❌ [EditCitaModal] ERROR:', err);
    alert('Error al procesar el pago: ' + err.message);
  } finally {
    setPagoModalOpen(false);
    setCitaSeleccionada(null);
    setCitaEditandoId(null);
  }
};

    // ← Formatear fecha para display
  const formatDate = (fechaStr: string): string => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-CO', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short' 
    });
  };

  // ← Obtener color según estado
  const getEstadoColor = (estado: string): string => {
    const colors: Record<string, string> = {
      'pendiente': 'bg-yellow-600',
      'confirmada': 'bg-blue-600',
      'completada': 'bg-green-600',
      'cancelada': 'bg-red-600'
    };
    return colors[estado] || 'bg-gray-600';
  };

  // ← NUEVO: Manejar clic en card de total para filtrar citas (AGREGADO 'pendiente')
  const handleFiltroClick = (tipo: 'todas' | 'pendiente' | 'confirmada_pendiente' | 'completada_pagada') => {
    console.log(`🔍 [CitasTab] Filtro aplicado: ${tipo}`);
    setFiltroEstado(tipo);
  };

  // ← NUEVO: Filtrar citas según el filtro seleccionado (AGREGADO caso 'pendiente')
   const getCitasFiltradas = (): Cita[] => {
    if (filtroEstado === 'todas') return citas;
    if (filtroEstado === 'pendiente') {  // ← ← ← NUEVO: Filtrar por pendiente
      return citas.filter(c => c.estado === 'pendiente');
    }
    if (filtroEstado === 'confirmada_pendiente') {
      return citas.filter(c => c.estado === 'confirmada');
    }
    if (filtroEstado === 'completada_pagada') {
      return citas.filter(c => c.estado === 'completada' && c.pago_estado === 'pagado');
    }
    return citas;
  };

  // ← NUEVO: Obtener texto del filtro activo para mostrar (AGREGADO caso 'pendiente')
  const getFiltroLabel = (): string => {
    switch (filtroEstado) {
      case 'pendiente': return 'Citas Pendientes';  // ← ← ← NUEVO
      case 'confirmada_pendiente': return 'Confirmadas (Pendiente Pago)';
      case 'completada_pagada': return 'Completadas (Pagadas)';
      default: return 'Todas las citas';
    }
  };

  // ← ← ← NUEVO: Abrir modal de productos para una cita ← ← ←
  const handleOpenProductosModal = async (cita: Cita) => {
    setCitaSeleccionada(cita);
    setCitaEditandoId(cita.id);
    await cargarProductosDeCita(cita.id);
    setProductoModalOpen(true);
  };

  // ← ← ← NUEVO: Formatear moneda ← ← ←
  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* ========== FILTROS DE FECHA Y TOTALES ========== */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📅 Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📅 Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          {/* ← ← ← NUEVA CARD: Citas Pendientes (PRIMERA CARD DE TOTALES) ← ← ← */}
          <button
            type="button"
            onClick={() => handleFiltroClick('pendiente')}
            className={`bg-gradient-to-br from-yellow-600/70 to-orange-600/70 rounded-xl p-3 border-2 flex flex-col justify-center transition-all hover:scale-105 ${
              filtroEstado === 'pendiente' 
                ? 'border-yellow-300 ring-4 ring-yellow-500/50 shadow-lg shadow-yellow-500/30' 
                : 'border-yellow-500 hover:border-yellow-300'
            }`}
            title="Click para filtrar: Citas pendientes de confirmación"
          >
            <p className="text-yellow-200 text-[10px] font-semibold mb-0.5">
              ⏳ Citas Pendientes
            </p>
            <p className="text-2xl font-bold text-white">
              {totalCitasPendientes}
            </p>
            <p className="text-yellow-300/70 text-[9px] mt-0.5">
              Por confirmar
            </p>
            {filtroEstado === 'pendiente' && (
              <span className="text-[9px] text-yellow-200 mt-1">✓ Filtrando</span>
            )}
          </button>
          
          {/* Total Pendiente - Confirmada con pago pendiente */}
          <button
            type="button"
            onClick={() => handleFiltroClick('confirmada_pendiente')}
            className={`bg-gradient-to-br from-blue-900/70 to-indigo-900/70 rounded-xl p-3 border-2 flex flex-col justify-center transition-all hover:scale-105 ${
              filtroEstado === 'confirmada_pendiente' 
                ? 'border-blue-300 ring-4 ring-blue-500/50 shadow-lg shadow-blue-500/30' 
                : 'border-blue-500 hover:border-blue-300'
            }`}
            title="Click para filtrar: Citas confirmadas con pago pendiente"
          >
            <p className="text-blue-300 text-[10px] font-semibold mb-0.5">
              ⏳ Confirmada Pendiente Pago
            </p>
            <p className="text-lg font-bold text-blue-400">
              ${totalConfirmado.toLocaleString('es-CO')}
            </p>
            {filtroEstado === 'confirmada_pendiente' && (
              <span className="text-[9px] text-blue-200 mt-1">✓ Filtrando</span>
            )}
          </button>

          {/* Total Confirmado - Completada con pago */}
          <button
            type="button"
            onClick={() => handleFiltroClick('completada_pagada')}
            className={`bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-3 border flex flex-col justify-center transition-all hover:scale-105 ${
              filtroEstado === 'completada_pagada' 
                ? 'border-green-300 ring-4 ring-green-500/50 shadow-lg shadow-green-500/30' 
                : 'border-green-700 hover:border-green-300'
            }`}
            title="Click para filtrar: Citas completadas y pagadas"
          >
            <p className="text-green-300 text-[10px] font-semibold mb-0.5">
              ✅ Completado con pago
            </p>
            <p className="text-lg font-bold text-green-400">
              ${totalPendiente.toLocaleString('es-CO')}
            </p>
            {filtroEstado === 'completada_pagada' && (
              <span className="text-[9px] text-green-200 mt-1">✓ Filtrando</span>
            )}
          </button>

          {/* Total General - Todas las citas */}
          <button
            type="button"
            onClick={() => handleFiltroClick('todas')}
            className={`bg-gradient-to-br from-yellow-900/50 to-amber-900/50 rounded-lg p-2 border flex flex-col justify-center transition-all hover:scale-105 ${
              filtroEstado === 'todas' 
                ? 'border-yellow-300 ring-2 ring-yellow-500/50 shadow-md shadow-yellow-500/30' 
                : 'border-yellow-700 hover:border-yellow-300'
            }`}
            title="Click para mostrar todas las citas"
          >
            <p className="text-yellow-200 text-[8px] font-bold mb-0.5 uppercase tracking-wide leading-tight">
              💰 Total
            </p>
            <p className="text-lg font-extrabold text-white drop-shadow">
              ${totalGeneral.toLocaleString('es-CO')}
            </p>
            <p className="text-yellow-300/70 text-[7px] mt-0.5 leading-none">
              {citas.length} cita{citas.length !== 1 ? 's' : ''}
            </p>
            {filtroEstado !== 'todas' && (
              <span className="text-[7px] text-yellow-200 mt-0.5 cursor-pointer hover:underline">
                Ver todas
              </span>
            )}
          </button>
        </div>
      </div>  
      
      {/* ========== GRID DE CITAS ========== */}
      <div>
        <div className="flex items-center justify-between mb-4">
         
          {/* Después del título "Citas (X)" */}
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              Citas ({getCitasFiltradas().length})
            </h2>
            {/* ← ← ← NUEVO: Badge de orden ← ← ← */}
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              ↓ Más recientes primero
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filtroEstado !== 'todas' && (
              <button
                onClick={() => setFiltroEstado('todas')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Quitar filtro
              </button>
            )}
            <p className="text-sm text-gray-400">
              {fechaInicio === fechaFin 
                ? `Citas del ${formatDate(fechaInicio)}`
                : `Del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)}`
              }
            </p>
          </div>
        </div>

        {filtroEstado !== 'todas' && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg flex items-center justify-between">
            <p className="text-blue-300 text-sm">
              🔍 Mostrando: <span className="font-semibold">{getFiltroLabel()}</span>
            </p>
            <button
              onClick={() => setFiltroEstado('todas')}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
            >
              Limpiar filtro
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {getCitasFiltradas().length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400 text-lg">
              {filtroEstado !== 'todas' 
                ? `No hay citas ${getFiltroLabel().toLowerCase()} en este rango`
                : 'No hay citas en este rango de fechas'
              }
            </p>
            {filtroEstado !== 'todas' && (
              <button
                onClick={() => setFiltroEstado('todas')}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
              >
                Mostrar todas las citas →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {getCitasFiltradas().map((cita) => (
              <div
                key={cita.id}
                onClick={() => handleEditCita(cita)}
                className="bg-gray-800 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all cursor-pointer hover:shadow-xl hover:scale-105 overflow-hidden"
              >
                {/* Header con código y estado */}
                <div className="bg-gray-900 p-3 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {cita.codigo_reserva}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getEstadoColor(cita.estado)}`}>
                      {cita.estado}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-sm truncate">
                    {cita.cliente_nombre}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {cita.hora_inicio} - {cita.hora_fin}
                  </p>
                </div>

                {/* Body con servicio */}
                <div className="p-3">
                  <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                    {cita.servicio_nombre}
                  </p>
                  <p className="text-lg font-bold text-green-400">
                    ${parseInt(cita.precio_total).toLocaleString()}
                  </p>
                </div>

                {/* Footer con profesional, método de pago y PRODUCTOS */}
                <div className="bg-gray-900 p-3 border-t border-gray-700 space-y-2">
                  
                  {/* ← Profesional: Azul si tiene, Gris si no tiene */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProfesional(cita);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all font-medium ${
                      cita.profesional_nombre
                        ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                        : 'bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <span className={cita.profesional_nombre ? 'text-blue-400' : 'text-gray-500'}>👨‍⚕️</span>
                    <span className="truncate flex-1 mx-2 font-semibold">
                      {cita.profesional_nombre || 'Sin profesional'}
                    </span>
                    <span className={cita.profesional_nombre ? 'text-blue-300' : 'text-gray-500'}>✏️</span>
                  </button>

                  {/* ← Método de Pago: Verde si está pagado, Gris si está pendiente */}
                    <button
                     /* onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMetodoPago(cita);
                      }}*/
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all font-medium ${
                        cita.pago_estado === 'pagado' && cita.metodo_pago
                          ? 'bg-green-600/20 border border-green-500/50 text-green-300 hover:bg-green-600/30'
                          : 'bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <span className={cita.pago_estado === 'pagado' ? 'text-green-400' : 'text-gray-500'}>💳</span>
                      <span className="truncate flex-1 mx-2 font-semibold capitalize">
                        {cita.pago_estado === 'pagado' && cita.metodo_pago 
                          ? `Pago: ${cita.metodo_pago}` 
                          : 'Pendiente pago'}
                      </span>
                      <span className={cita.pago_estado === 'pagado' ? 'text-green-300' : 'text-gray-500'}>✏️</span>
                    </button>

                  {/* ← Productos: Púrpura si tiene, Gris si no tiene */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProductosModal(cita);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all font-medium ${
                      cita.total_productos && cita.total_productos > 0
                        ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300 hover:bg-purple-600/30'
                        : 'bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <span className={cita.total_productos && cita.total_productos > 0 ? 'text-purple-400' : 'text-gray-500'}>📦</span>
                    <span className="truncate flex-1 mx-2 font-semibold">
                      Productos {cita.total_productos && cita.total_productos > 0 && `(${formatMoney(cita.total_productos)})`}
                    </span>
                    <span className={cita.total_productos && cita.total_productos > 0 ? 'text-purple-300' : 'text-gray-500'}>✏️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ← Modal de Edición de Cita */}
      {editModalOpen && citaSeleccionada && (
        <EditCitaModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          cita={citaSeleccionada}
          onCitaUpdated={handleCitaUpdated}
        />
      )}

      {/* ← Modal de Profesional */}
      {profesionalModalOpen && citaSeleccionada && (
        <ProfessionalModal
          isOpen={profesionalModalOpen}
          onClose={() => {
            setProfesionalModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          onSelect={handleProfesionalSelected}
          servicioId={citaSeleccionada.servicio}
          profesionalSeleccionadoId={citaSeleccionada.profesional}
        />
      )}

      {/* ← Modal de Método de Pago */}
      {pagoModalOpen && citaSeleccionada && (
        <PaymentMethodModal
          isOpen={pagoModalOpen}
          onClose={() => {
            setPagoModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
          }}
          onSelect={handleMetodoPagoSelected}
          metodoSeleccionadoId={null}
        />
      )}

      {/* ← ← ← NUEVO: Modal de Productos para Citas ← ← ← */}
      {productoModalOpen && citaSeleccionada && (
        <ProductoModal
          isOpen={productoModalOpen}
          onClose={() => {
            setProductoModalOpen(false);
            setCitaSeleccionada(null);
            setCitaEditandoId(null);
            setProductosDeCita([]);
          }}
          onSelect={handleProductosSeleccionados}
          apiUrl={apiUrl}
          token={token || undefined}
          productosExistentes={productosDeCita.map(p => ({
            productoId: p.productoId,
            productoNombre: p.productoNombre,
            productoMarca: p.productoMarca,
            cantidad: p.cantidad,
            precioUnitario: p.precioUnitario,
            precioBase: p.precioUnitario,
            subtotal: p.subtotal,
            stockDisponible: 999
          }))}
        />
      )}
    </div>
  );
}