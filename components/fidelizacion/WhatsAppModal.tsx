// components/fidelizacion/WhatsAppModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { 
  X, Send, MessageCircle, AlertCircle, CheckCircle2, Phone,
  Plus, Edit2, Trash2, Save, LayoutTemplate
} from 'lucide-react';
import { ClienteFidelizacion, PlantillaMensaje } from '@/types/fidelizacion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteFidelizacion | null;
  plantillas: PlantillaMensaje[];
  onSend: (plantillaId: number, mensaje: string, telefono: string) => Promise<void>;
  onSaveTemplate?: (template: Partial<PlantillaMensaje>) => Promise<void>;
  onDeleteTemplate?: (templateId: number) => Promise<void>;
}

const reemplazarVariables = (texto: string, cliente: ClienteFidelizacion): string => {
  if (!texto) return '';
  const fechaSugerida = cliente.fecha_sugerida
    ? new Date(cliente.fecha_sugerida).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'fecha por definir';

  const reemplazos: Record<string, string> = {
    '{nombre}': cliente.cliente_nombre || 'estimado cliente',
    '{servicio}': cliente.servicio_nombre || 'nuestro servicio',
    '{fecha}': fechaSugerida,
    '{estilista}': cliente.profesional_nombre || 'nuestro equipo',
    '{dias}': String(cliente.dias_para_cita ?? 0),
    '{telefono}': cliente.cliente_telefono || '',
    '{salon}': 'DZ Salón',
  };

  let resultado = texto;
  Object.entries(reemplazos).forEach(([variable, valor]) => {
    resultado = resultado.split(variable).join(valor);
  });
  return resultado;
};

const validarTelefono = (telefono: string): boolean => {
  if (!telefono) return false;
  const limpio = telefono.replace(/\D/g, '');
  return limpio.length === 10 || limpio.length === 12;
};

const formatearTelefonoWhatsApp = (telefono: string): string => {
  if (!telefono) return '';
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.startsWith('57') && limpio.length === 12) return limpio;
  if (limpio.length === 10) return `57${limpio}`;
  return limpio;
};

