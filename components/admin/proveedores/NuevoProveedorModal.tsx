// components/admin/proveedores/NuevoProveedorModal.tsx
import { useState } from 'react';
// ← ← ← AGREGAR ESTA INTERFAZ ← ← ←
interface Proveedor {
  id: number;
  nombre: string;
  numero_documento?: string;
  tipo_documento?: string;
  email?: string;
  telefono?: string;
  tipo?: 'proveedor';
}
interface NuevoProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proveedor: Proveedor) => void;
  apiUrl: string;
  token: string | null;
}

export default function NuevoProveedorModal({
  isOpen,
  onClose,
  onSave,
  apiUrl,
  token
}: NuevoProveedorModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_documento: 'nit',
    numero_documento: '',
    tipo_proveedor: 'persona_natural',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    banco: '',
    tipo_cuenta: 'ahorros',
    numero_cuenta: '',
    notas: '',
  });

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.numero_documento) {
      alert('Nombre y número de documento son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/proveedores/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        onSave(data);
        handleClose();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || error.numero_documento?.[0]}`);
      }
    } catch (error) {
      console.error('Error creando proveedor:', error);
      alert('Error al crear el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      tipo_documento: 'nit',
      numero_documento: '',
      tipo_proveedor: 'persona_natural',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      banco: '',
      tipo_cuenta: 'ahorros',
      numero_cuenta: '',
      notas: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white"> Nuevo Proveedor</h3>
        </div>

        <div className="p-6 space-y-4">
          {/* Nombre y Tipo de Proveedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Nombre / Razón Social *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="Nombre completo"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Tipo de Proveedor
              </label>
              <select
                value={formData.tipo_proveedor}
                onChange={(e) => setFormData({...formData, tipo_proveedor: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
              >
                <option value="persona_natural">Persona Natural</option>
                <option value="persona_juridica">Persona Jurídica</option>
              </select>
            </div>
          </div>

          {/* Tipo y Número de Documento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Tipo Documento
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
              >
                <option value="nit">NIT</option>
                <option value="cedula">Cédula</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Número Documento *
              </label>
              <input
                type="text"
                value={formData.numero_documento}
                onChange={(e) => setFormData({...formData, numero_documento: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="NIT o cédula"
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="email@ejemplo.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white"
                placeholder="300 123 4567"
              />
            </div>
          </div>

          {/* Información Bancaria */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Información Bancaria (Opcional)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Banco</label>
                <input
                  type="text"
                  value={formData.banco}
                  onChange={(e) => setFormData({...formData, banco: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="Bancolombia, BBVA..."
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo Cuenta</label>
                <select
                  value={formData.tipo_cuenta}
                  onChange={(e) => setFormData({...formData, tipo_cuenta: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Número Cuenta</label>
                <input
                  type="text"
                  value={formData.numero_cuenta}
                  onChange={(e) => setFormData({...formData, numero_cuenta: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="123-456789-00"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Guardando...' : '✅ Crear Proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}