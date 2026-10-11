import { useState } from 'react';
import { MessageCircle, Calendar, AlertTriangle, History, Phone } from 'lucide-react';
import { ClienteFidelizacion, HistorialAutomatizacion } from '@/types/fidelizacion';

interface Props {
  clientes: ClienteFidelizacion[];
  clientesRiesgo: ClienteFidelizacion[]; // ← NUEVO: Datos para la pestaña de riesgo
  historial: HistorialAutomatizacion[];
  onOpenModal: (cliente: ClienteFidelizacion) => void;
}

// Tipado correcto para evitar el "as any"
type TabId = 'contactar' | 'riesgo' | 'historial';

export default function ClientList({ clientes, clientesRiesgo, historial, onOpenModal }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('contactar');

  const tabs: { id: TabId; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'contactar', label: 'Contactar Hoy', icon: MessageCircle, count: clientes.length },
    { id: 'riesgo', label: 'En Riesgo', icon: AlertTriangle, count: clientesRiesgo.length },
    { id: 'historial', label: 'Historial', icon: History, count: historial.length },
  ];

  // Función auxiliar para renderizar la tabla de clientes (reutilizable para contactar y riesgo)
  const renderClientTable = (listaClientes: ClienteFidelizacion[], isEmptyMsg: string, isRiesgo: boolean = false) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-4 py-3 rounded-l-lg">Cliente</th>
            <th className="px-4 py-3">Servicio Sugerido</th>
            <th className="px-4 py-3">Próxima Cita</th>
            <th className="px-4 py-3 rounded-r-lg text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {listaClientes.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                {isEmptyMsg}
              </td>
            </tr>
          ) : (
            listaClientes.map(cliente => (
              <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{cliente.cliente_nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {cliente.cliente_telefono}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-900 dark:text-gray-200">{cliente.servicio_nombre || 'No especificado'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cliente.profesional_nombre}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {new Date(cliente.fecha_sugerida).toLocaleDateString('es-CO')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      cliente.dias_para_cita <= 3 || isRiesgo
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {isRiesgo ? `Hace ${Math.abs(cliente.dias_para_cita)} días` : `en ${cliente.dias_para_cita} días`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => onOpenModal(cliente)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${
                      isRiesgo 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-[#25D366] hover:bg-[#20bd5a]'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {isRiesgo ? 'Recuperar' : 'Enviar'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative
              ${activeTab === tab.id 
                ? 'text-[#075E54] dark:text-emerald-400 border-b-2 border-[#075E54] dark:border-emerald-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id 
                ? 'bg-[#075E54] text-white dark:bg-emerald-600' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'contactar' && renderClientTable(clientes, 'No hay clientes para contactar hoy.')}
        
        {activeTab === 'riesgo' && renderClientTable(clientesRiesgo, 'No hay clientes en riesgo en este momento.', true)}

        {activeTab === 'historial' && (
          <div className="space-y-3">
            {historial.length === 0 ? (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                No hay registros de automatización aún.
              </p>
            ) : (
              historial.map(reg => (
                <div key={reg.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    reg.estado === 'enviado' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {reg.cliente_nombre}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {new Date(reg.fecha_envio).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {reg.mensaje_enviado}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                        {reg.tipo.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                        {reg.canal.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}