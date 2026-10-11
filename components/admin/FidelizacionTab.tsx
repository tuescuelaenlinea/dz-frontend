// components/admin/FidelizacionTab.tsx
// components/admin/FidelizacionTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  AlertTriangle, 
  History, 
  Plus, 
  Send, 
  X, 
  Calendar, 
  Crown, 
  DollarSign,
  Settings,
  Info
} from 'lucide-react';
import HistorialCitasSection from '@/components/fidelizacion/HistorialCitasSection';
import WhatsAppModal from '@/components/fidelizacion/WhatsAppModal';

// ==========================================
// 1. TIPOS (Alineados con el Modal)
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
  cliente: number | null;
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

interface ConfiguracionFidelizacion {
  id: number;
  dias_anticipacion_recordatorio: number;
  dias_cliente_riesgo: number;
  dias_cliente_inactivo: number;
  frecuencia_default_dias: number;
  mensaje_whatsapp_default: string;
}

// ==========================================
// 2. HELPER DE AUTENTICACIÓN
// ==========================================
const getToken = () => {
  if (typeof window === 'undefined') return null;
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
  if (res.status === 401) console.error('⚠️ Error 401: No autorizado.');
  return res.json();
};

// ==========================================
// 3. HELPER DE FECHAS CON TIMEZONE COLOMBIA
// ==========================================

/**
 * Formatea una fecha ISO string a formato local Colombia (DD/MM/YYYY)
 * SIN aplicar conversión de timezone que cause desfase de día
 */
const formatDateColombia = (dateString: string): string => {
  if (!dateString) return '';
  
  // Extraer solo la parte de fecha (YYYY-MM-DD) sin timezone
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-');
  
  // Formatear como DD/MM/YYYY
  return `${day}/${month}/${year}`;
};

/**
 * Formatea una fecha ISO string a formato legible con hora
 * Maneja correctamente el timezone de Colombia (UTC-5)
 */
const formatDateTimeColombia = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Si la fecha ya viene con timezone info, usarla directamente
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Si es solo fecha (YYYY-MM-DD), formatear sin hora
    return formatDateColombia(dateString);
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return dateString;
  }
};

/**
 * Calcula la diferencia en días entre dos fechas
 * Usando timezone de Colombia para evitar desfases
 */
