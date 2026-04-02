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

type BookingStep = 1 | 2 | 3 | 4 | 5 | 'success';

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
  
  // ← NUEVOS ESTADOS PARA CUENTAS BANCARIAS Y COMPROBANTE
  const [showUploadReceipt, setShowUploadReceipt] = useState(false);
  const [cuentasBancarias, setCuentasBancarias] = useState<any[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState<number | null>(null);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);
  
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

  // ← CARGAR CUENTAS BANCARIAS
  useEffect(() => {
    async function loadCuentasBancarias() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/cuentas-bancarias/`);
        const data = await res.json();
        setCuentasBancarias(data);
      } catch (err) {
        console.error('Error cargando cuentas bancarias:', err);
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

  const getBoldPaymentUrl = () => {
    const defaultUrl = 'https://checkout.bold.co/payment/LNK_LWD70PVJ5I';
    if (configuracion?.bold_payment_activo && configuracion?.bold_payment_link) {
      return configuracion.bold_payment_link;
    }
    return defaultUrl;
  };

  // Cargar servicio desde URL
  useEffect(() => {
    const servicioId = searchParams?.get('servicio');
    if (servicioId) {
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
  }, [searchParams]);

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
      default: return true;
    }
  };

  const handleNext = () => {
    const nextStep = (Number(currentStep) + 1) as BookingStep;
    const canProceed = canProceedToStep(nextStep);
    
    if (canProceed) {
      setCurrentStep(nextStep);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError('Por favor completa todos los campos requeridos');
    }
  };

  const handleBack = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedService) { setError('Por favor selecciona un servicio'); return; }
    if (!selectedProfessional) { setError('Por favor selecciona un profesional'); return; }
    if (!selectedDate || !selectedTime) { setError('Por favor selecciona fecha y hora'); return; }
    if (!clientData.cliente_nombre.trim()) { setError('Por favor ingresa tu nombre'); return; }
    if (!clientData.cliente_telefono.trim()) { setError('Por favor ingresa tu teléfono'); return; }
    if (!selectedPaymentMethod) { setError('Por favor selecciona un método de pago'); return; }
    
    if (currentStep !== 5) {
      setError('Por favor completa todos los pasos');
      return;
    }
    
    setLoading(true);
    
    try {
      const citaData: any = {
        servicio: selectedService.id,
        profesional: selectedProfessional,
        fecha: selectedDate?.toISOString().split('T')[0],
        hora_inicio: selectedTime,
        hora_fin: calculateEndTime(selectedTime, selectedService.duracion),
        precio_total: calcularPrecioTotal(),
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
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/`, {
        method: 'POST', headers, body: JSON.stringify(citaData),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.detail || 'Error al crear la cita');
        } catch { throw new Error(`Error ${res.status}: ${res.statusText}`); }
      }
      
      const nuevaCita = await res.json();
      
      // Guardar en localStorage
      localStorage.setItem('cita_pendiente_pago', JSON.stringify(nuevaCita));
      localStorage.setItem('dz_last_phone', clientData.cliente_telefono);
      localStorage.setItem('cita_id_pago', nuevaCita.id.toString());
      localStorage.setItem('cita_metodo_pago', selectedPaymentMethod);
      
      // MANEJAR DIFERENTES MÉTODOS DE PAGO
      if (selectedPaymentMethod === 'bold') {
        const boldUrl = getBoldPaymentUrl();
        alert('Serás redirigido a Bold para completar el pago seguro de $' + calcularPrecioTotal().toLocaleString());
        window.location.href = boldUrl;
        
      } else if (selectedPaymentMethod === 'efectivo') {
        // ← MOSTRAR MODAL DE SUBIDA DE COMPROBANTE
        setCitaCreada(nuevaCita);
        setShowUploadReceipt(true);
        return;  // ← Salir aquí, no cambiar a success todavía
        
      } else if (selectedPaymentMethod === 'pendiente') {
        setCitaCreada(nuevaCita);
        setCurrentStep('success');
        setPagoPendiente(true);
        
        alert('✅ Reserva guardada! Para pagar y confirmar, ve a "Mis Citas" en tu perfil.');
        
        if (isAuthenticated) {
          setTimeout(() => {
            router.push('/mis-citas');
          }, 2000);
        }
      }
      
    } catch (err: any) {
      console.error('❌ Error creando cita:', err);
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
  };

  const renderProgressBar = () => {
    const steps = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: 'Profesional' },
      { num: 3, label: 'Fecha y Hora' },
      { num: 4, label: 'Tus Datos' },
      { num: 5, label: 'Confirmar' },
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
      
