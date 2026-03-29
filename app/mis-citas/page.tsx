// app/mis-citas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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
  metodo_pago: string;
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado';
  notas_cliente: string;
  fecha_reserva: string;
}

export default function MisCitasPage() {
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'historial'>('todas');

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?next=/mis-citas');
    }
  }, [isAuthenticated, authLoading, router]);

  // ← FIX: Cargar citas usando endpoint 'mis_citas' que filtra por usuario
  useEffect(() => {
    async function loadCitas() {
      if (!token) return;
      
      try {
        // ← USAR endpoint específico que ya filtra por usuario en backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/mis_citas/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/auth/login?next=/mis-citas');
            return;
          }
          throw new Error('Error al cargar citas');
        }
        
        const data = await res.json();
        // El endpoint devuelve array directo
        const citasList = Array.isArray(data) ? data : (data.results || []);
        setCitas(citasList);
      } catch (err) {
        console.error('Error cargando citas:', err);
        setError('No se pudieron cargar tus citas');
      } finally {
        setLoading(false);
      }
    }
    loadCitas();
  }, [token, router]);

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

  // Ordenar por fecha (más recientes primero)
  const sortedCitas = [...filteredCitas].sort((a, b) => 
    new Date(b.fecha + 'T' + b.hora_inicio).getTime() - 
    new Date(a.fecha + 'T' + a.hora_inicio).getTime()
  );

  const formatPrice = (price: string) => {
    return `$${parseInt(price).toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
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

  // ← FIX: Cancelar cita usando endpoint con autenticación
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
      
      // Recargar solo MIS citas (no todas)
      const resCitas = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/citas/mis_citas/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await resCitas.json();
      const citasList = Array.isArray(data) ? data : (data.results || []);
      setCitas(citasList);
      
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
                  
                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    {['pendiente', 'confirmada'].includes(cita.estado) && (
                      <>
                        <a
                          href={`https://wa.me/573157072678?text=Hola,%20quiero%20confirmar%20mi%20cita%20#${cita.codigo_reserva}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors text-center"
                        >
                          💬 Confirmar
                        </a>
                        <button
                          onClick={() => handleCancelarCita(cita.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
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
    </div>
  );
}