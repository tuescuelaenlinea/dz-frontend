// components/booking/ClientInfoForm.tsx
'use client';

interface ClientInfoFormProps {
  isAuthenticated: boolean;
  userData: any;
  formData: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_email: string;
    notas_cliente: string;
  };
  onFormChange: (field: string, value: string) => void;
}

export default function ClientInfoForm({
  isAuthenticated,
  userData,
  formData,
  onFormChange,
}: ClientInfoFormProps) {
  return (
    <div className="space-y-4">
      {isAuthenticated ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            ✅ Sesión iniciada como <strong>{userData?.username || userData?.email}</strong>
          </p>
          {/* Teléfono editable pero pre-llenado desde el perfil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono para contacto *
              </label>
              <input
                type="tel"
                value={formData.cliente_telefono}
                onChange={(e) => onFormChange('cliente_telefono', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+57 300 123 4567"
                required
              />
              {userData?.telefono && !formData.cliente_telefono && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Tu teléfono registrado es: {userData.telefono}
                </p>
              )}
            </div>
          <p className="text-xs text-blue-600 mt-1">
            Tus datos se usarán automáticamente para la reserva
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.cliente_nombre}
              onChange={(e) => onFormChange('cliente_nombre', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre completo"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <input
                type="tel"
                value={formData.cliente_telefono}
                onChange={(e) => onFormChange('cliente_telefono', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+57 300 123 4567"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.cliente_email}
                onChange={(e) => onFormChange('cliente_email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
              />
            </div>
          </div>
        </>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={formData.notas_cliente}
          onChange={(e) => onFormChange('notas_cliente', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Indicaciones especiales, preferencias, etc."
          rows={3}
        />
      </div>
    </div>
  );
}