case 5:
  console.log('🎯 Renderizando PASO 5 - Confirmación');
  return (
    <>
      <section className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">5️⃣ Confirma tu reserva</h2>
        
        {!showPaymentSelector ? (
          <>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">📋 Revisa cuidadosamente tu reserva antes de proceder al pago.</p>
            </div>
            
            <BookingSummary
              servicio={selectedService}
              profesional={selectedProfessional}
              profesionalData={selectedProfessionalData}
              fecha={selectedDate}
              hora={selectedTime}
              mode={mode}
              adicionalDomicilio={selectedService?.adicional_domicilio}
              clienteData={{
                nombre: clientData.cliente_nombre,
                telefono: clientData.cliente_telefono,
                email: clientData.cliente_email,
              }}
            />
            
            <button
              type="button"
              onClick={() => setShowPaymentSelector(true)}
              className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              Seleccionar Método de Pago →
            </button>
          </>
        ) : (
          <div className="space-y-6">
            {/* Selector de método de pago */}
            <PaymentMethodSelector
              onSelect={(method) => {
                setSelectedPaymentMethod(method);
                // ← ABRIR MODAL si selecciona transferencia
                if (method === 'efectivo') {
                  setShowBankAccountsModal(true);
                }
              }}
              total={calcularPrecioTotal()}
            />
            
            {/* Mensaje para "Pagar después" */}
            {selectedPaymentMethod === 'pendiente' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  ⏰ <strong>Reserva ahora, paga después:</strong> Tu cita quedará guardada. 
                  Para pagar y confirmar, ve a <strong>"Mis Citas"</strong> en tu perfil cuando estés listo.
                </p>
              </div>
            )}
            
            {/* Botón Confirmar - Solo mostrar si NO es transferencia (esa abre modal) */}
            {selectedPaymentMethod && selectedPaymentMethod !== 'efectivo' && (
              <button
                type="button"
                onClick={() => {
                  const form = document.getElementById('booking-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirmar Reserva - ${calcularPrecioTotal().toLocaleString()}
              </button>
            )}
            
            {/* Botón volver */}
            <button
              type="button"
              onClick={() => {
                setShowPaymentSelector(false);
                setSelectedPaymentMethod(null);
              }}
              className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
            >
              ← Volver al resumen
            </button>
          </div>
        )}
      </section>
      
      {/* ← MODAL DE CUENTAS BANCARIAS */}
      <BankAccountsModal
        isOpen={showBankAccountsModal}
        onClose={() => setShowBankAccountsModal(false)}
        accounts={cuentasBancarias}
        total={calcularPrecioTotal()}
        onConfirm={() => {
          setShowBankAccountsModal(false);
          // Trigger form submit después de cerrar modal
          const form = document.getElementById('booking-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
      />
    </>
  );
      
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

  // ← ELIMINAR BOTONES DUPLICADOS: Ocultar cuando estamos en paso 5 y showPaymentSelector es true
  const renderNavigationButtons = () => {
    if (currentStep === 'success') return null;
    if (currentStep === 5 && showPaymentSelector) return null;  // ← OCULTAR botones duplicados
    
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
          
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToStep((currentStep + 1) as BookingStep)}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 4 ? 'Ir a Confirmación →' : 'Siguiente →'}
            </button>
          ) : (
            <button
              type="submit"
              form="booking-form"
              disabled={loading}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>Procesando...</>
              ) : (
               <>
                   {/*<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="relative z-10">Confirmar y Pagar ${calcularPrecioTotal().toLocaleString()}</span>*/}
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          {currentStep === 5 
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reservar Cita</h1>
          <p className="text-lg text-gray-600">Agenda tu tratamiento en DZ Salón en pocos pasos</p>
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
      {showUploadReceipt && citaCreada && (
        <UploadReceipt
          citaId={citaCreada.id}
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