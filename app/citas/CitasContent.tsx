'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ServiceSelector from '@/components/booking/ServiceSelector';
import DateTimePicker from '@/components/booking/DateTimePicker';
import ClientInfoForm from '@/components/booking/ClientInfoForm';
import BookingSuccess from '@/components/booking/BookingSuccess';
import ProfessionalSelector from '@/components/booking/ProfessionalSelector';
import PaymentMethodSelector, { PaymentMethod } from '@/components/booking/PaymentMethodSelector';
import UploadReceipt from '@/components/booking/UploadReceipt';
import BankAccountsModal from '@/components/booking/BankAccountsModal';
import ValoracionModal from '@/components/reservas/ValoracionModal';
import { RespuestaValoracion } from '@/types/valoracion';

// ==========================================
// TYPES
// ==========================================
interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio?: string;
  requiere_valoracion?: boolean;
}

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  telefono_whatsapp?: string;
}

interface Configuracion {
  id: number;
  bold_payment_link: string | null;
  bold_payment_activo: boolean;
  whatsapp: string;
}

// ← NUEVO: Tipo para cada item en la reserva múltiple
interface ItemReserva {
  id: string; // ID único temporal para la UI
  servicio: Servicio;
  profesional: Profesional | null;
  fecha: Date | null;
  hora: string | null;
  precio: number;
  respuestasValoracion?: RespuestaValoracion[];
}

type BookingStep = 1 | 2 | 3 | 3.5 | 4 | 5 | 6 | 'success';

