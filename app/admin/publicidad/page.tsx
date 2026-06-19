'use client';
// /var/www/dz_api/frontend/app/admin/publicidad/page.tsx
import { useState, useEffect } from 'react';

interface Publicidad {
  id: number;
  titulo: string;
  descripcion: string;
  imagen: string;
  imagen_url: string;
  url_destino?: string;
  texto_boton: string;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  audiencia: string;
  audiencia_display: string;
  empresa_aliada?: number;
  empresa_aliada_nombre?: string;
  frecuencia: string;
  frecuencia_display: string;
  vistas: number;
  esta_vigente: boolean;
  creado: string;
}

interface Aliado {
  id: number;
  nombre: string;
  nit: string;
  activo: boolean;
}

const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'El archivo debe ser una imagen' };
  }
  
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `La imagen es muy grande. Tamaño máximo: 5MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }
  
  return { valid: true };
};

const compressImage = (file: File, maxSizeMB: number = 0.5): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 600;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          0.7
        );
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
};

export default function PublicidadPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const [publicidades, setPublicidades] = useState<Publicidad[]>([]);
  const [aliados, setAliados] = useState<Aliado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    imagen: null as File | null,
    url_destino: '',
    texto_boton: 'Ver más',
    activo: true,
    fecha_inicio: '',
    fecha_fin: '',
    audiencia: 'todos',
    empresa_aliada: '',
    frecuencia: 'una_vez'
  });

  useEffect(() => {
    cargarPublicidades();
    cargarAliados();
  }, []);

  const cargarAliados = async () => {
    try {
      const res = await fetch(`${apiUrl}/aliados/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setAliados(data.results || data);
      }
    } catch (err) {
      console.error('❌ Error cargando aliados:', err);
    }
  };

  const cargarPublicidades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/publicidad/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setPublicidades(data.results || data);
      }
    } catch (err) {
      console.error('❌ Error cargando publicidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = () => {
    setEditingId(null);
    setFormData({
      titulo: '',
      descripcion: '',
      imagen: null,
      url_destino: '',
      texto_boton: 'Ver más',
      activo: true,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      audiencia: 'todos',
      empresa_aliada: '',
      frecuencia: 'una_vez'
    });
    setShowModal(true);
  };

  const handleEditar = (pub: Publicidad) => {
    setEditingId(pub.id);
    setFormData({
      titulo: pub.titulo,
      descripcion: pub.descripcion,
      imagen: null,
      url_destino: pub.url_destino || '',
      texto_boton: pub.texto_boton,
      activo: pub.activo,
      fecha_inicio: pub.fecha_inicio.split('T')[0],
      fecha_fin: pub.fecha_fin.split('T')[0],
      audiencia: pub.audiencia,
      empresa_aliada: pub.empresa_aliada?.toString() || '',
      frecuencia: pub.frecuencia
    });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    try {
      if (!formData.titulo.trim()) {
        alert('⚠️ El título es obligatorio');
        return;
      }
      
      let imagenAEnviar = formData.imagen;
      
      if (imagenAEnviar) {
        const validation = validateImageFile(imagenAEnviar);
        if (!validation.valid) {
          alert(`⚠️ ${validation.error}`);
          return;
        }
        
        if (imagenAEnviar.size > 500 * 1024) {
          try {
            setLoading(true);
            alert('🔄 Comprimiendo imagen... Por favor espera.');
            
            imagenAEnviar = await compressImage(imagenAEnviar, 0.5);
            
            alert('✅ Imagen comprimida exitosamente');
            console.log(`✅ Imagen comprimida: ${(imagenAEnviar.size / 1024 / 1024).toFixed(2)}MB → ${(imagenAEnviar.size / 1024 / 1024).toFixed(2)}MB`);
          } catch (err) {
            console.error('❌ Error comprimiendo imagen:', err);
            alert('⚠️ Error al comprimir la imagen. Intenta con otra imagen más pequeña.');
            setLoading(false);
            return;
          } finally {
            setLoading(false);
          }
        }
      }
      
      let response;
      
      if (editingId && !imagenAEnviar) {
        response = await fetch(`${apiUrl}/publicidad/${editingId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            url_destino: formData.url_destino,
            texto_boton: formData.texto_boton,
            activo: formData.activo,
            fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
            fecha_fin: new Date(formData.fecha_fin).toISOString(),
            audiencia: formData.audiencia,
            frecuencia: formData.frecuencia,
            empresa_aliada: formData.empresa_aliada || null
          })
        });
      } else {
        const formDataObj = new FormData();
        formDataObj.append('titulo', formData.titulo);
        formDataObj.append('descripcion', formData.descripcion);
        
        if (imagenAEnviar && imagenAEnviar instanceof File) {
          formDataObj.append('imagen', imagenAEnviar);
          console.log(`📎 Imagen adjunta: ${imagenAEnviar.name} (${(imagenAEnviar.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        formDataObj.append('url_destino', formData.url_destino);
        formDataObj.append('texto_boton', formData.texto_boton);
        formDataObj.append('activo', formData.activo.toString());
        formDataObj.append('fecha_inicio', new Date(formData.fecha_inicio).toISOString());
        formDataObj.append('fecha_fin', new Date(formData.fecha_fin).toISOString());
        formDataObj.append('audiencia', formData.audiencia);
        formDataObj.append('frecuencia', formData.frecuencia);
        
        if (formData.empresa_aliada) {
          formDataObj.append('empresa_aliada', formData.empresa_aliada);
        }

        const method = editingId ? 'PATCH' : 'POST';
        const url = editingId 
          ? `${apiUrl}/publicidad/${editingId}/`
          : `${apiUrl}/publicidad/`;

        console.log(`📡 Enviando ${method} a ${url}`);
        
        response = await fetch(url, {
          method,
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formDataObj
        });
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Publicidad guardada exitosamente:', data);
        
        alert(`✅ Publicidad ${editingId ? 'actualizada' : 'creada'} exitosamente`);
        setShowModal(false);
        cargarPublicidades();
      } else {
        let errorMessage = 'Error desconocido';
        
        if (response.status === 413) {
          errorMessage = 'La imagen es demasiado grande. Máximo 5MB permitidos.';
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = Object.values(errorData).flat().join('\n') || 'Datos inválidos';
        } else if (response.status === 401) {
          errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
        } else if (response.status === 500) {
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.imagen?.[0] || 
                          errorData.titulo?.[0] || 
                          errorData.detail || 
                          JSON.stringify(errorData);
          } catch {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        }
        
        console.error('❌ Error del backend:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage
        });
        
        alert(`❌ Error al guardar:\n${errorMessage}`);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      
      let errorMessage = 'Error de conexión';
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorMessage = 'No se pudo conectar con el servidor.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta publicidad?')) return;

    try {
      const res = await fetch(`${apiUrl}/publicidad/${id}/`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        alert('✅ Publicidad eliminada');
        cargarPublicidades();
      }
    } catch (err) {
      console.error('❌ Error eliminando:', err);
    }
  };

  const mostrarSelectorEmpresa = formData.audiencia === 'aliados' || formData.audiencia === 'empleados_aliados';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">📢 Gestión de Publicidades</h1>
            <p className="text-gray-400 mt-2">Administra las publicidades modales del sistema</p>
          </div>
          <button
            onClick={handleCrear}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
          >
            + Nueva Publicidad
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicidades.map((pub) => (
            <div
              key={pub.id}
              className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-purple-500 transition-colors"
            >
              <div className="relative h-48">
                <img
                  src={pub.imagen_url}
                  alt={pub.titulo}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {pub.activo && pub.esta_vigente && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                      ✅ Activa
                    </span>
                  )}
                  {!pub.activo && (
                    <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
                      ⏸️ Inactiva
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-2">{pub.titulo}</h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {pub.descripcion}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>👁️ {pub.vistas} vistas</span>
                  <span>🎯 {pub.audiencia_display}</span>
                </div>

                {pub.empresa_aliada_nombre && (
                  <div className="text-xs text-blue-400 mb-2">
                    🏢 {pub.empresa_aliada_nombre}
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-4">
                  <div>📅 Inicio: {new Date(pub.fecha_inicio).toLocaleDateString('es-CO')}</div>
                  <div>📅 Fin: {new Date(pub.fecha_fin).toLocaleDateString('es-CO')}</div>
                  <div>🔄 {pub.frecuencia_display}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditar(pub)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(pub.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {publicidades.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <p className="text-gray-400 text-lg">No hay publicidades creadas</p>
            <button
              onClick={handleCrear}
              className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
            >
              Crear primera publicidad
            </button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-purple-700">
              <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? '✏️ Editar Publicidad' : '✨ Nueva Publicidad'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Ej: Promo Verano 2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Descripción de la promoción..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Imagen *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setFormData({ ...formData, imagen: null });
                        return;
                      }
                      
                      const validation = validateImageFile(file);
                      if (!validation.valid) {
                        alert(`⚠️ ${validation.error}`);
                        e.target.value = '';
                        return;
                      }
                      
                      setFormData({ ...formData, imagen: file });
                      
                      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                      console.log(`📁 Imagen seleccionada: ${file.name} (${sizeMB}MB)`);
                      if (file.size > 1024 * 1024) {
                        console.log('💡 La imagen se comprimirá automáticamente al guardar');
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  />
                  {formData.imagen && (
                    <p className="text-xs text-gray-500 mt-1">
                      📁 {formData.imagen.name} ({(formData.imagen.size / 1024 / 1024).toFixed(2)} MB)
                      {formData.imagen.size > 1024 * 1024 && (
                        <span className="text-yellow-500 ml-2">⚠️ Se comprimirá al guardar</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    URL destino (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.url_destino}
                    onChange={(e) => setFormData({ ...formData, url_destino: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Texto del botón
                  </label>
                  <input
                    type="text"
                    value={formData.texto_boton}
                    onChange={(e) => setFormData({ ...formData, texto_boton: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Ver más"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Fecha inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Fecha fin *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Audiencia objetivo *
                  </label>
                  <select
                    value={formData.audiencia}
                    onChange={(e) => setFormData({ ...formData, audiencia: e.target.value, empresa_aliada: '' })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="todos">🌐 Todos los clientes</option>
                    <option value="aliados">🏢 Empresas aliadas</option>
                    <option value="empleados_aliados">👥 Empleados de empresas aliadas</option>
                    <option value="referidos">🎯 Clientes referidos</option>
                    <option value="referentes">⭐ Clientes referentes</option>
                    <option value="nuevos">🆕 Clientes nuevos</option>
                    <option value="frecuentes">🔄 Clientes frecuentes</option>
                  </select>
                </div>

                {mostrarSelectorEmpresa && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Empresa aliada específica (opcional)
                    </label>
                    <select
                      value={formData.empresa_aliada}
                      onChange={(e) => setFormData({ ...formData, empresa_aliada: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">🌐 Todas las empresas aliadas</option>
                      {aliados.map((aliado) => (
                        <option key={aliado.id} value={aliado.id}>
                          {aliado.nombre} (NIT: {aliado.nit})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Si no seleccionas una empresa específica, la publicidad se mostrará a todos los empleados de todas las empresas aliadas
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Frecuencia de aparición *
                  </label>
                  <select
                    value={formData.frecuencia}
                    onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="siempre">Cada vez que entre</option>
                    <option value="una_vez">Una sola vez por cliente</option>
                    <option value="diaria">Una vez al día por cliente</option>
                    <option value="semanal">Una vez por semana por cliente</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="activo" className="text-sm font-semibold text-gray-300">
                    Publicidad activa
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-800 p-6 border-t border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors"
                >
                  {editingId ? '💾 Actualizar' : '✨ Crear'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}