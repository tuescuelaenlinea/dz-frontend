// components/admin/CajaReciboModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProfessionalModal from '@/components/booking/ProfessionalModal';
import CitasPendientesModal from '@/components/admin/CitasPendientesModal';

// ← ← ← INTERFACES ← ← ←
interface Servicio {
  id: number;
  nombre: string;
  precio_min: string | number;
  categoria_nombre: string;
  duracion?: string;              // ← ← ← AGREGADO (soluciona tu error)
  imagen_url?: string | null;     // ← ← ← AGREGADO (para línea 617)
}

interface Producto {
  id: number;
  nombre: string;
  marca: string;
  precio_venta: string | number;
  stock_actual: number;
  categoria_nombre: string;
  imagen_url?: string | null;     // ← ← ← AGREGADO
}

interface Profesional {
  id: number;
  nombre: string;
}

interface ReciboItem {
  id: string;
  tipo: 'servicio' | 'producto';
  servicioId?: number;
  productoId?: number;
  descripcion: string;
  categoria?: string; 
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  duracion?: string
  profesionalId?: number;
  profesionalNombre?: string;
  citaId?: number;
  codigoReserva?: string;
  esNuevo?: boolean;  // ← ← ← NUEVO: Para diferenciar items agregados en edición
  imagenUrl?: string | null;    // ← ← ← AGREGADO
  productosAsociados?: any[];   // ← ← ← AGREGADO
  stockActual?: number;         // ← ← ← AGREGADO
}

interface CajaReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCajaId?: number;  // ← ← ← OPCIONAL (con ?)
  reciboParaEditarId?: number | null;
  apiUrl?: string;
  token?: string | null;
  onReciboCreado?: (recibo: any) => void;
  onReciboActualizado?: (recibo: any) => void;
}

