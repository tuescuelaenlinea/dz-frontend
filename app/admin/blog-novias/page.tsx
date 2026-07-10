'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ComboNovia {
  id?: number;
  nombre: string;
  icono: string;
  precio: string;
  moneda: string;
  caracteristica_1: string;
  caracteristica_2: string;
  caracteristica_3: string;
  caracteristica_4: string;
  caracteristica_5: string;
  caracteristica_6: string;
  link_reserva: string;
  destacado: boolean;
  orden: number;
  activo: boolean;
}

interface BlogPostData {
  id?: number;
  titulo: string;
  slug: string;
  header_imagen: string | null;
  header_imagen_url?: string;
  header_titulo_principal: string;
  header_subtitulo: string;
  header_texto: string;
  galeria_imagen_1: string | null;
  galeria_imagen_1_url?: string;
  galeria_imagen_2: string | null;
  galeria_imagen_2_url?: string;
  galeria_imagen_3: string | null;
  galeria_imagen_3_url?: string;
  galeria_imagen_4: string | null;
  galeria_imagen_4_url?: string;
  galeria_imagen_5: string | null;
  galeria_imagen_5_url?: string;
  tiempo_cambio_1: number;
  tiempo_cambio_2: number;
  tiempo_cambio_3: number;
  tiempo_cambio_4: number;
  tiempo_cambio_5: number;
  servicios_titulo: string;
  servicios_subtitulo: string;
  servicios_descripcion: string;
  servicios_imagen: string | null;
  servicios_imagen_url?: string;
  combos_imagen_fondo: string | null;
  combos_imagen_fondo_url?: string;
  activo: boolean;
  combos?: ComboNovia[];
  combos_imagen_fondo_mobile: string | null;
  combos_imagen_fondo_mobile_url?: string;
}

type TabType = 'general' | 'galeria' | 'servicios' | 'combos';

