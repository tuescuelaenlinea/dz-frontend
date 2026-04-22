// components/booking/PaymentMethodModal.tsx
'use client';
import { useState, useEffect } from 'react';

interface MetodoPago {
  id: number | string;  // ← Ahora acepta string para métodos especiales
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string | null;
  titular: string;
  telefono: string | null;
  activo: boolean;
  es_principal: boolean;
  // ← Campos adicionales para métodos especiales
  nombre?: string;
  descripcion?: string;
  icono?: 'bold' | 'efectivo' | 'transferencia';
  esEspecial?: boolean;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (metodo: MetodoPago) => void;
  metodoSeleccionadoId?: number | string | null;  // ← Ahora acepta string o number
  mostrarBold?: boolean;
  mostrarEfectivo?: boolean;
}

const API_DOMAIN = 'https://api.dzsalon.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

// ← NUEVO: Métodos de pago especiales (fuera de BD)
const METODOS_ESPECIALES: MetodoPago[] = [
  {
    id: 'bold',
    banco: 'Bold',
    tipo_cuenta: '',
    numero_cuenta: null,
    titular: 'Bold - Pasarela de pagos',
    telefono: null,
    activo: true,
    es_principal: false,
    nombre: 'Bold (Tarjeta/PSE)',
    descripcion: 'Pago en línea con tarjeta de crédito/débito o PSE',
    icono: 'bold',
    esEspecial: true
  },
  {
    id: 'efectivo',
    banco: 'Efectivo',
    tipo_cuenta: '',
    numero_cuenta: null,
    titular: 'Pago en sitio',
    telefono: null,
    activo: true,
    es_principal: false,
    nombre: 'Efectivo',
    descripcion: 'Pago en efectivo en el salón',
    icono: 'efectivo',
    esEspecial: true
  },
  {
    id: 'transferencia',
    banco: 'Transferencia',
    tipo_cuenta: '',
    numero_cuenta: null,
    titular: 'Transferencia bancaria',
    telefono: null,
    activo: true,
    es_principal: false,
    nombre: 'Transferencia',
    descripcion: 'Transferencia bancaria directa',
    icono: 'transferencia',
    esEspecial: true
  }
];

