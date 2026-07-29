// components/admin/ReportesModal.tsx
'use client';

interface ReportesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarReporte: (tipo: 'cierre_caja' | 'libro_diario' | 'libro_mayor') => void;
}

export default function ReportesModal({ isOpen, onClose, onSeleccionarReporte }: ReportesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Centro de Reportes
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Selecciona el reporte que deseas generar o visualizar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid de Reportes (3 columnas en desktop) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Reporte de Cierre de Caja (AZUL) */}
          <button
            onClick={() => {
              onSeleccionarReporte('cierre_caja');
              onClose();
            }}
            className="p-5 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 hover:from-blue-800/50 hover:to-indigo-800/50 border border-blue-700/50 rounded-xl text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🏦
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                  Cierre de Caja
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Desglose completo de saldos, métodos de pago, ventas, comisiones y cuadre final.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-400 font-medium">
                  <span>Generar reporte</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          {/* 2. Libro Diario (VERDE / ESMERALDA) */}
          <button
            onClick={() => {
              onSeleccionarReporte('libro_diario');              
              onClose();
            }}
            className="p-5 bg-gradient-to-br from-emerald-900/40 to-green-900/40 hover:from-emerald-800/50 hover:to-green-800/50 border border-emerald-700/50 rounded-xl text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📖
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Libro Diario
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Registro cronológico detallado de cada movimiento de ingresos y egresos.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <span>Generar reporte</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          {/* 3. Libro Mayor (PÚRPURA / VIOLETA) */} 
          <button
            onClick={() => {
              onSeleccionarReporte('libro_mayor');
              onClose();
            }}
            className="p-5 bg-gradient-to-br from-purple-900/40 to-violet-900/40 hover:from-purple-800/50 hover:to-violet-800/50 border border-purple-700/50 rounded-xl text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📘
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  Libro Mayor
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Resumen consolidado diario de ingresos, egresos y saldos acumulados por período.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-purple-400 font-medium">
                  <span>Generar reporte</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}