// app/mis-citas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CitaDetailModal from '@/components/citas/CitaDetailModal';  // ← NUEVO IMPORT

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
  
  // ← NUEVO: Estado para modal de detalle
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?next=/mis-citas');
    }
  }, [isAuthenticated, authLoading, router]);

  // Cargar citas
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
        // ← LOG PARA VER EL ERROR DEL SERVIDOR:
        const errorText = await res.text().catch(() => 'No se pudo leer el error');
        console.error(`❌ HTTP ${res.status}:`, errorText);
        
        if (res.status === 401) {
          router.push('/auth/login?next=/mis-citas');
          return;
        }
        throw new Error(`Error ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('✅ Datos recibidos del API:', data);  // ← LOG DE DATOS
      
      const citasList = Array.isArray(data) ? data : (data.results || []);
      console.log('✅ Citas procesadas:', citasList.length);
      setCitas(citasList);
      
    } catch (err: any) {
      // ← LOGS PARA DEPURAR:
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

// ← NUEVO: Cargar saldos pendientes de todas las citas
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

  // ← NUEVO: Abrir modal de detalle
  const handleVerDetalle = (cita: Cita) => {
    setSelectedCita(cita);
    setIsModalOpen(true);
  };

  // ← NUEVO: Cerrar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCita(null);
  };

  // ← NUEVO: Redirigir al asistente de reserva con cita precargada
const handlePay = (citaId: number) => {
  // Redirigir al asistente con parámetro para editar cita
  router.push(`/citas?editar_cita=${citaId}`);
};

  // ← NUEVO: Confirmar con profesional (WhatsApp)
  const handleConfirmWithProfessional = async (citaId: number) => {
    try {
      const cita = citas.find(c => c.id === citaId);
      if (!cita) return;
      
      // Obtener profesional (necesitarías un endpoint para esto)
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

  // ← NUEVO: Confirmar con administración
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
        // Recargar citas
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Citas</h1>
            <p className="text-gray-600">Gestiona tus reservas en DZ Salón</p>
          </div>
          <Link
            href="/citas"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de citas */}
        {sortedCitas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg mb-6">
              {filter === 'todas' 
                ? 'Aún no tienes reservas' 
                : `No tienes citas ${filter === 'pendientes' ? 'próximas' : 'en el historial'}`}
            </p>
            <Link
              href="/citas"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Reservar mi primera cita
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCitas.map((cita) => (
              <div
                key={cita.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info principal */}
                  <div className="flex-1">
                  


                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg text-gray-900">{cita.servicio_nombre}</h3>
                      {getStatusBadge(cita.estado)}
                      {/* ← NUEVO: Badge de saldo pendiente */}
                      {saldosPendientes[cita.id] && saldosPendientes[cita.id] > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                          💰 Saldo: ${saldosPendientes[cita.id].toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">📅 Fecha</p>
                        <p className="font-medium">{formatDate(cita.fecha)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">🕐 Hora</p>
                        <p className="font-medium">{cita.hora_inicio} - {cita.hora_fin}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">💰 Total</p>
                        <p className="font-medium text-green-600">{formatPrice(cita.precio_total)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">🔖 Código</p>
                        <p className="font-mono font-medium">{cita.codigo_reserva}</p>
                      </div>
                    </div>
                    
                    {cita.notas_cliente && (
                      <p className="text-sm text-gray-500 mt-3 italic">
                        📝 "{cita.notas_cliente}"
                      </p>
                    )}
                  </div>
                  
                  {/* ← CAMBIO: Botón "Ver" en lugar de "Confirmar" */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleVerDetalle(cita)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                      👁️ Ver Detalle
                    </button>
                    
                    {['pendiente', 'confirmada'].includes(cita.estado) && (
                      <button
                        onClick={() => handleCancelarCita(cita.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    
                    {cita.estado === 'completada' && (
                      <Link
                        href={`/servicios/${cita.servicio}`}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors text-center"
                      >
                        🔁 Reservar de nuevo
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ← NUEVO: Modal de Detalle */}
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