export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSelect,
  metodoSeleccionadoId = null,
  mostrarBold = true,
  mostrarEfectivo = true
}: PaymentMethodModalProps) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(false);

  // ← Cargar métodos de pago cuando se abre el modal
   // ← Cargar métodos de pago cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      async function loadMetodos() {
        console.log('💳 [PaymentMethodModal] Cargando métodos de pago...');
        setLoading(true);
        try {
          const token = localStorage.getItem('admin_token');
          const url = `${API_URL}/cuentas-bancarias/?activo=true`;
          
          console.log(`📡 [PaymentMethodModal] Fetching: ${url}`);
          const res = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          let metodosBD: MetodoPago[] = [];
          if (res.ok) {
            const data = await res.json();
            metodosBD = Array.isArray(data) ? data : (data.results || []);
            console.log(`✅ [PaymentMethodModal] Cuentas bancarias cargadas: ${metodosBD.length}`);
            metodosBD.forEach(m => {
              console.log(`💳 [PaymentMethodModal] Cuenta BD: ${m.banco} - ${m.titular} (ID: ${m.id})`);
            });
          } else {
            console.error('❌ [PaymentMethodModal] Error cargando cuentas:', await res.text());
          }
          
          // ← COMBINAR: Métodos especiales + Cuentas de BD
          // ← USAR valores por defecto estables
          const showBold = mostrarBold !== false;  // Default: true
          const showEfectivo = mostrarEfectivo !== false;  // Default: true
          
          const metodosEspeciales = [
            ...(showBold ? METODOS_ESPECIALES.filter(m => m.id === 'bold') : []),
            ...(showEfectivo ? METODOS_ESPECIALES.filter(m => m.id === 'efectivo') : []),
            ...METODOS_ESPECIALES.filter(m => m.id === 'transferencia')
          ];
          
          const todosLosMetodos = [...metodosEspeciales, ...metodosBD];
          
          setMetodos(todosLosMetodos);
          console.log(`📊 [PaymentMethodModal] Total métodos disponibles: ${todosLosMetodos.length}`);
          todosLosMetodos.forEach(m => {
            console.log(`💳 [PaymentMethodModal] Método: ${m.nombre || m.banco} (ID: ${m.id}, Especial: ${m.esEspecial})`);
          });
          
        } catch (err) {
          console.error('❌ [PaymentMethodModal] Error crítico:', err);
        } finally {
          setLoading(false);
        }
      }
      loadMetodos();
    }
  }, [isOpen]);  // ← SOLO isOpen como dependencia, NO mostrarBold/mostrarEfectivo

  // ← Manejar selección
  const handleSelect = (metodo: MetodoPago) => {
    console.log(`💳 [PaymentMethodModal] Método seleccionado:`, metodo);
    onSelect(metodo);
    onClose();
  };

  // ← Formatear nombre para display
  const formatMetodoDisplay = (metodo: MetodoPago): string => {
    // Si es método especial, usar descripción
    if (metodo.esEspecial && metodo.descripcion) {
      return metodo.descripcion;
    }
    
    // Para cuentas de BD, usar formato original
    const partes = [metodo.banco];
    
    if (metodo.tipo_cuenta) {
      partes.push(metodo.tipo_cuenta);
    }
    
    if (metodo.numero_cuenta) {
      partes.push(`****${metodo.numero_cuenta.slice(-4)}`);
    } else if (metodo.telefono) {
      partes.push(metodo.telefono);
    }
    
    return partes.join(' - ');
  };

  // ← Obtener icono según banco o método especial
  const getBankIcon = (banco: string, iconoEspecial?: string): React.ReactNode => {
    const iconProps = { className: "w-8 h-8", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    
    // ← Iconos para métodos especiales
    if (iconoEspecial === 'bold') {
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    }
    
    if (iconoEspecial === 'efectivo') {
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    if (iconoEspecial === 'transferencia') {
      return (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    }
    
    // Iconos para bancos tradicionales
    switch (banco.toLowerCase()) {
      case 'bancolombia':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'bbva':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'davivienda':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'nequi':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'daviplata':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden border-2 border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">
            💳 Seleccionar Método de Pago
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid de Métodos - Scrollable */}
        <div className="overflow-y-auto max-h-96 p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Cargando métodos de pago...</p>
            </div>
          ) : metodos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No hay métodos de pago configurados</p>
              <p className="text-xs mt-2">Ve a Configuración → Cuentas Bancarias para agregar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metodos.map((metodo) => {
                const isSelected = metodo.id === metodoSeleccionadoId;
                
                return (
                  <button
                    key={metodo.id}
                    onClick={() => handleSelect(metodo)}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-xl text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/20 ring-4 ring-blue-500/50'
                        : 'border-gray-700 bg-gray-900 hover:border-blue-500'
                    }`}
                  >
                    {/* Icono */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {getBankIcon(metodo.banco, metodo.icono)}
                    </div>

                    {/* Información */}
                    <div>
                      <p className="text-white font-semibold text-sm mb-1">
                        {metodo.nombre || metodo.banco}
                      </p>
                      <p className="text-gray-300 text-xs mb-2">
                        {formatMetodoDisplay(metodo)}
                      </p>
                      {/* Solo mostrar titular para cuentas de BD */}
                      {!metodo.esEspecial && (
                        <p className="text-gray-400 text-xs">
                          Titular: {metodo.titular}
                        </p>
                      )}
                      
                      {/* Badge de principal (solo cuentas BD) */}
                      {!metodo.esEspecial && metodo.es_principal && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                          ✓ Principal
                        </span>
                      )}
                      
                      {/* Badge de especial */}
                      {metodo.esEspecial && (
                        <span className="inline-block mt-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                          ✨ Digital
                        </span>
                      )}
                      
                      {/* Badge de seleccionado */}
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            {metodos.length} método{metodos.length !== 1 ? 's' : ''} de pago disponible{metodos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}