export default function CajaReciboModal({
  isOpen,
  onClose,
  sessionCajaId,
  reciboParaEditarId = null,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api',
  token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null,
  onReciboCreado,
  onReciboActualizado
}: CajaReciboModalProps) {
  
  // ← Estados principales
  const [tipoRecibo, setTipoRecibo] = useState<'entrada' | 'salida' | 'venta'>('venta');
  const [items, setItems] = useState<ReciboItem[]>([]);
  const [descuento, setDescuento] = useState<number>(0);
  const [propinaTotal, setPropinaTotal] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>('bold');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [clienteEmail, setClienteEmail] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  
  // ← ← ← NUEVOS ESTADOS PARA MODO EDICIÓN ← ← ←
  const [modoEdicion, setModoEdicion] = useState(false);
  const [reciboEditando, setReciboEditando] = useState<any | null>(null);
  const [reciboId, setReciboId] = useState<number | null>(null);
  
  // ← ← ← NUEVOS ESTADOS PARA MODAL DE PROFESIONAL ← ← ←
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [itemParaProfesional, setItemParaProfesional] = useState<ReciboItem | null>(null);

  // ← Estados para búsqueda de citas sin recibos
  const [showCitasModal, setShowCitasModal] = useState(false);
  
  // ← Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'servicio' | 'producto'>('servicio');
  const [searchResults, setSearchResults] = useState<(Servicio | Producto)[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  // ← Estados para propinas
  const [showPropinaModal, setShowPropinaModal] = useState(false);
  const [propinaMetodo, setPropinaMetodo] = useState<'equitativa' | 'proporcional' | 'manual'>('proporcional');
  const [propinaDistribucion, setPropinaDistribucion] = useState<Array<{
    profesionalId: number; 
    nombre: string; 
    monto: number; 
    porcentaje: number
  }>>([]);
  const [propinaEditable, setPropinaEditable] = useState<string>('');
  
  // ← Estados de carga y guardado
  const [loading, setLoading] = useState(false);
  const [estadoRecibo, setEstadoRecibo] = useState<'borrador' | 'publicado'>('borrador');
  
  // ← Datos auxiliares
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState<number | null>(null);

  // ← ← ← CALCULAR TOTALES ← ← ←
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const total = useMemo(() => {
    return subtotal - descuento + propinaTotal;
  }, [subtotal, descuento, propinaTotal]);



  // ← Formatear moneda
  const formatMoney = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ← ← ← CARGAR RECIBO PARA EDITAR ← ← ←
  useEffect(() => {
    if (isOpen && reciboParaEditarId) {
      cargarReciboParaEditar();
    }
  }, [isOpen, reciboParaEditarId]);

  // ← ← ← FUNCIÓN: Cargar códigos de reserva para múltiples citas ← ← ←
  const cargarCodigosReservaParaCitas = async (citaIds: number[]): Promise<Record<number, string>> => {
    if (citaIds.length === 0) return {};
    
    try {
      const idsParam = citaIds.join(',');
      const res = await fetch(`${apiUrl}/citas/?id__in=${idsParam}&fields=id,codigo_reserva`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) return {};
      
      const data = await res.json();
      const citasList = Array.isArray(data) ? data : (data.results || []);
      
      const mapaCodigos: Record<number, string> = {};
      citasList.forEach((cita: any) => {
        if (cita.id && cita.codigo_reserva) {
          mapaCodigos[cita.id] = cita.codigo_reserva;
        }
      });
      
      return mapaCodigos;
    } catch (err) {
      console.error('❌ Error cargando códigos de reserva:', err);
      return {};
    }
  };

  const cargarReciboParaEditar = async () => {
    if (!reciboParaEditarId) return;
    
    setLoading(true);
    setItemsQuitados([]);  // ← ← ← NUEVO
    console.log('📦 [CajaReciboModal] Cargando recibo para editar ID:', reciboParaEditarId);
    
    try {
      // ← ← ← 1. CARGAR RECIBO DESDE API ← ← ←
      const res = await fetch(`${apiUrl}/caja/recibos/${reciboParaEditarId}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error cargando recibo:', errorText);
        throw new Error('Error cargando recibo');
      }
      
      const recibo = await res.json();
      console.log('✅ [CajaReciboModal] Recibo cargado:', recibo.codigo_recibo);
      
      // ← ← ← 2. LIMPIAR ESTADO ANTES DE CARGAR (CRÍTICO) ← ← ←
      setItems([]);
      
      // ← ← ← 3. LLENAR ESTADOS CON DATOS DEL RECIBO ← ← ←
      setModoEdicion(true);
      setReciboEditando(recibo);
      setReciboId(recibo.id);
      setTipoRecibo(recibo.tipo);
      setDescuento(parseFloat(recibo.descuento) || 0);
      setPropinaTotal(parseFloat(recibo.propina_total) || 0);
      setPropinaEditable(String(recibo.propina_total || 0));
      setMetodoPago(recibo.metodo_pago || 'efectivo');
      setClienteNombre(recibo.cliente_nombre || '');
      setClienteTelefono(recibo.cliente_telefono || '');
      setClienteEmail(recibo.cliente_email || '');
      setNotas(recibo.notas || '');
      setEstadoRecibo(recibo.estado);
      setPropinaMetodo(recibo.propina_metodo_distribucion || 'proporcional');
      
      // ← ← ← 4. CARGAR ITEMS CON ESTRUCTURA CORRECTA ← ← ←
      if (recibo.items && Array.isArray(recibo.items)) {
        // Primero mapear items básicos
        const itemsMapeados: ReciboItem[] = recibo.items.map((item: any) => {
          // ← ← ← EXTRAER servicio_id: puede venir en diferentes lugares ← ← ←
          let servicioId: number | undefined;
          
          if (item.tipo_item === 'servicio') {
            // Prioridad 1: servicio_id directo del serializer
            if (item.servicio_id) {
              servicioId = item.servicio_id;
            }
            // Prioridad 2: desde cita.servicio (objeto o ID)
            else if (item.cita && typeof item.cita === 'object' && item.cita.servicio) {
              servicioId = typeof item.cita.servicio === 'object' 
                ? item.cita.servicio.id 
                : item.cita.servicio;
            }
            // Prioridad 3: campo anidado servicio
            else if (item.servicio && typeof item.servicio === 'object') {
              servicioId = item.servicio.id;
            }
          }
          
          // ← ← ← EXTRAER codigo_reserva: puede venir en diferentes lugares ← ← ←
          let codigoReserva: string | undefined;
          
          if (item.tipo_item === 'servicio' && item.cita) {
            if (typeof item.cita === 'object' && item.cita.codigo_reserva) {
              codigoReserva = item.cita.codigo_reserva;
            } else if (item.codigo_reserva_cita) {
              codigoReserva = item.codigo_reserva_cita;
            }
          }
          
          return {
            id: item.id.toString(),
            tipo: item.tipo_item,
            // ← ← ← CAMPOS CLAVE PARA SERVICIOS ← ← ←
            servicioId: item.tipo_item === 'servicio' ? servicioId : undefined,
            productoId: item.tipo_item === 'producto' ? item.producto : undefined,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: parseFloat(item.precio_unitario) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            // ← ← ← PROFESIONAL ← ← ←
            profesionalId: item.profesional || undefined,
            profesionalNombre: item.profesional_nombre || undefined,
            // ← ← ← CITA VINCULADA ← ← ←
            citaId: item.tipo_item === 'servicio' ? (item.cita || undefined) : undefined,
            codigoReserva: codigoReserva,  // ← ← ← AHORA SE CARGA CORRECTAMENTE
            // ← ← ← MARCAR COMO ITEM EXISTENTE (NO NUEVO) ← ← ←
            esNuevo: false
          };
        });
        
        // ← ← ← 5. CARGAR CÓDIGOS DE RESERVA PARA CITAS QUE NO LOS TENGAN ← ← ←
        const itemsSinCodigo = itemsMapeados.filter(
          item => item.tipo === 'servicio' && item.citaId && !item.codigoReserva
        );
        
        if (itemsSinCodigo.length > 0) {
          const citaIds = Array.from(
            new Set(itemsSinCodigo.map(item => item.citaId!).filter(Boolean))
          ) as number[];
          
          if (citaIds.length > 0) {
            try {
              const codigosMapa = await cargarCodigosReservaParaCitas(citaIds);
              
              // Actualizar items con códigos de reserva
              const itemsActualizados = itemsMapeados.map(item => ({
                ...item,
                codigoReserva: item.citaId ? codigosMapa[item.citaId] : item.codigoReserva
              }));
              
              setItems(itemsActualizados);
              console.log(`✅ [CajaReciboModal] Códigos de reserva cargados para ${Object.keys(codigosMapa).length} citas`);
            } catch (err) {
              console.warn('⚠️ No se pudieron cargar códigos de reserva, usando items básicos');
              setItems(itemsMapeados);
            }
          } else {
            setItems(itemsMapeados);
          }
        } else {
          // Todos los items ya tienen código o no son servicios con cita
          setItems(itemsMapeados);
        }
        
        // ← ← ← 6. CALCULAR DISTRIBUCIÓN DE PROPINA EXISTENTE ← ← ←
        if (recibo.propina_total && parseFloat(recibo.propina_total) > 0) {
          const propina = parseFloat(recibo.propina_total);
          const metodo = recibo.propina_metodo_distribucion || 'proporcional';
          
          // Obtener profesionales con servicios desde items cargados
          const profesionalesConServicios = Array.from(
            new Set(
              itemsMapeados
                .filter((item: any) => item.tipo === 'servicio' && item.profesionalId)
                .map((item: any) => ({
                  id: item.profesionalId,
                  nombre: item.profesionalNombre || '',
                  subtotal: parseFloat(item.subtotal) || 0
                }))
            )
          );
          
          if (profesionalesConServicios.length > 0) {
            let distribucionInicial: Array<{profesionalId: number, nombre: string, monto: number, porcentaje: number}> = [];
            
            if (metodo === 'equitativa') {
              const cantidad = profesionalesConServicios.length;
              const montoBase = propina / cantidad;
              const residuo = propina - (montoBase * cantidad);
              distribucionInicial = profesionalesConServicios.map((p: any, index: number) => ({
                profesionalId: p.id,
                nombre: p.nombre || '',
                monto: index === cantidad - 1 ? Math.round(montoBase + residuo) : Math.round(montoBase),
                porcentaje: Math.round(100 / cantidad)
              }));
            } else if (metodo === 'proporcional') {
              const subtotalTotal = profesionalesConServicios.reduce(
                (sum: number, p: any) => sum + p.subtotal, 0
              );
              if (subtotalTotal > 0) {
                let montoRestante = propina;
                distribucionInicial = profesionalesConServicios.map((p: any, index: number, arr: any[]) => {
                  const porcentaje = (p.subtotal / subtotalTotal) * 100;
                  const monto = index === arr.length - 1
                    ? Math.round(montoRestante)
                    : Math.round((p.subtotal / subtotalTotal) * propina);
                  montoRestante -= monto;
                  return {
                    profesionalId: p.id,
                    nombre: p.nombre || '',
                    monto: monto,
                    porcentaje: Math.round(porcentaje)
                  };
                });
              }
            }
            
            setPropinaDistribucion(distribucionInicial);
            console.log(`💰 [CajaReciboModal] Propina distribuida: ${distribucionInicial.length} profesionales`);
          }
        }
      }
      
    } catch (err) {
      console.error('❌ [CajaReciboModal] Error cargando recibo:', err);
      alert('⚠️ Error cargando el recibo para editar');
    } finally {
      setLoading(false);
    }
  };

   const handleCitaSeleccionada = (cita: any) => {
    console.log('📦 [handleCitaSeleccionada] Cita recibida:', cita);
    
    // ← ← ← VALIDAR DATOS DE LA CITA ← ← ←
    if (!cita) {
      console.error('❌ No se recibió la cita');
      alert('⚠️ Error: No se recibió la información de la cita');
      return;
    }
    
    // ← ← ← EXTRAER DATOS CON CAMPOS PLANOS (CRÍTICO) ← ← ←
    // El modal envía: cita_id, servicio_id, profesional_id (no objetos anidados)
    const servicioId = cita.servicio_id || cita.servicio?.id || 0;
    const servicioNombre = cita.servicio_nombre || cita.servicio?.nombre || 'Servicio sin nombre';
    
    const profesionalId = cita.profesional_id || cita.profesional?.id || null;
    const profesionalNombre = cita.profesional_nombre || cita.profesional?.nombre || null;
    
    // ← ← ← PARSEAR PRECIO ← ← ←
    const precioTotal = typeof cita.precio_total === 'string'
      ? parseFloat(cita.precio_total.replace(/[^0-9.-]+/g, '')) || 0
      : Number(cita.precio_total) || 0;
    
    // ← ← ← CREAR ITEM CON ESTRUCTURA UNIFICADA ← ← ←
    const nuevoItem: ReciboItem = {
      id: `cita-${cita.cita_id}-${Date.now()}`,  // ← ← ← CAMBIO: cita_id (plano)
      tipo: 'servicio',
      servicioId: servicioId,  // ← ← ← CAMBIO: servicio_id (plano)
      descripcion: servicioNombre,  // ← ← ← CAMBIO: servicio_nombre (plano)
      cantidad: 1,
      precioUnitario: precioTotal,
      subtotal: precioTotal,
      profesionalId: profesionalId,  // ← ← ← CAMBIO: profesional_id (plano)
      profesionalNombre: profesionalNombre,  // ← ← ← CAMBIO: profesional_nombre (plano)
      citaId: cita.cita_id,  // ← ← ← CAMBIO: cita_id (plano)
      codigoReserva: cita.codigo_reserva,  // ← ← ← CAMBIO: codigo_reserva (plano)
      esNuevo: true  // ← ← ← Para diferenciar en edición
    };
    
    console.log('✅ [handleCitaSeleccionada] Item creado:', nuevoItem);
    
    // ← ← ← AGREGAR ITEM AL ESTADO ← ← ←
    setItems(prev => [...prev, nuevoItem]);
    
    // ← ← ← ALERTA SI NO TIENE PROFESIONAL ← ← ←
    if (!profesionalId) {
      setTimeout(() => {
        alert(
          '⚠️ Esta cita no tiene profesional asignado.\n\n' +
          'Por favor haz click en el item para asignar un profesional antes de publicar el recibo.'
        );
      }, 300);
    }
    
    // ← ← ← RECALCULAR PROPINA SI APLICA ← ← ←
    if (propinaTotal > 0) {
      setPropinaDistribucion(calcularDistribucionPropina);
    }
  };

  // ← ← ← FUNCIÓN: Abrir modal de profesional para un item específico ← ← ←
  const handleOpenProfessionalModal = (item: ReciboItem) => {
    if (item.tipo !== 'servicio') return;
    
    if (!item.servicioId) {
      console.warn('⚠️ Item de servicio sin servicioId, cargando todos los profesionales');
    }
    
    setItemParaProfesional(item);
    setShowProfessionalModal(true);
  };

  // ← ← ← FUNCIÓN: Manejar selección de profesional + actualizar cita ← ← ←
  const handleProfesionalSelected = async (profesional: Profesional) => {
    if (!itemParaProfesional) return;
    
    const itemId = itemParaProfesional.id;
    const citaId = itemParaProfesional.citaId;
    
    try {
      // ← ← ← PASO 1: Actualizar estado local inmediatamente ← ← ←
      setItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, profesionalId: profesional.id, profesionalNombre: profesional.nombre }
          : item
      ));
      
       // ← ← ← PASO 2: Si hay propina, recalcular distribución inmediatamente ← ← ←
      if (propinaTotal > 0) {
        // El useMemo se recalculará automáticamente por la dependencia [items]
        // Pero forzamos actualización explícita para feedback inmediato
        const nuevaDistribucion = calcularDistribucionPropina;
        if (nuevaDistribucion.length > 0) {
          setPropinaDistribucion(nuevaDistribucion);
        }
      }
    
      
      // ← ← ← PASO 3: ACTUALIZAR LA CITA EN BACKEND ← ← ←
      if (citaId) {
        console.log(`🔄 [CajaReciboModal] Actualizando cita ${citaId} con profesional ${profesional.id}`);
        
        const resCita = await fetch(`${apiUrl}/citas/${citaId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            profesional: profesional.id
          })
        });
        
        if (!resCita.ok) {
          console.warn(`⚠️ Error actualizando cita ${citaId}:`, await resCita.text());
          alert(`⚠️ Se asignó el profesional al recibo, pero no se pudo actualizar la cita.`);
        }
      }
      
      // ← ← ← PASO 4: Limpiar y cerrar modal ← ← ←
      setItemParaProfesional(null);
      setShowProfessionalModal(false);
      
    } catch (err: any) {
      console.error('❌ Error asignando profesional:', err);
      alert(`❌ Error: ${err.message}`);
      
      // Revertir cambio visual si falló
      setItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, profesionalId: itemParaProfesional.profesionalId, profesionalNombre: itemParaProfesional.profesionalNombre }
          : item
      ));
    }
  };

  // ← Cargar profesionales para propinas
  useEffect(() => {
    if (isOpen && tipoRecibo === 'venta' && items.length === 0) {
      const cargarProfesionales = async () => {
        try {
          const res = await fetch(`${apiUrl}/profesionales/?activo=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setProfesionales(Array.isArray(data) ? data : (data.results || []));
          }
        } catch (err) {
          console.error('❌ Error cargando profesionales:', err);
        }
      };
      cargarProfesionales();
    }
  }, [isOpen, tipoRecibo, items.length, apiUrl, token]);

  // ← ← ← BUSCAR SERVICIOS/PRODUCTOS (debounce) ← ← ←
  useEffect(() => {
    if (!isOpen || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const endpoint = searchType === 'servicio' 
          ? `${apiUrl}/servicios/?search=${encodeURIComponent(searchTerm)}&disponible=true`
          : `${apiUrl}/productos/buscar/?search=${encodeURIComponent(searchTerm)}&disponibles=true`;
        
        const res = await fetch(endpoint, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error('❌ Error buscando:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchType, isOpen, apiUrl, token]);

  // ← ← ← AGREGAR ITEM AL RECIBO (CON CREACIÓN DE CITA PARA SERVICIOS) ← ← ←
  const agregarItem = async (itemData: Servicio | Producto, tipo: 'servicio' | 'producto') => {
    try {
      // ← ← ← SI ES SERVICIO: CREAR CITA PRIMERO ← ← ←
      if (tipo === 'servicio') {
        const servicio = itemData as Servicio;
        const precio = typeof servicio.precio_min === 'string' 
          ? parseFloat(servicio.precio_min) 
          : servicio.precio_min;

        setLoading(true);
        
        // 1. Crear cita en backend
        const resCita = await fetch(`${apiUrl}/citas/crear-para-recibo/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            servicio_id: servicio.id,
            profesional_id: undefined,
            fecha_cita: new Date().toISOString().split('T')[0],
            hora_inicio: new Date().toTimeString().slice(0, 5),
            precio_total: precio,
            cliente_nombre: clienteNombre || '',
            cliente_telefono: clienteTelefono || '',
            cliente_email: clienteEmail || '',
            notas: notas || ''
          })
        });

        if (!resCita.ok) {
          const error = await resCita.json();
          throw new Error(error.error || 'Error creando cita');
        }

        const { cita_id, codigo_reserva } = await resCita.json();
        
        // 2. Agregar item CON cita ya creada
        const nuevoItem: ReciboItem = {
          id: `servicio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'servicio',
          servicioId: servicio.id,
          citaId: cita_id,
          codigoReserva: codigo_reserva,
          descripcion: servicio.nombre,
          categoria: servicio.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          duracion: servicio.duracion,
          profesionalId: undefined,
          profesionalNombre: undefined,
          imagenUrl: servicio.imagen_url,
          productosAsociados: [],
          esNuevo: modoEdicion  // ← ← ← MARCAR COMO NUEVO SI ESTÁ EN MODO EDICIÓN
        };

        setItems(prev => [...prev, nuevoItem]);
        console.log(`✅ Servicio agregado con cita ${codigo_reserva}`);
        
      } 
      // ← ← ← SI ES PRODUCTO: AGREGAR DIRECTAMENTE ← ← ←
      else {
        const producto = itemData as Producto;
        const precio = typeof producto.precio_venta === 'string' 
          ? parseFloat(producto.precio_venta) 
          : producto.precio_venta;

        const nuevoItem: ReciboItem = {
          id: `producto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tipo: 'producto',
          productoId: producto.id,
          descripcion: producto.nombre,
          categoria: producto.categoria_nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
          imagenUrl: producto.imagen_url,
          stockActual: producto.stock_actual,
          productosAsociados: [],
          esNuevo: modoEdicion  // ← ← ← MARCAR COMO NUEVO SI ESTÁ EN MODO EDICIÓN
        };

        setItems(prev => [...prev, nuevoItem]);
      }

      setSearchTerm('');
      setSearchResults([]);

    } catch (err: any) {
      console.error('❌ Error agregando item:', err);
      alert(`⚠️ No se pudo agregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ← Actualizar cantidad de item
  const actualizarCantidad = (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * item.precioUnitario
        };
      }
      return item;
    }));
  };

  // ← Actualizar precio unitario
  const actualizarPrecio = (itemId: string, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          precioUnitario: nuevoPrecio,
          subtotal: item.cantidad * nuevoPrecio
        };
      }
      return item;
    }));
  };

  // ← ← ← FUNCIÓN REMOVER ITEM MEJORADA ← ← ←
  const removerItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    
    if (!item) return;
    
    // Si es modo edición y el item tiene cita asociada, confirmar eliminación
    if (modoEdicion && item.tipo === 'servicio' && item.citaId) {
      const confirmar = window.confirm(
        `⚠️ ¿Estás seguro de eliminar este servicio?\n\n` +
        `• Servicio: ${item.descripcion}\n` +
        `• Cita: ${item.codigoReserva || `#${item.citaId}`}\n\n` +
        `Esta acción eliminará permanentemente la cita del sistema.`
      );
      
      if (!confirmar) return;
      
      try {
        setLoading(true);
        
        // ← ← ← ELIMINAR CITA DEL BACKEND ← ← ←
        const resCita = await fetch(`${apiUrl}/citas/${item.citaId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        if (!resCita.ok && resCita.status !== 404) {
          const errorText = await resCita.text();
          console.warn('⚠️ No se pudo eliminar la cita:', errorText);
          // Continuar eliminando el item del recibo aunque falle la cita
        }
        
        // ← ← ← ELIMINAR ITEM DEL RECIBO (ReciboCajaItem) ← ← ←
        // Nota: Esto requiere endpoint para eliminar items individuales
        // Si no existe, solo eliminamos visualmente y se sincroniza al guardar
        if (item.id && !isNaN(parseInt(item.id))) {
          try {
            await fetch(`${apiUrl}/caja/recibos/${reciboId}/items/${item.id}/`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          } catch (err) {
            console.warn('⚠️ No se pudo eliminar el item del recibo en backend');
          }
        }
        
      } catch (err: any) {
        console.error('❌ Error eliminando item/cita:', err);
        alert(`⚠️ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Modo nuevo recibo o item sin cita: solo eliminar localmente
      if (!modoEdicion || !confirm('¿Eliminar este item del recibo?')) {
        if (!modoEdicion) return;
      }
    }
    
    // ← ← ← ELIMINAR DEL ESTADO LOCAL ← ← ←
    setItems(prev => prev.filter(i => i.id !== itemId));
    
    // ← ← ← ACTUALIZAR DISTRIBUCIÓN DE PROPINA SI APLICA ← ← ←
    if (propinaTotal > 0 && item.tipo === 'servicio' && item.profesionalId) {
      setPropinaDistribucion(calcularDistribucionPropina);
    }
    
    console.log(`✅ Item eliminado: ${item.descripcion}${item.citaId ? ` + Cita #${item.citaId}` : ''}`);
  };

   

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← NUEVAS FUNCIONES PARA PROPINA Y DISTRIBUCIÓN ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←

  const calcularDistribucionPropina = useMemo(() => {
    if (propinaTotal <= 0) return [];
    
     // ← ← ← CLAVE: Incluir TODOS los items de servicio con profesional, sin filtrar por esNuevo
      const profesionalesConServicios = Array.from(
        new Set(
          items
            .filter(item => item.tipo === 'servicio' && item.profesionalId)  // ← Sin filtro esNuevo
            .map(item => item.profesionalId)
        )
      ).map(id => profesionales.find(p => p.id === id)).filter(Boolean) as Profesional[];
      
      if (profesionalesConServicios.length === 0) return [];
    
    if (propinaMetodo === 'equitativa') {
      const montoPorPersona = propinaTotal / profesionalesConServicios.length;
      const residuo = propinaTotal - (montoPorPersona * profesionalesConServicios.length);
      
      return profesionalesConServicios.map((p, index) => ({
        profesionalId: p.id,
        nombre: p.nombre,
        monto: index === profesionalesConServicios.length - 1 
          ? Math.round(montoPorPersona + residuo) 
          : Math.round(montoPorPersona),
        porcentaje: Math.round(100 / profesionalesConServicios.length)
      }));
    }
    
    if (propinaMetodo === 'proporcional') {
      const subtotalesPorProfesional = new Map<number, number>();
      
      items
        .filter(item => item.tipo === 'servicio' && item.profesionalId)
        .forEach(item => {
          const current = subtotalesPorProfesional.get(item.profesionalId!) || 0;
          subtotalesPorProfesional.set(item.profesionalId!, current + item.subtotal);
        });
      
      const totalServicios = Array.from(subtotalesPorProfesional.values()).reduce((a, b) => a + b, 0);
      
      if (totalServicios === 0) return [];
      
      let montoRestante = propinaTotal;
      
      return Array.from(subtotalesPorProfesional.entries()).map(([profId, subtotal], index, arr) => {
        const profesional = profesionales.find(p => p.id === profId);
        const porcentaje = (subtotal / totalServicios) * 100;
        const monto = index === arr.length - 1 
          ? Math.round(montoRestante)
          : Math.round((porcentaje / 100) * propinaTotal);
        
        montoRestante -= monto;
        
        return {
          profesionalId: profId,
          nombre: profesional?.nombre || 'Desconocido',
          monto,
          porcentaje: Math.round(porcentaje)
        };
      });
    }
    
    if (propinaDistribucion.length > 0) return propinaDistribucion;
    
    return profesionalesConServicios.map(p => ({
      profesionalId: p.id,
      nombre: p.nombre,
      monto: 0,
      porcentaje: 0
    }));
  }, [propinaTotal, propinaMetodo, items, profesionales, propinaDistribucion]);

  const validarServiciosConProfesional = (): { valido: boolean; serviciosSinProfesional: ReciboItem[] } => {
    const serviciosSinProfesional = items.filter(
      item => item.tipo === 'servicio' && !item.profesionalId
    );
    
    return {
      valido: serviciosSinProfesional.length === 0,
      serviciosSinProfesional
    };
  };

  const mostrarAlertaServiciosSinProfesional = (servicios: ReciboItem[]) => {
    const lista = servicios.map(s => `• ${s.descripcion} (Cita: ${s.codigoReserva || 'N/A'})`).join('\n');
    
    alert(
      `⚠️ No se puede publicar el recibo.\n\n` +
      `Hay ${servicios.length} servicio(s) sin profesional asignado:\n${lista}\n\n` +
      `Por favor asigna un profesional a cada servicio antes de publicar.`
    );
  };

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← NUEVO ESTADO: Para rastrear items quitados en modo edición ← ← ←
const [itemsQuitados, setItemsQuitados] = useState<string[]>([]);

// ← ← ← FUNCIÓN: Quitar item del recibo SIN eliminar cita del sistema ← ← ←
const quitarItemDelRecibo = (itemId: string) => {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  
  if (!confirm(`¿Quitar "${item.descripcion}" del recibo?\n\nLa cita permanecerá en el sistema.`)) {
    return;
  }
  
  // ← ← ← Registrar item quitado si es modo edición ← ← ←
  if (modoEdicion) {
    setItemsQuitados(prev => [...prev, itemId]);
  }
  
  setItems(prev => prev.filter(i => i.id !== itemId));
  
  if (propinaTotal > 0 && item.tipo === 'servicio' && item.profesionalId) {
    const nuevaDistribucion = calcularDistribucionPropina;
    if (nuevaDistribucion.length > 0) {
      setPropinaDistribucion(nuevaDistribucion);
    }
  }
  
  console.log(`✅ Item quitado: ${item.descripcion}`);
};


  const handleActualizarRecibo = async () => {
      if (!reciboId) return;

      // ← ← ← VALIDACIÓN DE PROFESIONALES ← ← ←
      const validacion = validarServiciosConProfesional();
      if (!validacion.valido) {
        mostrarAlertaServiciosSinProfesional(validacion.serviciosSinProfesional);
        return;
      }
      
      setLoading(true);
      
      try {
        // ← ← ← CLAVE: Usar calcularDistribucionPropina (useMemo) directamente ← ← ←
        const distribucionActual = calcularDistribucionPropina;
        
        // ← ← ← VALIDAR session_caja PARA ACTUALIZACIÓN ← ← ←
        // En modo edición, session_caja puede ser null si el recibo ya existe
        // pero si se está publicando, debe tener sesión
        if (estadoRecibo === 'publicado' && !sessionCajaId) {
          alert('⚠️ No hay sesión de caja activa. Por favor abre una sesión primero.');
          setLoading(false);
          return;
        }
        
        const payload: any = {
          tipo: tipoRecibo,
          estado: 'publicado',
          subtotal: subtotal,
          descuento: descuento,
          total: total,
          propina_total: propinaTotal,
          propina_metodo_distribucion: propinaTotal > 0 ? propinaMetodo : null,
          metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
          // ← ← ← session_caja: puede ser undefined si no hay sesión activa (TypeScript lo acepta)
          session_caja: sessionCajaId,
          cliente_nombre: tipoRecibo === 'venta' ? clienteNombre : null,
          cliente_telefono: tipoRecibo === 'venta' ? clienteTelefono : null,
          cliente_email: tipoRecibo === 'venta' ? clienteEmail : null,
          notas: notas || '',
          
          // ← ← ← items_data: lista de items a mantener/actualizar ← ← ←
          items_data: items.map(item => {
            // ← ← ← VALIDACIÓN MEJORADA: Solo incluir id si es numérico válido ← ← ←
            const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
            
            return {
              // Solo incluir id si es válido (para items nuevos, no se incluye)
              ...(itemIdNum && { id: itemIdNum }),
              tipo_item: item.tipo,
              ...(item.servicioId && { 
                cita: item.citaId, 
                profesional: item.profesionalId
              }),
              ...(item.productoId && { producto: item.productoId }),
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precio_unitario: item.precioUnitario,
              subtotal: item.subtotal,
              propina_item: distribucionActual.find(d => d.profesionalId === item.profesionalId)?.monto || 0
            };
          }),
          
          // ← ← ← items_a_eliminar: lista de IDs a eliminar (SEPARADO) ← ← ←
          ...(modoEdicion && itemsQuitados.length > 0 && {
            items_a_eliminar: itemsQuitados
              .map(id => {
                const numId = Number(id);
                return !isNaN(numId) ? numId : null;
              })
              .filter((id): id is number => id !== null)
          })
        };

        console.log('📦 [CajaReciboModal] Actualizando recibo:', payload);

        const res = await fetch(`${apiUrl}/caja/recibos/${reciboId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error del servidor:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
          throw new Error(errorData.detail || JSON.stringify(errorData));
        }

        const reciboActualizado = await res.json();
        console.log('✅ Recibo actualizado:', reciboActualizado);

        // ← ← ← DISTRIBUIR PROPINA: USAR useMemo DIRECTAMENTE ← ← ←
        if (propinaTotal > 0 && distribucionActual.length > 0) {
          const payloadPropina = {
            monto_propina: propinaTotal,
            metodo: propinaMetodo,
            distribucion: distribucionActual.map(d => ({
              profesional: d.profesionalId,
              monto: d.monto,
              porcentaje: d.porcentaje
            }))
          };
          
          console.log('💰 [CajaReciboModal] Payload para distribuir-propina:', payloadPropina);
          
          const resDist = await fetch(`${apiUrl}/caja/recibos/${reciboId}/distribuir_propina/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payloadPropina)
          });
          
          const responseText = await resDist.text();
          console.log(`📡 Respuesta distribuir-propina [${resDist.status}]:`, responseText);
          
          if (!resDist.ok) {
            console.error('❌ Error distribuyendo propina:', responseText);
            try {
              const errorData = JSON.parse(responseText);
              alert(`⚠️ Error: ${errorData.detail || JSON.stringify(errorData)}`);
            } catch {
              alert(`⚠️ Error: ${responseText.substring(0, 200)}`);
            }
          } else {
            try {
              const distResult = JSON.parse(responseText);
              console.log('✅ Propina distribuida:', distResult);
              alert(`✅ Propina de ${formatMoney(propinaTotal)} distribuida a ${distribucionActual.length} profesional(es)`);
            } catch {
              console.log('✅ Propina distribuida (respuesta no JSON)');
            }
          }
        }
          
        alert(`✅ Recibo ${reciboActualizado.codigo_recibo} publicado exitosamente`);
        
        onReciboActualizado?.(reciboActualizado);
        handleClose();
        
      } catch (err: any) {
        console.error('❌ Error actualizando recibo:', err);
        alert(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

  const handleGuardar = async () => {
    if (items.length === 0 && tipoRecibo !== 'entrada') {
      alert('⚠️ Agrega al menos un item al recibo');
      return;
    }

    // ← ← ← VALIDAR session_caja PARA NUEVOS RECIBOS ← ← ←
    // Para creación de nuevos recibos, session_caja es requerido
    if (!sessionCajaId) {
      alert('⚠️ No hay sesión de caja activa. Por favor abre una sesión primero.');
      return;
    }

    if (estadoRecibo === 'publicado') {
      const validacion = validarServiciosConProfesional();
      if (!validacion.valido) {
        mostrarAlertaServiciosSinProfesional(validacion.serviciosSinProfesional);
        return;
      }
    }

    setLoading(true);
    
    try {
      const payload: any = {
        tipo: tipoRecibo,
        estado: estadoRecibo,
        subtotal: subtotal,
        descuento: descuento,
        total: total,
        propina_total: propinaTotal,
        propina_metodo_distribucion: propinaTotal > 0 ? propinaMetodo : null,
        metodo_pago: tipoRecibo === 'venta' ? metodoPago : null,
        // ← ← ← session_caja: requerido para creación, TypeScript acepta el valor
        session_caja: sessionCajaId,
        cliente_nombre: tipoRecibo === 'venta' ? clienteNombre : null,
        cliente_telefono: tipoRecibo === 'venta' ? clienteTelefono : null,
        cliente_email: tipoRecibo === 'venta' ? clienteEmail : null,
        notas: notas || '',
        items_data: items.map(item => {
          // ← ← ← VALIDACIÓN MEJORADA DE ID ← ← ←
          const itemIdNum = item.id && !isNaN(Number(item.id)) ? Number(item.id) : null;
          
          return {
            // Solo incluir id si es válido
            ...(itemIdNum && { id: itemIdNum }),
            tipo_item: item.tipo,
            ...(item.servicioId && { cita: item.citaId, profesional: item.profesionalId }),
            ...(item.productoId && { producto: item.productoId }),
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            subtotal: item.subtotal,
            propina_item: propinaDistribucion.find(d => d.profesionalId === item.profesionalId)?.monto || 0
          };
        })
      };

      const res = await fetch(`${apiUrl}/caja/recibos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || JSON.stringify(error));
      }

      const reciboCreado = await res.json();

      if (propinaTotal > 0) {
        const distribucionActual = calcularDistribucionPropina;  // ← Usar useMemo
        
        if (distribucionActual.length > 0) {
          await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/distribuir_propina/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              monto_propina: propinaTotal,
              metodo: propinaMetodo,
              distribucion: distribucionActual.map(d => ({
                profesional: d.profesionalId,
                monto: d.monto,
                porcentaje: d.porcentaje
              }))
            })
          });
        }
      }

      if (estadoRecibo === 'publicado') {
        await fetch(`${apiUrl}/caja/recibos/${reciboCreado.id}/publicar/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
      }

      alert(`✅ Recibo ${reciboCreado.codigo_recibo} ${estadoRecibo === 'publicado' ? 'publicado' : 'guardado como borrador'}`);
      
      onReciboCreado?.(reciboCreado);
      handleClose();
      
    } catch (err: any) {
      console.error('❌ Error guardando recibo:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setItems([]);
    setDescuento(0);
    setPropinaTotal(0);
    setPropinaEditable('0');
    setPropinaDistribucion([]);
    setClienteNombre('');
    setNotas('');
    setSearchTerm('');
    setModoEdicion(false);
    setReciboEditando(null);
    setReciboId(null);
    setTipoRecibo('venta');
    setMetodoPago('efectivo');
    setEstadoRecibo('borrador');
    setPropinaMetodo('proporcional');
    setShowProfessionalModal(false);
    setItemParaProfesional(null);
    setItemsQuitados([]);  // ← ← ← NUEVO
    onClose();
  };

  if (!isOpen) return null;

  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  // ← ← ← RENDERIZADO DE ITEMS MEJORADO ← ← ←
  // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
  const renderizarItemCompacto = (item: ReciboItem) => {
  const tieneProfesional = item.tipo === 'servicio' && item.profesionalId;
  const tieneCita = item.tipo === 'servicio' && item.citaId;
  
  return (
    <div 
      key={item.id} 
      className={`bg-gray-800 rounded-lg p-2 border transition-colors ${
        item.tipo === 'servicio' 
          ? (tieneProfesional ? 'border-gray-700 cursor-pointer hover:border-blue-500' : 'border-red-500/50 cursor-pointer hover:border-red-500')
          : 'border-gray-700'
      }`}
      onClick={() => item.tipo === 'servicio' && handleOpenProfessionalModal(item)}
    >
      {/* ← ← ← FILA ÚNICA CON TODA LA INFORMACIÓN ← ← ← */}
      <div className="flex items-center justify-between gap-2 text-xs">
        
        {/* Código de Reserva */}
        {item.tipo === 'servicio' && item.codigoReserva && (
          <span className="font-mono text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded" title={`Cita: ${item.codigoReserva}`}>
            {item.codigoReserva}
          </span>
        )}
        
        {item.tipo === 'servicio' && !item.codigoReserva && item.citaId && (
          <span className="font-mono text-[10px] text-gray-500 bg-gray-900/30 px-1.5 py-0.5 rounded" title="Cita sin código disponible">
            Cita #{item.citaId}
          </span>
        )}
        
        {/* ← ← ← ETIQUETA "NUEVO" PARA ITEMS AGREGADOS EN EDICIÓN ← ← ← */}
        {item.esNuevo && (
          <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
            ✨ Nuevo
          </span>
        )}
        
        {/* Descripción del item */}
        <span className="font-medium text-white truncate flex-1" title={item.descripcion}>
          {item.descripcion}
        </span>
        
        {/* Profesional con indicador visual (solo servicios) */}
        {item.tipo === 'servicio' && (
          <span 
            className={`text-[10px] truncate max-w-24 flex items-center gap-1 ${
              item.profesionalNombre ? 'text-blue-400' : 'text-red-400'
            }`}
            title={item.profesionalNombre || 'Click para asignar profesional'}
          >
            {item.profesionalNombre ? '👨' : '⚠️'} 
            <span className="truncate">{item.profesionalNombre || 'Asignar'}</span>
          </span>
        )}
        
        {/* Cantidad × Precio = Subtotal */}
        <div className="flex items-center gap-1 text-right shrink-0">
          <span className="text-gray-400">{item.cantidad}×{formatMoney(item.precioUnitario)}</span>
          <span className="text-gray-500">=</span>
          <span className="font-semibold text-green-400">{formatMoney(item.subtotal)}</span>
        </div>
        
        {/* ← ← ← BOTÓN ELIMINAR (PARA SERVICIOS Y PRODUCTOS) ← ← ← 
        <button
          onClick={(e) => {
            e.stopPropagation();  // ← Evitar que se abra el modal de profesional
            if (tieneCita) {
              // Confirmar si tiene cita asociada
              if (window.confirm('⚠️ Este servicio tiene una cita asociada. ¿Estás seguro de eliminarlo? La cita también será eliminada.')) {
                removerItem(item.id);
              }
            } else {
              removerItem(item.id);
            }
          }}
          className="text-red-400 hover:text-red-300 p-1 shrink-0 transition-colors"
          title={tieneCita ? "Eliminar item y cita asociada" : "Remover item"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>*/}
      

      {/* ← ← ← BOTONES DE ACCIÓN: Quitar (X) y Eliminar (🗑️) ← ← ← */}
      <div className="flex items-center gap-1 shrink-0">
        
        {/* ← ← ← BOTÓN X ROJA: Quitar del recibo SIN borrar cita ← ← ← */}
        <button
          onClick={(e) => {
            e.stopPropagation();  // Evitar que se abra el modal de profesional
            quitarItemDelRecibo(item.id);
          }}
          className="text-red-500 hover:text-red-300 p-1 transition-colors"
          title="Quitar del recibo (la cita se mantiene en el sistema)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* ← ← ← BOTÓN BASURA: Eliminar item Y cita del sistema ← ← ← */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (tieneCita) {
              if (window.confirm('⚠️ ¿Eliminar este servicio Y su cita del sistema? Esta acción es irreversible.')) {
                removerItem(item.id);
              }
            } else {
              removerItem(item.id);
            }
          }}
          className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
          title={tieneCita ? "Eliminar item y cita del sistema" : "Remover item"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
      </div>
</div>

      
      {/* Segunda fila: Info adicional */}
      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
        {item.tipo === 'servicio' && !item.citaId && (
          <span className="text-yellow-400">⚠️ Sin cita</span>
        )}
        {item.tipo === 'servicio' && item.citaId && !item.codigoReserva && (
          <span className="text-gray-400">Cargando código...</span>
        )}
        {item.tipo === 'producto' && (
          <span>📦 Producto</span>
        )}
        {/* ← ← ← INDICADOR VISUAL SI TIENE CITA ← ← ← */}
        {tieneCita && (
          <span className="text-[10px] text-orange-400 bg-orange-900/30 px-1 rounded flex items-center gap-1">
            📅 Cita vinculada
          </span>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl my-8 max-h-[95vh] flex flex-col">
        
        {/* ← Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              📝 {modoEdicion ? `Editar Recibo ${reciboEditando?.codigo_recibo}` : (estadoRecibo === 'borrador' ? 'Nuevo Recibo (Borrador)' : 'Nuevo Recibo')}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              Tipo: {tipoRecibo === 'entrada' ? '💰 Entrada' : tipoRecibo === 'salida' ? '💸 Salida' : '🛒 Venta'}
              {modoEdicion && <span className="ml-2 text-yellow-300">• Modo Edición</span>}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← Body con scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ← Columna Izquierda: Configuración y Búsqueda */}
            <div className="lg:col-span-1 space-y-5">
              
              {/* Tipo de Recibo */}
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  📋 Tipo de Recibo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entrada', 'salida', 'venta'] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => !modoEdicion && setTipoRecibo(tipo)}
                      disabled={modoEdicion}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        tipoRecibo === tipo
                          ? tipo === 'entrada' ? 'bg-green-600 text-white'
                          : tipo === 'salida' ? 'bg-orange-600 text-white'
                          : 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {tipo === 'entrada' ? '💰' : tipo === 'salida' ? '💸' : '🛒'}
                    </button>
                  ))}
                </div>
              </div>

               {/* ← ← ← DATOS DEL CLIENTE: GRID COMPACTO EN UNA FILA ← ← ← */}
              {tipoRecibo === 'venta' && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    👤 Datos del Cliente
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="👤 Nombre"
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      placeholder="📱 Teléfono"
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="✉️ Email"
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Búsqueda de Items - ← ← ← AHORA SIEMPRE DISPONIBLE ← ← ← */}
              {tipoRecibo !== 'entrada' && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    🔍 Agregar Items {modoEdicion && <span className="text-green-400">(✨ Nuevos)</span>}
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSearchType('servicio')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'servicio'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Servicios
                    </button>
                    <button
                      onClick={() => setSearchType('producto')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                        searchType === 'producto'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Productos
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Buscar ${searchType === 'servicio' ? 'servicios' : 'productos'}...`}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    {loadingSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>



                  <div className="mt-3">
                    <button
                      onClick={() => setShowCitasModal(true)}
                      className="w-full px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700 rounded-lg text-blue-300 hover:text-blue-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      📅 Agregar Cita Existente
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto border border-gray-700 rounded-lg">
                      {searchResults.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => agregarItem(item, searchType)}
                          className="w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                        >
                          <p className="font-medium text-white text-sm">{item.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {item.categoria_nombre || item.marca} • {formatMoney(
                              typeof item.precio_min === 'string' ? parseFloat(item.precio_min) : 
                              typeof item.precio_venta === 'string' ? parseFloat(item.precio_venta) : 
                              (item.precio_min || item.precio_venta || 0)
                            )}
                          </p>
                          {item.stock_actual !== undefined && (
                            <p className={`text-xs ${item.stock_actual > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Stock: {item.stock_actual}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

             

              {/* Método de Pago */}
              {tipoRecibo === 'venta' && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-3">
                    💳 Método de Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="bold">Bold</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="tarjeta">Tarjeta</option>
                    
                  </select>
                </div>
              )}
            </div>

            {/* ← Columna Central: Items del Recibo */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-xl border border-gray-700">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    📦 Items del Recibo ({items.length})
                  </h3>
                  {/* ← ← ← PROPINA: UNIFICADA Y CLICKEABLE ← ← ← 
                  {tipoRecibo === 'venta' && items.length > 0 && (
                    <button
                      onClick={() => {
                        setPropinaEditable(String(propinaTotal));
                        setShowPropinaModal(true);
                      }}
                      className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1"
                      title="Click para editar propina"
                    >
                      💎 Propina: {propinaMetodo} - {formatMoney(propinaTotal)}
                    </button>
                  )}*/}
                </div>

                <div className="p-4 max-h-80 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      {modoEdicion 
                        ? 'Este recibo no tiene items asignados' 
                        : tipoRecibo === 'entrada' 
                          ? 'Los recibos de entrada no requieren items' 
                          : 'Busca y agrega servicios o productos arriba'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => renderizarItemCompacto(item))}
                    </div>
                  )}
                </div>

                {/* Totales */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">{formatMoney(subtotal)}</span>
                    </div>
                    
                    {descuento > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Descuento:</span>
                        <span className="text-orange-400">-{formatMoney(descuento)}</span>
                      </div>
                    )}
                    
                    {/* ← ← ← PROPINA: FORMATO UNIFICADO ← ← ← */}
                    {propinaTotal > 0 && (
                      <div className="flex justify-between">
                        <button
                          onClick={() => {
                            setPropinaEditable(String(propinaTotal));
                            setShowPropinaModal(true);
                          }}
                          className="text-left text-purple-400 hover:text-purple-300 cursor-pointer"
                          title="Click para editar propina"
                        >
                          💎 Propina: {propinaMetodo} 
                        </button>
                        <button
                          onClick={() => {
                            setPropinaEditable(String(propinaTotal));
                            setShowPropinaModal(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 cursor-pointer"
                          title="Click para editar propina"
                        >
                          {formatMoney(propinaTotal)} 
                        </button>
                        
                      </div>
                    )}
                    
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-gray-300">TOTAL:</span>
                        <span className="text-green-400">{formatMoney(total)}</span>
                      </div>
                      {/* ← ← ← MÉTODO DE PAGO DEBAJO DEL TOTAL ← ← ← */}
                      {tipoRecibo === 'venta' && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Método:</span>
                          <span className="text-gray-300 capitalize">{metodoPago}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inputs de Descuento y Propina */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Descuento ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={descuento}
                        onChange={(e) => !modoEdicion && setDescuento(parseFloat(e.target.value) || 0)}
                        disabled={modoEdicion}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                        placeholder="0"
                      />
                    </div>
                    {tipoRecibo === 'venta' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">💎 Propina ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={propinaEditable}
                          onChange={(e) => {
                            setPropinaEditable(e.target.value);
                            const valor = parseFloat(e.target.value) || 0;
                            setPropinaTotal(valor);
                            if (propinaDistribucion.length > 0) {
                              setPropinaDistribucion(calcularDistribucionPropina);
                            }
                          }}
                          disabled={modoEdicion}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm disabled:opacity-50"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                </div>

              </div>
               
               {/* Notas */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    📝 Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-9 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Notas adicionales para este recibo..."
                  />
                </div>

              </div>
            </div>
          </div>

         

        {/* ← Footer con acciones */}
          <div className="sticky bottom-0 bg-gray-900 px-6 py-4 border-t border-gray-700 rounded-b-2xl flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            
            {estadoRecibo === 'borrador' && !modoEdicion && (
              <button
                onClick={() => {
                  setEstadoRecibo('borrador');
                  handleGuardar();
                }}
                disabled={loading}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Guardando...' : '💾 Guardar Borrador'}
              </button>
            )}
            
            <button
              onClick={() => {
                if (modoEdicion) {
                  setEstadoRecibo('publicado');
                  handleActualizarRecibo();
                } else {
                  setEstadoRecibo('publicado');
                  handleGuardar();
                }
              }}
              disabled={loading || (items.length === 0 && tipoRecibo !== 'entrada')}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Procesando...
                </span>
              ) : modoEdicion ? (
                '✅ Actualizar y Publicar'
              ) : estadoRecibo === 'borrador' ? (
                '✅ Publicar Recibo'
              ) : (
                '✅ Guardar y Publicar'
              )}
            </button>
          </div>
      </div>

      {/* ← ← ← MODAL DE PROPINA ← ← ← */}
      {showPropinaModal && tipoRecibo === 'venta' && (
        <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">💎 Distribuir Propina</h3>
              <p className="text-sm text-gray-400 mt-1">
                Total propina: {formatMoney(propinaTotal)}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Monto de propina ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={propinaEditable}
                  onChange={(e) => {
                    setPropinaEditable(e.target.value);
                    const valor = parseFloat(e.target.value) || 0;
                    setPropinaTotal(valor);
                  }}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-lg font-bold focus:border-purple-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Método de distribución
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'equitativa', label: '⚖️ Equitativa (igual para todos)', desc: 'Divide el monto igualmente entre profesionales' },
                    { value: 'proporcional', label: '📊 Proporcional (según servicio)', desc: 'Distribuye según el valor de cada servicio' },
                    { value: 'manual', label: '✏️ Manual (asignar montos)', desc: 'Ingresa el monto para cada profesional' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-700 transition-colors">
                      <input
                        type="radio"
                        name="propinaMetodo"
                        value={option.value}
                        checked={propinaMetodo === option.value}
                        onChange={(e) => {
                          setPropinaMetodo(e.target.value as any);
                          setPropinaDistribucion(calcularDistribucionPropina);
                        }}
                        className="text-purple-600 mt-1"
                      />
                      <div>
                        <span className="text-sm text-gray-300 font-medium">{option.label}</span>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-300 mb-3">
                  {propinaMetodo === 'manual' ? 'Asignar montos:' : 'Vista previa:'}
                </p>
                
                {calcularDistribucionPropina.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay profesionales con servicios para distribuir propina
                  </p>
                ) : (
                  <div className="space-y-2">
                    {calcularDistribucionPropina.map((dist, index) => (
                      <div key={dist.profesionalId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{dist.nombre}</span>
                        
                        {propinaMetodo === 'manual' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              min="0"
                              value={dist.monto}
                              onChange={(e) => {
                                const nuevoMonto = parseFloat(e.target.value) || 0;
                                const nuevaDistribucion = [...propinaDistribucion];
                                const idx = nuevaDistribucion.findIndex(d => d.profesionalId === dist.profesionalId);
                                if (idx !== -1) {
                                  nuevaDistribucion[idx] = { ...nuevaDistribucion[idx], monto: nuevoMonto };
                                  const totalAsignado = nuevaDistribucion.reduce((s, d) => s + d.monto, 0);
                                  nuevaDistribucion.forEach(d => {
                                    d.porcentaje = totalAsignado > 0 ? Math.round((d.monto / totalAsignado) * 100) : 0;
                                  });
                                  setPropinaDistribucion(nuevaDistribucion);
                                }
                              }}
                              className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-right"
                            />
                            <span className="text-xs text-gray-500 w-8 text-right">
                              ({dist.porcentaje}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-purple-400 font-medium">
                            {formatMoney(dist.monto)} ({dist.porcentaje}%)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {propinaMetodo === 'manual' && propinaDistribucion.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                    <span>Total asignado:</span>
                    <span className={
                      Math.abs(propinaDistribucion.reduce((s, d) => s + d.monto, 0) - propinaTotal) <= 0.01
                        ? 'text-green-400' 
                        : 'text-orange-400'
                    }>
                      {formatMoney(propinaDistribucion.reduce((s, d) => s + d.monto, 0))} 
                      {Math.abs(propinaDistribucion.reduce((s, d) => s + d.monto, 0) - propinaTotal) > 0.01 && 
                        ` (Faltan ${formatMoney(propinaTotal - propinaDistribucion.reduce((s, d) => s + d.monto, 0))})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowPropinaModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (propinaMetodo === 'manual') {
                    const totalAsignado = propinaDistribucion.reduce((s, d) => s + d.monto, 0);
                    if (Math.abs(totalAsignado - propinaTotal) > 0.01) {
                      alert(`⚠️ La suma de los montos (${formatMoney(totalAsignado)}) no coincide con el total de propina (${formatMoney(propinaTotal)}). Ajusta los valores antes de confirmar.`);
                      return;
                    }
                  }
                  setPropinaDistribucion(calcularDistribucionPropina);
                  setShowPropinaModal(false);
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCitasModal && (
        <CitasPendientesModal
          isOpen={showCitasModal}
          onClose={() => setShowCitasModal(false)}
          onSelect={handleCitaSeleccionada}
          apiUrl={apiUrl}
          token={token}
        />
      )}

      {/* ← ← ← MODAL DE PROFESIONAL ← ← ← NUEVO ← ← ← */}
      {showProfessionalModal && itemParaProfesional && (
        <ProfessionalModal
          isOpen={showProfessionalModal}
          onClose={() => {
            setShowProfessionalModal(false);
            setItemParaProfesional(null);
          }}
          onSelect={handleProfesionalSelected}
          servicioId={itemParaProfesional.tipo === 'servicio' ? (itemParaProfesional.servicioId || undefined) : undefined}
          profesionalSeleccionadoId={itemParaProfesional.profesionalId || undefined}
        />
      )}
    </div>
  );
}