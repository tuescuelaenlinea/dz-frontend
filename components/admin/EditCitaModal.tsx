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
  
  // ← NUEVO: Estados para búsqueda de clientes
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  
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

  // ← NUEVO: Cargar clientes cuando se abre la búsqueda
  useEffect(() => {
    if (showClientSearch && clientes.length === 0) {
      loadClientes();
    }
  }, [showClientSearch]);

  // ← NUEVO: Cargar clientes para búsqueda
  const loadClientes = async () => {
    console.log('🔍 [EditCitaModal] Cargando clientes...');
    setLoadingClientes(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127..0.1:8080/api';
      
      // 1. Cargar usuarios registrados
      const usuariosRes = await fetch(`${apiUrl}/usuarios/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      let clientesList: any[] = [];
      
      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json();
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : (usuariosData.results || []);
        
        clientesList = usuariosList.map((u: any) => ({
          id: u.id,
          nombre: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username || u.email?.split('@')[0] || 'Usuario',
          telefono: u.perfil?.telefono || u.telefono || '',
          email: u.email || '',
          esRegistrado: true
        }));
      }
      
      // 2. Cargar clientes no registrados de citas
      const citasRes = await fetch(`${apiUrl}/citas/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (citasRes.ok) {
        const citasData = await citasRes.json();
        const citasList = Array.isArray(citasData) ? citasData : (citasData.results || []);
        
        for (const cita of citasList) {
          if (!cita.cliente_nombre || cita.cliente) continue;
          
          const yaExiste = clientesList.some((c: any) => 
            c.nombre.toLowerCase() === cita.cliente_nombre.toLowerCase() && 
            c.email === cita.cliente_email
          );
          
          if (!yaExiste) {
            clientesList.push({
              id: `no-reg-${cita.id}`,
              nombre: cita.cliente_nombre,
              telefono: cita.cliente_telefono || '',
              email: cita.cliente_email || '',
              esRegistrado: false
            });
          }
        }
      }
      
      // Eliminar duplicados por email
      const clientesUnicos = Array.from(
        new Map(clientesList.map((c: any) => [c.email || c.nombre, c])).values()
      );
      
      setClientes(clientesUnicos.slice(0, 300));
      console.log(`✅ [EditCitaModal] Clientes cargados: ${clientesUnicos.length}`);
      
    } catch (err) {
      console.error('❌ [EditCitaModal] Error cargando clientes:', err);
    } finally {
      setLoadingClientes(false);
    }
  };

  // ← NUEVO: Filtrar clientes para búsqueda
  const clientesFiltrados = clientes.filter((c: any) => 
    c.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    c.telefono.includes(clienteSearchTerm) ||
    c.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
  );

  // ← NUEVO: Manejar selección de cliente desde búsqueda
  const handleClienteSelect = (cliente: any) => {
    console.log('👤 [EditCitaModal] Cliente seleccionado:', cliente.nombre);
    setClienteNombre(cliente.nombre);
    setClienteTelefono(cliente.telefono || '');
    setClienteEmail(cliente.email || '');
    setShowClientSearch(false);
  };

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
      
      // ← NUEVO: Teléfono por defecto si está vacío
      const telefonoParaEnviar = clienteTelefono.trim() || '300000000';
      
      // ← Construir payload SOLO con campos modificados
      const citaData: any = {
        // ← SIEMPRE incluir teléfono (campo requerido por backend)
        cliente_telefono: telefonoParaEnviar,
      };
      
      // ← Incluir otros campos solo si cambiaron
      if (clienteNombre !== valoresOriginales.nombre) {
        citaData.cliente_nombre = clienteNombre;
      }
      
      if (clienteEmail !== valoresOriginales.email) {
        citaData.cliente_email = clienteEmail;
      }
      
      // ← Solo incluir precio si realmente cambió
      if (precio !== valoresOriginales.precio) {
        citaData.precio_total = precio.toString();
      }
      
      // ← Verificar si hay cambios para enviar (además del teléfono por defecto)
      const hayCambiosReales = Object.keys(citaData).some(key => {
        if (key === 'cliente_telefono') {
          // El teléfono por defecto no cuenta como cambio si el original también estaba vacío
          return clienteTelefono.trim() !== '' || valoresOriginales.telefono !== '300000000';
        }
        return true;
      });
      
      if (!hayCambiosReales) {
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
    <> {/* ← Fragment de apertura */}
      {/* Modal Principal de Edición */}
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
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center justify-between">
                <span>👤 Nombre del Cliente</span>
                {/* ← NUEVO: Botón de búsqueda de cliente */}
                <button
                  type="button"
                  onClick={() => {
                    setShowClientSearch(true);
                    setClienteSearchTerm('');
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs"
                  title="Buscar cliente existente"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </button>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none pr-10"
                  placeholder="Nombre completo"
                />
                {/* ← Indicador visual si hay cliente seleccionado */}
                {clienteNombre && (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteNombre('');
                      setClienteTelefono('');
                      setClienteEmail('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Limpiar cliente"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
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

      {/* ← NUEVO: Modal de Búsqueda de Clientes */}
      {showClientSearch && (
        <div 
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowClientSearch(false)}
        >
          <div 
            className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">👥 Seleccionar Cliente</h3>
              <button
                onClick={() => setShowClientSearch(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, teléfono o email..."
                value={clienteSearchTerm}
                onChange={(e) => setClienteSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Lista de clientes */}
            <div className="overflow-y-auto max-h-96 p-2">
              {loadingClientes ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-400 text-sm mt-2">Cargando clientes...</p>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>{clienteSearchTerm ? `No se encontraron clientes con "${clienteSearchTerm}"` : 'No hay clientes para mostrar'}</p>
                </div>
              ) : (
                clientesFiltrados.map((cliente: any) => (
                  <button
                    key={cliente.id}
                    onClick={() => handleClienteSelect(cliente)}
                    className="w-full p-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl text-left hover:bg-gray-700 hover:border-blue-500 transition-all flex items-center gap-3"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      cliente.esRegistrado ? 'bg-blue-900' : 'bg-gray-700'
                    }`}>
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {cliente.nombre} {cliente.esRegistrado && <span className="text-xs text-blue-400">(Registrado)</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
                      {cliente.email && (
                        <p className="text-xs text-gray-500 truncate">{cliente.email}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 text-center">
              <p className="text-xs text-gray-500">
                {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    
     </>  
  ); 
}  