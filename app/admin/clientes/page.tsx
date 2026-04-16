// app/admin/clientes/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ClienteHistorialModal from '@/components/admin/ClienteHistorialModal';
import CitaDetailAdminModal from '@/components/admin/CitaDetailAdminModal';

interface CitaData {
  id: number;
  codigo_reserva: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  servicio_nombre: string;
  profesional_nombre: string | null;
  fecha: string;
  hora_inicio: string;
  precio_total: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  servicio: number;
  profesional_id: number | null;
  hora_fin: string;
  metodo_pago: 'bold' | 'efectivo' | 'pendiente';
  pago_estado: 'pendiente' | 'pagado' | 'reembolsado' | 'parcial';
  estado_pago_detalle?: 'pendiente' | 'parcial' | 'pagado' | 'reembolsado';
  notas_cliente?: string;
}

interface ClienteUnico {
  id: string;  // email o combinación nombre+teléfono
  nombre: string;
  email: string;
  telefono: string;
  total_citas: number;
  ultima_cita: string;
  citas: CitaData[];
}

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<ClienteUnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteUnico | null>(null);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  
  const [citaParaDetalle, setCitaParaDetalle] = useState<CitaData | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  // Cargar clientes desde citas
  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ← Obtener token de admin
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // ← Fetch de todas las citas (admin ve todas)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const res = await fetch(`${apiUrl}/citas/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const citas: CitaData[] = await res.json();
      
      // ← Extraer clientes únicos desde las citas
      const mapaClientes = new Map<string, ClienteUnico>();
      
      for (const cita of citas) {
        // ← Usar email como ID único, o fallback a nombre+teléfono
        const claveCliente = cita.cliente_email?.trim() || 
          `${cita.cliente_nombre.trim()}_${cita.cliente_telefono.trim()}`;
        
        if (!mapaClientes.has(claveCliente)) {
          mapaClientes.set(claveCliente, {
            id: claveCliente,
            nombre: cita.cliente_nombre,
            email: cita.cliente_email || '',
            telefono: cita.cliente_telefono,
            total_citas: 0,
            ultima_cita: '',
            citas: [],
          });
        }
        
        const cliente = mapaClientes.get(claveCliente)!;
        cliente.citas.push(cita);
        cliente.total_citas += 1;
        
        // Actualizar última cita (la más reciente)
        if (!cliente.ultima_cita || new Date(cita.fecha) > new Date(cliente.ultima_cita)) {
          cliente.ultima_cita = cita.fecha;
        }
      }
      
      // ← Convertir mapa a array y ordenar por última cita
      const listaClientes = Array.from(mapaClientes.values())
        .sort((a, b) => new Date(b.ultima_cita).getTime() - new Date(a.ultima_cita).getTime());
      
      setClientes(listaClientes);
      console.log(`✅ Clientes cargados: ${listaClientes.length}`);
      
    } catch (err: any) {
      console.error('❌ Error cargando clientes:', err);
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientes.filter(cliente => {
    const texto = busqueda.toLowerCase();
    return (
      cliente.nombre.toLowerCase().includes(texto) ||
      cliente.email.toLowerCase().includes(texto) ||
      cliente.telefono.includes(texto)
    );
  });

  // Abrir modal de historial
  const abrirHistorial = (cliente: ClienteUnico) => {
    setClienteSeleccionado(cliente);
    setModalHistorialAbierto(true);
  };

  // Abrir modal de detalle de cita
  const abrirDetalleCita = (cita: CitaData) => {
    setCitaParaDetalle(cita);
    setModalDetalleAbierto(true);
    // Cerrar modal de historial si está abierto
    setModalHistorialAbierto(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price) || 0;
    return `$${num.toLocaleString('es-CO')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👥 Clientes</h1>
        <p className="text-gray-600">Listado de clientes registrados en el sistema</p>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          {clientesFiltrados.length} de {clientes.length} clientes
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button 
            onClick={cargarClientes}
            className="ml-2 text-red-600 hover:text-red-800 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de Clientes */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Citas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última Cita
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((cliente) => (
                <tr 
                  key={cliente.id}
                  onClick={() => abrirHistorial(cliente)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{cliente.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {cliente.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {cliente.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {cliente.total_citas}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {formatDate(cliente.ultima_cita)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Historial de Citas */}
      {modalHistorialAbierto && clienteSeleccionado && (
        <ClienteHistorialModal
          cliente={clienteSeleccionado}
          isOpen={modalHistorialAbierto}
          onClose={() => {
            setModalHistorialAbierto(false);
            setClienteSeleccionado(null);
          }}
          onCitaClick={abrirDetalleCita}
        />
      )}

      {/* Modal de Detalle de Cita */}
      {modalDetalleAbierto && citaParaDetalle && (
        <CitaDetailAdminModal
          cita={citaParaDetalle}
          isOpen={modalDetalleAbierto}
          onClose={() => {
            setModalDetalleAbierto(false);
            setCitaParaDetalle(null);
          }}
          onCitaUpdated={cargarClientes}
        />
      )}
    </div>
  );
}