const getDaysDifference = (fechaSugerida: string): number => {
  if (!fechaSugerida) return 0;
  
  // Obtener fecha actual en timezone Colombia
  const now = new Date();
  const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  
  // Parsear fecha sugerida
  const datePart = fechaSugerida.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Crear fecha en timezone Colombia (mes es 0-indexed)
  const fechaSug = new Date(year, month - 1, day);
  
  // Calcular diferencia en días
  const diffTime = fechaSug.getTime() - colombiaTime.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
export default function FidelizacionTab() {
  const [dashboard, setDashboard] = useState<FidelizacionDashboard | null>(null);
  const [clientes, setClientes] = useState<ClienteFidelizacion[]>([]);
  const [clientesSeguimiento, setClientesSeguimiento] = useState<ClienteFidelizacion[]>([]); // <-- NUEVO
  const [clientesRiesgo, setClientesRiesgo] = useState<ClienteFidelizacion[]>([]);
  const [historial, setHistorial] = useState<HistorialAutomatizacion[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>([]);
  const [config, setConfig] = useState<ConfiguracionFidelizacion | null>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFidelizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';

  // Form state for config
  const [configForm, setConfigForm] = useState({
    dias_anticipacion_recordatorio: 3,
    dias_cliente_riesgo: 30,
    dias_cliente_inactivo: 90,
    frecuencia_default_dias: 45,
    mensaje_whatsapp_default: '¡Hola! 👋 Es momento de renovar tu look. ¿Te gustaría agendar tu próxima cita?'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashRes, clientesRes, clientesSeguimientoRes, clientesRiesgoRes, histRes, plantRes, configRes] = await Promise.all([
          fetchConAuth('/fidelizacion/dashboard/'),
          fetchConAuth('/fidelizacion/clientes/?segmento=contactar'),
          fetchConAuth('/fidelizacion/clientes/?segmento=seguimiento'), // <-- NUEVO
          fetchConAuth('/fidelizacion/clientes/?segmento=riesgo'),
          fetchConAuth('/fidelizacion/historial/'),
          fetchConAuth('/fidelizacion/plantillas/'),
          fetchConAuth('/fidelizacion/configuracion/'),
        ]);
        setDashboard(dashRes);
        setClientes(clientesRes.results || []);
        setClientesSeguimiento(clientesSeguimientoRes.results || []); // <-- NUEVO
        setClientesRiesgo(clientesRiesgoRes.results || []);
        setHistorial(histRes.results || []);
        setPlantillas(plantRes.results || []);
        setConfig(configRes);
        
        // Load config into form
        if (configRes) {
          setConfigForm({
            dias_anticipacion_recordatorio: configRes.dias_anticipacion_recordatorio || 3,
            dias_cliente_riesgo: configRes.dias_cliente_riesgo || 30,
            dias_cliente_inactivo: configRes.dias_cliente_inactivo || 90,
            frecuencia_default_dias: configRes.frecuencia_default_dias || 45,
            mensaje_whatsapp_default: configRes.mensaje_whatsapp_default || '¡Hola! 👋 Es momento de renovar tu look. ¿Te gustaría agendar tu próxima cita?'
          });
        }
      } catch (error) {
        console.error('❌ Error cargando datos de fidelización:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ==========================================
  // HANDLERS (TODOS ANTES DEL RETURN)
  // ==========================================

  const handleSaveConfig = async () => {
    if (!configForm) return;
    
    setSavingConfig(true);
    try {
      const currentToken = getToken();
      const url = `${apiUrl}/fidelizacion/configuracion/`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
        },
        body: JSON.stringify(configForm)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Error al guardar la configuración');
      }

      const data = await response.json();
      setConfig(data);
      alert('✅ Configuración guardada exitosamente');
      setConfigModalOpen(false);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveTemplate = async (template: Partial<PlantillaMensaje>) => {
    const token = getToken();
    const url = template.id 
      ? `${apiUrl}/fidelizacion/plantillas/${template.id}/`
      : `${apiUrl}/fidelizacion/plantillas/`;
    
    const method = template.id ? 'PATCH' : 'POST';
    
    console.log("📤 Enviando plantilla al backend:", template);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(template)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Detalle del error del servidor:", errorData);
      
      const errorMsg = 
        errorData.detail || 
        errorData.nombre?.[0] || 
        errorData.categoria?.[0] || 
        errorData.contenido?.[0] || 
        'Error al guardar la plantilla. Revisa la consola para más detalles.';
        
      throw new Error(errorMsg);
    }

    const plantRes = await fetchConAuth('/fidelizacion/plantillas/');
    setPlantillas(plantRes.results || []);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    const token = getToken();
    const response = await fetch(`${apiUrl}/fidelizacion/plantillas/${templateId}/`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('Error al eliminar la plantilla');
    }

    const plantRes = await fetchConAuth('/fidelizacion/plantillas/');
    setPlantillas(plantRes.results || []);
  };

  const handleSendWhatsApp = async (plantillaId: number, mensaje: string, telefono: string) => {
    if (!selectedCliente) return;

    console.log('📤 [FidelizacionTab] Enviando recordatorio:', {
      cliente_id: selectedCliente.cliente,
      cliente_nombre: selectedCliente.cliente_nombre,
      cliente_telefono: telefono,
      plantilla_id: plantillaId
    });

    try {
      const token = getToken();
      const res = await fetch(`https://api.dzsalon.com/api/fidelizacion/enviar-recordatorio/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cliente_id: selectedCliente.cliente || null,
          cliente_nombre: selectedCliente.cliente_nombre,
          cliente_telefono: telefono,
          plantilla_id: plantillaId,
          mensaje_personalizado: mensaje
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Error del servidor al generar recordatorio');
      }

      const data = await res.json();
      
      if (data.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank');
        
        const histRes = await fetchConAuth('/fidelizacion/historial/');
        setHistorial(histRes.results || []);
        
        alert('✅ Mensaje generado y abierto en WhatsApp.');
        setModalOpen(false);
        setSelectedCliente(null);
      } else {
        alert(`️ Error: ${data.error || 'No se pudo generar el enlace'}`);
      }
    } catch (error: any) {
      console.error('❌ [FidelizacionTab] Error enviando WhatsApp:', error);
      alert(`❌ Ocurrió un error al procesar el envío: ${error.message}`);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const kpiCards = [
    { 
      title: 'Próximos', 
      value: dashboard?.proximos_a_regresar || 0, 
      icon: Calendar, 
      color: 'text-blue-400', 
      bg: 'bg-blue-900/30',
      tooltip: 'Clientes que deben regresar en los próximos días según su frecuencia de visita habitual'
    },
    { 
      title: 'Seguimiento', 
      value: dashboard?.en_seguimiento || 0, 
      icon: MessageCircle, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-900/30',
      tooltip: 'Clientes que ya pasaron su fecha sugerida pero fueron contactados recientemente'
    },
    { 
      title: 'En riesgo', 
      value: dashboard?.en_riesgo || 0, 
      icon: AlertTriangle, 
      color: 'text-orange-400', 
      bg: 'bg-orange-900/30',
      tooltip: 'Clientes que han excedido el tiempo habitual entre citas y no han sido contactados'
    },
    { 
      title: 'Inactivos', 
      value: dashboard?.inactivos || 0, 
      icon: History, 
      color: 'text-red-400', 
      bg: 'bg-red-900/30',
      tooltip: 'Clientes que no han visitado el salón en un período prolongado y requieren reactivación'
    },
    { 
      title: 'VIP', 
      value: dashboard?.clientes_vip || 0, 
      icon: Crown, 
      color: 'text-purple-400', 
      bg: 'bg-purple-900/30',
      tooltip: 'Clientes frecuentes de alto valor que merecen atención especial y beneficios exclusivos'
    },
    { 
      title: 'Ventas Pot.', 
      value: `$${((dashboard?.ventas_potenciales || 0) / 1000000).toFixed(1)}M`, 
      icon: DollarSign, 
      color: 'text-green-400', 
      bg: 'bg-green-900/30',
      tooltip: 'Valor estimado de ventas potenciales si todos los clientes contactados agendan su cita'
    },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      {/* 1. TARJETAS KPI CON TOOLTIPS */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
          {kpiCards.map((card, idx) => (
            <div 
              key={idx} 
              className="bg-gray-800 p-3 rounded-xl border border-gray-700 relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">{card.value}</p>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-48 text-center">
                {card.tooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. SEGMENTOS DE CLIENTES (3 COLUMNAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Panel Contactar Hoy */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-700 flex-shrink-0 bg-gray-800 rounded-t-xl">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-400" /> Contactar Hoy ({clientes.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Próxima Cita</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {clientes.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay clientes para contactar hoy.</td></tr>
                ) : (
                  clientes.map(cliente => {
                    const diasParaCita = getDaysDifference(cliente.fecha_sugerida);
                    return (
                      <tr key={cliente.id} className="hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{cliente.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">{cliente.cliente_telefono}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{cliente.servicio_nombre || 'No especificado'}</p>
                          <p className="text-xs text-gray-400">{cliente.profesional_nombre}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-white">
                              {formatDateColombia(cliente.fecha_sugerida)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${diasParaCita <= 3 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                              en {diasParaCita} días
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => { setSelectedCliente(cliente); setModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Enviar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel En Seguimiento */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-700 flex-shrink-0 bg-gray-800 rounded-t-xl">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-400" /> En Seguimiento ({clientesSeguimiento.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Fecha Sugerida</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {clientesSeguimiento.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay clientes en seguimiento.</td></tr>
                ) : (
                  clientesSeguimiento.map(cliente => {
                    const diasParaCita = getDaysDifference(cliente.fecha_sugerida);
                    return (
                      <tr key={cliente.id} className="hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{cliente.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">{cliente.cliente_telefono}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{cliente.servicio_nombre || 'No especificado'}</p>
                          <p className="text-xs text-gray-400">{cliente.profesional_nombre}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-white">
                              {formatDateColombia(cliente.fecha_sugerida)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">
                              hace {Math.abs(diasParaCita)} días
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => { setSelectedCliente(cliente); setModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-lg transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Enviar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel En Riesgo */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-700 flex-shrink-0 bg-gray-800 rounded-t-xl">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> En Riesgo ({clientesRiesgo.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Fecha Sugerida</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {clientesRiesgo.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">No hay clientes en riesgo.</td></tr>
                ) : (
                  clientesRiesgo.map(cliente => {
                    const diasParaCita = getDaysDifference(cliente.fecha_sugerida);
                    return (
                      <tr key={cliente.id} className="hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{cliente.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">{cliente.cliente_telefono}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{cliente.servicio_nombre || 'No especificado'}</p>
                          <p className="text-xs text-gray-400">{cliente.profesional_nombre}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-white">
                              {formatDateColombia(cliente.fecha_sugerida)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">
                              hace {Math.abs(diasParaCita)} días
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => { setSelectedCliente(cliente); setModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Enviar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. HISTORIAL DE AUTOMATIZACIÓN Y CITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        {/* Historial de Automatización */}
        <div className="lg:col-span-1 bg-gray-800 rounded-xl border border-gray-700 flex flex-col min-h-0 max-h-[400px]">
          <div className="p-3 border-b border-gray-700 flex-shrink-0 bg-gray-800 rounded-t-xl">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" /> Historial de Envíos ({historial.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {historial.length === 0 ? (
              <p className="text-center py-8 text-gray-500 text-sm">No hay registros aún.</p>
            ) : (
              historial.map(reg => (
                <div key={reg.id} className="flex flex-col gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${reg.estado === 'enviado' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-white text-sm truncate">{reg.cliente_nombre}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDateTimeColombia(reg.fecha_envio)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{reg.mensaje_enviado}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">
                          {reg.tipo === 'recordatorio_proxima' && 'RECORDATORIO'}
                          {reg.tipo === 'cliente_riesgo' && 'RIESGO'}
                          {reg.tipo === 'inactivo' && 'INACTIVO'}
                          {reg.tipo === 'campana' && 'CAMPAÑA'}
                          {!['recordatorio_proxima', 'cliente_riesgo', 'inactivo', 'campana'].includes(reg.tipo) && reg.tipo.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-900/40 text-green-300 border border-green-700/50">
                          {reg.canal === 'whatsapp_manual' && 'WHATSAPP'}
                          {reg.canal === 'whatsapp_api' && 'API'}
                          {reg.canal === 'email' && 'EMAIL'}
                          {!['whatsapp_manual', 'whatsapp_api', 'email'].includes(reg.canal) && reg.canal.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historial de Citas Completadas */}
        <div className="lg:col-span-2 h-[400px] flex-shrink-0 overflow-y-auto custom-scrollbar bg-gray-800 rounded-xl border border-gray-700">
          <HistorialCitasSection apiUrl="https://api.dzsalon.com/api" token={getToken()} />
        </div>
      </div>

      {/* 4. BOTONES FLOTANTES */}
      <div className="fixed top-10 right-6 z-40 flex flex-col gap-3">
        {/* Botón de Configuración */}
        <button 
          onClick={() => setConfigModalOpen(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 border border-gray-600"
          title="Configurar parámetros de fidelización"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configuración</span>
        </button>

        {/* Botón de Nueva Campaña 
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 group border border-gray-600"
          onClick={() => alert('Funcionalidad de Nueva Campaña en desarrollo')}
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-medium">Nueva Campaña</span>
        </button>*/}
      </div>

      {/* 5. MODAL DE WHATSAPP COMPLETO */}
      {modalOpen && selectedCliente && (
        <WhatsAppModal 
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedCliente(null); }}
          cliente={selectedCliente}
          plantillas={plantillas}
          onSend={handleSendWhatsApp}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      {/* 6. MODAL DE CONFIGURACIÓN */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Configuración de Fidelización</h2>
                  <p className="text-sm text-gray-400">Define los parámetros del sistema de fidelización</p>
                </div>
              </div>
              <button 
                onClick={() => setConfigModalOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Días de anticipación para recordatorio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Días de anticipación para recordatorio
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={configForm.dias_anticipacion_recordatorio}
                  onChange={(e) => setConfigForm({...configForm, dias_anticipacion_recordatorio: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400">Días antes de la fecha sugerida para enviar el recordatorio automático</p>
              </div>

              {/* Días para cliente en riesgo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Días para considerar cliente en riesgo
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={configForm.dias_cliente_riesgo}
                  onChange={(e) => setConfigForm({...configForm, dias_cliente_riesgo: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400">Días sin visitar después de su frecuencia habitual para marcar como "en riesgo"</p>
              </div>

              {/* Días para cliente inactivo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <History className="w-4 h-4 text-red-400" />
                  Días para considerar cliente inactivo
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={configForm.dias_cliente_inactivo}
                  onChange={(e) => setConfigForm({...configForm, dias_cliente_inactivo: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-400">Días sin visitar para considerar al cliente como "inactivo" y requerir reactivación</p>
              </div>

              {/* Frecuencia default en días */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <Calendar className="w-4 h-4 text-green-400" />
                  Frecuencia default (días)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={configForm.frecuencia_default_dias}
                  onChange={(e) => setConfigForm({...configForm, frecuencia_default_dias: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400">Frecuencia en días que se usa cuando no hay historial suficiente del cliente</p>
              </div>

              {/* Mensaje WhatsApp default */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  Mensaje WhatsApp por defecto
                </label>
                <textarea
                  rows={4}
                  value={configForm.mensaje_whatsapp_default}
                  onChange={(e) => setConfigForm({...configForm, mensaje_whatsapp_default: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Escribe el mensaje por defecto para WhatsApp..."
                />
                <p className="text-xs text-gray-400">Mensaje que se usará como plantilla default para los recordatorios</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {savingConfig ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}