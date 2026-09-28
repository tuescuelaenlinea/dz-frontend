// app/admin/costos-fijos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardCostosFijos from '@/components/admin/costos-fijos/DashboardCostosFijos';
import CostoFijoCard from '@/components/admin/costos-fijos/CostoFijoCard';
import FiltrosCostosFijos, { Filtros } from '@/components/admin/costos-fijos/FiltrosCostosFijos';
import CostoFijoModal from '@/components/admin/costos-fijos/CostoFijoModal';
import ProyeccionAnual from '@/components/admin/costos-fijos/ProyeccionAnual';
import {
  getCostosFijos,
  createCostoFijo,
  updateCostoFijo,
  deleteCostoFijo,
  marcarComoPagado,
  proyectarCosto,
  replicarCostosRecurrentes,
  getResumenMensual,
  getProyeccionAnual,
  type CostoFijoMensual,
  type ResumenMensual,
  type ProyeccionAnual as ProyeccionAnualType,
} from '@/lib/api/costosFijos';

export default function CostosFijosPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  // Estados principales
  const [costosFijos, setCostosFijos] = useState<CostoFijoMensual[]>([]);
  const [resumen, setResumen] = useState<ResumenMensual | null>(null);
  const [proyeccionAnual, setProyeccionAnual] = useState<ProyeccionAnualType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  // Filtros (DECLARACIÓN ÚNICA)
  const [filtros, setFiltros] = useState<Filtros>({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    categoria: '',
    estado: '',
    es_recurrente: undefined,
    es_esencial: undefined,
  });

  // Modales
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalProyeccionOpen, setModalProyeccionOpen] = useState(false);
  const [modalPagadoOpen, setModalPagadoOpen] = useState(false);
  const [costoSeleccionado, setCostoSeleccionado] = useState<CostoFijoMensual | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'proyeccion'>('lista');

  // Cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [costos, resumenData, proyeccionData] = await Promise.all([
        getCostosFijos(filtros),
        getResumenMensual(filtros.mes, filtros.anio),
        getProyeccionAnual(filtros.anio),
      ]);

      setCostosFijos(costos);
      setResumen(resumenData);
      setProyeccionAnual(proyeccionData);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      alert('Error al cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  // Handlers
  const handleCrear = async (data: Partial<CostoFijoMensual>) => {
    try {
      await createCostoFijo(data);
      alert('✅ Costo fijo creado exitosamente');
      setModalCrearOpen(false);
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleEditar = async (data: Partial<CostoFijoMensual>) => {
    if (!costoSeleccionado) return;
    try {
      await updateCostoFijo(costoSeleccionado.id, data);
      alert('✅ Costo fijo actualizado');
      setModalEditarOpen(false);
      setCostoSeleccionado(null);
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este costo fijo?')) return;
    try {
      await deleteCostoFijo(id);
      alert('✅ Costo fijo eliminado');
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleMarcarPagado = async (
    id: number,
    data: { fecha_pago_real?: string; referencia_pago?: string; notas?: string }
  ) => {
    setLoadingAction(id);
    try {
      await marcarComoPagado(id, data);
      alert('✅ Costo marcado como pagado');
      setModalPagadoOpen(false);
      setCostoSeleccionado(null);
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleProyectar = async (
    id: number,
    data: { monto_proyectado?: number; mes_referencia?: number; anio_referencia?: number }
  ) => {
    setLoadingAction(id);
    try {
      await proyectarCosto(id, data);
      alert('✅ Proyección creada exitosamente');
      setModalProyeccionOpen(false);
      setCostoSeleccionado(null);
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReplicar = async () => {
    if (!confirm('¿Replicar todos los costos recurrentes del mes anterior al mes actual?')) return;
    
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    try {
      const result = await replicarCostosRecurrentes(mesActual, anioActual);
      alert(
        `✅ Replicación completada\n\n` +
        `Creados: ${result.resumen.creados}\n` +
        `Omitidos: ${result.resumen.omitidos}\n` +
        `Errores: ${result.resumen.errores}`
      );
      cargarDatos();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const formatMoney = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-700 border-t-zinc-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 flex items-center gap-2">
            💰 Costos Fijos Mensuales
          </h1>
          <p className="text-zinc-400 mt-1">
            Control, planificación y proyección de gastos recurrentes
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setVistaActual(vistaActual === 'lista' ? 'proyeccion' : 'lista')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-medium transition-all"
          >
            {vistaActual === 'lista' ? '📊 Proyección Anual' : '📋 Ver Lista'}
          </button>
          <button
            onClick={handleReplicar}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-medium transition-all"
          >
            🔄 Replicar
          </button>
          <button
            onClick={() => setModalCrearOpen(true)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
          >
            + Nuevo Costo
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {resumen && <DashboardCostosFijos resumen={resumen} formatMoney={formatMoney} />}

      {/* Vista de Proyección Anual */}
      {vistaActual === 'proyeccion' && proyeccionAnual && (
        <ProyeccionAnual proyeccion={proyeccionAnual} formatMoney={formatMoney} />
      )}

      {/* Vista de Lista */}
      {vistaActual === 'lista' && (
        <>
          {/* Filtros */}
          <FiltrosCostosFijos filtros={filtros} setFiltros={setFiltros} />

          {/* Lista de Costos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costosFijos.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">No hay costos fijos registrados</p>
                <p className="text-gray-500 text-sm mt-2">
                  Crea tu primer costo fijo para comenzar
                </p>
              </div>
            ) : (
              costosFijos.map((costo) => (
                <CostoFijoCard
                  key={costo.id}
                  costo={costo}
                  onEditar={(c) => {
                    setCostoSeleccionado(c);
                    setModalEditarOpen(true);
                  }}
                  onEliminar={handleEliminar}
                  onMarcarPagado={(c) => {
                    setCostoSeleccionado(c);
                    setModalPagadoOpen(true);
                  }}
                  onProyectar={(c) => {
                    setCostoSeleccionado(c);
                    setModalProyeccionOpen(true);
                  }}
                  formatMoney={formatMoney}
                  loading={loadingAction === costo.id}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {modalCrearOpen && (
        <CostoFijoModal
          isOpen={modalCrearOpen}
          onClose={() => setModalCrearOpen(false)}
          onSubmit={handleCrear}
          mode="crear"
          mesDefault={filtros.mes}
          anioDefault={filtros.anio}
        />
      )}

      {modalEditarOpen && costoSeleccionado && (
        <CostoFijoModal
          isOpen={modalEditarOpen}
          onClose={() => {
            setModalEditarOpen(false);
            setCostoSeleccionado(null);
          }}
          onSubmit={handleEditar}
          mode="editar"
          costo={costoSeleccionado}
        />
      )}

      {modalPagadoOpen && costoSeleccionado && (
        <ModalMarcarPagado
          isOpen={modalPagadoOpen}
          onClose={() => {
            setModalPagadoOpen(false);
            setCostoSeleccionado(null);
          }}
          onSubmit={(data) => handleMarcarPagado(costoSeleccionado.id, data)}
          costo={costoSeleccionado}
          formatMoney={formatMoney}
          loading={loadingAction === costoSeleccionado.id}
        />
      )}

      {modalProyeccionOpen && costoSeleccionado && (
        <ModalProyectar
          isOpen={modalProyeccionOpen}
          onClose={() => {
            setModalProyeccionOpen(false);
            setCostoSeleccionado(null);
          }}
          onSubmit={(data) => handleProyectar(costoSeleccionado.id, data)}
          costo={costoSeleccionado}
          formatMoney={formatMoney}
          loading={loadingAction === costoSeleccionado.id}
        />
      )}
    </div>
  );
}

// Modal para marcar como pagado
function ModalMarcarPagado({
  isOpen,
  onClose,
  onSubmit,
  costo,
  formatMoney,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { fecha_pago_real?: string; referencia_pago?: string; notas?: string }) => void;
  costo: CostoFijoMensual;
  formatMoney: (value: string | number) => string;
  loading: boolean;
}) {
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">✅ Marcar como Pagado</h3>
          <p className="text-sm text-gray-400 mt-1">{costo.nombre}</p>
          <p className="text-2xl font-bold text-green-400 mt-2">{formatMoney(costo.monto)}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📅 Fecha de Pago
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📄 Referencia / Comprobante
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Transf-12345, Factura 678"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              📝 Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ fecha_pago_real: fechaPago, referencia_pago: referencia, notas })}
            disabled={loading}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              '✅ Marcar Pagado'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para proyectar
function ModalProyectar({
  isOpen,
  onClose,
  onSubmit,
  costo,
  formatMoney,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { monto_proyectado?: number; mes_referencia?: number; anio_referencia?: number }) => void;
  costo: CostoFijoMensual;
  formatMoney: (value: string | number) => string;
  loading: boolean;
}) {
  const [montoProyectado, setMontoProyectado] = useState<number>(Number(costo.monto));
  const [mesProyectado, setMesProyectado] = useState(costo.mes_referencia + 1 > 12 ? 1 : costo.mes_referencia + 1);
  const [anioProyectado, setAnioProyectado] = useState(costo.mes_referencia + 1 > 12 ? costo.anio_referencia + 1 : costo.anio_referencia);

  if (!isOpen) return null;

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">📊 Proyectar Costo</h3>
          <p className="text-sm text-gray-400 mt-1">{costo.nombre}</p>
          <p className="text-lg text-gray-300 mt-2">
            Monto actual: <span className="font-bold text-white">{formatMoney(costo.monto)}</span>
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              💰 Monto Proyectado
            </label>
            <input
              type="number"
              value={montoProyectado}              
              onChange={(e) => setMontoProyectado(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📅 Mes
              </label>
              <select
                value={mesProyectado}
                onChange={(e) => setMesProyectado(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                {meses.map((mes, idx) => (
                  <option key={idx + 1} value={idx + 1}>{mes}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                📆 Año
              </label>
              <input
                type="number"
                value={anioProyectado}
                onChange={(e) => setAnioProyectado(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit({ monto_proyectado: montoProyectado, mes_referencia: mesProyectado, anio_referencia: anioProyectado })}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando...
              </>
            ) : (
              '📊 Crear Proyección'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}