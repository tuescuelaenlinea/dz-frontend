// components/fidelizacion/HistorialCitasSection.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Phone, User, Plus, MessageCircle, Search, Loader2, Mail, Hash, Edit3 } from 'lucide-react';
import ProximaCitaSugeridaModal from './ProximaCitaSugeridaModal';
import WhatsAppModal from './WhatsAppModal';
// ← ← ← IMPORTAR LA INTERFAZ CORRECTA ← ← ←
import { ClienteFidelizacion } from '@/types/fidelizacion';

// ==========================================
// INTERFACES
// ==========================================
interface CitaHistorial {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_id: number | null;
  cliente_nombre_completo: string | null;
  cliente_email_usuario: string | null;
  cliente_telefono_perfil: string | null;
  servicio_nombre: string;
  fecha: string;
  proxima_cita_sugerida: string | null;
}

interface Props {
  apiUrl: string;
  token: string | null;
}

// ==========================================
// HELPERS
// ==========================================
const obtenerInicioSemana = (): string => {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diferencia = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diferencia);
  return lunes.toISOString().split('T')[0];
};

const obtenerFinSemana = (): string => {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diferencia = diaSemana === 0 ? 0 : 7 - diaSemana;
  const domingo = new Date(hoy);
  domingo.setDate(hoy.getDate() + diferencia);
  return domingo.toISOString().split('T')[0];
};