export default function WhatsAppModal({ 
  isOpen, onClose, cliente, plantillas, onSend,
  onSaveTemplate, onDeleteTemplate 
}: Props) {
  const [selectedPlantilla, setSelectedPlantilla] = useState<number>(0);
  const [mensaje, setMensaje] = useState('');
  const [telefonoEditado, setTelefonoEditado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para gestión de plantillas
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PlantillaMensaje | null>(null);
  const [templateForm, setTemplateForm] = useState({
    nombre: '',
    categoria: 'recordatorio',
    contenido: '',
    es_activa: true,
    es_default: false
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const plantillaDefault = useMemo(() => {
    if (!plantillas || plantillas.length === 0) return null;
    return plantillas.find((p) => p.es_default) || plantillas[0];
  }, [plantillas]);

  useEffect(() => {
    if (isOpen && cliente) {
      setTelefonoEditado(formatearTelefonoWhatsApp(cliente.cliente_telefono || ''));
      if (plantillaDefault) {
        setSelectedPlantilla(plantillaDefault.id);
        setMensaje(reemplazarVariables(plantillaDefault.contenido, cliente));
      }
      setError(null);
    }
  }, [isOpen, cliente, plantillaDefault]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        if (showTemplateManager) {
          setShowTemplateManager(false);
          setEditingTemplate(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose, showTemplateManager]);

  const handlePlantillaChange = (plantillaId: number) => {
    setSelectedPlantilla(plantillaId);
    if (plantillaId === 0) {
      setMensaje('');
      return;
    }
    const plantilla = plantillas.find((p) => p.id === plantillaId);
    if (plantilla && cliente) {
      setMensaje(reemplazarVariables(plantilla.contenido, cliente));
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      nombre: '',
      categoria: 'recordatorio',
      contenido: 'Hola {nombre},\n\nEsperamos que estés muy bien. Te recordamos que tienes una cita programada para el {fecha}.\n\n¡Te esperamos en DZ Salón!',
      es_activa: true,
      es_default: false
    });
    setShowTemplateManager(true);
  };

  const handleEditTemplate = (template: PlantillaMensaje) => {
    setEditingTemplate(template);
    setTemplateForm({
      nombre: template.nombre,
      categoria: template.categoria,
      contenido: template.contenido,
      es_activa: template.es_activa,
      es_default: template.es_default
    });
    setShowTemplateManager(true);
  };

  const handleSaveTemplate = async () => {
    if (!onSaveTemplate) {
      alert('La función de guardar plantillas no está disponible');
      return;
    }

    if (!templateForm.nombre.trim() || !templateForm.contenido.trim()) {
      alert('El nombre y el contenido son obligatorios');
      return;
    }

    setSavingTemplate(true);
    try {
      await onSaveTemplate({
        ...templateForm,
        id: editingTemplate?.id
      });
      setShowTemplateManager(false);
      setEditingTemplate(null);
      alert('✅ Plantilla guardada exitosamente');
    } catch (err) {
      console.error('Error guardando plantilla:', err);
      alert('❌ Error al guardar la plantilla');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!onDeleteTemplate) {
      alert('La función de eliminar plantillas no está disponible');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    try {
      await onDeleteTemplate(templateId);
      alert('✅ Plantilla eliminada');
    } catch (err) {
      console.error('Error eliminando plantilla:', err);
      alert('❌ Error al eliminar la plantilla');
    }
  };

  const validarAntesDeEnviar = (): boolean => {
    if (!cliente) { setError('No hay cliente seleccionado'); return false; }
    if (!validarTelefono(telefonoEditado)) {
      setError(`El teléfono "${telefonoEditado}" no es válido. Debe tener 10 dígitos o 12 con 57.`);
      return false;
    }
    if (!mensaje || mensaje.trim().length === 0) { setError('El mensaje no puede estar vacío'); return false; }
    if (mensaje.length > 4000) { setError('El mensaje es muy largo (máximo 4000 caracteres)'); return false; }
    setError(null);
    return true;
  };

  const handleSend = async () => {
    if (!validarAntesDeEnviar()) return;
    setLoading(true);
    try {
      await onSend(selectedPlantilla, mensaje, telefonoEditado);
      onClose();
    } catch (err) {
      console.error('Error enviando:', err);
      setError(err instanceof Error ? err.message : 'Error al generar el enlace de WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // Modal de Gestión de Plantillas
  if (showTemplateManager) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-700 max-h-[90vh] flex flex-col">
          <div className="bg-blue-900/50 border-b border-blue-800 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6" />
              <h3 className="font-semibold text-lg">
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
            </div>
            <button 
              onClick={() => { setShowTemplateManager(false); setEditingTemplate(null); }}
              className="hover:bg-white/10 p-1.5 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de la plantilla *
              </label>
              <input
                type="text"
                value={templateForm.nombre}
                onChange={(e) => setTemplateForm({...templateForm, nombre: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Recordatorio de cita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Categoría
              </label>
              <select
                value={templateForm.categoria}
                onChange={(e) => setTemplateForm({...templateForm, categoria: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recordatorio">Recordatorio</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="promocion">Promoción</option>
                <option value="bienvenida">Bienvenida</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contenido del mensaje *
              </label>
              <textarea
                value={templateForm.contenido}
                onChange={(e) => setTemplateForm({...templateForm, contenido: e.target.value})}
                rows={8}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Escribe el contenido de la plantilla usando variables como {nombre}, {servicio}, {fecha}, etc."
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables disponibles: {`{nombre}`} {`{servicio}`} {`{fecha}`} {`{estilista}`} {`{dias}`} {`{telefono}`} {`{salon}`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateForm.es_activa}
                  onChange={(e) => setTemplateForm({...templateForm, es_activa: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <span className="text-sm text-gray-300">Plantilla activa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateForm.es_default}
                  onChange={(e) => setTemplateForm({...templateForm, es_default: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <span className="text-sm text-gray-300">Establecer como predeterminada</span>
              </label>
            </div>
          </div>

          <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-900/50">
            <button
              onClick={() => { setShowTemplateManager(false); setEditingTemplate(null); }}
              className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !templateForm.nombre.trim() || !templateForm.contenido.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition"
            >
              {savingTemplate ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar Plantilla</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 border border-gray-700">
        <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <h3 className="font-semibold text-lg">Enviar Recordatorio por WhatsApp</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="hover:bg-white/20 p-1.5 rounded-full transition disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1"><p className="text-sm text-red-200">{error}</p></div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 space-y-3">
                <p className="font-semibold text-white">{cliente.cliente_nombre}</p>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Teléfono para WhatsApp</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><Phone className="w-4 h-4" /></span>
                    <input
                      type="text"
                      value={telefonoEditado}
                      onChange={(e) => {
                        setTelefonoEditado(e.target.value.replace(/\D/g, ''));
                        if (error) setError(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-[#25D366] focus:border-transparent transition-all"
                      placeholder="Ej: 573001234567"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">* Puedes corregir o cambiar el número antes de enviar.</p>
                </div>
                {cliente.servicio_nombre && <p className="text-xs text-gray-400">Último servicio: {cliente.servicio_nombre}</p>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-300">Plantilla</label>
                {onSaveTemplate && (
                  <button
                    onClick={handleNewTemplate}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nueva
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <select
                  value={selectedPlantilla}
                  onChange={(e) => handlePlantillaChange(Number(e.target.value))}
                  disabled={loading}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-[#25D366] focus:border-transparent disabled:opacity-50"
                >
                  {plantillas.filter(p => p.es_activa).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.es_default && '(Default)'}
                    </option>
                  ))}
                  <option value={0}>✏️ Mensaje personalizado</option>
                </select>
                
                {/* Lista rápida de plantillas con acciones */}
                {plantillas.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                    {plantillas.filter(p => p.es_activa).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-gray-900/50 rounded hover:bg-gray-700/50 group">
                        <span className="text-gray-300 truncate flex-1">
                          {p.nombre} {p.es_default && '⭐'}
                        </span>
                        {onDeleteTemplate && (
                          <button
                            onClick={() => handleDeleteTemplate(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                            title="Eliminar plantilla"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {onSaveTemplate && (
                          <button
                            onClick={() => handleEditTemplate(p)}
                            className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 p-1"
                            title="Editar plantilla"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-300 mb-2">💡 Variables disponibles:</p>
              <div className="flex flex-wrap gap-1">
                {['{nombre}', '{servicio}', '{fecha}', '{estilista}', '{dias}', '{telefono}', '{salon}'].map((v) => (
                  <code key={v} className="text-xs bg-gray-800 px-1.5 py-0.5 rounded border border-blue-700 text-blue-300">{v}</code>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-1">Vista previa del mensaje</label>
            <div className="bg-[#0B141A] rounded-lg p-3 min-h-[200px] mb-2 border border-gray-700">
              <div className="bg-[#005C4B] rounded-lg p-3 shadow-sm relative max-w-[90%] ml-auto">
                <p className="text-sm text-white whitespace-pre-wrap break-words">
                  {mensaje || <span className="text-gray-400 italic">Escribe tu mensaje aquí...</span>}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-green-200/70">{new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                  {mensaje && <CheckCircle2 className="w-3 h-3 text-green-300" />}
                </div>
              </div>
            </div>

            <textarea
              value={mensaje}
              onChange={(e) => { setMensaje(e.target.value); if (error) setError(null); }}
              rows={6}
              maxLength={4000}
              disabled={loading}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none disabled:opacity-50"
              placeholder="Escribe tu mensaje aquí..."
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">* Las variables se reemplazan automáticamente</p>
              <p className={`text-xs ${4000 - mensaje.length < 100 ? 'text-orange-400' : 'text-gray-500'}`}>{mensaje.length}/4000</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 p-4 border-t border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-400">Se abrirá WhatsApp Web con el mensaje listo</p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg font-medium transition disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !mensaje.trim()}
              className="px-6 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              ) : (
                <><Send className="w-4 h-4" /> Abrir en WhatsApp</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}