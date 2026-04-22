// components/admin/EditCitaModal.tsx

'use client';
import { useState, useEffect } from 'react';

interface Cita {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_id: number | null;
  servicio: number;
  servicio_nombre: string;
  profesional: number | null;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: string;
  metodo_pago: string;
  estado: string;
  pago_estado: string;
}

interface EditCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: Cita;
  onCitaUpdated: (cita: Cita) => void;
}

export default function EditCitaModal({
  isOpen,
  onClose,
  cita,
  onCitaUpdated
}: EditCitaModalProps) {
  const [precio, setPrecio] = useState<number>(0);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ← Guardar valores originales para comparar cambios
  const [valoresOriginales, setValoresOriginales] = useState({
    precio: 0,
    nombre: '',
    telefono: '',
    email: ''
  });

  // ← Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (cita) {
      const precioNum = parseFloat(cita.precio_total) || 0;
      setPrecio(precioNum);
      setClienteNombre(cita.cliente_nombre || '');
      setClienteTelefono(cita.cliente_telefono || '');
      setClienteEmail(cita.cliente_email || '');
      
      // ← Guardar valores originales
      setValoresOriginales({
        precio: precioNum,
        nombre: cita.cliente_nombre || '',
        telefono: cita.cliente_telefono || '',
        email: cita.cliente_email || ''
      });
    }
  }, [cita]);

  // ← Formatear precio como moneda sin decimales
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace('COP', '$').trim();
  };

  // ← Manejar cambio de precio (acepta formato moneda)
  const handlePrecioChange = (value: string) => {
    const numericValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
    const precioNum = parseFloat(numericValue) || 0;
    setPrecio(precioNum);
  };

  const handleSave = async () => {
    console.log('💾 [EditCitaModal] Guardando cambios...');
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      // ← Construir payload SOLO con campos modificados
      const citaData: any = {};
      
      if (clienteNombre !== valoresOriginales.nombre) {
        citaData.cliente_nombre = clienteNombre;
      }
      
      if (clienteTelefono !== valoresOriginales.telefono) {
        citaData.cliente_telefono = clienteTelefono;
      }
      
      if (clienteEmail !== valoresOriginales.email) {
        citaData.cliente_email = clienteEmail;
      }
      
      // ← Solo incluir precio si realmente cambió
      if (precio !== valoresOriginales.precio) {
        citaData.precio_total = precio.toString();
      }
      
      // ← Verificar si hay cambios para enviar
      if (Object.keys(citaData).length === 0) {
        alert('ℹ️ No has realizado ningún cambio');
        setLoading(false);
        return;
      }
      
      console.log('📦 [EditCitaModal] Payload:', citaData);
      
      const res = await fetch(`${apiUrl}/citas/${cita.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(citaData)
      });
      
      if (res.ok) {
        const citaActualizada = await res.json();
        console.log('✅ [EditCitaModal] Cita actualizada:', citaActualizada);
        onCitaUpdated(citaActualizada);
      } else {
        const errorText = await res.text();
        console.error('❌ [EditCitaModal] Error:', errorText);
        
        if (errorText.includes('precio_total') && cita.estado === 'completada') {
          alert('⚠️ No se puede modificar el precio de una cita completada.\n\nSolo puedes cambiar:\n• Nombre del cliente\n• Teléfono\n• Email');
        } else {
          alert('Error al actualizar la cita: ' + errorText);
        }
      }
    } catch (err) {
      console.error('❌ [EditCitaModal] Error crítico:', err);
      alert('Error al actualizar la cita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-white">
              ✏️ Editar Cita {cita.codigo_reserva}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Estado: <span className="text-blue-400 font-semibold">{cita.estado}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-4">
          {/* Precio */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              💰 Precio Total
            </label>
            <input
              type="text"
              value={formatCurrency(precio)}
              onChange={(e) => handlePrecioChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none text-xl font-bold"
              placeholder="$0"
            />
            {cita.estado === 'completada' && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠️ No se puede modificar en citas completadas
              </p>
            )}
          </div>

          {/* Cliente Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              👤 Nombre del Cliente
            </label>
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Nombre completo"
            />
          </div>

          {/* Cliente Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📱 Teléfono
            </label>
            <input
              type="tel"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Ej: 300 123 4567"
            />
          </div>

          {/* Cliente Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              ✉️ Email
            </label>
            <input
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Guardando...
              </span>
            ) : (
              '💾 Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}