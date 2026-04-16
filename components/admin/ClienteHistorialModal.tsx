// components/admin/ClienteHistorialModal.tsx
'use client';
import { useState } from 'react';

// ← REEMPLAZA la interfaz CitaData existente con esta:
interface CitaData {
  id: number;
  codigo_reserva: string;
  servicio_nombre: string;
  profesional_nombre: string | null;
  profesional_id: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  servicio: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado' | 'parcial';
  estado_pago_detalle?: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  notas_cliente?: string;
}

interface ClienteUnico {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  total_citas: number;
  ultima_cita: string;
  citas: CitaData[];
}

interface ClienteHistorialModalProps {
  cliente: ClienteUnico;
  isOpen: boolean;
  onClose: () => void;
  onCitaClick: (cita: CitaData) => void;
}

export default function ClienteHistorialModal({
  cliente,
  isOpen,
  onClose,
  onCitaClick,
}: ClienteHistorialModalProps) {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  if (!isOpen) return null;

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    return `$${num.toLocaleString('es-CO')}`;
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'confirmada': return 'bg-blue-100 text-blue-800';
      case 'completada': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar citas por estado
  const citasFiltradas = filtroEstado === 'todos' 
    ? cliente.citas 
    : cliente.citas.filter(c => c.estado === filtroEstado);

  // Ordenar por fecha (más reciente primero)
  const citasOrdenadas = [...citasFiltradas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">📋 Historial de Citas</h2>
            <p className="text-sm opacity-90">{cliente.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info del Cliente */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{cliente.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{cliente.telefono}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Citas</p>
              <p className="font-medium text-blue-600">{cliente.total_citas}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            {['todos', 'pendiente', 'confirmada', 'completada', 'cancelada'].map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filtroEstado === estado
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {estado === 'todos' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Citas */}
        <div className="p-6">
          {citasOrdenadas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay citas para mostrar</p>
          ) : (
            <div className="space-y-3">
              {citasOrdenadas.map((cita) => (
                <div
                  key={cita.id}
                  onClick={() => onCitaClick(cita)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500">{cita.codigo_reserva}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getEstadoColor(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 mt-1">{cita.servicio_nombre}</p>
                      {cita.profesional_nombre && (
                        <p className="text-sm text-gray-600">👨‍⚕️ {cita.profesional_nombre}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatPrice(cita.precio_total)}</p>
                      <p className="text-sm text-gray-500">{formatDate(cita.fecha)}</p>
                      <p className="text-sm text-gray-500">{cita.hora_inicio}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}