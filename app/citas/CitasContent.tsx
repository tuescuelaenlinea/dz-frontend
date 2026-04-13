'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ServiceSelector from '@/components/booking/ServiceSelector';
import DateTimePicker from '@/components/booking/DateTimePicker';
import ClientInfoForm from '@/components/booking/ClientInfoForm';
import BookingSummary from '@/components/booking/BookingSummary';
import BookingSuccess from '@/components/booking/BookingSuccess';
import ProfessionalSelector from '@/components/booking/ProfessionalSelector';
import PaymentMethodSelector, { PaymentMethod } from '@/components/booking/PaymentMethodSelector';
import UploadReceipt from '@/components/booking/UploadReceipt';
import BankAccountsModal from '@/components/booking/BankAccountsModal';

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

interface CitaParaEditar {
  id: number;
  servicio: number;
  profesional: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  metodo_pago: string;
  estado_pago: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas_cliente: string;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  servicio_nombre?: string;
  profesional_nombre?: string;
  codigo_reserva?: string;
}

// ← CAMBIO #1: Agregar paso 6 al tipo BookingStep
type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 'success';

export default function CitasContent() {
  const { user, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [mode, setMode] = useState<'salon' | 'domicilio'>('salon');
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [selectedProfessional, setSelectedProfessional] = useState<number | null>(null);
  const [selectedProfessionalData, setSelectedProfessionalData] = useState<Profesional | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  
  // ← ESTADOS PARA CUENTAS BANCARIAS Y COMPROBANTE
  const [showUploadReceipt, setShowUploadReceipt] = useState(false);
  const [cuentasBancarias, setCuentasBancarias] = useState<any[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState<number | null>(null);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);
  const [ultimoPagoId, setUltimoPagoId] = useState<number | null>(null);

  // ← NUEVO: Estado para edición de cita
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

    // ← ESTADOS PARA PAGO PARCIAL
  const [montoPago, setMontoPago] = useState<number | null>(null);
  const [esPrimerPago, setEsPrimerPago] = useState<boolean | null>(null);
  const [errorMonto, setErrorMonto] = useState<string | null>(null);
  const [verificandoPagos, setVerificandoPagos] = useState(false);
  const [montoValidado, setMontoValidado] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState<number | null>(null);

  // Cargar configuración de Bold
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await api.getConfiguracion().catch(() => null);
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
      } catch (err) {
        console.error('Error cargando configuración de pagos:', err);
      }
    }
    loadConfig();
  }, []);

