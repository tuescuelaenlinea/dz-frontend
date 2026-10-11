
// admin/fidelizacion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, AlertTriangle, History, Plus, Send, X, Calendar } from 'lucide-react';
import HistorialCitasSection from '@/components/fidelizacion/HistorialCitasSection';

// ==========================================
// 1. TIPOS (Puedes mover esto a types/fidelizacion.ts)
// ==========================================
interface FidelizacionDashboard {
  proximos_a_regresar: number;
  en_seguimiento: number;
  en_riesgo: number;
  inactivos: number;
  clientes_vip: number;
  ventas_potenciales: number;
}

interface ClienteFidelizacion {
  id: number;
  cliente: number;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string | null;
  profesional_nombre: string | null;
  fecha_sugerida: string;
  frecuencia_dias: number;
  dias_para_cita: number;
}

interface PlantillaMensaje {
  id: number;
  nombre: string;
  categoria: string;
  contenido: string;
  es_activa: boolean;
  es_default: boolean;
}

interface HistorialAutomatizacion {
  id: number;
  cliente_nombre: string;
  tipo: string;
  estado: string;
  fecha_envio: string;
  canal: string;
  mensaje_enviado: string;
}

// ==========================================
// 2. HELPER LOCAL DE AUTENTICACIÓN (No modifica api.ts global)
// ==========================================
const getToken = () => {
  if (typeof window === 'undefined') return null;
  // ← ← ← CLAVE: Busca admin_token primero, igual que en tu api.ts
  return localStorage.getItem('admin_token') || localStorage.getItem('token');
};

const fetchConAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`https://api.dzsalon.com/api${url}`, { ...options, headers });

  if (res.status === 401) {
    console.error('🔒 Error 401: No autorizado. Verifica que hayas iniciado sesión como admin.');
  }
  
  return res.json();
};

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================
export default function FidelizacionPage() {
  const [dashboard, setDashboard] = useState<FidelizacionDashboard | null>(null);
  const [clientes, setClientes] = useState<ClienteFidelizacion[]>([]);
  const [historial, setHistorial] = useState<HistorialAutomatizacion[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFidelizacion | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 [Fidelización] Cargando datos...');
        const [dashRes, clientesRes, histRes, plantRes] = await Promise.all([
          fetchConAuth('/fidelizacion/dashboard/'),
          fetchConAuth('/fidelizacion/clientes/?segmento=contactar'),
          fetchConAuth('/fidelizacion/historial/'),
          fetchConAuth('/fidelizacion/plantillas/'),
        ]);
        
        setDashboard(dashRes);
        setClientes(clientesRes.results || []);
        setHistorial(histRes.results || []);
        setPlantillas(plantRes.results || []);
        console.log('✅ [Fidelización] Datos cargados exitosamente');
      } catch (error) {
        console.error('❌ Error cargando datos de fidelización:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenModal = (cliente: ClienteFidelizacion) => {
    setSelectedCliente(cliente);
    setModalOpen(true);
  };

  const handleSendWhatsApp = async (plantillaId: number, mensaje: string) => {
    if (!selectedCliente) return;

    try {
      const response = await fetchConAuth('/fidelizacion/enviar-recordatorio/', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: selectedCliente.cliente,
          plantilla_id: plantillaId,
          mensaje_personalizado: mensaje,
        }),
      });

      if (response.whatsapp_link) {
        // Abrir WhatsApp Web/App en nueva pestaña
        window.open(response.whatsapp_link, '_blank');
        
        // Recargar historial para mostrar el nuevo registro
        const histRes = await fetchConAuth('/fidelizacion/historial/');
        setHistorial(histRes.results || []);
        
        alert('✅ Mensaje generado y abierto en WhatsApp. El historial se ha actualizado.');
      } else {
        alert(`❌ Error: ${response.error || 'No se pudo generar el enlace'}`);
      }
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      alert('❌ Ocurrió un error al procesar el envío.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#075E54] mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando módulo de fidelización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fidelización de Clientes</h1>
          <p className="text-gray-500 mt-1">Gestiona recordatorios, campañas y retención de clientes.</p>
        </div>

        {/* 1. TARJETAS KPI */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { title: 'Próximos a regresar', value: dashboard.proximos_a_regresar, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: 'En seguimiento', value: dashboard.en_seguimiento, icon: MessageCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { title: 'En riesgo', value: dashboard.en_riesgo, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
              { title: 'Inactivos', value: dashboard.inactivos, icon: History, color: 'text-red-600', bg: 'bg-red-50' },
              { title: 'Clientes VIP', value: dashboard.clientes_vip, icon: Plus, color: 'text-purple-600', bg: 'bg-purple-50' }, // Usando Plus como placeholder de Crown
              { title: 'Ventas Potenciales', value: `$${(dashboard.ventas_potenciales / 1000000).toFixed(1)}M`, icon: Plus, color: 'text-green-600', bg: 'bg-green-50' },
            ].map((card, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">{card.title}</span>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 2. LISTA DE CLIENTES Y HISTORIAL (Tabs) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <TabsContent 
            clientes={clientes} 
            historial={historial} 
            onOpenModal={handleOpenModal} 
          />
        </div>

         <HistorialCitasSection 
          apiUrl="https://api.dzsalon.com/api" 
          token={localStorage.getItem('admin_token')} 
        />

      </div>

      {/* 3. MODAL DE WHATSAPP */}
      {modalOpen && selectedCliente && (
        <WhatsAppModal 
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedCliente(null); }}
          cliente={selectedCliente}
          plantillas={plantillas}
          onSend={handleSendWhatsApp}
        />
      )}

      {/* 4. BOTÓN FLOTANTE */}
      <button 
        className="fixed bottom-6 right-6 z-40 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 group"
        onClick={() => alert('Funcionalidad de Nueva Campaña en desarrollo')}
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        <span className="font-medium">Nueva Campaña</span>
      </button>
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTES (Para mantener el archivo limpio)
// ==========================================

function TabsContent({ clientes, historial, onOpenModal }: { 
  clientes: ClienteFidelizacion[], 
  historial: HistorialAutomatizacion[], 
  onOpenModal: (c: ClienteFidelizacion) => void 
}) {
  const [activeTab, setActiveTab] = useState<'contactar' | 'historial'>('contactar');

  return (
    <>
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('contactar')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${activeTab === 'contactar' ? 'text-[#075E54] border-b-2 border-[#075E54]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MessageCircle className="w-4 h-4" />
          Contactar Hoy
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'contactar' ? 'bg-[#075E54] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {clientes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${activeTab === 'historial' ? 'text-[#075E54] border-b-2 border-[#075E54]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <History className="w-4 h-4" />
          Historial
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'historial' ? 'bg-[#075E54] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {historial.length}
          </span>
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'contactar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                  <th className="px-4 py-3">Servicio Sugerido</th>
                  <th className="px-4 py-3">Próxima Cita</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay clientes para contactar hoy.</td></tr>
                ) : (
                  clientes.map(cliente => (
                    <tr key={cliente.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{cliente.cliente_nombre}</p>
                        <p className="text-xs text-gray-500">{cliente.cliente_telefono}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{cliente.servicio_nombre || 'No especificado'}</p>
                        <p className="text-xs text-gray-500">{cliente.profesional_nombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{new Date(cliente.fecha_sugerida).toLocaleDateString('es-CO')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cliente.dias_para_cita <= 3 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            en {cliente.dias_para_cita} días
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => onOpenModal(cliente)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-medium rounded-lg transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Enviar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-3">
            {historial.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No hay registros de automatización aún.</p>
            ) : (
              historial.map(reg => (
                <div key={reg.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className={`mt-1 w-2 h-2 rounded-full ${reg.estado === 'enviado' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 text-sm">{reg.cliente_nombre}</p>
                      <span className="text-xs text-gray-500">{new Date(reg.fecha_envio).toLocaleString('es-CO')}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{reg.mensaje_enviado}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-white px-2 py-0.5 rounded border">{reg.tipo}</span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-white px-2 py-0.5 rounded border">{reg.canal}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function WhatsAppModal({ isOpen, onClose, cliente, plantillas, onSend }: {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteFidelizacion;
  plantillas: PlantillaMensaje[];
  onSend: (plantillaId: number, mensaje: string) => Promise<void>;
}) {
  const [selectedPlantilla, setSelectedPlantilla] = useState<number>(0);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plantillas.length > 0) {
      const defaultPlantilla = plantillas.find(p => p.es_default) || plantillas[0];
      setSelectedPlantilla(defaultPlantilla.id);
      
      const rawMsg = defaultPlantilla.contenido;
      const preview = rawMsg
        .replace('{nombre}', cliente.cliente_nombre)
        .replace('{servicio}', cliente.servicio_nombre || 'nuestro servicio')
        .replace('{fecha}', new Date(cliente.fecha_sugerida).toLocaleDateString('es-CO'))
        .replace('{estilista}', cliente.profesional_nombre || 'nuestro equipo')
        .replace('{dias}', String(cliente.dias_para_cita));
      
      setMensaje(preview);
    }
  }, [cliente, plantillas]);

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSend(selectedPlantilla, mensaje);
      onClose();
    } catch (error) {
      console.error('Error enviando:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <h3 className="font-semibold text-lg">Enviar Recordatorio por WhatsApp</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="font-semibold text-gray-900">{cliente.cliente_nombre}</p>
                <p className="text-sm text-gray-500">{cliente.cliente_telefono}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
              <select 
                value={selectedPlantilla}
                onChange={(e) => {
                  setSelectedPlantilla(Number(e.target.value));
                  const p = plantillas.find(pl => pl.id === Number(e.target.value));
                  if (p) {
                    const rawMsg = p.contenido;
                    const preview = rawMsg
                      .replace('{nombre}', cliente.cliente_nombre)
                      .replace('{servicio}', cliente.servicio_nombre || 'nuestro servicio')
                      .replace('{fecha}', new Date(cliente.fecha_sugerida).toLocaleDateString('es-CO'))
                      .replace('{estilista}', cliente.profesional_nombre || 'nuestro equipo')
                      .replace('{dias}', String(cliente.dias_para_cita));
                    setMensaje(preview);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
              >
                {plantillas.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.es_default && '(Default)'}</option>
                ))}
                <option value={0}>✏️ Mensaje personalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vista previa del mensaje</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none"
              placeholder="Escribe tu mensaje aquí..."
            />
            <p className="text-xs text-gray-500 mt-1">
              * Las variables como {'{nombre}'} se reemplazarán automáticamente al enviar.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSend}
            disabled={loading}
            className="px-6 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? 'Generando...' : (<> <Send className="w-4 h-4" /> Abrir en WhatsApp </>)}
          </button>
        </div>
      </div>
    </div>
  );
}