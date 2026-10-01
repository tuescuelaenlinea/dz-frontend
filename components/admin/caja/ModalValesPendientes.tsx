// components/admin/caja/ModalValesPendientes.tsx
'use client';

import { useState, useEffect } from 'react';

interface ValePendiente {
  id: number;
  codigo_vale: string;
  monto: number;
  fecha: string;
  metodo_pago: string;
  metodo_pago_display: string;
  notas: string;
}

interface ModalValesPendientesProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (valesSeleccionados: ValePendiente[], totalSeleccionado: number) => void;
  profesionalId: number;
  profesionalNombre: string;
  montoCostoFijo: number;
  apiUrl: string;
  token: string | null;
}

export default function ModalValesPendientes({
  isOpen,
  onClose,
  onAccept,
  profesionalId,
  profesionalNombre,
  montoCostoFijo,
  apiUrl,
  token
}: ModalValesPendientesProps) {
  const [vales, setVales] = useState<ValePendiente[]>([]);
  const [valesSeleccionados, setValesSeleccionados] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [totalPendiente, setTotalPendiente] = useState(0);

  // Cargar vales al abrir
  useEffect(() => {
    if (isOpen && profesionalId) {
      cargarVales();
    }
  }, [isOpen, profesionalId]);

  const cargarVales = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/caja/vales/pendientes-por-profesional/?profesional_id=${profesionalId}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setVales(data.vales || []);
        setTotalPendiente(data.total_pendiente || 0);
      } else {
        console.error('❌ Error cargando vales:', res.status);
      }
    } catch (err) {
      console.error('❌ Error de red:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVale = (valeId: number, monto: number) => {
    const nuevas = new Set(valesSeleccionados);
    
    if (nuevas.has(valeId)) {
      nuevas.delete(valeId);
    } else {
      // ← ← ← VALIDACIÓN: No exceder monto del costo fijo ← ← ←
      const totalActual = calcularTotalSeleccionado();
      if (totalActual + monto > montoCostoFijo) {
        alert(
          `️ No puedes seleccionar este vale.\n\n` +
          `El total seleccionado excedería el monto del costo fijo ($${montoCostoFijo.toLocaleString('es-CO')}).\n\n` +
          `Disponible para seleccionar: $${(montoCostoFijo - totalActual).toLocaleString('es-CO')}`
        );
        return;
      }
      nuevas.add(valeId);
    }
    
    setValesSeleccionados(nuevas);
  };

  const calcularTotalSeleccionado = () => {
    return vales
      .filter(v => valesSeleccionados.has(v.id))
      .reduce((sum, v) => sum + v.monto, 0);
  };

  const handleAccept = () => {
    const seleccionados = vales.filter(v => valesSeleccionados.has(v.id));
    const total = calcularTotalSeleccionado();
    onAccept(seleccionados, total);
  };

  const handleClose = () => {
    setValesSeleccionados(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const totalSeleccionado = calcularTotalSeleccionado();
  const disponibleParaSeleccionar = montoCostoFijo - totalSeleccionado;

  return (
    <div className="fixed inset-0 z-[95] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-blue-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900/40 to-indigo-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                🎫 Vales Pendientes de {profesionalNombre}
              </h3>
              <p className="text-sm text-blue-300 mt-1">
                Selecciona los vales a descontar de este pago de nómina
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info de límites */}
        <div className="p-4 bg-gray-900/50 border-b border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">💰 Monto Costo Fijo</p>
              <p className="text-white font-bold">${montoCostoFijo.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">✅ Seleccionado</p>
              <p className="text-green-400 font-bold">${totalSeleccionado.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">💵 Disponible</p>
              <p className={`font-bold ${disponibleParaSeleccionar > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                ${disponibleParaSeleccionar.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de vales */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Cargando vales...</span>
            </div>
          ) : vales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3"></p>
              <p className="text-gray-400">Este profesional no tiene vales pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vales.map((vale) => {
                const isSelected = valesSeleccionados.has(vale.id);
                const excedeLimite = totalSeleccionado + vale.monto > montoCostoFijo && !isSelected;
                
                return (
                  <label
                    key={vale.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-900/30 border-blue-500'
                        : excedeLimite
                        ? 'bg-gray-900/50 border-gray-700 opacity-50 cursor-not-allowed'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={excedeLimite}
                      onChange={() => toggleVale(vale.id, vale.monto)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-800 border-gray-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white font-bold">
                          {vale.codigo_vale}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(vale.fecha).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {vale.notas && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {vale.notas}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        ${vale.monto.toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {vale.metodo_pago_display}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex gap-3 bg-gray-800 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAccept}
            disabled={valesSeleccionados.size === 0}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>✅ Aplicar Descuento</span>
            {valesSeleccionados.size > 0 && (
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                {valesSeleccionados.size} vale(s) • ${totalSeleccionado.toLocaleString('es-CO')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}