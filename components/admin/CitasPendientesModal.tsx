// components/admin/CitasPendientesModal.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';

// ← ← ← INTERFACES TIPO SEGURAS ← ← ←
interface ServicioData {
  id: number;
  nombre: string;
  categoria_nombre?: string;
  duracion?: string;
  precio_min?: number | string;
}

interface ProfesionalData {
  id: number;
  nombre: string;
}

interface CitaPendiente {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  servicio: ServicioData;
  profesional: ProfesionalData | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string | number;
  estado: string;
  pago_estado: string;       // ← NUEVO: estado de pago (pendiente, parcial, pagado)
  pago_acumulado: string | number; // ← NUEVO: monto abonado
  notas_cliente?: string;
}

interface CitaSeleccionada {
  cita_id: number;
  codigo_reserva: string;
  servicio_id: number;
  servicio_nombre: string;
  profesional_id: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion: string | null;
  precio_total: number; // ← ESTO SERÁ EL SALDO PENDIENTE
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas_cliente: string;
  estado: string;
  pago_acumulado: number; // ← Para referencia
}

interface CitasPendientesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cita: CitaSeleccionada) => void;
  apiUrl: string;
  token?: string | null;
}

export default function CitasPendientesModal({
  isOpen,
  onClose,
  onSelect,
  apiUrl,
  token
}: CitasPendientesModalProps) {
  const [citas, setCitas] = useState<CitaPendiente[]>([]);
  const [filteredCitas, setFilteredCitas] = useState<CitaPendiente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // ← ← ← CARGAR CITAS AL ABRIR MODAL ← ← ←
  useEffect(() => {
    if (isOpen) {
      cargarCitasPendientes();
    }
  }, [isOpen]);

  // ← ← ← FILTRAR CUANDO CAMBIA BÚSQUEDA O CITAS ← ← ←
  useEffect(() => {
    filtrarCitas();
  }, [searchTerm, citas]);

  // ← ← ← FUNCIÓN PRINCIPAL: CARGAR CITAS DESDE API ← ← ←
  const cargarCitasPendientes = async () => {
    setLoading(true);
    try {
      // ← ← ← LLAMADA AL ENDPOINT PERSONALIZADO ← ← ←
      // Este endpoint ya filtra por sin_recibo=true y estados [pendiente, confirmada]
      const res = await fetch(
        `${apiUrl}/citas/sin-recibo-para-caja/`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error API:', errorText.substring(0, 200));
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const citasList = Array.isArray(data) ? data : (data.results || []);

      // ← ← ← NORMALIZAR DATOS Y CALCULAR SALDOS ← ← ←
      const citasNormalizadas = citasList.map((cita: any): CitaPendiente => {
        // Extraer datos básicos
        const servicioRaw = cita.servicio;
        const servicio: ServicioData = {
          id: typeof servicioRaw === 'object'
            ? servicioRaw?.id || cita.servicio_id || 0
            : parseInt(servicioRaw) || 0,
          nombre: servicioRaw?.nombre || cita.servicio_nombre || 'Servicio',
          categoria_nombre: servicioRaw?.categoria_nombre || cita.categoria_nombre,
          duracion: servicioRaw?.duracion || cita.duracion_servicio,
          precio_min: servicioRaw?.precio_min || cita.precio_min || 0
        };

       // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
        // ← ← ← CORRECCIÓN CLAVE: EXTRAER PROFESIONAL DE FORMA UNIVERSAL ← ← ←
        // ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
        // La API puede enviar 'profesional' como ID (4) o como objeto ({id:4, nombre: "Juan"})
        const rawProf = cita.profesional;
        const profId = typeof rawProf === 'object' 
          ? rawProf?.id 
          : (cita.profesional_id || rawProf);
        
        const profName = typeof rawProf === 'object' 
          ? rawProf?.nombre 
          : (cita.profesional_nombre || 'Sin Asignar');

        const profesional: ProfesionalData | null = (profId && profId !== 0)
          ? { id: Number(profId), nombre: String(profName) }
          : null;

        // Parsear precios
        const precioTotal = typeof cita.precio_total === 'string'
          ? parseFloat(cita.precio_total.replace(/[^0-9.-]+/g, '')) || 0
          : Number(cita.precio_total) || 0;

        const pagoAcumulado = typeof cita.pago_acumulado === 'string'
          ? parseFloat(cita.pago_acumulado.replace(/[^0-9.-]+/g, '')) || 0
          : Number(cita.pago_acumulado) || 0;

        return {
          id: cita.id,
          codigo_reserva: cita.codigo_reserva || '',
          cliente_nombre: cita.cliente_nombre || '',
          cliente_telefono: cita.cliente_telefono || '',
          cliente_email: cita.cliente_email || '',
          servicio,
          profesional,
          fecha: cita.fecha || new Date().toISOString().split('T')[0],
          hora_inicio: cita.hora_inicio || '09:00',
          hora_fin: cita.hora_fin || '10:00',
          precio_total: precioTotal,
          pago_estado: cita.pago_estado || 'pendiente',
          pago_acumulado: pagoAcumulado, // Guardar el abono
          estado: cita.estado || 'pendiente',
          notas_cliente: cita.notas_cliente || ''
        };
      });

      setCitas(citasNormalizadas);
      setFilteredCitas(citasNormalizadas);

    } catch (err) {
      console.error('❌ Error cargando citas:', err);
      setCitas([]);
      setFilteredCitas([]);
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← FUNCIÓN DE FILTRADO LOCAL ← ← ←
  const filtrarCitas = () => {
    if (!citas?.length) {
      setFilteredCitas([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredCitas(citas);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const resultados = citas.filter(cita => {
      const campos = [
        cita.codigo_reserva?.toLowerCase(),
        cita.cliente_nombre?.toLowerCase(),
        cita.cliente_telefono,
        cita.cliente_email?.toLowerCase(),
        cita.servicio?.nombre?.toLowerCase(),
        cita.profesional?.nombre?.toLowerCase()
      ].filter(Boolean) as string[];
      return campos.some(campo => campo.includes(term));
    });
    setFilteredCitas(resultados);
  };

  // ← ← ← MANEJAR SELECCIÓN DE CITA ← ← ←
  const handleSelect = (cita: CitaPendiente) => {
    // Calcular el saldo pendiente para el recibo
    const saldoPendiente = Math.max(0, (typeof cita.precio_total === 'number' ? cita.precio_total : 0) - (typeof cita.pago_acumulado === 'number' ? cita.pago_acumulado : 0));

    const citaParaRecibo: CitaSeleccionada = {
      cita_id: cita.id,
      codigo_reserva: cita.codigo_reserva,
      servicio_id: cita.servicio.id,
      servicio_nombre: cita.servicio.nombre,
      profesional_id: cita.profesional?.id ?? null,
      profesional_nombre: cita.profesional?.nombre ?? null,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion: cita.servicio.duracion ?? null,
      precio_total: saldoPendiente, // ← Se agrega solo el saldo pendiente al recibo
      cliente_nombre: cita.cliente_nombre,
      cliente_telefono: cita.cliente_telefono,
      cliente_email: cita.cliente_email,
      notas_cliente: cita.notas_cliente || '',
      estado: cita.estado,
      pago_acumulado: typeof cita.pago_acumulado === 'number' ? cita.pago_acumulado : 0
    };
    
    onSelect(citaParaRecibo);
    onClose();
  };

  // ← ← ← RENDER CONDICIONAL ← ← ←
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ← ← ← HEADER ← ← ← */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">📅 Agregar Cita al Recibo</h2>
            <p className="text-sm text-gray-400 mt-1">
              Busca citas pendientes o confirmadas sin pagar totalmente
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← ← ← BARRA DE BÚSQUEDA ← ← ← */}
        <div className="p-6 border-b border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por código, cliente o servicio..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* ← ← ← LISTA DE RESULTADOS ← ← ← */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Cargando citas...</span>
            </div>
          ) : filteredCitas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                {searchTerm ? '🔍 No se encontraron coincidencias' : '📭 No hay citas disponibles'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCitas.map((cita) => {
                // Calcular saldos para visualización
                const totalNum = typeof cita.precio_total === 'number' ? cita.precio_total : 0;
                const abonoNum = typeof cita.pago_acumulado === 'number' ? cita.pago_acumulado : 0;
                const saldoNum = Math.max(0, totalNum - abonoNum);
                
                // Determinar si tiene abono (es "Confirmada")
                const tieneAbono = abonoNum > 0;
                const esConfirmada = cita.estado === 'confirmada' || tieneAbono;

                return (
                  <button
                    key={cita.id}
                    onClick={() => handleSelect(cita)}
                    className="w-full p-4 bg-gray-900 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg transition-all text-left group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* ← ← ← BADGES Y CÓDIGO ← ← ← */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800">
                            {cita.codigo_reserva}
                          </span>
                          
                          {/* Badge de Estado (Pendiente o Confirmada) */}
                          <span className={`text-xs px-2 py-1 rounded border ${
                            esConfirmada
                              ? 'bg-green-900/30 text-green-400 border-green-800'
                              : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                          }`}>
                            {esConfirmada ? '✅ Confirmada' : '⏳ Pendiente'}
                          </span>

                          {/* Badge de Pago (si tiene abono) */}
                          {tieneAbono && (
                            <span className="text-xs px-2 py-1 rounded border bg-blue-900/30 text-blue-400 border-blue-800">
                              💰 Abono: ${Math.round(abonoNum).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* ← ← ← INFORMACIÓN DEL CLIENTE Y SERVICIO ← ← ← */}
                        <p className="font-semibold text-white truncate mb-1">
                          👤 {cita.cliente_nombre || 'Cliente sin nombre'}
                        </p>
                        
                        <p className="text-sm text-purple-400 font-medium">
                          🔧 {cita.servicio.nombre}
                        </p>
                        
                        {cita.profesional && (
                          <p className="text-sm text-gray-400">
                            👨‍⚕️ {cita.profesional.nombre}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span>📅 {new Date(cita.fecha).toLocaleDateString('es-CO')}</span>
                          <span>🕐 {cita.hora_inicio} - {cita.hora_fin}</span>
                        </div>
                      </div>

                      {/* ← ← ← PRECIOS (Saldo Pendiente) ← ← ← */}
                      <div className="text-right ml-4 flex-shrink-0">
                        {tieneAbono ? (
                          <>
                            <p className="text-xs text-gray-500 line-through">
                              Total: ${Math.round(totalNum).toLocaleString()}
                            </p>
                            <p className="text-lg font-bold text-orange-400">
                              Saldo: ${Math.round(saldoNum).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-green-400">
                            ${Math.round(totalNum).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-400 transition-colors">
                          Click para agregar →
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ← ← ← FOOTER ← ← ← */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
          <p className="text-sm text-gray-400 text-center">
            {filteredCitas.length} cita{filteredCitas.length !== 1 ? 's' : ''} disponible{filteredCitas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}