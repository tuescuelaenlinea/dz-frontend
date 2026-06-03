'use client';

import { useState, useEffect } from 'react';
import { ValoracionConfig, ValoracionSeccion, TipoSeccion } from '@/types/valoracion';
import SeccionBuilder from './SeccionBuilder';
import PreviewValoracion from './PreviewValoracion';
import { toast } from 'react-hot-toast';

interface Props {
  config: ValoracionConfig;
  onSave: (config: ValoracionConfig) => Promise<any>;
  saving: boolean;
}

export default function ConfiguracionValoracion({ config, onSave, saving }: Props) {
  const [configLocal, setConfigLocal] = useState<ValoracionConfig>(config);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [modalOpen, setModalOpen] = useState(false);
  const [seccionEditando, setSeccionEditando] = useState<ValoracionSeccion | null>(null);
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<number>>(new Set());

  // ← ← ← CLAVE: Sincronizar configLocal cuando cambie el prop config
  useEffect(() => {
    console.log('🔄 Sincronizando configLocal con prop config');
    setConfigLocal(config);
  }, [config]);

  const agregarSeccion = (tipo: TipoSeccion) => {
    const nuevaSeccion: ValoracionSeccion = {
      tipo,
      titulo: '',
      instruccion: '',
      orden: configLocal.secciones.length,
      obligatoria: false,
      seleccion_multiple: false,
      opciones: [],
    };

    const nuevasSecciones = [...configLocal.secciones, nuevaSeccion];
    setConfigLocal({
      ...configLocal,
      secciones: nuevasSecciones,
    });
    
    // ← ← ← CLAVE: Expandir automáticamente la nueva sección
    const nuevoIndex = nuevasSecciones.length - 1;
    const nuevasExpandidas = new Set(seccionesExpandidas);
    nuevasExpandidas.add(nuevoIndex);
    setSeccionesExpandidas(nuevasExpandidas);
    
    setModalOpen(false);
    toast.success('✅ Sección agregada. Completa los campos.');
  };

  const actualizarSeccion = (index: number, seccion: ValoracionSeccion) => {
    const nuevasSecciones = [...configLocal.secciones];
    nuevasSecciones[index] = seccion;
    setConfigLocal({ ...configLocal, secciones: nuevasSecciones });
  };

  const eliminarSeccion = (index: number) => {
    if (confirm('¿Estás seguro de eliminar esta sección?')) {
      const nuevasSecciones = configLocal.secciones.filter((_, i) => i !== index);
      setConfigLocal({
        ...configLocal,
        secciones: nuevasSecciones.map((s, i) => ({ ...s, orden: i })),
      });
      
      const nuevasExpandidas = new Set(seccionesExpandidas);
      nuevasExpandidas.delete(index);
      setSeccionesExpandidas(nuevasExpandidas);
      
      toast.success('🗑️ Sección eliminada');
    }
  };

  const toggleSeccionExpandida = (index: number) => {
    const nuevas = new Set(seccionesExpandidas);
    if (nuevas.has(index)) {
      nuevas.delete(index);
    } else {
      nuevas.add(index);
    }
    setSeccionesExpandidas(nuevas);
  };

  const handleSave = async () => {
    console.log('💾 Iniciando guardado...');
    console.log('📊 Secciones:', configLocal.secciones.length);
    
    // Validaciones
    if (configLocal.secciones.length === 0) {
      toast.error('⚠️ Debes agregar al menos una sección');
      return;
    }

    const seccionesSinTitulo = configLocal.secciones.filter(s => !s.titulo.trim());
    if (seccionesSinTitulo.length > 0) {
      toast.error(`⚠️ ${seccionesSinTitulo.length} sección(es) sin título`);
      const primerIndex = configLocal.secciones.findIndex(s => !s.titulo.trim());
      if (primerIndex >= 0) {
        const nuevasExpandidas = new Set(seccionesExpandidas);
        nuevasExpandidas.add(primerIndex);
        setSeccionesExpandidas(nuevasExpandidas);
      }
      return;
    }

    try {
      const toastId = toast.loading('💾 Guardando configuración...');
      
      // ← ← ← CLAVE: Esperar la respuesta y capturar errores
      await onSave(configLocal);
      
      toast.success('✅ Configuración guardada exitosamente', {
        id: toastId,
        duration: 3000,
      });
      
      // Colapsar todas las secciones después de guardar
      setSeccionesExpandidas(new Set());
      
    } catch (error: any) {
      console.error('❌ Error en handleSave:', error);
      toast.error(`❌ ${error.message || 'Error al guardar configuración'}`);
    }
  };

  // ← ← ← DEBUG: Log de cambios en configLocal
  useEffect(() => {
    console.log('📊 configLocal actualizado:', {
      secciones: configLocal.secciones.length,
      titulo: configLocal.titulo,
    });
  }, [configLocal]);

  return (
    <div className="space-y-6">
      {/* Header con tabs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'editor'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✏️ Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'preview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👁️ Vista Previa
            </button>
          </div>
          
          <button
            onClick={() => setModalOpen(true)}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            + Agregar Sección
          </button>
        </div>
      </div>

      {/* Contenido */}
      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {configLocal.secciones.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">
                No hay secciones configuradas
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Crear primera sección
              </button>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 font-medium">
                  📊 Total de secciones: <strong>{configLocal.secciones.length}</strong>
                </p>
              </div>
              
              {configLocal.secciones.map((seccion, index) => (
                <SeccionBuilder
                  key={index}
                  seccion={seccion}
                  index={index}
                  onUpdate={(seccionActualizada) =>
                    actualizarSeccion(index, seccionActualizada)
                  }
                  onDelete={() => eliminarSeccion(index)}
                  todasSecciones={configLocal.secciones}
                  isExpanded={seccionesExpandidas.has(index)}
                  onToggleExpand={() => toggleSeccionExpandida(index)}
                />
              ))}
            </>
          )}
        </div>
      ) : (
        <PreviewValoracion config={configLocal} />
      )}

      {/* Botón guardar */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          onClick={() => {
            setConfigLocal(config);
            setSeccionesExpandidas(new Set());
            toast('↩️ Cambios descartados');
          }}
          disabled={saving}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || configLocal.secciones.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            <>💾 Guardar Configuración ({configLocal.secciones.length} secciones)</>
          )}
        </button>
      </div>

      {/* Modal para seleccionar tipo de sección */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Seleccionar Tipo de Sección</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => agregarSeccion('foto_opciones')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 text-left transition-colors"
              >
                <h3 className="font-bold text-lg">📸 Foto + Opciones</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Muestra fotos con opciones seleccionables (radio/checkbox)
                </p>
              </button>
              
              <button
                onClick={() => agregarSeccion('foto_descripcion')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 text-left transition-colors"
              >
                <h3 className="font-bold text-lg">📝 Foto + Descripción</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Fotos con descripciones detalladas
                </p>
              </button>
              
              <button
                onClick={() => agregarSeccion('pregunta_opciones')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 text-left transition-colors"
              >
                <h3 className="font-bold text-lg">❓ Pregunta + Botones</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Pregunta con opciones tipo botón
                </p>
              </button>
              
              <button
                onClick={() => agregarSeccion('pregunta_texto')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 text-left transition-colors"
              >
                <h3 className="font-bold text-lg">✍️ Pregunta + Texto</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Campo de texto libre para respuesta
                </p>
              </button>
              
              <button
                onClick={() => agregarSeccion('subir_foto')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 text-left transition-colors md:col-span-2"
              >
                <h3 className="font-bold text-lg">📤 Subir Foto</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Permite al cliente subir una foto de referencia
                </p>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}