export default function AdminBlogNovias() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [blogData, setBlogData] = useState<BlogPostData>({
    titulo: 'Blog Novias Cartagena',
    slug: '',
    header_imagen: null,
    header_titulo_principal: 'NOVIAS en Cartagena',
    header_subtitulo: 'Tu mejor versión, en el día más especial',
    header_texto: 'Belleza que resalta tu esencia, en la ciudad más mágica.',
    galeria_imagen_1: null,
    galeria_imagen_2: null,
    galeria_imagen_3: null,
    galeria_imagen_4: null,
    galeria_imagen_5: null,
    tiempo_cambio_1: 3,
    tiempo_cambio_2: 5,
    tiempo_cambio_3: 4,
    tiempo_cambio_4: 6,
    tiempo_cambio_5: 4,
    servicios_titulo: 'MAQUILLAJE & PEINADO',
    servicios_subtitulo: 'para novias y acompañantes',
    servicios_descripcion: '',
    servicios_imagen: null,
    combos_imagen_fondo: null,
    combos_imagen_fondo_mobile: null,
    activo: true,
    combos: [],
  });

  // ← ← ← CLAVE: Inicializar SIEMPRE como array vacío ← ← ←
  const [combos, setCombos] = useState<ComboNovia[]>([]);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});

  const API_DOMAIN = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  useEffect(() => {
    cargarDatos();
  }, []);

  const getImageUrl = (imagePath: string | null | undefined, urlCompleta?: string): string | null => {
    if (urlCompleta && urlCompleta.startsWith('http')) {
      return urlCompleta;
    }
    
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const baseUrl = API_DOMAIN.replace('/api', '');
    const cleanPath = imagePath.startsWith('/media') ? imagePath : `/media/${imagePath}`;
    return `${baseUrl}${cleanPath}`;
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_DOMAIN}/blog-posts/activo/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const data = await res.json();
        
        console.log('📥 Datos recibidos del backend:', data);
        console.log('📦 Combos en respuesta:', data.combos);
        
        // ← ← ← CLAVE: Verificar si hay blog activo ← ← ←
        if (data.count === 0 || data.detail === 'No hay blog post activo') {
          console.log('⚠️ No hay blog post activo, usando valores por defecto');
          // ← ← ← IMPORTANTE: Asegurar que combos sea array vacío ← ← ←
          setCombos([]);
          setLoading(false);
          return;
        }
        
        // ← ← ← MAPEO EXPLÍCITO de campos ← ← ←
        setBlogData({
          id: data.id,
          titulo: data.titulo || 'Blog Novias',
          slug: data.slug || '',
          header_imagen: data.header_imagen || null,
          header_imagen_url: data.header_imagen_url || null,
          header_titulo_principal: data.header_titulo_principal || '',
          header_subtitulo: data.header_subtitulo || '',
          header_texto: data.header_texto || '',
          galeria_imagen_1: data.galeria_imagen_1 || null,
          galeria_imagen_1_url: data.galeria_imagen_1_url || null,
          galeria_imagen_2: data.galeria_imagen_2 || null,
          galeria_imagen_2_url: data.galeria_imagen_2_url || null,
          galeria_imagen_3: data.galeria_imagen_3 || null,
          galeria_imagen_3_url: data.galeria_imagen_3_url || null,
          galeria_imagen_4: data.galeria_imagen_4 || null,
          galeria_imagen_4_url: data.galeria_imagen_4_url || null,
          galeria_imagen_5: data.galeria_imagen_5 || null,
          galeria_imagen_5_url: data.galeria_imagen_5_url || null,
          tiempo_cambio_1: data.tiempo_cambio_1 || 3,
          tiempo_cambio_2: data.tiempo_cambio_2 || 5,
          tiempo_cambio_3: data.tiempo_cambio_3 || 4,
          tiempo_cambio_4: data.tiempo_cambio_4 || 6,
          tiempo_cambio_5: data.tiempo_cambio_5 || 4,
          servicios_titulo: data.servicios_titulo || 'MAQUILLAJE & PEINADO',
          servicios_subtitulo: data.servicios_subtitulo || 'para novias y acompañantes',
          servicios_descripcion: data.servicios_descripcion || '',
          servicios_imagen: data.servicios_imagen || null,
          servicios_imagen_url: data.servicios_imagen_url || null,
          combos_imagen_fondo: data.combos_imagen_fondo || null,
          combos_imagen_fondo_url: data.combos_imagen_fondo_url || null,
          combos_imagen_fondo_mobile: data.combos_imagen_fondo_mobile || null,
          combos_imagen_fondo_mobile_url: data.combos_imagen_fondo_mobile_url || null,
          activo: data.activo ?? true,
          // ← ← ← CLAVE: Asegurar que combos sea array ← ← ←
          combos: Array.isArray(data.combos) ? data.combos : [],
        });
        
        // ← ← ← CLAVE: Asegurar que el estado combos sea array ← ← ←
        if (data.combos && Array.isArray(data.combos)) {
          console.log(`✅ ${data.combos.length} combos cargados`);
          setCombos(data.combos);
        } else {
          console.log('⚠️ No hay combos o no es un array, inicializando como []');
          setCombos([]);
        }
        
        // Configurar previews
        const previews: Record<string, string> = {};
        const uploaded: Record<string, string> = {};
        const imageFields = [
          'header_imagen',
          'galeria_imagen_1', 'galeria_imagen_2', 'galeria_imagen_3', 
          'galeria_imagen_4', 'galeria_imagen_5',
          'servicios_imagen',
          'combos_imagen_fondo', 'combos_imagen_fondo_mobile',
        ];
        
        imageFields.forEach(field => {
          const pathValue = data[field as keyof BlogPostData];
          const urlField = `${field}_url` as keyof BlogPostData;
          const urlValue = data[urlField];
          
          const url = getImageUrl(pathValue as string, urlValue as string);
          if (url) {
            previews[field] = url;
            uploaded[field] = (pathValue as string) || url;
          }
        });
        
        console.log('🖼️ Previews configuradas:', previews);
        setPreviewImages(previews);
        setUploadedImages(uploaded);
      } else {
        console.log('⚠️ No hay blog post activo (status:', res.status, ')');
        // ← ← ← IMPORTANTE: Asegurar que combos sea array vacío ← ← ←
        setCombos([]);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      // ← ← ← IMPORTANTE: Asegurar que combos sea array vacío ← ← ←
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (field: string, file: File) => {
    setUploadingImage(field);
    
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      formData.append('carpeta', 'blog');
      
      const res = await fetch(`${API_DOMAIN}/upload-imagen/`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.url;
        
        setBlogData(prev => ({ ...prev, [field]: imageUrl }));
        setUploadedImages(prev => ({ ...prev, [field]: imageUrl }));
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImages(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
        
        console.log(`✅ Imagen subida: ${field} -> ${imageUrl}`);
      } else {
        const error = await res.json();
        console.error('Error al subir imagen:', error);
        alert(`Error al subir imagen: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    
    try {
      if (combos.length === 0 && blogData.combos && blogData.combos.length > 0) {
        const confirmar = window.confirm(
          '⚠️ Estás intentando guardar SIN combos, pero ya existen combos en el blog.\n\n' +
          '¿Estás seguro de que quieres ELIMINAR todos los combos existentes?\n\n' +
          'Si NO quieres eliminarlos, cancela y agrega al menos un combo.'
        );
        if (!confirmar) {
          setSaving(false);
          return;
        }
      }

      const shouldUpdateCombos = combos.length > 0 || 
                                 (blogData.combos && blogData.combos.length > 0);

      const payload: any = {
        titulo: blogData.titulo || 'Blog Novias',
        header_imagen: uploadedImages.header_imagen || blogData.header_imagen || null,
        header_titulo_principal: blogData.header_titulo_principal,
        header_subtitulo: blogData.header_subtitulo,
        header_texto: blogData.header_texto,
        galeria_imagen_1: uploadedImages.galeria_imagen_1 || blogData.galeria_imagen_1 || null,
        galeria_imagen_2: uploadedImages.galeria_imagen_2 || blogData.galeria_imagen_2 || null,
        galeria_imagen_3: uploadedImages.galeria_imagen_3 || blogData.galeria_imagen_3 || null,
        galeria_imagen_4: uploadedImages.galeria_imagen_4 || blogData.galeria_imagen_4 || null,
        galeria_imagen_5: uploadedImages.galeria_imagen_5 || blogData.galeria_imagen_5 || null,
        tiempo_cambio_1: blogData.tiempo_cambio_1,
        tiempo_cambio_2: blogData.tiempo_cambio_2,
        tiempo_cambio_3: blogData.tiempo_cambio_3,
        tiempo_cambio_4: blogData.tiempo_cambio_4,
        tiempo_cambio_5: blogData.tiempo_cambio_5,
        servicios_titulo: blogData.servicios_titulo,
        servicios_subtitulo: blogData.servicios_subtitulo,
        servicios_descripcion: blogData.servicios_descripcion,
        servicios_imagen: uploadedImages.servicios_imagen || blogData.servicios_imagen || null,
        combos_imagen_fondo: uploadedImages.combos_imagen_fondo || blogData.combos_imagen_fondo || null,
        combos_imagen_fondo_mobile: uploadedImages.combos_imagen_fondo_mobile || blogData.combos_imagen_fondo_mobile || null,
        activo: blogData.activo,
      };

      if (shouldUpdateCombos) {
        payload.combos_data = combos.map((combo, index) => ({
          nombre: combo.nombre,
          icono: combo.icono,
          precio: combo.precio,
          moneda: combo.moneda,
          caracteristica_1: combo.caracteristica_1,
          caracteristica_2: combo.caracteristica_2,
          caracteristica_3: combo.caracteristica_3,
          caracteristica_4: combo.caracteristica_4,
          caracteristica_5: combo.caracteristica_5,
          caracteristica_6: combo.caracteristica_6,
          link_reserva: combo.link_reserva,
          destacado: combo.destacado,
          orden: index,
          activo: combo.activo ?? true,
        }));
      }

      console.log('📤 Payload a enviar:', JSON.stringify(payload, null, 2));
      console.log('📦 Combos a enviar:', payload.combos_data ? payload.combos_data.length : 'NINGUNO');

      let url: string;
      let method: string;

      if (blogData.slug) {
        url = `${API_DOMAIN}/blog-posts/${blogData.slug}/`;
        method = 'PUT';
      } else {
        url = `${API_DOMAIN}/blog-posts/`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Blog guardado:', data);
        
        // ← ← ← NUEVO: Mostrar mensaje y redirigir a la página pública ← ← ←
        alert('✅ Blog guardado exitosamente. Redirigiendo a la página pública...');
        
        // Esperar 500ms para que el usuario vea el mensaje antes de redirigir
        setTimeout(() => {
          window.location.href = 'https://www.dzsalon.com/blog-novias';
        }, 500);
      } else {
        const error = await res.json();
        console.error('❌ Error al guardar:', error);
        
        let mensajeError = 'Error al guardar el blog:\n\n';
        if (error.detail) {
          mensajeError += error.detail;
        } else if (error.combos_data) {
          mensajeError += 'Error en combos: ' + JSON.stringify(error.combos_data);
        } else {
          mensajeError += JSON.stringify(error, null, 2);
        }
        
        alert(mensajeError);
      }
    } catch (error) {
      console.error('❌ Error guardando:', error);
      alert('❌ Error al guardar el blog: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const agregarCombo = () => {
    const nuevoCombo: ComboNovia = {
      nombre: '',
      icono: '',
      precio: '0',
      moneda: 'COP',
      caracteristica_1: '',
      caracteristica_2: '',
      caracteristica_3: '',
      caracteristica_4: '',
      caracteristica_5: '',
      caracteristica_6: '',
      link_reserva: '',
      destacado: false,
      orden: combos.length,
      activo: true,
    };
    setCombos([...combos, nuevoCombo]);
  };

  const eliminarCombo = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este combo?')) {
      setCombos(combos.filter((_, i) => i !== index));
    }
  };

  const actualizarCombo = (index: number, field: keyof ComboNovia, value: any) => {
    const nuevos = [...combos];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setCombos(nuevos);
  };

  const moverCombo = (index: number, direccion: 'up' | 'down') => {
    if ((direccion === 'up' && index === 0) || (direccion === 'down' && index === combos.length - 1)) return;
    const nuevos = [...combos];
    const newIndex = direccion === 'up' ? index - 1 : index + 1;
    [nuevos[index], nuevos[newIndex]] = [nuevos[newIndex], nuevos[index]];
    setCombos(nuevos);
  };

  const renderImageField = (label: string, field: keyof BlogPostData, description?: string) => {
    const currentImageUrl = previewImages[field] || getImageUrl(
      blogData[field] as string, 
      blogData[`${field}_url` as keyof BlogPostData] as string
    );
    const hasImage = !!currentImageUrl;
    
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {hasImage && <span className="ml-2 text-xs text-green-600">✓ Cargada</span>}
        </label>
        {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
        
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(field as string, file);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              disabled={uploadingImage === field}
            />
          </div>
          
          {currentImageUrl && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-green-400">
              <Image src={currentImageUrl} alt={label} fill className="object-cover" unoptimized />
              <button
                onClick={() => {
                  setBlogData(prev => ({ ...prev, [field]: null }));
                  setPreviewImages(prev => { const n = { ...prev }; delete n[field]; return n; });
                  setUploadedImages(prev => { const n = { ...prev }; delete n[field]; return n; });
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
              >×</button>
            </div>
          )}
          
          {uploadingImage === field && (
            <div className="w-32 h-32 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center bg-blue-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ← ← ← CLAVE: Verificación defensiva de combos ← ← ←
  const combosArray = Array.isArray(combos) ? combos : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión Blog Novias</h1>
          <p className="text-gray-600">Administra el contenido de la página de novias</p>
          {blogData.slug && (
            <p className="text-sm text-blue-600 mt-2">
              📝 Editando blog existente: <strong>{blogData.titulo}</strong> (slug: {blogData.slug})
            </p>
          )}
          {!blogData.slug && (
            <p className="text-sm text-orange-600 mt-2">
              ⚠️ No hay blog activo. Se creará uno nuevo al guardar.
            </p>
          )}
        </div>

        {/* TABS */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'general', label: '📝 Header', badge: 0 },
                { id: 'galeria', label: '🖼️ Galería', badge: 0 },
                { id: 'servicios', label: '💄 Servicios', badge: 0 },
                // ← ← ← CLAVE: Usar combosArray.length en lugar de combos.length ← ← ←
                { id: 'combos', label: '👑 Combos', badge: combosArray.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    console.log(`🔄 Cambiando a tab: ${tab.id}`);
                    setActiveTab(tab.id as TabType);
                  }}
                  className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* TAB: HEADER */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Sección 1: Header</h2>
              
              {renderImageField('Imagen Principal', 'header_imagen', 'Fondo del header (1920x780px)')}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título Principal *</label>
                  <input
                    type="text"
                    value={blogData.header_titulo_principal}
                    onChange={(e) => setBlogData({ ...blogData, header_titulo_principal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo</label>
                  <input
                    type="text"
                    value={blogData.header_subtitulo}
                    onChange={(e) => setBlogData({ ...blogData, header_subtitulo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Texto Descriptivo</label>
                <textarea
                  value={blogData.header_texto}
                  onChange={(e) => setBlogData({ ...blogData, header_texto: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* TAB: GALERÍA */}
          {activeTab === 'galeria' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Sección 2: Galería</h2>
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderImageField(
                      `Imagen ${num}`,
                      `galeria_imagen_${num}` as keyof BlogPostData,
                      'Recomendado: 600x800px (vertical)'
                    )}
                    <div className="md:mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiempo de visualización (segundos)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={blogData[`tiempo_cambio_${num}` as keyof BlogPostData] as number}
                        onChange={(e) => setBlogData({ 
                          ...blogData, 
                          [`tiempo_cambio_${num}`]: parseInt(e.target.value) || 3 
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SERVICIOS */}
          {activeTab === 'servicios' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Sección 3: Servicios</h2>
              <p className="text-sm text-gray-600 mb-4">
                Configura el título, subtítulo y la imagen de la sección de servicios
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título de Servicios
                  </label>
                  <input
                    type="text"
                    value={blogData.servicios_titulo}
                    onChange={(e) => setBlogData({ ...blogData, servicios_titulo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="MAQUILLAJE & PEINADO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtítulo de Servicios
                  </label>
                  <input
                    type="text"
                    value={blogData.servicios_subtitulo}
                    onChange={(e) => setBlogData({ ...blogData, servicios_subtitulo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="para novias y acompañantes"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de Servicios
                </label>
                <textarea
                  value={blogData.servicios_descripcion}
                  onChange={(e) => setBlogData({ ...blogData, servicios_descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Descripción de los servicios..."
                />
              </div>

              {renderImageField(
                'Imagen de Servicios',
                'servicios_imagen',
                'Imagen única de servicios (recomendado: 1920x500px)'
              )}
            </div>
          )}

          {/* TAB: COMBOS */}
          {activeTab === 'combos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Sección 4: Combos</h2>
                <button
                  onClick={agregarCombo}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <span>+</span>
                  <span>Agregar Combo</span>
                </button>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Imagen de Fondo</h3>
                {renderImageField(
                  'Imagen de Fondo de Combos',
                  'combos_imagen_fondo' as keyof BlogPostData,
                  'Imagen de fondo para la sección de combos (recomendado: 1920x900px)'
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Imagen de Fondo (Móvil)</h3>
                {renderImageField(
                  'Imagen de Fondo de Combos (Móvil)',
                  'combos_imagen_fondo_mobile' as keyof BlogPostData,
                  'Imagen vertical para móviles (recomendado: 768x1024px). Si no se sube, se usará la imagen de web.'
                )}
              </div>

              <p className="text-sm text-gray-600">
                Los combos se mostrarán en la esquina superior derecha sobre la imagen de fondo
              </p>

              {/* ← ← ← CLAVE: Usar combosArray en lugar de combos ← ← ← */}
              {combosArray.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 text-lg mb-2">No hay combos creados</p>
                  <p className="text-gray-400 text-sm mb-4">
                    Agrega tu primer combo para comenzar
                  </p>
                  <button
                    onClick={agregarCombo}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                  >
                    Crear Primer Combo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {combosArray.map((combo, index) => (
                    <div key={combo.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">
                          Combo {index + 1}: {combo.nombre || 'Sin nombre'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moverCombo(index, 'up')}
                            disabled={index === 0}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="Mover arriba"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moverCombo(index, 'down')}
                            disabled={index === combosArray.length - 1}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="Mover abajo"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => eliminarCombo(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Combo *
                          </label>
                          <input
                            type="text"
                            value={combo.nombre}
                            onChange={(e) => actualizarCombo(index, 'nombre', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="Ej: ESENCIA"
                          />
                        </div>

                       {/* <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Icono (Emoji)
                          </label>
                          <input
                            type="text"
                            value={combo.icono}
                            onChange={(e) => actualizarCombo(index, 'icono', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="👑"
                          />
                        </div>*/}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio *
                          </label>
                          <input
                            type="number"
                            value={combo.precio}
                            onChange={(e) => actualizarCombo(index, 'precio', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="980000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Moneda
                          </label>
                          <select
                            value={combo.moneda}
                            onChange={(e) => actualizarCombo(index, 'moneda', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          >
                            <option value="COP">COP - Peso Colombiano</option>
                            <option value="USD">USD - Dólar</option>
                            <option value="EUR">EUR - Euro</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link de Reserva (WhatsApp/URL)
                          </label>
                          <input
                            type="url"
                            value={combo.link_reserva}
                            onChange={(e) => actualizarCombo(index, 'link_reserva', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="https://wa.me/573001234567"
                          />
                        </div>

                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <div key={num} className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Característica {num}
                            </label>
                            <input
                              type="text"
                              value={(combo as any)[`caracteristica_${num}`] || ''}
                              onChange={(e) => actualizarCombo(index, `caracteristica_${num}` as keyof ComboNovia, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                              placeholder={`Ej: Maquillaje Novia`}
                            />
                          </div>
                        ))}

                        <div className="md:col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={combo.destacado}
                              onChange={(e) => actualizarCombo(index, 'destacado', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Marcar como destacado (borde especial)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            onClick={() => window.confirm('¿Limpiar todo el formulario?') && window.location.reload()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Recargar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Guardando...</span></>
            ) : (
              <><span>💾</span><span>Guardar Blog Completo</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}