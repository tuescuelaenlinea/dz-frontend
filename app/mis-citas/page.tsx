// app/mis-citas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CitaDetailModal from '@/components/citas/CitaDetailModal';
import PublicidadModal from '@/components/admin/PublicidadModal';

interface Cita {
  id: number;
  codigo_reserva: string;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  precio_total: string;
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado';
  comprobante_pago_url: string | null;
  notas_cliente: string;
  fecha_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  profesional_id: number | null;
}

export default function MisCitasPage() {
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'historial'>('todas');
  const [saldosPendientes, setSaldosPendientes] = useState<{[key: number]: number}>({});
  
  // Estado para modal de detalle
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para acordeón
  const [expandedCita, setExpandedCita] = useState<number | null>(null);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?next=/mis-citas');
    }
  }, [isAuthenticated, authLoading, router]);

  // Cargar citas
  useEffect(() => {
    async function loadCitas() {
      if (!token) return;
      
      try {
        console.log('🔄 Cargando citas con token:', token ? 'presente' : 'ausente');
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/mis_citas/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Response status:', res.status);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'No se pudo leer el error');
          console.error(`❌ HTTP ${res.status}:`, errorText);
          
          if (res.status === 401) {
            router.push('/auth/login?next=/mis-citas');
            return;
          }
          throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        const data = await res.json();
        console.log('✅ Datos recibidos del API:', data);
        
        const citasList = Array.isArray(data) ? data : (data.results || []);
        console.log('✅ Citas procesadas:', citasList.length);
        setCitas(citasList);
        
      } catch (err: any) {
        console.error('❌ Error completo:', err);
        console.error('❌ Mensaje del error:', err?.message);
        console.error('❌ Stack trace:', err?.stack);
        
        if (err?.response) {
          console.error('❌ Response status:', err.response.status);
          console.error('❌ Response data:', err.response.data);
        }
        
        setError(`Error al cargar citas: ${err?.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    }
    loadCitas();
  }, [token, router]);

  // Cargar saldos pendientes de todas las citas
  useEffect(() => {
    async function loadSaldos() {
      if (!token || citas.length === 0) return;
      
      try {
        const saldos: {[key: number]: number} = {};
        
        for (const cita of citas) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/${cita.id}/pagos/`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            const totalPagado = (data.pagos || [])
              .filter((p: any) => p.estado === 'exitoso' || p.estado === 'pendiente')
              .reduce((sum: number, p: any) => sum + parseFloat(p.monto || 0), 0);
            
            const total = parseFloat(cita.precio_total) || 0;
            const saldo = total - totalPagado;
            
            if (saldo > 0) {
              saldos[cita.id] = saldo;
            }
          }
        }
        
        setSaldosPendientes(saldos);
      } catch (err) {
        console.error('Error cargando saldos:', err);
      }
    }
    
    loadSaldos();
  }, [citas, token]);

  const getStatusBadge = (estado: Cita['estado']) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-blue-100 text-blue-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pendiente: '⏳ Pendiente',
      confirmada: '✅ Confirmada',
      completada: '✨ Completada',
      cancelada: '❌ Cancelada',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };


  // Filtrar citas
  const filteredCitas = citas.filter((cita) => {
    if (filter === 'pendientes') {
      return ['pendiente', 'confirmada'].includes(cita.estado);
    }
    if (filter === 'historial') {
      return ['completada', 'cancelada'].includes(cita.estado);
    }
    return true;
  });

  // Ordenar por fecha
  const sortedCitas = [...filteredCitas].sort((a, b) => 
    new Date(b.fecha + 'T' + b.hora_inicio).getTime() - 
    new Date(a.fecha + 'T' + a.hora_inicio).getTime()
  );

  const formatPrice = (price: string) => `$${parseInt(price).toLocaleString()}`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  const getStatusConfig = (estado: Cita['estado']) => {
    const configs = {
      pendiente: { 
        bg: 'bg-yellow-900/50', 
        border: 'border-yellow-700', 
        text: 'text-yellow-300',
        icon: '⏳'
      },
      confirmada: { 
        bg: 'bg-blue-900/50', 
        border: 'border-blue-700', 
        text: 'text-blue-300',
        icon: '✅'
      },
      completada: { 
        bg: 'bg-green-900/50', 
        border: 'border-green-700', 
        text: 'text-green-300',
        icon: '✨'
      },
      cancelada: { 
        bg: 'bg-red-900/50', 
        border: 'border-red-700', 
        text: 'text-red-300',
        icon: '❌'
      },
    };
    return configs[estado];
  };

  // Abrir modal de detalle
  const handleVerDetalle = (cita: Cita) => {
    setSelectedCita(cita);
    setIsModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCita(null);
  };

  // Toggle acordeón
  const toggleExpand = (citaId: number) => {
    setExpandedCita(expandedCita === citaId ? null : citaId);
  };

  // Redirigir al asistente de reserva con cita precargada
  const handlePay = (citaId: number) => {
    router.push(`/citas?editar_cita=${citaId}`);
  };

  // Confirmar con profesional (WhatsApp)
  const handleConfirmWithProfessional = async (citaId: number) => {
    try {
      const cita = citas.find(c => c.id === citaId);
      if (!cita) return;
      
      const profsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/profesionales/`);
      const profs = await profsRes.json();
      const profesional = Array.isArray(profs) ? profs.find((p: any) => p.id === cita.profesional) : null;
      
      if (profesional?.telefono_whatsapp) {
        const mensaje = `*✅ CONFIRMACIÓN DE CITA*%0A%0A` +
          `*Código:* ${cita.codigo_reserva}%0A` +
          `*Cliente:* ${cita.cliente_nombre}%0A` +
          `*Servicio:* ${cita.servicio_nombre}%0A` +
          `*Fecha:* ${cita.fecha}%0A` +
          `*Hora:* ${cita.hora_inicio}%0A%0A` +
          `El cliente confirma su reserva. Por favor preparar el servicio.`;
        
        const telefonoLimpio = profesional.telefono_whatsapp.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        
        alert('✅ Notificación enviada al profesional por WhatsApp');
      } else {
        alert('⚠️ El profesional no tiene WhatsApp registrado');
      }
    } catch (err) {
      console.error('Error confirmando con profesional:', err);
      alert('Error al confirmar con el profesional');
    }
  };

  // Confirmar con administración
  const handleConfirmWithAdmin = async (citaId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/${citaId}/confirmar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        alert('✅ Solicitud de confirmación enviada a administración');
        const resCitas = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/mis_citas/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await resCitas.json();
        setCitas(Array.isArray(data) ? data : (data.results || []));
      } else {
        throw new Error('Error al confirmar');
      }
    } catch (err) {
      console.error('Error confirmando con admin:', err);
      alert('Error al enviar solicitud de confirmación');
    }
  };

  // Cancelar cita
  const handleCancelarCita = async (citaId: number) => {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    if (!token) {
      router.push('/auth/login?next=/mis-citas');
      return;
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/${citaId}/cancelar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo: 'Cancelada por el usuario' }),
      });
      
      if (!res.ok) throw new Error('Error al cancelar');
      
      const resCitas = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/mis_citas/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await resCitas.json();
      setCitas(Array.isArray(data) ? data : (data.results || []));
      
    } catch (err) {
      console.error('Error cancelando cita:', err);
      alert('Error al cancelar la cita');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      {/* MODAL DE PUBLICIDAD */}
      <PublicidadModal />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mis Citas</h1>
            <p className="text-gray-300">Gestiona tus reservas en DZ Salón</p>
          </div>
          <Link
            href="/citas"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            + Nueva Cita
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'pendientes', label: 'Próximas' },
            { key: 'historial', label: 'Historial' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de citas - ACORDEÓN */}
        {sortedCitas.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg mb-6">
              {filter === 'todas' 
                ? 'Aún no tienes reservas' 
                : `No tienes citas ${filter === 'pendientes' ? 'próximas' : 'en el historial'}`}
            </p>
            <Link
              href="/citas"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Reservar mi primera cita
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCitas.map((cita) => {
              const statusConfig = getStatusConfig(cita.estado);
              const isExpanded = expandedCita === cita.id;
              const saldoPendiente = saldosPendientes[cita.id];
              
              return (
                <div
                  key={cita.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                    statusConfig.bg
                  } ${statusConfig.border}`}
                >
                  {/* Header del acordeón - Click para expandir */}
                  <div
                    onClick={() => toggleExpand(cita.id)}
                    className="p-4 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Icono de estado */}
                      <span className="text-2xl">{statusConfig.icon}</span>
                      
                      {/* Información principal */}
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg ${statusConfig.text}`}>
                          {cita.servicio_nombre}
                        </h3>
                        <p className="text-sm text-gray-300">
                          📅 {formatDate(cita.fecha)} • 🕐 {cita.hora_inicio} - {cita.hora_fin}
                        </p>
                      </div>
                    </div>
                    
                    {/* Flecha de expansión */}
                    <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className={`w-6 h-6 ${statusConfig.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Contenido expandido */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400"> {statusConfig.icon} Estado:  {getStatusBadge(cita.estado)}</span>
                        <span className="font-mono text-white"> </span>
                      </div>

                      {/* Código de reserva */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">🔖 Código:</span>
                        <span className="font-mono text-white">{cita.codigo_reserva}</span>
                      </div>
                      
                      {/* Profesional */}
                      {cita.profesional_nombre && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">👨‍⚕️ Profesional:</span>
                          <span className="text-white">{cita.profesional_nombre}</span>
                        </div>
                      )}
                      
                      {/* Precio */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">💰 Total:</span>
                        <span className="text-green-400 font-bold">{formatPrice(cita.precio_total)}</span>
                        {saldoPendiente && saldoPendiente > 0 && (
                          <span className="text-orange-400 text-xs">
                            (Saldo pendiente: ${saldoPendiente.toLocaleString()})
                          </span>
                        )}
                      </div>
                      
                      {/* Notas */}
                      {cita.notas_cliente && (
                        <div className="text-sm">
                          <span className="text-gray-400">📝 Notas:</span>
                          <p className="text-gray-300 mt-1 italic">"{cita.notas_cliente}"</p>
                        </div>
                      )}
                      
                      {/* Estado de pago */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">💳 Pago:</span>
                        <span className={`font-medium ${
                          cita.pago_estado === 'pagado' ? 'text-green-400' :
                          cita.pago_estado === 'pendiente' ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>
                          {cita.pago_estado === 'pagado' ? 'Pagado' :
                           cita.pago_estado === 'pendiente' ? 'Pendiente' :
                           'Reembolsado'}
                        </span>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex gap-2 pt-3 border-t border-gray-700">
                        <button
                          onClick={() => handleVerDetalle(cita)}
                          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          👁️ Ver Detalle
                        </button>
                        
                        {['pendiente', 'confirmada'].includes(cita.estado) && (
                          <button
                            onClick={() => handleCancelarCita(cita.id)}
                            className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-700"
                          >
                            Cancelar
                          </button>
                        )}
                        
                        {cita.estado === 'completada' && (
                          <Link
                            href={`/servicios/${cita.servicio}`}
                            className="px-4 py-2 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 rounded-lg text-sm font-medium transition-colors border border-blue-700"
                          >
                            🔁 Reservar de nuevo
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {selectedCita && (
        <CitaDetailModal
          cita={selectedCita}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onPay={handlePay}
          onConfirmWithProfessional={handleConfirmWithProfessional}
          onConfirmWithAdmin={handleConfirmWithAdmin}
        />
      )}
    </div>
  );
}