const limpiarTelefono = (tel: string) => tel?.replace(/\D/g, '') || '';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function HistorialCitasSection({ apiUrl, token }: Props) {
  const [fechaInicio, setFechaInicio] = useState(obtenerInicioSemana());
  const [fechaFin, setFechaFin] = useState(obtenerFinSemana());
  
  const [citas, setCitas] = useState<CitaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [isSugerenciaModalOpen, setIsSugerenciaModalOpen] = useState(false);
  const [citaIdsParaSugerir, setCitaIdsParaSugerir] = useState<number[]>([]);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  // ← ← ← USAR LA INTERFAZ CORRECTA ← ← ←
  const [citaParaWhatsApp, setCitaParaWhatsApp] = useState<ClienteFidelizacion | null>(null);
  const [plantillas, setPlantillas] = useState<any[]>([]);

  const [isClientLinkModalOpen, setIsClientLinkModalOpen] = useState(false);
  const [citaParaVincular, setCitaParaVincular] = useState<CitaHistorial | null>(null);
  
  const [isPhoneSelectModalOpen, setIsPhoneSelectModalOpen] = useState(false);
  const [citaParaTelefono, setCitaParaTelefono] = useState<CitaHistorial | null>(null);

  const cargarCitas = async () => {
    setLoading(true);
    try {
      const url = `${apiUrl}/citas/?estado=completada&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&page_size=50`;
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) throw new Error('Error al cargar citas');
      
      const data = await res.json();
      const listaCitas = data.results || data; 
      
      setCitas(listaCitas.map((c: any) => ({
        id: c.id,
        cliente_nombre: c.cliente_nombre || 'Cliente',
        cliente_telefono: c.cliente_telefono || '',
        cliente_id: c.cliente_id || null,
        cliente_nombre_completo: c.cliente_nombre_completo || null,
        cliente_email_usuario: c.cliente_email_usuario || null,
        cliente_telefono_perfil: c.cliente_telefono_perfil || null,
        servicio_nombre: c.servicio_nombre || 'Servicio',
        fecha: c.fecha,
        proxima_cita_sugerida: c.proxima_cita_sugerida || null
      })));
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPlantillas = async () => {
    try {
      const res = await fetch(`${apiUrl}/fidelizacion/plantillas/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setPlantillas(data.results || data);
      }
    } catch (error) {
      console.error('❌ Error cargando plantillas:', error);
    }
  };

  useEffect(() => {
    cargarCitas();
    cargarPlantillas();
  }, [fechaInicio, fechaFin]);

  const citasFiltradas = useMemo(() => citas.filter(c => {
    const searchLower = busqueda.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      (c.cliente_nombre || '').toLowerCase().includes(searchLower) ||
      (c.cliente_telefono || '').toLowerCase().includes(searchLower) ||
      (c.cliente_nombre_completo || '').toLowerCase().includes(searchLower) ||
      (c.cliente_email_usuario || '').toLowerCase().includes(searchLower) ||
      (c.cliente_telefono_perfil || '').toLowerCase().includes(searchLower) ||
      (c.cliente_id ? String(c.cliente_id) : '').includes(searchLower) ||
      (c.servicio_nombre || '').toLowerCase().includes(searchLower)
    );
  }), [citas, busqueda]);

  const handleOpenClientLink = (cita: CitaHistorial) => {
    setCitaParaVincular(cita);
    setIsClientLinkModalOpen(true);
  };

  const handleClientLinked = async (nuevoClienteId: number, nuevoTelefono: string) => {
    if (!citaParaVincular) return;

    try {
      const res = await fetch(`${apiUrl}/citas/${citaParaVincular.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cliente: nuevoClienteId,
          cliente_nombre: citaParaVincular.cliente_nombre,
          cliente_telefono: nuevoTelefono
        })
      });

      if (!res.ok) throw new Error('Error al vincular cliente');

      setCitas(prev => prev.map(c => 
        c.id === citaParaVincular.id 
          ? { ...c, cliente_id: nuevoClienteId, cliente_telefono: nuevoTelefono } 
          : c
      ));

      setIsClientLinkModalOpen(false);
      setCitaParaVincular(null);
      cargarCitas(); 
    } catch (error) {
      console.error('❌ Error vinculando cliente:', error);
      alert('Error al vincular el cliente a la cita.');
    }
  };

  const handleRequestWhatsApp = (cita: CitaHistorial) => {
    const telCita = limpiarTelefono(cita.cliente_telefono);
    const telPerfil = limpiarTelefono(cita.cliente_telefono_perfil ?? '');

    if (!telCita && !telPerfil) {
      alert('⚠️ No hay número de teléfono registrado ni en la cita ni en el perfil del cliente.');
      return;
    }

    if (telCita && telPerfil && telCita !== telPerfil) {
      setCitaParaTelefono(cita);
      setIsPhoneSelectModalOpen(true);
      return;
    }

    const telFinal = telCita || telPerfil;
    const fuente = telCita ? 'cita' : 'perfil';
    proceedToWhatsApp(cita, telFinal, fuente);
  };

  const proceedToWhatsApp = (cita: CitaHistorial, telefono: string, fuente: string) => {
    const diasParaCita = cita.proxima_cita_sugerida 
      ? Math.ceil((new Date(cita.proxima_cita_sugerida).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // ← ← ← MAPEO CORRECTO A LA INTERFAZ ClienteFidelizacion ← ← ←
    setCitaParaWhatsApp({
      id: 0, // ID temporal, no se usa en este contexto específico del modal
      cliente: cita.cliente_id,
      cliente_nombre: cita.cliente_nombre_completo || cita.cliente_nombre,
      cliente_telefono: telefono,
      servicio_nombre: cita.servicio_nombre,
      profesional_nombre: null, // No disponible en esta vista, es nullable
      fecha_sugerida: cita.proxima_cita_sugerida || new Date().toISOString(),
      frecuencia_dias: 0, // No disponible en esta vista, es requerido por la interfaz
      dias_para_cita: diasParaCita
    });
    setIsWhatsAppModalOpen(true);
  };

  const handleSendWhatsApp = async (plantillaId: number, mensaje: string, telefono: string) => {
    if (!citaParaWhatsApp) return;

    try {
      const res = await fetch(`${apiUrl}/fidelizacion/enviar-recordatorio/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cliente_id: citaParaWhatsApp.cliente,
          cliente_nombre: citaParaWhatsApp.cliente_nombre,
          cliente_telefono: telefono,
          plantilla_id: plantillaId,
          mensaje_personalizado: mensaje
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al generar recordatorio');
      }

      const data = await res.json();
      if (data.whatsapp_link) {
        window.open(data.whatsapp_link, '_blank');
        cargarCitas(); 
      } else {
        alert('Error: ' + (data.error || 'No se pudo generar el enlace'));
      }
    } catch (error) {
      console.error('❌ Error enviando WhatsApp:', error);
      alert('Error al procesar el envío. Verifica que el cliente tenga teléfono registrado.');
    }
  };

  // ==========================================
  // RENDER (TEMA OSCURO)
  // ==========================================
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-sm overflow-hidden mt-8">
      {/* Header y Filtros */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Historial de Citas Completadas
          </h3>
          <p className="text-sm text-gray-400">Revisa citas recientes y sugiere la próxima visita.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
            className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
          />
          <span className="text-gray-400">hasta</span>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)} 
            className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
          />
          <button 
            onClick={cargarCitas} 
            disabled={loading} 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
          </button>
          <button 
            onClick={() => { setFechaInicio(obtenerInicioSemana()); setFechaFin(obtenerFinSemana()); }} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition"
          >
             Esta Semana
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda Local */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, teléfono, email, ID o servicio..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" 
          />
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase bg-gray-900/80 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 w-1/5">Cliente (Cita)</th>
              <th className="px-4 py-3 w-1/4">Usuario Vinculado</th>
              <th className="px-4 py-3 w-1/5">Cita Realizada</th>
              <th className="px-4 py-3 w-1/5">Próxima Cita Sugerida</th>
              <th className="px-4 py-3 w-1/6 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Cargando historial...</td></tr>
            ) : citasFiltradas.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No se encontraron citas completadas en este rango de fechas.</td></tr>
            ) : (
              citasFiltradas.map((cita) => {
                const tieneUsuario = !!cita.cliente_id;
                const nombreMostrar = tieneUsuario ? (cita.cliente_nombre_completo || cita.cliente_nombre) : cita.cliente_nombre;

                return (
                  <tr key={cita.id} className="hover:bg-gray-700/50 transition-colors">
                    {/* Columna 1: Datos de la Cita */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{cita.cliente_nombre}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3" />
                            {cita.cliente_telefono || 'Sin teléfono'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Columna 2: Usuario Vinculado */}
                    <td className="px-4 py-3">
                      {tieneUsuario ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-800">
                              <Hash className="w-3 h-3 mr-1" /> ID: {cita.cliente_id}
                            </span>
                            <span className="font-semibold text-white">{nombreMostrar}</span>
                          </div>
                          {cita.cliente_email_usuario && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{cita.cliente_email_usuario}</span>
                            </div>
                          )}
                          {cita.cliente_telefono_perfil && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{cita.cliente_telefono_perfil}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleOpenClientLink(cita)}
                          className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-400 border border-yellow-700/50 hover:border-yellow-600 rounded-lg transition-all text-left w-full group"
                          title="Clic para vincular un cliente registrado o crear uno nuevo"
                        >
                          <Edit3 className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">Vincular a un usuario</span>
                            <span className="text-xs text-yellow-500/80">Busca un cliente existente o crea uno nuevo</span>
                          </div>
                        </button>
                      )}
                    </td>

                    {/* Columna 3: Cita Realizada */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{cita.servicio_nombre}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(cita.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>

                    {/* Columna 4: Próxima Cita Sugerida */}
                    <td className="px-4 py-3">
                      {cita.proxima_cita_sugerida ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/30 text-green-400 rounded-full text-xs font-medium border border-green-800">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(cita.proxima_cita_sugerida).toLocaleDateString('es-CO')}
                        </div>
                      ) : (
                        <button onClick={() => { setCitaIdsParaSugerir([cita.id]); setIsSugerenciaModalOpen(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-purple-900/50 text-gray-300 hover:text-purple-300 rounded-full text-xs font-medium border border-gray-600 hover:border-purple-700 transition-all">
                          <Plus className="w-4 h-4" /> Agregar sugerencia
                        </button>
                      )}
                    </td>                 

                    {/* Columna 5: Acción */}
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const telefonoCita = limpiarTelefono(cita.cliente_telefono);
                        const telefonoPerfil = limpiarTelefono(cita.cliente_telefono_perfil ?? '');
                        const telefonoParaRecordatorio = telefonoCita || telefonoPerfil;
                        const telefonoValido = telefonoParaRecordatorio.length >= 7;
                        
                        return (
                          <button
                            onClick={() => handleRequestWhatsApp(cita)}
                            disabled={!telefonoValido}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition ${
                              telefonoValido ? 'bg-[#25D366] hover:bg-[#20bd5a]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!telefonoValido ? 'No hay teléfono válido' : 'Enviar recordatorio por WhatsApp'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Recordatorio
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODALES
      ========================================== */}
      <ProximaCitaSugeridaModal
        isOpen={isSugerenciaModalOpen}
        onClose={() => { setIsSugerenciaModalOpen(false); cargarCitas(); }}
        citaIds={citaIdsParaSugerir}
        apiUrl={apiUrl}
        token={token}
      />

      {isPhoneSelectModalOpen && citaParaTelefono && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-700">
            <div className="bg-blue-900/50 border-b border-blue-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" /> Seleccionar Teléfono
              </h3>
              <button onClick={() => setIsPhoneSelectModalOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-300">
                Hemos detectado dos números de teléfono diferentes para <strong className="text-white">{citaParaTelefono.cliente_nombre}</strong>. ¿A cuál deseas enviar el recordatorio?
              </p>
              
              <button
                onClick={() => {
                  setIsPhoneSelectModalOpen(false);
                  proceedToWhatsApp(citaParaTelefono, citaParaTelefono.cliente_telefono, 'cita');
                }}
                className="w-full p-4 border-2 border-gray-700 rounded-xl hover:border-blue-600 hover:bg-blue-900/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center group-hover:bg-blue-900/80">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Teléfono de la Cita</p>
                    <p className="text-sm text-gray-400">{citaParaTelefono.cliente_telefono}</p>
                    <p className="text-xs text-blue-400 mt-1">Recomendado (más reciente)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsPhoneSelectModalOpen(false);
                  proceedToWhatsApp(citaParaTelefono, citaParaTelefono.cliente_telefono_perfil || '', 'perfil');
                }}
                className="w-full p-4 border-2 border-gray-700 rounded-xl hover:border-purple-600 hover:bg-purple-900/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center group-hover:bg-purple-900/80">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Teléfono del Perfil</p>
                    <p className="text-sm text-gray-400">{citaParaTelefono.cliente_telefono_perfil}</p>
                    <p className="text-xs text-purple-400 mt-1">Registrado en la cuenta del usuario</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {isWhatsAppModalOpen && citaParaWhatsApp && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => { setIsWhatsAppModalOpen(false); setCitaParaWhatsApp(null); }}
          cliente={citaParaWhatsApp}
          plantillas={plantillas}
          onSend={handleSendWhatsApp}
        />
      )}

      {isClientLinkModalOpen && citaParaVincular && (
        <ClientLinkModal
          isOpen={isClientLinkModalOpen}
          onClose={() => { setIsClientLinkModalOpen(false); setCitaParaVincular(null); }}
          cita={citaParaVincular}
          apiUrl={apiUrl}
          token={token}
          onLinked={handleClientLinked}
        />
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE: ClientLinkModal (TEMA OSCURO)
// ==========================================
interface ClientLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaHistorial;
  apiUrl: string;
  token: string | null;
  onLinked: (clienteId: number, telefono: string) => void;
}

function ClientLinkModal({ isOpen, onClose, cita, apiUrl, token, onLinked }: ClientLinkModalProps) {
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '' });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (isOpen && step === 'select') {
      cargarUsuarios();
    }
  }, [isOpen, step]);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.results || data);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUsuario = (usuario: any) => {
    const telefono = usuario.perfil?.telefono || usuario.telefono || '';
    onLinked(usuario.id, telefono);
  };

  const handleCrearCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.telefono) {
      alert('El nombre y el teléfono son obligatorios');
      return;
    }

    setCreando(true);
    try {
      const res = await fetch(`${apiUrl}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: nuevoCliente.telefono.replace(/\D/g, ''),
          email: nuevoCliente.email || `${nuevoCliente.telefono.replace(/\D/g, '')}@temp.com`,
          password: 'TempPass123!',
          first_name: nuevoCliente.nombre.split(' ')[0],
          last_name: nuevoCliente.nombre.split(' ').slice(1).join(' ') || '',
          telefono: nuevoCliente.telefono
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || 'Error al crear cliente');
      }

      const data = await res.json();
      onLinked(data.id, nuevoCliente.telefono);
    } catch (error: any) {
      console.error('Error creando cliente:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setCreando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const nombre = `${u.first_name} ${u.last_name}`.toLowerCase();
    const username = u.username.toLowerCase();
    const tel = (u.perfil?.telefono || u.telefono || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return nombre.includes(search) || username.includes(search) || tel.includes(search);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-700">
        <div className="bg-purple-900/50 border-b border-purple-800 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="w-5 h-5" /> Vincular Cliente a Cita
            </h3>
            <p className="text-xs text-purple-300 mt-1">Cita: {cita.cliente_nombre} - {cita.servicio_nombre}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, usuario o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setStep('create')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Nuevo
                </button>
              </div>

              <div className="border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-96 overflow-y-auto bg-gray-900/30">
                {loading ? (
                  <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Cargando...</div>
                ) : usuariosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No se encontraron clientes.</div>
                ) : (
                  usuariosFiltrados.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUsuario(u)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-purple-900/20 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center font-bold flex-shrink-0 border border-purple-800">
                        {(u.first_name || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{u.first_name} {u.last_name} <span className="text-xs text-gray-400 font-normal">({u.username})</span></p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {u.perfil?.telefono || u.telefono || 'Sin teléfono'}
                        </p>
                        {u.email && <p className="text-xs text-gray-500 truncate">{u.email}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep('select')} className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  ← Volver a la lista
                </button>
                <h4 className="font-semibold text-white">Registrar Nuevo Cliente</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ej: María González"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono (WhatsApp) *</label>
                <input
                  type="tel"
                  value={nuevoCliente.telefono}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ej: 3001234567"
                />
                <p className="text-xs text-gray-500 mt-1">Se guardará en el perfil del usuario.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email (Opcional)</label>
                <input
                  type="email"
                  value={nuevoCliente.email}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={() => setStep('select')} className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition">
                  Cancelar
                </button>
                <button 
                  onClick={handleCrearCliente} 
                  disabled={creando || !nuevoCliente.nombre || !nuevoCliente.telefono}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Crear y Vincular
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}