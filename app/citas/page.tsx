// app/citas/page.tsx
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

// Tipos para los pasos del wizard
type BookingStep = 1 | 2 | 3 | 4 | 'success';

export default function CitasPage() {
  const { user, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estado del wizard
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  
  // Datos de la reserva
  const [mode, setMode] = useState<'salon' | 'domicilio'>('salon');
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Datos del cliente - ← FIX: Pre-llenar teléfono con username si está autenticado
  const [clientData, setClientData] = useState({
    cliente_nombre: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
    cliente_telefono: user?.username || '',  // ← FIX: Fallback con username
    cliente_email: user?.email || '',
    notas_cliente: '',
  });
  
  // Estados de envío
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citaCreada, setCitaCreada] = useState<{ id: number; codigo_reserva: string } | null>(null);

  // ← NUEVO: Cargar servicio desde URL si viene pre-seleccionado
  useEffect(() => {
    const servicioId = searchParams?.get('servicio');
    
    if (servicioId) {
      async function loadServicio() {
        try {
          const allServicios = await (api.getAllServicios 
            ? api.getAllServicios() 
            : api.getServicios());
          
          const serviciosList = Array.isArray(allServicios) 
            ? allServicios 
            : (allServicios.results || allServicios);
          
          const servicioEncontrado = serviciosList.find(
            (s: Servicio) => s.id.toString() === servicioId
          );
          
          if (servicioEncontrado) {
            setSelectedService(servicioEncontrado);
          }
        } catch (err) {
          console.error('Error cargando servicio desde URL:', err);
        }
      }
      loadServicio();
    }
  }, [searchParams]);

  // Actualizar datos del cliente cuando cambia el usuario - ← FIX: Incluir teléfono
  useEffect(() => {
    if (isAuthenticated && user) {
      setClientData(prev => ({
        ...prev,
        cliente_nombre: `${user.first_name || ''} ${user.last_name || ''}`.trim() || prev.cliente_nombre,
        cliente_email: user.email || prev.cliente_email,
        // ← FIX: Si no hay teléfono guardado, usar username como fallback
        cliente_telefono: prev.cliente_telefono || user.username || prev.cliente_telefono,
      }));
    }
  }, [isAuthenticated, user]);

  // ← NUEVO: Validar paso antes de avanzar
  const canProceedToStep = (step: BookingStep): boolean => {
    switch (step) {
      case 2: return selectedService !== null;
      case 3: return selectedService !== null && selectedDate !== null && selectedTime !== null;
      case 4: return selectedService !== null && selectedDate !== null && selectedTime !== null && 
               (clientData.cliente_nombre.trim() && clientData.cliente_telefono.trim());
      default: return true;
    }
  };

  const handleNext = () => {
    if (canProceedToStep((currentStep + 1) as BookingStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4) as BookingStep);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1) as BookingStep);
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

  // ← FIX: Calcular hora de fin correctamente
  const calculateEndTime = (startTime: string | null, duracion: string): string => {
    if (!startTime || !duracion) return startTime || '';
    
    // Parsear duración (ej: "60 minutos" → 60)
    const minutes = parseInt(duracion.replace(/\D/g, '')) || 60;
    const [hours, mins] = startTime.split(':').map(Number);
    
    const endDate = new Date();
    endDate.setHours(hours, mins + minutes, 0, 0);
    
    // Formatear como HH:MM
    return endDate.toTimeString().slice(0, 5);
  };

  // ← FIX: handleSubmit corregido para evitar error 400
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // ← FIX: Validaciones finales - teléfono obligatorio para TODOS
    if (!selectedService) {
      setError('Por favor selecciona un servicio');
      return;
    }
    if (!selectedDate || !selectedTime) {
      setError('Por favor selecciona fecha y hora');
      return;
    }
    if (!clientData.cliente_nombre.trim()) {
      setError('Por favor ingresa tu nombre');
      setCurrentStep(3);
      return;
    }
    if (!clientData.cliente_telefono.trim()) {  // ← FIX: Validar teléfono para todos
      setError('Por favor ingresa tu teléfono para contactarte');
      setCurrentStep(3);  // ← Volver al paso de datos
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    
    try {
      // ← FIX: Preparar datos compatibles con el backend
      const citaData: any = {
        servicio: selectedService.id,
        profesional: null,
        fecha: selectedDate?.toISOString().split('T')[0],
        hora_inicio: selectedTime,
        hora_fin: calculateEndTime(selectedTime, selectedService.duracion),
        precio_total: calcularPrecioTotal(),
        metodo_pago: 'efectivo',
        // ← FIX: Campos obligatorios con trim()
        cliente_nombre: clientData.cliente_nombre.trim(),
        cliente_telefono: clientData.cliente_telefono.trim(),  // ← FIX: Asegurar que no esté vacío
        cliente_email: clientData.cliente_email?.trim() || '',
        notas_cliente: clientData.notas_cliente?.trim() || '',
        disponible_salon: mode === 'salon',
        disponible_domicilio: mode === 'domicilio',
      };
      
      // Headers con token si está autenticado
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // ← DEBUG: Log para ver qué se está enviando
      console.log('📤 Enviando cita:', JSON.stringify(citaData, null, 2));
      
      // Crear cita
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(citaData),
      });
      
      // ← DEBUG: Log de respuesta
      console.log('📥 Respuesta:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          // ← FIX: Mostrar mensaje específico del campo que falló
          if (errorData.cliente_telefono) {
            throw new Error('El teléfono es requerido para confirmar tu reserva');
          }
          if (errorData.cliente_nombre) {
            throw new Error('El nombre es requerido para confirmar tu reserva');
          }
          throw new Error(errorData.detail || errorData.non_field_errors?.join(', ') || 'Error al crear la cita');
        } catch {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
      }
      
      const nuevaCita = await res.json();
      setCitaCreada({ id: nuevaCita.id, codigo_reserva: nuevaCita.codigo_reserva });
      setCurrentStep('success');
      
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
    setSelectedDate(null);
    setSelectedTime(null);
    setClientData({
      cliente_nombre: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
      cliente_telefono: user?.username || '',  // ← FIX: Mantener fallback
      cliente_email: user?.email || '',
      notas_cliente: '',
    });
    setCitaCreada(null);
    setError(null);
    setMode('salon');
  };

  // ← NUEVO: Renderizar barra de progreso
  const renderProgressBar = () => {
    const steps = [
      { num: 1, label: 'Servicio' },
      { num: 2, label: 'Fecha y Hora' },
      { num: 3, label: 'Tus Datos' },
      { num: 4, label: 'Confirmar' },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            
            return (
              <div key={step.num} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    isActive || isCompleted ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.num ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ← NUEVO: Renderizar contenido del paso actual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              1️⃣ Selecciona tu servicio
            </h2>
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              2️⃣ Elige fecha y hora
            </h2>
            <DateTimePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              servicioId={selectedService?.id || null}
              profesionalId={null}
              mode={mode}
            />
          </section>
        );
        
      case 3:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              3️⃣ Tus datos
            </h2>
            <ClientInfoForm
              isAuthenticated={isAuthenticated}
              userData={user}
              formData={clientData}
              onFormChange={handleClientChange}
            />
          </section>
        );
        
      case 4:
        return (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              4️⃣ Confirma tu reserva
            </h2>
            <BookingSummary
              servicio={selectedService}
              fecha={selectedDate}
              hora={selectedTime}
              mode={mode}
              adicionalDomicilio={selectedService?.adicional_domicilio}
              clienteData={clientData}
            />
          </section>
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

  // ← NUEVO: Renderizar botones de navegación
  const renderNavigationButtons = () => {
    if (currentStep === 'success') return null;
    
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
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToStep((currentStep + 1) as BookingStep)}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="submit"
              form="booking-form"
              disabled={loading}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Procesando...
                </>
              ) : (
                <>
                  ✅ Confirmar - ${calcularPrecioTotal().toLocaleString()}
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          Al confirmar, aceptas nuestros términos y condiciones
        </p>
      </div>
    );
  };

  // ← NUEVO: Si es éxito, mostrar solo eso
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Reservar Cita
          </h1>
          <p className="text-lg text-gray-600">
            Agenda tu tratamiento en DZ Salón en pocos pasos
          </p>
        </div>

        {/* Barra de progreso */}
        {renderProgressBar()}

        {/* Formulario */}
        <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Contenido del paso actual (solo uno visible) */}
          {renderStepContent()}

          {/* Mensajes de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Botones de navegación */}
          {renderNavigationButtons()}
        </form>
      </div>
    </div>
  );
}