// ← CARGAR CUENTAS BANCARIAS (CORREGIDO)
useEffect(() => {
  async function loadCuentasBancarias() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      const res = await fetch(`${apiUrl}/cuentas-bancarias/`);
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // ← MANEJAR RESPUESTA PAGINADA O ARRAY DIRECTO
      const cuentas = data.results || (Array.isArray(data) ? data : []);
      
      // ← FILTRAR SOLO CUENTAS ACTIVAS (doble seguridad)
      const cuentasActivas = cuentas.filter((c: any) => c.activo === true);
      
      setCuentasBancarias(cuentasActivas);
      
    } catch (err) {
      console.error('Error cargando cuentas bancarias:', err);
      setCuentasBancarias([]); // ← Asegurar array vacío en caso de error
    }
  }
  loadCuentasBancarias();
}, []);

  // Cargar datos del profesional seleccionado
  useEffect(() => {
    if (selectedProfessional) {
      async function loadProfessionalData() {
        try {
          const profs = await api.getProfesionales();
          let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
          const prof = profesionalesList.find((p: any) => p.id === selectedProfessional);
          if (prof) {
            setSelectedProfessionalData(prof);
          }
        } catch (err) {
          console.error('Error cargando datos del profesional:', err);
        }
      }
      loadProfessionalData();
    }
  }, [selectedProfessional]);

     // ← NUEVO: Detectar si se está editando una cita existente
    useEffect(() => {
      const editarCitaId = searchParams?.get('editar_cita');
      
      if (editarCitaId) {
        async function loadCitaParaEditar() {
          try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
            
            console.log('🔍 Cargando cita #', editarCitaId, 'para edición');
            
            const res = await fetch(`${apiUrl}/citas/${editarCitaId}/`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (!res.ok) {
              console.error('❌ Error cargando cita:', await res.text());
              return;
            }
            
            const cita: CitaParaEditar = await res.json();
            console.log('📋 Cita cargada para edición:', cita);
            
            // ← NUEVO: Verificar si ya tiene pagos (NO es primer pago)
            const pagosRes = await fetch(`${apiUrl}/citas/${editarCitaId}/pagos/`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            let totalPagado = 0;
            let esPrimerPago = true;
                      
            if (pagosRes.ok) {
              const pagosData = await pagosRes.json();
              const pagosExitosos = (pagosData.pagos || []).filter((p: any) => 
                p.estado === 'exitoso' || p.estado === 'pendiente'
              );
              
              esPrimerPago = pagosExitosos.length === 0;
              setEsPrimerPago(esPrimerPago);
              
              totalPagado = pagosExitosos.reduce((sum: number, p: any) => 
                sum + parseFloat(p.monto || 0), 0
              );
              
              const precioTotal = parseFloat(cita.precio_total) || 0;
              const saldo = precioTotal - totalPagado;
              
              setSaldoPendiente(saldo);
              
              if (!esPrimerPago) {
                setMontoPago(saldo);
                console.log('💰 montoPago inicializado con saldo:', saldo);
              }
              
              // ← LOG MOVIDO AQUÍ:
              console.log('💵 Precio Total:', precioTotal, '- Saldo Pendiente:', saldo);
            }                   
          
            // ← Precargar TODOS los datos del formulario
            setSelectedService({
              id: cita.servicio,
              nombre: cita.servicio_nombre || '',
              slug: '',
              precio_min: cita.precio_total,
              precio_max: null,
              duracion: '',
              categoria: 0,
              categoria_nombre: '',
              imagen: null,
              imagen_url: null,
              disponible_salon: cita.disponible_salon,
              disponible_domicilio: cita.disponible_domicilio,
              adicional_domicilio: undefined,
            });
            
            if (cita.profesional) {
              setSelectedProfessional(cita.profesional);
              const profs = await api.getProfesionales();
              let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
              const prof = profesionalesList.find((p: any) => p.id === cita.profesional);
              if (prof) setSelectedProfessionalData(prof);
            }
            
            setSelectedDate(cita.fecha ? new Date(cita.fecha) : null);
            setSelectedTime(cita.hora_inicio);
            
            setClientData({
              cliente_nombre: cita.cliente_nombre || '',
              cliente_telefono: cita.cliente_telefono || '',
              cliente_email: cita.cliente_email || '',
              notas_cliente: cita.notas_cliente || '',
            });
            
            setMode(cita.disponible_domicilio ? 'domicilio' : 'salon');
            setSelectedPaymentMethod(cita.metodo_pago as PaymentMethod);
            
            // ← Guardar ID de edición e ir al paso 5
            setEditingCitaId(editarCitaId);
            setCurrentStep(5);
            
          } catch (err) {
            console.error('❌ Error cargando cita para editar:', err);
            setError('No se pudo cargar la información de la cita');
          }
        }
        
        loadCitaParaEditar();
      }
    }, [searchParams]);

  // const getBoldPaymentUrl = () => {
  //   const defaultUrl = 'https://checkout.bold.co/payment/LNK_LWD70PVJ5I';
  //   if (configuracion?.bold_payment_activo && configuracion?.bold_payment_link) {
  //     return configuracion.bold_payment_link;
  //   }
  //   return defaultUrl;
  // };

const getBoldPaymentUrl = () => {
  // ← ELIMINAR el defaultUrl hardcodeado
  // const defaultUrl = 'https://checkout.bold.co/payment/LNK_LWD70PVJ5I';
  
  // ← Solo retornar si está configurado en BD
  if (configuracion?.bold_payment_activo && configuracion?.bold_payment_link) {
    return configuracion.bold_payment_link;
  }
  
  // ← Si no está configurado, retornar null (Bold no disponible)
  return null;
};

  // Cargar servicio desde URL (para nuevas reservas)
  useEffect(() => {
    const servicioId = searchParams?.get('servicio');
    if (servicioId && !editingCitaId) {  // ← Solo si NO estamos editando
      async function loadServicio() {
        try {
          const allServicios = await (api.getAllServicios ? api.getAllServicios() : api.getServicios());
          const serviciosList = Array.isArray(allServicios) ? allServicios : (allServicios.results || allServicios);
          const servicioEncontrado = serviciosList.find((s: Servicio) => s.id.toString() === servicioId);
          if (servicioEncontrado) {
            setSelectedService(servicioEncontrado);
            setCurrentStep(2);
          }
        } catch (err) {
          console.error('Error cargando servicio desde URL:', err);
        }
      }
      loadServicio();
    }
  }, [searchParams, editingCitaId]);

  // Cargar teléfono persistente
  useEffect(() => {
    async function loadLastPhone() {
      if (isAuthenticated && user?.id) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/?cliente=${user.id}&ordering=-fecha`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (response.ok) {
            const data = await response.json();
            const citas = data.results || data;
            const lastCita = citas[0];
            if (lastCita?.cliente_telefono) {
              setClientData(prev => ({
                ...prev,
                cliente_nombre: `${user.first_name || ''} ${user.last_name || ''}`.trim() || prev.cliente_nombre,
                cliente_email: user.email || prev.cliente_email,
                cliente_telefono: lastCita.cliente_telefono,
              }));
              return;
            }
          }
        } catch (err) {
          console.warn('No se pudo cargar teléfono de última cita:', err);
        }
        setClientData(prev => ({
          ...prev,
          cliente_nombre: `${user.first_name || ''} ${user.last_name || ''}`.trim() || prev.cliente_nombre,
          cliente_email: user.email || prev.cliente_email,
          cliente_telefono: prev.cliente_telefono || user.username || '',
        }));
      }
    }
    loadLastPhone();
  }, [isAuthenticated, user, token]);

  // ← CAMBIO #2: Actualizar canProceedToStep para manejar paso 6
    const canProceedToStep = (step: BookingStep): boolean => {
      switch (step) {
        case 2: return selectedService !== null;
        case 3: return selectedService !== null && selectedProfessional !== null;
        case 4: return selectedService !== null && selectedProfessional !== null && 
                 selectedDate !== null && selectedTime !== null;
        case 5: return selectedService !== null && selectedProfessional !== null && 
                 selectedDate !== null && selectedTime !== null &&
                 (clientData.cliente_nombre.trim().length > 0 && 
                  clientData.cliente_telefono.trim().length > 0);
        case 6: {
          // ← Para pagos adicionales (edición), NO validar 50%        
          const esPagoAdicional = editingCitaId !== null && esPrimerPago === false;
        const montoFinal = montoPago !== null 
          ? montoPago 
          : (esPagoAdicional && saldoPendiente !== null ? saldoPendiente : calcularPrecioTotal());
  
          
          if (!esPagoAdicional && esPrimerPago !== false && montoPago !== null) {
            const total = calcularPrecioTotal();
            const error = validarMontoPago(montoPago, total, true);
            return error === null;
          }
          return true;
        }
        default: return true;
      }
    };

  const handleNext = () => {
    const nextStep = (Number(currentStep) + 1) as BookingStep;
    const canProceed = canProceedToStep(nextStep);
    
    if (canProceed) {
      setCurrentStep(nextStep);
      setError(null);
      // ← Si avanzamos a paso 6, mostrar selector de pago
      if (nextStep === 6) {
        setShowPaymentSelector(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // ← Mensaje específico si falla validación de monto en paso 5
      if (currentStep === 5 && nextStep === 6 && esPrimerPago !== false) {
        const total = calcularPrecioTotal();
        const minimo = total * 0.5;
        setError(`Para continuar, el monto debe ser al menos $${minimo.toLocaleString()} (50% del total)`);
      } else {
        setError('Por favor completa todos los campos requeridos');
      }
    }
  };

  const handleBack = () => {
    // ← Si volvemos del paso 6 al 5, ocultar selector de pago
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

  const calcularPrecioTotal = () => {
    if (!selectedService) return 0;
    const base = parseInt(selectedService.precio_min);
    const adicional = mode === 'domicilio' && selectedService.adicional_domicilio 
      ? parseInt(selectedService.adicional_domicilio) 
      : 0;
    return base + adicional;
  };

  const calculateEndTime = (startTime: string | null, duracion: string): string => {
    if (!startTime || !duracion) return startTime || '';
    const minutes = parseInt(duracion.replace(/\D/g, '')) || 60;
    const [hours, mins] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, mins + minutes, 0, 0);
    return endDate.toTimeString().slice(0, 5);
  };

  // ← FUNCIÓN PARA ENVIAR WHATSAPP AL PROFESIONAL (reutilizable)
  async function enviarWhatsAppAlProfesional(citaId: number, profesionalId: number) {
    try {
      const token = localStorage.getItem('token');
      
      // Obtener datos del profesional
      const profsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/profesionales/`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      const profs = await profsRes.json();
      let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
      const profesional = profesionalesList.find((p: any) => p.id === profesionalId);
      
      if (!profesional?.telefono_whatsapp) {
        console.warn('Profesional sin WhatsApp');
        return;
      }
      
      // Obtener datos de la cita
      const citaRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/${citaId}/`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const cita = await citaRes.json();
      
      const mensaje = `*🔔 NUEVA RESERVA CONFIRMADA*%0A%0A` +
        `*Código:* ${cita.codigo_reserva}%0A` +
        `*Cliente:* ${cita.cliente_nombre}%0A` +
        `*Teléfono:* ${cita.cliente_telefono}%0A` +
        `*Servicio:* ${cita.servicio_nombre}%0A` +
        `*Fecha:* ${cita.fecha}%0A` +
        `*Hora:* ${cita.hora_inicio}%0A` +
        `*Total:* $${cita.precio_total}%0A%0A` +
        `✅ Pago confirmado - Por favor preparar el servicio.`;
      
      const telefonoLimpio = profesional.telefono_whatsapp.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
      
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      console.log('✅ WhatsApp enviado al profesional:', profesional.nombre);
      
    } catch (err) {
      console.error('Error enviando WhatsApp:', err);
    }
  }

  // Manejar retorno de Bold
  useEffect(() => {
    async function handleBoldReturn() {
      const pagoExitoso = searchParams?.get('pago') === 'exitoso';
      const citaIdParam = searchParams?.get('cita_id');
      
      if (pagoExitoso && citaIdParam) {
        try {
          // ← AGREGAR TOKEN
          const token = localStorage.getItem('token');
          
          const citaResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/${citaIdParam}/`,
            {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }
          );
          
          if (!citaResponse.ok) {
            console.error('Error obteniendo cita:', await citaResponse.text());
            return;
          }
          
          const citaData = await citaResponse.json();
          console.log('📋 Cita cargada:', citaData);
          
          setCitaCreada({ id: citaData.id, codigo_reserva: citaData.codigo_reserva });
          
          // ← ENVIAR WHATSAPP AL PROFESIONAL (si existe)
          if (citaData.profesional) {
            await enviarWhatsAppAlProfesional(citaData.id, citaData.profesional);
          } else {
            console.warn('⚠️ La cita no tiene profesional asignado');
          }
          
          setCurrentStep('success');
          setPagoPendiente(false);
          
        } catch (err) {
          console.error('Error confirmando pago:', err);
          setError('Error al confirmar el pago');
        }
      }
    }
    handleBoldReturn();
  }, [searchParams]);

    // ← VERIFICAR SI ES PRIMER PAGO DE LA CITA
  async function verificarEsPrimerPago(citaId: number): Promise<boolean> {
    try {
      setVerificandoPagos(true);
      const historial = await api.getCitaPagos(citaId);
      // Si no hay pagos exitosos, es primer pago
      const pagosExitosos = historial.pagos?.filter((p: any) => p.estado === 'exitoso') || [];
      return pagosExitosos.length === 0;
    } catch (err) {
      console.warn('Error verificando pagos:', err);
      // Por seguridad, asumir que es primer pago si hay error
      return true;
    } finally {
      setVerificandoPagos(false);
    }
  }

       // ← VALIDAR MONTO SEGÚN REGLAS CONFIRMADAS
    function validarMontoPago(monto: number, total: number, esPrimerPago: boolean, saldoPendienteActual?: number): string | null {
      if (monto <= 0) return 'El monto debe ser mayor a $0';
      
      // ← Para pagos adicionales, validar contra saldo pendiente, no contra total
      const maximo = saldoPendienteActual !== undefined ? saldoPendienteActual : total;
      
      if (monto > maximo) {
        return `El monto no puede exceder ${saldoPendienteActual !== undefined ? 'el saldo pendiente' : 'el total'} ($${maximo.toLocaleString()})`;
      }
      
      if (esPrimerPago) {
        const minimo = total * 0.5;
        if (monto < minimo) {
          return `Para confirmar esta reserva, el primer pago debe ser al menos el 50% ($${minimo.toLocaleString()})`;
        }
      }
      
      return null; // ✅ Válido
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    console.log('🔔 handleSubmit llamado - editingCitaId:', editingCitaId);
    
    // ← VALIDACIONES ACTUALIZADAS CON MONTO Y REGLA 50%
    if (!selectedService) { setError('Por favor selecciona un servicio'); return; }
    if (!selectedProfessional) { setError('Por favor selecciona un profesional'); return; }
    if (!selectedDate || !selectedTime) { setError('Por favor selecciona fecha y hora'); return; }
    if (!clientData.cliente_nombre.trim()) { setError('Por favor ingresa tu nombre'); return; }
    if (!clientData.cliente_telefono.trim()) { setError('Por favor ingresa tu teléfono'); return; }
    if (!selectedPaymentMethod) { setError('Por favor selecciona un método de pago'); return; }
    
    // ← Aceptar tanto paso 5 como 6 para submit (paso 6 es el nuevo paso de confirmación)
    if (currentStep !== 5 && currentStep !== 6) {
      setError('Por favor completa todos los pasos');
      return;
    }
    
    setLoading(true);
    
    try {
    const total = calcularPrecioTotal();
    
    // ← Declarar UNA SOLA VEZ:
    const esPagoAdicional = editingCitaId !== null && esPrimerPago === false;
    const montoFinal = montoPago !== null 
      ? montoPago 
      : (esPagoAdicional && saldoPendiente !== null ? saldoPendiente : total);
    
    if (selectedPaymentMethod !== 'pendiente') {
      let esPrimer = esPrimerPago;
      if (editingCitaId && esPrimer === null) {
        esPrimer = await verificarEsPrimerPago(parseInt(editingCitaId));
        setEsPrimerPago(esPrimer);
      }
      
      // ← USAR esPagoAdicional ya declarado:
      const error = validarMontoPago(
        montoFinal, 
        total, 
        esPrimer !== false,
        esPagoAdicional && saldoPendiente != null ? saldoPendiente : undefined
      );
      
      if (error) {
        setErrorMonto(error);
        setError(error);
        return;
      }
      setErrorMonto(null);
    }

    // ← NUEVO: Validar disponibilidad antes de crear/actualizar cita
    if (!editingCitaId && selectedTime && selectedProfessional) {
      try {
        const duracionMin = parseInt(selectedService?.duracion?.replace(/\D/g, '') || '60');
        const [hours, mins] = selectedTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, mins + duracionMin, 0, 0);
        const horaFin = endDate.toTimeString().slice(0, 5);
        
        const validacion = await api.validarDisponibilidadCita({
          profesional_id: selectedProfessional,
          fecha: selectedDate?.toISOString().split('T')[0] || '',
          hora_inicio: selectedTime,
          hora_fin: horaFin,
        });
        
        if (!validacion.disponible) {
          setError(`⚠️ ${validacion.mensaje}`);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Error validando disponibilidad:', err);
        // No bloquear si falla la validación, pero mostrar advertencia
        setError('⚠️ No se pudo verificar disponibilidad. Procediendo con precaución.');
      }
    }
      
      // ← CORRECCIÓN #1: Ahora SÍ definir citaData (después de validar)
      const citaData: any = {
        servicio: selectedService.id,
        profesional: selectedProfessional,
        fecha: selectedDate?.toISOString().split('T')[0],
        hora_inicio: selectedTime,
        hora_fin: calculateEndTime(selectedTime, selectedService.duracion),
        precio_total: total,
        metodo_pago: selectedPaymentMethod,
        estado_pago: 'pendiente',
        cliente_nombre: clientData.cliente_nombre.trim(),
        cliente_telefono: clientData.cliente_telefono.trim(),
        cliente_email: clientData.cliente_email?.trim() || '',
        notas_cliente: clientData.notas_cliente?.trim() || '',
        disponible_salon: mode === 'salon',
        disponible_domicilio: mode === 'domicilio',
      };
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const authToken = localStorage.getItem('token');
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← DETECTAR si es edición o creación nueva
      let res;
      
      if (editingCitaId) {
        // ← ACTUALIZAR cita existente con PUT
        console.log('🔄 Actualizando cita #', editingCitaId);
        res = await fetch(`${apiUrl}/citas/${editingCitaId}/`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(citaData),
        });
      } else {
        // ← CREAR nueva cita con POST (comportamiento original)
        console.log('🆕 Creando nueva cita');
        res = await fetch(`${apiUrl}/citas/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(citaData),
        });
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.detail || 'Error al procesar la cita');
        } catch { throw new Error(`Error ${res.status}: ${res.statusText}`); }
      }
      
      const resultado = await res.json();
      const citaId = editingCitaId || resultado.id;
      const codigoReserva = resultado.codigo_reserva;
      
      console.log('✅ Cita procesada:', { id: citaId, codigo: codigoReserva });
      
      // ← CORRECCIÓN #2: Crear registro de Pago después de crear/actualizar cita
      // ← CORRECCIÓN: Crear registro de Pago y guardar su ID
      if (selectedPaymentMethod !== 'pendiente') {
        const pagoResponse = await fetch(`${apiUrl}/pagos/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            monto: montoFinal,
            metodo_pago: selectedPaymentMethod,
            estado: selectedPaymentMethod === 'efectivo' ? 'pendiente' : 'exitoso',
            origen_tipo: 'cita',
            origen_id: citaId,
            referencia_externa: `RESERVA-${codigoReserva}`,
          }),
        });
        
        if (pagoResponse.ok) {
          const pagoData = await pagoResponse.json();
          setUltimoPagoId(pagoData.id);  // ← GUARDAR ID DEL PAGO
        }
      }
      // Guardar en localStorage
      localStorage.setItem('cita_pendiente_pago', JSON.stringify(resultado));
      localStorage.setItem('dz_last_phone', clientData.cliente_telefono);
      localStorage.setItem('cita_id_pago', citaId.toString());
      localStorage.setItem('cita_metodo_pago', selectedPaymentMethod);
      
      // ← MANEJAR DIFERENTES MÉTODOS DE PAGO
      if (selectedPaymentMethod === 'bold') {
        // ← CORRECCIÓN #1: Usar montoFinal (ya validado)
        const amountToPay = montoFinal;
        
        // ← CORRECCIÓN #2: Obtener URL y validar
        const boldUrl = getBoldPaymentUrl();
        console.log('🔍 Bold URL:', boldUrl);
        
        if (!boldUrl) {
          setError('❌ URL de pago de Bold no configurada. Contacta al administrador.');
          setLoading(false);
          return;
        }
        
        alert('Serás redirigido a Bold para completar el pago seguro de $' + amountToPay.toLocaleString());
        
        // ← CORRECCIÓN #3: Redirección simple (sin return_url por ahora)
        // Si Bold requiere parámetros, descomenta la línea de abajo
        window.location.href = boldUrl;
        
        // ← ALTERNATIVA: Si Bold requiere parámetros específicos:
        // const redirectUrl = new URL(boldUrl);
        // redirectUrl.searchParams.append('amount', amountToPay.toString());
        // redirectUrl.searchParams.append('reference', codigoReserva);
        // redirectUrl.searchParams.append('success_url', `${window.location.origin}/citas?pago=exitoso&cita_id=${citaId}`);
        // window.location.href = redirectUrl.toString();
        
        // ← NO retornar aquí, dejar que la redirección ocurra
        
      } else if (selectedPaymentMethod === 'efectivo') {
        // ← MOSTRAR MODAL DE SUBIDA DE COMPROBANTE
        setCitaCreada({ id: parseInt(citaId), codigo_reserva: codigoReserva });
        setShowUploadReceipt(true);
        return;  // ← Salir aquí, no cambiar a success todavía
        
      } else if (selectedPaymentMethod === 'pendiente') {
        setCitaCreada({ id: parseInt(citaId), codigo_reserva: codigoReserva });
        setCurrentStep('success');
        setPagoPendiente(true);
        
        alert('✅ Reserva guardada! Para pagar y confirmar, ve a "Mis Citas" en tu perfil.');
        
        if (isAuthenticated) {
          setTimeout(() => {
            router.push('/mis-citas');
          }, 2000);
        }
      }
      
      // ← Limpiar parámetro de edición de la URL después de procesar
      if (editingCitaId) {
        router.replace('/citas');
        setEditingCitaId(null);
      }
      
    } catch (err: any) {
      console.error('❌ Error procesando cita:', err);
      setError(err.message || 'Error al procesar tu reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setCurrentStep(1);
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedProfessionalData(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setEditingCitaId(null);  // ← Limpiar edición
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
    setSelectedPaymentMethod(null);
    // ← Resetear estados de pago parcial
    setMontoPago(null);
    setEsPrimerPago(null);
    setErrorMonto(null);
    setMontoValidado(false);
  };

  const renderProgressBar = () => {
    // ← CAMBIO #3: Actualizar steps para incluir paso 6
    const steps = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: 'Profesional' },
      { num: 3, label: 'Fecha y Hora' },
      { num: 4, label: 'Tus Datos' },
      { num: 5, label: 'Monto' },
      { num: 6, label: 'Pago' },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = Number(currentStep) === step.num;
            const isCompleted = Number(currentStep) > step.num;
            return (
              <div key={step.num} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isCompleted ? 'bg-green-600 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive || isCompleted ? 'text-blue-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${Number(currentStep) > step.num ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">1️⃣ Selecciona tu servicio</h2>
            <ServiceSelector
              selectedService={selectedService?.id || null}
              onServiceSelect={setSelectedService}
              mode={mode}
              onModeChange={setMode}
              preSelectedService={selectedService}
            />
          </section>
        );
      
      case 2:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">2️⃣ Selecciona el profesional</h2>
            <ProfessionalSelector
              selectedProfessional={selectedProfessional}
              onProfessionalSelect={(id) => {
                setSelectedProfessional(id);
                api.getProfesionales().then(profs => {
                  let list = Array.isArray(profs) ? profs : (profs.results || []);
                  const prof = list.find((p: any) => p.id === id);
                  if (prof) setSelectedProfessionalData(prof);
                });
              }}
              servicioId={selectedService?.id || null}
              selectedDate={selectedDate}
            />
            {selectedProfessional && selectedProfessionalData && (
              <p className="text-xs text-green-600 mt-3">
                ✅ Seleccionado: {selectedProfessionalData.titulo} {selectedProfessionalData.nombre}
              </p>
            )}
          </section>
        );
      
      case 3:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">3️⃣ Elige fecha y hora</h2>
            <DateTimePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              servicioId={selectedService?.id || null}
              profesionalId={selectedProfessional}
              mode={mode}
            />
          </section>
        );
      
      case 4:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">4️⃣ Tus datos</h2>
            <ClientInfoForm
              isAuthenticated={isAuthenticated}
              userData={user}
              formData={clientData}
              onFormChange={handleClientChange}
            />
          </section>
        );
      
      // ← CAMBIO #4: Paso 5 - Solo regla + input de monto + validación
      // ← CAMBIO #4: Paso 5 - Mensajes diferenciados para primera vez vs edición
     // ← CAMBIO #4: Paso 5 - Mensajes diferenciados para primera vez vs edición
      case 5: {
        console.log('🎯 Renderizando PASO 5 - Monto y Validación');
        const isEditing = editingCitaId !== null;
        const total = calcularPrecioTotal();
        const minimo = total * 0.5;
        
        // ← Determinar si es primer pago o pago adicional
        const esPagoAdicional = isEditing && esPrimerPago === false;
        
        // ← Usar saldo pendiente si es pago adicional
        const maximoAPagar = esPagoAdicional && saldoPendiente !== null ? saldoPendiente : total;
        
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {isEditing 
                ? (esPagoAdicional ? '💳 Pagar Saldo Pendiente' : '✏️ Editar Monto de Pago') 
                : '5️⃣ Define el monto a pagar'}
            </h2>
            
            {isEditing && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  📝 <strong>{esPagoAdicional ? 'Pago de saldo pendiente' : 'Editando reserva existente'}</strong><br/>
                  {esPagoAdicional 
                    ? 'Completa el pago de tu reserva. Puedes pagar el saldo total o un monto parcial.' 
                    : 'Puedes ajustar el monto del pago. Los cambios se guardarán automáticamente.'}
                </p>
              </div>
            )}
            
            {/* ← BANNER DE REGLA DEL 50% - SOLO para primer pago */}
            {!esPagoAdicional && esPrimerPago !== false && (
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
            )}
            
            {/* ← Mensaje para pago adicional (saldo pendiente) */}
            {esPagoAdicional && saldoPendiente !== null && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>Pago de saldo pendiente:</strong> Puedes pagar cualquier monto hasta completar el saldo.
                  <br/>
                  <span className="text-xs text-green-600 mt-1 block">
                    Total: ${total.toLocaleString()} | Abonado: ${(total - saldoPendiente).toLocaleString()} | <strong>Saldo: ${saldoPendiente.toLocaleString()}</strong>
                  </span>
                </p>
              </div>
            )}
            
            {/* ← INPUT DE MONTO PERSONALIZADO */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a pagar $
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={montoPago !== null ? montoPago : maximoAPagar}
                  onChange={(e) => {
                    const valor = Number(e.target.value);
                    setMontoPago(valor);
                    // Validar en tiempo real
                    const esPrimer = esPagoAdicional ? false : (esPrimerPago !== false);
                    const error = validarMontoPago(valor, total, esPrimer, esPagoAdicional && saldoPendiente != null ? saldoPendiente : undefined);
                    setErrorMonto(error);
                    setMontoValidado(error === null);
                  }}
                  // ← SIN mínimo del 50% para pagos adicionales, pero SÍ límite de saldo
                  min={1}
                  max={maximoAPagar}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={esPagoAdicional 
                    ? `Máximo: $${maximoAPagar.toLocaleString()}` 
                    : (esPrimerPago !== false ? `Mínimo: $${minimo.toLocaleString()}` : 'Ingresa el monto')}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMontoPago(maximoAPagar);
                    setErrorMonto(null);
                    setMontoValidado(true);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  {esPagoAdicional ? 'Saldo Total' : 'Total'}
                </button>
              </div>
              {errorMonto && (
                <p className="text-red-600 text-sm mt-1">{errorMonto}</p>
              )}
              {montoValidado && montoPago !== null && (
                <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                  ✅ Monto válido - {esPagoAdicional ? 'Procede al pago' : 'Puedes continuar'}
                </p>
              )}
            </div>
            
            {/* ← Resumen del monto seleccionado */}
            {montoPago !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  💰 Monto seleccionado: <strong>${montoPago.toLocaleString()}</strong>
                  {!esPagoAdicional && esPrimerPago !== false && montoPago >= minimo && (
                    <span className="text-xs block text-green-600 mt-1">
                      ✅ Cumple con el mínimo del 50% para confirmar
                    </span>
                  )}
                  {esPagoAdicional && (
                    <span className="text-xs block text-green-600 mt-1">
                      ✅ Abono registrado para tu reserva
                      {saldoPendiente !== null && montoPago >= saldoPendiente && (
                        <span className="block text-green-700 font-semibold mt-1">
                          🎉 ¡Con este pago completas tu reserva!
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            )}
          </section>
        );
      }
      
      // ← CAMBIO #5: NUEVO Paso 6 - Solo selección de método de pago
            // ← CAMBIO #5: NUEVO Paso 6 - Solo selección de método de pago
      case 6: {
        console.log('🎯 Renderizando PASO 6 - Método de Pago');
        const isEditing = editingCitaId !== null;
        
        // ← CORREGIDO: Calcular monto a mostrar
        const esPagoAdicional = isEditing && esPrimerPago === false;
        const montoAMostrar = montoPago !== null 
          ? montoPago 
          : (esPagoAdicional && saldoPendiente !== null ? saldoPendiente : calcularPrecioTotal());
        
        return (
          <>
            <section className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {isEditing ? '✏️ Selecciona Método de Pago' : '6️⃣ Selecciona tu método de pago'}
              </h2>
              
              {/* ← MOSTRAR EL MONTO CORRECTO */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  ✅ Monto confirmado: <strong>${montoAMostrar.toLocaleString()}</strong>
                </p>
                {isEditing && saldoPendiente !== null && (
                  <p className="text-xs text-green-600 mt-1">
                    Saldo pendiente: ${saldoPendiente.toLocaleString()}
                    {montoPago === null && ' (usando saldo pendiente)'}
                  </p>
                )}
              </div>
              
              {/* ← Selector de método de pago */}
              <PaymentMethodSelector
                onSelect={(method) => {
                  setSelectedPaymentMethod(method);
                  
                  if (method === 'pendiente') {
                    setMontoPago(null);
                    setErrorMonto(null);
                    setMontoValidado(false);
                  } else if (method === 'efectivo') {
                    setShowBankAccountsModal(true);
                  }
                }}
                total={calcularPrecioTotal()}
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
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById('booking-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={verificandoPagos}
                  className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verificandoPagos ? (
                    <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>Verificando...</>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isEditing ? 'Actualizar y Pagar' : 'Confirmar Reserva'} - ${montoAMostrar.toLocaleString()}
                    </>
                  )}
                </button>
              )}
              
              {/* Botón volver */}
              <button
                type="button"
                onClick={handleBack}
                className="w-full mt-4 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
              >
                ← Volver a definir monto
              </button>
            </section>
            
            {/* ← MODAL DE CUENTAS BANCARIAS */}
            <BankAccountsModal
              isOpen={showBankAccountsModal}
              onClose={() => setShowBankAccountsModal(false)}
              accounts={cuentasBancarias}
              total={montoAMostrar}
              onConfirm={() => {
                setShowBankAccountsModal(false);
              }}
            />
          </>
        );
      }
      
      case 'success':
        if (citaCreada) {
          return (
            <div className="bg-white rounded-2xl shadow-lg p-6">
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

  // ← ELIMINAR BOTONES DUPLICADOS: Ocultar cuando estamos en paso 6 y showPaymentSelector es true
  const renderNavigationButtons = () => {
    if (currentStep === 'success') return null;
    // ← Ocultar botones de navegación en paso 6 cuando se muestra PaymentMethodSelector
    if (currentStep === 6 && selectedPaymentMethod) return null;
    
    return (
      <div className="sticky bottom-6 bg-white rounded-2xl shadow-lg p-6 border-t">
        <div className="flex gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-all"
            >
              ← Atrás
            </button>
          )}
          
          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToStep((currentStep + 1) as BookingStep)}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 4 ? 'Ir a Definir Monto →' : 
               currentStep === 5 ? 'Continuar a Método de Pago →' : 
               'Siguiente →'}
            </button>
          ) : (
            // ← Botón de submit en paso 6 (ya manejado dentro del paso)
            null
          )}
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          {currentStep === 5 
            ? '💡 Define el monto antes de seleccionar tu método de pago'
            : currentStep === 6
              ? '🔒 Al confirmar, serás redirigido a Bold para pagar de forma segura'
              : 'Al confirmar, aceptas nuestros términos y condiciones'}
        </p>
      </div>
    );
  };

  if (currentStep === 'success' && citaCreada) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          {renderStepContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {editingCitaId ? '✏️ Editar Reserva' : 'Reservar Cita'}
          </h1>
          <p className="text-lg text-gray-600">
            {editingCitaId 
              ? 'Ajusta los detalles y procede al pago de tu reserva existente'
              : 'Agenda tu tratamiento en DZ Salón en pocos pasos'}
          </p>
        </div>
        {renderProgressBar()}
        <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
          {renderStepContent()}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {renderNavigationButtons()}
        </form>
      </div>
      
      {/* ← MODAL PARA SUBIR COMPROBANTE */}
      {showUploadReceipt && citaCreada && ultimoPagoId && (
        <UploadReceipt
          citaId={citaCreada.id}
          pagoId={ultimoPagoId}  // ← AGREGAR ESTA PROP
          onSuccess={() => {
            setShowUploadReceipt(false);
            setCurrentStep('success');
            setPagoPendiente(true);
          }}
          onCancel={() => {
            setShowUploadReceipt(false);
          }}
        />
      )}
    </div>
  );
}