export default function CitasContent() {
  const { user, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [mode, setMode] = useState<'salon' | 'domicilio'>('salon');
  const [itemsReserva, setItemsReserva] = useState<ItemReserva[]>([]); 
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // ← NUEVO: Estado para el servicio que se está configurando actualmente
  const [itemActual, setItemActual] = useState<Partial<ItemReserva>>({
    precio: 0
  });

  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [showUploadReceipt, setShowUploadReceipt] = useState(false);
  const [cuentasBancarias, setCuentasBancarias] = useState<any[]>([]);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);
  const [ultimoPagoId, setUltimoPagoId] = useState<number | null>(null);
  
  const [editingCitaId, setEditingCitaId] = useState<string | null>(null);
  
  const [clientData, setClientData] = useState(() => {
    const savedPhone = typeof window !== 'undefined' ? localStorage.getItem('dz_last_phone') : null;
    return {
      cliente_nombre: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
      cliente_telefono: savedPhone || user?.username || '',
      cliente_email: user?.email || '',
      notas_cliente: '',
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citaCreada, setCitaCreada] = useState<{ id: number; codigo_reserva: string } | null>(null);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [pagoPendiente, setPagoPendiente] = useState(false);
  
  const [montoPago, setMontoPago] = useState<number | null>(null);
  const [esPrimerPago, setEsPrimerPago] = useState<boolean | null>(null);
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [verificandoPagos, setVerificandoPagos] = useState(false);
  const [montoValidado, setMontoValidado] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);

  // ← ← ← VALORACIÓN: Estados para el modal de valoración ← ← ←
  const [modalValoracionOpen, setModalValoracionOpen] = useState(false);
  const [respuestasValoracion, setRespuestasValoracion] = useState<RespuestaValoracion[]>([]);
  const [precioCalculadoValoracion, setPrecioCalculadoValoracion] = useState<number | null>(null);

  // ← FUNCIÓN AUXILIAR: Formatear fecha en zona horaria local (Colombia)
  // ← ← ← FUNCIÓN CORREGIDA: Formatear fecha SIN desfase de zona horaria
  const formatDateLocal = (date: Date | null): string => {
    if (!date) return '';
    // ← ← ← CLAVE: Usar métodos getFullYear/getMonth/getDate que usan zona LOCAL
    // Esto evita el desfase UTC que causa el problema del día siguiente
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes es 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ← NUEVA FUNCIÓN: Parsear fecha desde string a Date en zona local
  const parseDateLocal = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    // ← Crear Date en zona horaria local (mes es 0-indexed)
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Calcular precio total de TODOS los servicios en el carrito
  const calcularPrecioTotal = () => {
    return itemsReserva.reduce((total, item) => total + item.precio, 0);
  };

    // ← ← ← EFECTO PARA PROCESAR PARÁMETROS DE SERVICIO PREDEFINIDO ← ← ←
  useEffect(() => {
    const servicioId = searchParams.get('servicio');
    const servicioNombre = searchParams.get('nombre');
    const servicioPrecio = searchParams.get('precio');
    const servicioDuracion = searchParams.get('duracion');
    const requiereValoracion = searchParams.get('valoracion') === 'true';
    
    if (servicioId && currentStep === 1) {
      console.log('🎯 Servicio predefinido detectado:', servicioNombre);
      
      // ← ← ← CORRECCIÓN: Crear el objeto directamente desde los params ← ← ←
      const servicioPredefinido: Servicio = {
        id: parseInt(servicioId),
        nombre: servicioNombre || 'Servicio',
        slug: '',
        precio_min: servicioPrecio || '0',
        precio_max: null,
        duracion: servicioDuracion || '60',
        categoria: 0,
        categoria_nombre: '',
        imagen: null,
        imagen_url: null,
        disponible_salon: true,
        disponible_domicilio: false,
        adicional_domicilio: '0',
        requiere_valoracion: requiereValoracion
      };

      // Configurar itemActual con el servicio
      setItemActual(prev => ({
        ...prev,
        servicio: servicioPredefinido,
        precio: parseInt(servicioPredefinido.precio_min) || 0
      }));

      // Si requiere valoración, abrir modal inmediatamente
      if (requiereValoracion) {
        console.log('⚠️ Activando modal de valoración...');
        setModalValoracionOpen(true);
        setRespuestasValoracion([]);
        setPrecioCalculadoValoracion(null);
      } else {
        // Si NO requiere valoración, avanzar directamente al paso 2
        setCurrentStep(2);
      }

      // Limpiar URL para evitar re-ejecuciones al recargar
      router.replace('/citas', { scroll: false });
    }
  }, [searchParams, currentStep]); 

  // Cargar configuración de Bold
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await api.getConfiguracion().catch(() => null);
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
        // Cargar cuentas bancarias
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
        const res = await fetch(`${apiUrl}/cuentas-bancarias/`);
        if (res.ok) {
          const data = await res.json();
          const cuentas = data.results || (Array.isArray(data) ? data : []);
          setCuentasBancarias(cuentas.filter((c: any) => c.activo === true));
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    }
    loadConfig();
  }, []);

    // ← ← ← VALORACIÓN: Callback cuando el cliente completa la valoración ← ← ←
  const handleValoracionCompletada = (precioCalculado: number, respuestas: RespuestaValoracion[]) => {
    console.log('✅ [Valoración] Completada:', { precioCalculado, respuestasCount: respuestas.length });
    
    // Actualizar el precio del item actual con el precio calculado
    setItemActual(prev => ({
      ...prev,
      precio: precioCalculado
    }));
    
    // Guardar las respuestas para enviarlas después con la cita
    setRespuestasValoracion(respuestas);
    setPrecioCalculadoValoracion(precioCalculado);
    
    // Cerrar modal y avanzar al paso 2
    setModalValoracionOpen(false);
    setCurrentStep(2);
  };

  // ← ← ← VALORACIÓN: Callback si el cliente cierra el modal sin completar ← ← ←
  const handleValoracionCancelada = () => {
    console.log('❌ [Valoración] Modal cerrado sin completar');
    setModalValoracionOpen(false);
    // Resetear el item actual (deseleccionar el servicio)
    setItemActual({ precio: 0 });
    setRespuestasValoracion([]);
    setPrecioCalculadoValoracion(null);
  };

  // ← NUEVO: Función para agregar el item actual al carrito  
  const agregarItemAReserva = () => {
    if (!itemActual.servicio || !itemActual.profesional || !itemActual.fecha || !itemActual.hora) {
      setError('Por favor completa todos los datos del servicio antes de agregarlo.');
      return;
    }

    const nuevoItem: ItemReserva = {
      id: crypto.randomUUID(),
      servicio: itemActual.servicio,
      profesional: itemActual.profesional,
      fecha: itemActual.fecha,
      hora: itemActual.hora,
      precio: itemActual.precio || 0,
      // ← ← ← VALORACIÓN: Incluir respuestas de valoración si existen ← ← ←
      respuestasValoracion: respuestasValoracion.length > 0 ? respuestasValoracion : undefined,
    };

    setItemsReserva(prev => [...prev, nuevoItem]);
    
    // ← ← ← VALORACIÓN: Resetear estados de valoración ← ← ←
    setRespuestasValoracion([]);
    setPrecioCalculadoValoracion(null);
    
    // Resetear item actual para el siguiente
    setItemActual({ precio: 0 });
    setError(null);
    
    // Mostrar opción de agregar más o continuar
    setCurrentStep(3.5 as any);
  };

  const eliminarItemDeReserva = (id: string) => {
    setItemsReserva(prev => prev.filter(item => item.id !== id));
  };

    // ← AGREGAR ESTA FUNCIÓN ANTES DE handleNext
  const canProceedToStep = (step: BookingStep): boolean => {
    switch (step) {
      case 2: return itemActual.servicio !== null && itemActual.servicio !== undefined;
      case 3: return itemActual.profesional !== null && itemActual.profesional !== undefined;
      case 4: return itemActual.fecha !== null && itemActual.hora !== null;
      case 5: return itemsReserva.length > 0 && 
              clientData.cliente_nombre.trim().length > 0 &&
              clientData.cliente_telefono.trim().length > 0;
      case 6: {
        const total = calcularPrecioTotal();
        const minimo = total * 0.5;
        if (montoPago !== null) {
          return montoPago >= minimo && montoPago <= total;
        }
        return false;
      }
      default: return true;
    }
  };

  const handleNext = () => {
    // Lógica especial para el paso 3 -> 3.5 (Agregar al carrito)
    if (currentStep === 3) {
      agregarItemAReserva();
      return;
    }

    // Lógica especial para el paso 3.5 (Decidir si agregar más)
    if (currentStep === 3.5) {
      setCurrentStep(4); // Ir a datos del cliente
      return;
    }

    const nextStep = (Number(currentStep) + 1) as BookingStep;
    const canProceed = canProceedToStep(nextStep);
    
    if (canProceed) {
      setCurrentStep(nextStep);
      setError(null);
      
      // Si avanzamos a paso 6, mostrar selector de pago
      if (nextStep === 6) {
        setShowPaymentSelector(true);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Mensajes específicos de error
      if (currentStep === 4 && nextStep === 5) {
        setError('Por favor completa todos los datos del cliente');
      } else if (currentStep === 5 && nextStep === 6) {
        const total = calcularPrecioTotal();
        const minimo = total * 0.5;
        setError(`El monto debe ser al menos $${minimo.toLocaleString()} (50% del total)`);
      } else {
        setError('Por favor completa todos los campos requeridos');
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 3.5) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 4 && itemsReserva.length > 0) {
      setCurrentStep(3.5 as any);
      return;
    }
    if (currentStep === 6) {
      setShowPaymentSelector(false);
      setSelectedPaymentMethod(null);
    }
    setCurrentStep(prev => Math.max(Number(prev) - 1, 1) as BookingStep);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClientChange = (field: string, value: string) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const calculateEndTime = (startTime: string | null, duracion: string): string => {
    if (!startTime || !duracion) return startTime || '';
    const minutes = parseInt(duracion.replace(/\D/g, '')) || 60;
    const [hours, mins] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, mins + minutes, 0, 0);
    return endDate.toTimeString().slice(0, 5);
  };

  // ==========================================
  // SUBMIT (Creación de múltiples citas)
  // ==========================================
    const handleSubmit = async (e: React.FormEvent | null) => {
    // ← CORREGIDO: Solo prevenir default si hay evento
    if (e) {
      e.preventDefault();
    }
    setError(null);
    
    console.log('🚀 [handleSubmit] INICIO');
    console.log('📦 Items a reservar:', itemsReserva.length);
    console.log('💳 Método de pago:', selectedPaymentMethod);
    console.log('💰 Monto:', montoPago);

    if (itemsReserva.length === 0) {
      console.error('❌ No hay items en la reserva');
      setError('Debes agregar al menos un servicio a tu reserva.');
      return;
    }
    if (!clientData.cliente_nombre.trim()) { 
      console.error('❌ Falta nombre del cliente');
      setError('Por favor ingresa tu nombre'); 
      return; 
    }
    if (!clientData.cliente_telefono.trim()) { 
      console.error('❌ Falta teléfono del cliente');
      setError('Por favor ingresa tu teléfono'); 
      return; 
    }
    if (!selectedPaymentMethod) { 
      console.error('❌ Falta método de pago');
      setError('Por favor selecciona un método de pago'); 
      return; 
    }
    
    // Validar monto
    const total = calcularPrecioTotal();
    const montoFinal = montoPago !== null ? montoPago : total;
    const minimo = total * 0.5;
    
    if (selectedPaymentMethod !== 'pendiente') {
      if (montoFinal < minimo) {
        console.error('❌ Monto insuficiente:', montoFinal, '<', minimo);
        setError(`El primer pago debe ser al menos el 50% ($${minimo.toLocaleString()})`);
        return;
      }
      if (montoFinal > total) {
        console.error('❌ Monto excede total:', montoFinal, '>', total);
        setError(`El monto no puede exceder el total ($${total.toLocaleString()})`);
        return;
      }
    }

    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authToken = localStorage.getItem('token');
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        try {
      const codigoGrupo = 'GRUPO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const citasCreadas: any[] = [];

      console.log('🔄 Creando', itemsReserva.length, 'citas...');

      // ← ← ← PASO 1: CREAR TODAS LAS CITAS PRIMERO ← ← ←
      for (const item of itemsReserva) {
        const citaData = {
          servicio: item.servicio.id,
          profesional: item.profesional?.id || null,
          fecha: formatDateLocal(item.fecha),
          hora_inicio: item.hora,
          hora_fin: calculateEndTime(item.hora, item.servicio.duracion),
          precio_total: item.precio,
          metodo_pago: selectedPaymentMethod,
          estado_pago: 'pendiente',
          cliente_nombre: clientData.cliente_nombre.trim(),
          cliente_telefono: clientData.cliente_telefono.trim(),
          cliente_email: clientData.cliente_email?.trim() || '',
          notas_cliente: `${clientData.notas_cliente} | Grupo: ${codigoGrupo}`,
          disponible_salon: mode === 'salon',
          disponible_domicilio: mode === 'domicilio',
        };

        console.log('📤 Enviando cita:', citaData);

        const res = await fetch(`${apiUrl}/citas/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(citaData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error creando cita:', errorText);
          throw new Error(`Error al reservar ${item.servicio.nombre}: ${errorText}`);
        }

        const resultado = await res.json();
        console.log('✅ Cita creada:', resultado.codigo_reserva, 'ID:', resultado.id);
        citasCreadas.push(resultado);  // ← ← ← AGREGAR AL ARRAY

        // ← ← ← VALORACIÓN: Enviar respuestas de valoración si existen para este item ← ← ←
        if (item.respuestasValoracion && item.respuestasValoracion.length > 0) {
          console.log('📋 [Valoración] Enviando respuestas para cita', resultado.id);
          try {
            const respuestasPayload = item.respuestasValoracion.map(r => ({
              seccion: r.seccion,
              opcion_seleccionada: r.opcion_seleccionada || null,
              respuesta_texto: r.respuesta_texto || '',
              valor_aplicado: 0  // El backend lo calculará
            }));

            const formData = new FormData();
            formData.append('cita_id', resultado.id.toString());
            formData.append('respuestas', JSON.stringify(respuestasPayload));

            // Agregar archivos de fotos si existen
            item.respuestasValoracion.forEach(r => {
              if (r.foto_subida instanceof File) {
                formData.append(`foto_${r.seccion}`, r.foto_subida);
              }
            });

            const valoracionRes = await fetch(`${apiUrl}/valoracion/guardar-respuestas/`, {
              method: 'POST',
              headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
              body: formData
            });

            if (valoracionRes.ok) {
              const valoracionData = await valoracionRes.json();
              console.log('✅ [Valoración] Respuestas guardadas:', valoracionData);
            } else {
              console.warn('⚠️ [Valoración] Error guardando respuestas (no crítico):', await valoracionRes.text());
            }
          } catch (valoracionErr) {
            console.warn('⚠️ [Valoración] Error enviando respuestas (no crítico):', valoracionErr);
            // No fallar la reserva si falla la valoración
          }
        }  
      }

      console.log('🎉 Todas las citas creadas:', citasCreadas.length);

      // ← ← ← PASO 2: CREAR PAGOS PROPORCIONALES (SOLO SI NO ES PENDIENTE) ← ← ←
      if (selectedPaymentMethod !== 'pendiente') {
        const totalReserva = calcularPrecioTotal();
        
        console.log('💰 [Distribución Proporcional]');
        console.log(`   Total reserva: $${totalReserva.toLocaleString()}`);
        console.log(`   Monto pagado por usuario: $${montoFinal.toLocaleString()}`);
        console.log(`   Cantidad de citas: ${itemsReserva.length}`);
        
        // Calcular montos proporcionales para cada cita
        let montoAcumulado = 0;
        const pagosProporcionales: { citaId: number; monto: number; porcentaje: number }[] = [];
        
        itemsReserva.forEach((item, index) => {
          const precioCita = item.precio;
          const porcentaje = precioCita / totalReserva;
          
          // Para la última cita, usar el monto restante para evitar errores de redondeo
          let montoCita: number;
          if (index === itemsReserva.length - 1) {
            montoCita = montoFinal - montoAcumulado;
          } else {
            montoCita = Math.round(montoFinal * porcentaje);
            montoAcumulado += montoCita;
          }
          
          pagosProporcionales.push({
            citaId: citasCreadas[index].id,  // ← ← ← AHORA SÍ EXISTE
            monto: montoCita,
            porcentaje: porcentaje * 100
          });
          
          console.log(`   Cita ${index + 1} (${item.servicio.nombre}):`);
          console.log(`     Precio: $${precioCita.toLocaleString()} (${(porcentaje * 100).toFixed(2)}%)`);
          console.log(`     Pago asignado: $${montoCita.toLocaleString()}`);
        });
        
        // Verificar que la suma sea correcta
        const sumaPagos = pagosProporcionales.reduce((sum, p) => sum + p.monto, 0);
        console.log(`   ✓ Suma total de pagos: $${sumaPagos.toLocaleString()}`);
        
        if (sumaPagos !== montoFinal) {
          console.warn(`⚠️ Diferencia detectada: esperado $${montoFinal}, obtenido $${sumaPagos}`);
        }
        
        // Crear los pagos con montos proporcionales
        for (const pago of pagosProporcionales) {
          const pagoData = {
            monto: pago.monto,
            metodo_pago: selectedPaymentMethod,
            estado: selectedPaymentMethod === 'transferencia' ? 'pendiente' : 'exitoso',
            origen_tipo: 'cita',
            origen_id: pago.citaId,
            referencia_externa: `RESERVA-${citasCreadas.find(c => c.id === pago.citaId)?.codigo_reserva}`,
          };
          
          console.log(`💳 Creando pago para cita ${pago.citaId}: $${pago.monto.toLocaleString()}`);
          
          const pagoRes = await fetch(`${apiUrl}/pagos/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(pagoData),
          });
          
          if (pagoRes.ok) {
            const pagoResult = await pagoRes.json();
            console.log(`✅ Pago creado ID: ${pagoResult.id}`);
            // Guardar el ID del primer pago para el comprobante
            if (!ultimoPagoId) {
              setUltimoPagoId(pagoResult.id);
            }
          } else {
            console.warn('️ Error creando pago (no crítico):', await pagoRes.text());
          }
        }
      }

      const ultimaCita = citasCreadas[citasCreadas.length - 1];
      localStorage.setItem('cita_pendiente_pago', JSON.stringify(ultimaCita));
      localStorage.setItem('dz_last_phone', clientData.cliente_telefono);
      localStorage.setItem('cita_id_pago', ultimaCita.id.toString());
      localStorage.setItem('cita_metodo_pago', selectedPaymentMethod);

      setCitaCreada({ id: ultimaCita.id, codigo_reserva: ultimaCita.codigo_reserva });

      // Manejo de métodos de pago
      if (selectedPaymentMethod === 'bold') {
        const boldUrl = configuracion?.bold_payment_activo && configuracion?.bold_payment_link 
          ? configuracion.bold_payment_link 
          : null;
          
        if (!boldUrl) {
          setError('❌ URL de pago de Bold no configurada.');
          setLoading(false);
          return;
        }
        alert(`Serás redirigido a Bold para pagar $${montoFinal.toLocaleString()}`);
        window.location.href = boldUrl;
      } else if (selectedPaymentMethod === 'transferencia') {
        console.log('📄 Mostrando modal de comprobante');
        setShowUploadReceipt(true);
      } else {
        console.log('✅ Mostrando pantalla de éxito');
        setCurrentStep('success');
        setPagoPendiente(selectedPaymentMethod === 'pendiente');
      }

    } catch (err: any) {
      console.error('❌ Error procesando reserva:', err);
      setError(err.message || 'Error al procesar tu reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setCurrentStep(1);
    setItemsReserva([]);
    setItemActual({ precio: 0 });
    setClientData({
      cliente_nombre: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
      cliente_telefono: user?.username || '',
      cliente_email: user?.email || '',
      notas_cliente: '',
    });
    setCitaCreada(null);
    setPagoPendiente(false);
    setError(null);
    setMode('salon');
    setShowPaymentSelector(false);
  };

  // ==========================================
  // RENDERIZADO DE LA BARRA INFERIOR FIJA
  // ==========================================
    const renderBottomBar = () => {
    if (currentStep === 'success') return null;
    
    // Ocultar botones en paso 6 cuando ya se seleccionó método de pago
    if (currentStep === 6 && selectedPaymentMethod) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
        {/* SECCIÓN DE CARDS DE SERVICIOS SELECCIONADOS */}
        {itemsReserva.length > 0 && (
          <div className="border-b border-gray-100 bg-gray-50">
            <div className="flex overflow-x-auto p-2 gap-2 no-scrollbar items-center">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap mr-2">
                Tu reserva ({itemsReserva.length}):
              </span>
              {itemsReserva.map((item) => (
                <div key={item.id} className="relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden shadow-md border border-gray-200 group">
                  <img
                    src={item.servicio.imagen_url || 'https://via.placeholder.com/150?text=Servicio'}
                    alt={item.servicio.nombre}
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 flex flex-col justify-end text-white">
                    <p className="font-bold text-xs leading-tight mb-0.5 line-clamp-2">{item.servicio.nombre}</p>
                    <p className="text-green-400 font-semibold text-xs mb-0.5">${item.precio.toLocaleString()}</p>
                    <div className="text-[9px] space-y-0.5 text-gray-200">
                      <p className="truncate">👤 {item.profesional?.nombre || 'Sin asignar'}</p>
                      <p className="flex items-center gap-1">
                        📅 {item.fecha ? formatDateLocal(item.fecha) : '---'} • 🕒 {item.hora || '---'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarItemDeReserva(item.id)}
                    className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm transition-colors"
                    title="Eliminar servicio"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOTONES DE NAVEGACIÓN */}
        <div className="p-3 bg-white">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs mb-2 flex items-center gap-1">
              <span>⚠️</span> {error}
            </div>
          )}
          
          <div className="flex gap-3">
            {typeof currentStep === 'number' && currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all"
              >
                ← Atrás
              </button>
            )}
            
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
              >
                {currentStep === 3 ? 'Agregar a la reserva +' : 
                 currentStep === 4 ? 'Definir pago →' :
                 'Siguiente →'}
              </button>
            ) : currentStep === 3.5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-md"
              >
                Continuar con mis datos →
              </button>
            ) : currentStep === 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!montoValidado}
                className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50"
              >
                Continuar al método de pago →
              </button>
            ) : (
              // Paso 6: Botón de confirmar
              <button
                type="button"  // ← CORREGIDO: type="button"
                onClick={async () => {
                  console.log('🔘 [Confirmar] Botón clickeado');
                  await handleSubmit(null);  // ← Pasar null en lugar de 'null as any'
                }}
                disabled={loading || verificandoPagos}
                className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {loading ? (
                  <><span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></span>Procesando...</>
                ) : (
                  <>Confirmar Reserva (${(montoPago || calcularPrecioTotal()).toLocaleString()})</>
                )}
              </button>
            )}
          </div>
          <p className="text-[9px] text-gray-400 text-center mt-1">
            {currentStep === 3 ? 'Revisa los datos y agrega este servicio a tu lista' : 
             currentStep === 5 ? '💡 Define el monto antes de seleccionar tu método de pago' :
             currentStep === 6 ? '🔒 Al confirmar, aceptas nuestros términos y condiciones' :
             'Al confirmar, aceptas nuestros términos y condiciones'}
          </p>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDERIZADO DE PASOS
  // ==========================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-2">1️⃣ Selecciona tu servicio</h2>
            <p className="text-sm text-gray-500 mb-6">Puedes agregar varios servicios a tu reserva.</p>            
            <ServiceSelector
              selectedService={itemActual.servicio?.id || null}
              onServiceSelect={(servicio: Servicio | null) => {
                if (!servicio) {
                  setItemActual({ precio: 0 });
                  return;
                }
                
                const basePrice = mode === 'domicilio' && servicio.adicional_domicilio
                  ? parseInt(servicio.precio_min) + parseInt(servicio.adicional_domicilio)
                  : parseInt(servicio.precio_min);
                
                setItemActual({ 
                  servicio, 
                  precio: basePrice,
                  profesional: null,
                  fecha: null,
                  hora: null
                });

                // ← ← ← VALORACIÓN: Verificar si requiere valoración ← ← ←
                if (servicio.requiere_valoracion) {
                  console.log('📋 [Valoración] Servicio requiere valoración:', servicio.nombre);
                  // Resetear estados de valoración previos
                  setRespuestasValoracion([]);
                  setPrecioCalculadoValoracion(null);
                  // Abrir modal de valoración
                  setModalValoracionOpen(true);
                  // NO avanzar al paso 2 todavía, el modal lo hará al completar
                } else {
                  // Flujo normal: avanzar al paso 2
                  setCurrentStep(2);
                }
              }}
              mode={mode}
              onModeChange={setMode}
            />
          </section>
        );
      case 2:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-2">2️⃣ Selecciona el profesional</h2>
            <p className="text-sm text-gray-500 mb-6">Para: <span className="font-semibold text-blue-600">{itemActual.servicio?.nombre}</span></p>
            <ProfessionalSelector
              selectedProfessional={itemActual.profesional?.id || null}
              onProfessionalSelect={(id: number) => {
                // Buscar datos completos del profesional (simplificado para el ejemplo)
                const profData = { id, nombre: 'Profesional', titulo: '', especialidad: '' }; 
                setItemActual(prev => ({ ...prev, profesional: profData as any }));
                setCurrentStep(3);
              }}
              servicioId={itemActual.servicio?.id || null}
              selectedDate={itemActual.fecha ?? null}
            />
          </section>
        );
      case 3:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-2">3️⃣ Elige fecha y hora</h2>
            <p className="text-sm text-gray-500 mb-6">
              Para: <span className="font-semibold text-blue-600">{itemActual.servicio?.nombre}</span> con {itemActual.profesional?.nombre}
            </p>
            <DateTimePicker
              selectedDate={itemActual.fecha || null}
              onDateChange={(date: Date | null) => setItemActual(prev => ({ ...prev, fecha: date }))}
              selectedTime={itemActual.hora || null}
              onTimeChange={(time: string | null) => setItemActual(prev => ({ ...prev, hora: time }))}
              servicioId={itemActual.servicio?.id || null}
              profesionalId={itemActual.profesional?.id || null}
              mode={mode}
            />
          </section>
        );
      case 3.5: // ← NUEVO PASO INTERMEDIO
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Servicio agregado!</h2>
            <p className="text-gray-600 mb-6">
              Has agregado <strong>{itemsReserva[itemsReserva.length - 1]?.servicio.nombre}</strong> a tu reserva.
            </p>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <button
                onClick={() => {
                  setCurrentStep(1);
                }}
                className="w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
              >
                + Agregar otro servicio
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                No, continuar con mis datos →
              </button>
            </div>
          </section>
        );
            case 4:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">4️⃣ Tus datos de contacto</h2>
            <ClientInfoForm
              isAuthenticated={isAuthenticated}
              userData={user}
              formData={clientData}
              onFormChange={handleClientChange}
            />
            {/* Resumen rápido del total */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total de servicios ({itemsReserva.length}):</span>
                <span className="text-2xl font-bold text-blue-700">${calcularPrecioTotal().toLocaleString()}</span>
              </div>
            </div>
          </section>
        );
      
      case 5: {
        const total = calcularPrecioTotal();
        const minimo = total * 0.5;
        
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">5️⃣ Define el monto a pagar</h2>
            
            {/* Banner de regla del 50% */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Regla de confirmación:</strong> Para confirmar esta reserva,
                el primer pago debe ser al menos el <strong>50% del total</strong> (${minimo.toLocaleString()}).
                <br/>
                <span className="text-xs text-blue-600 mt-1 block">
                  Total del servicio: ${total.toLocaleString()}
                </span>
              </p>
            </div>
            
            {/* Input de monto */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a pagar $
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={montoPago !== null ? montoPago : total}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    setMontoPago(valor);
                    const error = valor < minimo 
                      ? `El monto debe ser al menos $${minimo.toLocaleString()} (50%)`
                      : valor > total 
                      ? `El monto no puede exceder $${total.toLocaleString()}`
                      : null;
                    setErrorMonto(error);
                    setMontoValidado(error === null);
                  }}
                  min={minimo}
                  max={total}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`Mínimo: $${minimo.toLocaleString()}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMontoPago(total);
                    setErrorMonto(null);
                    setMontoValidado(true);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Total
                </button>
              </div>
              {errorMonto && (
                <p className="text-red-600 text-sm mt-1">{errorMonto}</p>
              )}
              {montoValidado && montoPago !== null && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  ✅ Monto válido - Puedes continuar
                </p>
              )}
            </div>
            
            {/* Resumen del monto */}
            {montoPago !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  💰 Monto seleccionado: <strong>${montoPago.toLocaleString()}</strong>
                  {montoPago >= minimo && (
                    <span className="text-xs block text-green-600 mt-1">
                      ✅ Cumple con el mínimo del 50% para confirmar
                    </span>
                  )}
                </p>
              </div>
            )}
          </section>
        );
      }
      
      case 6: {
        const montoAMostrar = montoPago !== null ? montoPago : calcularPrecioTotal();
        
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6 mb-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">6️⃣ Selecciona tu método de pago</h2>
            
            {/* ← NUEVO: Mostrar errores aquí también (porque la barra inferior está oculta) */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
            
            {/* Mostrar el monto confirmado */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                ✅ Monto confirmado: <strong>${montoAMostrar.toLocaleString()}</strong>
              </p>
            </div>
            
            {/* Selector de método de pago */}
            <PaymentMethodSelector
              onSelect={(method: PaymentMethod) => {
                const metodosValidos = ['bold', 'efectivo', 'transferencia', 'nequi', 'daviplata', 'tarjeta', 'pendiente'];
                if (!metodosValidos.includes(method)) {
                  console.warn('⚠️ Método de pago no válido:', method);
                  return;
                }
                console.log('💳 [PaymentMethodSelector] Método seleccionado:', method);
                setSelectedPaymentMethod(method);
                setError(null);
                if (method === 'pendiente') {
                  setMontoPago(null);
                  setErrorMonto(null);
                  setMontoValidado(false);
                } else if (method === 'efectivo') {
                  setShowBankAccountsModal(true);
                }
              }}
              total={montoAMostrar}
            />
            
            {selectedPaymentMethod === 'pendiente' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-800">
                  ⏰ <strong>Reserva ahora, paga después:</strong> Tu cita quedará guardada.
                  Para pagar y confirmar, ve a <strong>"Mis Citas"</strong> en tu perfil cuando estés listo.
                </p>
              </div>
            )}
            
            {/* Botón Confirmar */}
            {selectedPaymentMethod && selectedPaymentMethod !== 'efectivo' && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    console.log('🔘 [Confirmar] Botón clickeado');
                    await handleSubmit(null as any);
                  }}
                  disabled={loading || verificandoPagos}
                  className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading || verificandoPagos ? (
                    <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>Procesando...</>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirmar Reserva - ${montoAMostrar.toLocaleString()}
                    </>
                  )}
                </button>
                
                {/* Botón Volver a definir monto */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod(null);
                    setCurrentStep(5);
                    setError(null);
                  }}
                  className="w-full mt-3 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  ← Volver a definir monto
                </button>
              </>
            )}
          </section>
        );
      }
      
      case 'success':
        if (citaCreada) {
          return (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-24">
              <BookingSuccess
                citaId={citaCreada.id}
                codigoReserva={citaCreada.codigo_reserva}
                onNewBooking={handleNewBooking}
              />
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  // ← NUEVA FUNCIÓN: Renderizar barra de progreso con círculos
    const renderProgressBar = () => {
    const steps = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: 'Profesional' },
      { num: 3, label: 'Fecha/Hora' },
      { num: 4, label: 'Datos' },
      { num: 5, label: 'Monto' },
      { num: 6, label: 'Pago' },
    ];

    return (
      <div className="mb-8 flex justify-between items-center px-4">
        {steps.map((step, index) => {
          const isActive = Number(currentStep) === step.num;
          const isCompleted = Number(currentStep) > step.num;
          
          return (
            <div key={step.num} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                isCompleted
                  ? 'bg-green-600 text-white'
                  : isActive
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                  : 'bg-gray-800 text-white'
              }`}>
                {isCompleted ? '✓' : step.num}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${
                isActive || isCompleted ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-6 mx-1 mt-2 ${
                  Number(currentStep) > step.num ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-40"> {/* pb-40 para dar espacio a la barra fija */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {editingCitaId ? '✏️ Editar Reserva' : 'Reservar Cita'}
          </h1>
          <p className="text-gray-600">
            {editingCitaId ? 'Ajusta los detalles de tu reserva' : 'Agenda tus tratamientos en DZ Salón'}
          </p>
        </div>

        {/* Barra de progreso con círculos */}
        {renderProgressBar()}

        <form id="booking-form" className="space-y-6"> 
          {renderStepContent()}
        </form>
      </div>

      {/* ← BARRA INFERIOR FIJA CON CARDS Y BOTONES */}
      {renderBottomBar()}

      {/* MODAL DE COMPROBANTE */}
      {showUploadReceipt && citaCreada && ultimoPagoId && (
        <UploadReceipt
          citaId={citaCreada.id}
          pagoId={ultimoPagoId}
          onSuccess={() => {
            setShowUploadReceipt(false);
            setCurrentStep('success');
            setPagoPendiente(true);
          }}
          onCancel={() => setShowUploadReceipt(false)}
        />
      )}
      
      {/* MODAL DE CUENTAS BANCARIAS */}
      <BankAccountsModal
        isOpen={showBankAccountsModal}
        onClose={() => setShowBankAccountsModal(false)}
        accounts={cuentasBancarias}
        total={calcularPrecioTotal()}
        onConfirm={() => setShowBankAccountsModal(false)}
      />
       {/* ← ← ← VALORACIÓN: Modal de valoración del servicio ← ← ← */}
      {modalValoracionOpen && itemActual.servicio && (
        <ValoracionModal
          isOpen={modalValoracionOpen}
          onClose={handleValoracionCancelada}
          servicioId={itemActual.servicio.id}
          servicioNombre={itemActual.servicio.nombre}
          onCompletar={handleValoracionCompletada}
        />
      )}
    </div>
  );
}