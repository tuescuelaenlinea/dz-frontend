// app\admin\configuracion\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Configuracion {
  id: number;
  nombre_salon: string;
  slogan: string;
  logo: string | null;
  logo_url: string | null;
  telefono_1: string;
  telefono_2: string;
  whatsapp: string;
  email: string;
  direccion: string;
  direccion_mapa: string;
  mapa_embed_url: string;
  hero_imagen: string | null;
  hero_imagen_url: string | null;
  hero_imagen_mobile: string | null;
  hero_imagen_mobile_url: string | null;
  hero_titulo: string;
  hero_subtitulo: string;
  categorias_header_desktop: string | null;
  categorias_header_desktop_url: string | null;
  categorias_header_mobile: string | null;
  categorias_header_mobile_url: string | null;
  servicios_header_desktop: string | null;
  servicios_header_desktop_url: string | null;
  servicios_header_mobile: string | null;
  servicios_header_mobile_url: string | null;
  contacto_header_desktop: string | null;
  contacto_header_desktop_url: string | null;
  contacto_header_mobile: string | null;
  contacto_header_mobile_url: string | null;
  galeria_header_desktop: string | null;
  galeria_header_desktop_url: string | null;
  galeria_header_mobile: string | null;
  galeria_header_mobile_url: string | null;
  reservas_header_desktop: string | null;
  reservas_header_desktop_url: string | null;
  reservas_header_mobile: string | null;
  reservas_header_mobile_url: string | null;
  bold_payment_link: string;
  bold_payment_activo: boolean;
  // ← NUEVO: Campo porcentaje_bold
  porcentaje_bold?: number | string;
  instagram_url: string;
  facebook_url: string;
  web_url: string;
  horario_lunes_viernes: string;
  horario_sabados: string;
  horario_domingos: string;
  activo: boolean;
}

export default function AdminConfiguracionPage() {
  const router = useRouter();
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  
  // Estados para archivos
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [heroMobilePreview, setHeroMobilePreview] = useState<string | null>(null);
  const [categoriasDesktopFile, setCategoriasDesktopFile] = useState<File | null>(null);
  const [categoriasDesktopPreview, setCategoriasDesktopPreview] = useState<string | null>(null);
  const [categoriasMobileFile, setCategoriasMobileFile] = useState<File | null>(null);
  const [categoriasMobilePreview, setCategoriasMobilePreview] = useState<string | null>(null);
  const [serviciosDesktopFile, setServiciosDesktopFile] = useState<File | null>(null);
  const [serviciosDesktopPreview, setServiciosDesktopPreview] = useState<string | null>(null);
  const [serviciosMobileFile, setServiciosMobileFile] = useState<File | null>(null);
  const [serviciosMobilePreview, setServiciosMobilePreview] = useState<string | null>(null);
  const [contactoDesktopFile, setContactoDesktopFile] = useState<File | null>(null);
  const [contactoDesktopPreview, setContactoDesktopPreview] = useState<string | null>(null);
  const [contactoMobileFile, setContactoMobileFile] = useState<File | null>(null);
  const [contactoMobilePreview, setContactoMobilePreview] = useState<string | null>(null);
  const [galeriaDesktopFile, setGaleriaDesktopFile] = useState<File | null>(null);
  const [galeriaDesktopPreview, setGaleriaDesktopPreview] = useState<string | null>(null);
  const [galeriaMobileFile, setGaleriaMobileFile] = useState<File | null>(null);
  const [galeriaMobilePreview, setGaleriaMobilePreview] = useState<string | null>(null);
  const [reservasDesktopFile, setReservasDesktopFile] = useState<File | null>(null);
  const [reservasDesktopPreview, setReservasDesktopPreview] = useState<string | null>(null);
  const [reservasMobileFile, setReservasMobileFile] = useState<File | null>(null);
  const [reservasMobilePreview, setReservasMobilePreview] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState<Partial<Configuracion>>({
    nombre_salon: '',
    slogan: '',
    telefono_1: '',
    telefono_2: '',
    whatsapp: '',
    email: '',
    direccion: '',
    direccion_mapa: '',
    mapa_embed_url: '',
    hero_titulo: '',
    hero_subtitulo: '',
    categorias_header_desktop_url: '',
    categorias_header_mobile_url: '',
    servicios_header_desktop_url: '',
    servicios_header_mobile_url: '',
    contacto_header_desktop_url: '',
    contacto_header_mobile_url: '',
    galeria_header_desktop_url: '',
    galeria_header_mobile_url: '',
    reservas_header_desktop_url: '',
    reservas_header_mobile_url: '',
    bold_payment_link: '',
    bold_payment_activo: false,
    // ← NUEVO: Porcentaje Bold por defecto
    porcentaje_bold: 3.50,
    instagram_url: '',
    facebook_url: '',
    web_url: '',
    horario_lunes_viernes: '',
    horario_sabados: '',
    horario_domingos: '',
    activo: true,
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log('🔍 Cargando configuración...');
    
    const res = await fetch(`${apiUrl}/configuracion/activa/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (res.status === 404) {
        console.log('⚠️ No hay configuración activa');
        setConfiguracion(null);
        return;
      }
      throw new Error('Error al cargar configuración');
    }

    const data = await res.json();
    console.log('✅ Configuración cargada:', data);
    
    setConfiguracion(data);
    setFormData({
        nombre_salon: data.nombre_salon || '',
        slogan: data.slogan || '',
        telefono_1: data.telefono_1 || '',
        telefono_2: data.telefono_2 || '',
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        direccion: data.direccion || '',
        direccion_mapa: data.direccion_mapa || '',
        mapa_embed_url: data.mapa_embed_url || '',
        hero_titulo: data.hero_titulo || '',
        hero_subtitulo: data.hero_subtitulo || '',
        categorias_header_desktop_url: data.categorias_header_desktop_url || '',
        categorias_header_mobile_url: data.categorias_header_mobile_url || '',
        servicios_header_desktop_url: data.servicios_header_desktop_url || '',
        servicios_header_mobile_url: data.servicios_header_mobile_url || '',
        contacto_header_desktop_url: data.contacto_header_desktop_url || '',
        contacto_header_mobile_url: data.contacto_header_mobile_url || '',
        galeria_header_desktop_url: data.galeria_header_desktop_url || '',
        galeria_header_mobile_url: data.galeria_header_mobile_url || '',
        reservas_header_desktop_url: data.reservas_header_desktop_url || '',
        reservas_header_mobile_url: data.reservas_header_mobile_url || '',
        bold_payment_link: data.bold_payment_link || '',
        bold_payment_activo: data.bold_payment_activo || false,
        // ← NUEVO: Cargar porcentaje_bold existente
        porcentaje_bold: data.porcentaje_bold || 3.50,
        instagram_url: data.instagram_url || '',
        facebook_url: data.facebook_url || '',
        web_url: data.web_url || '',
        horario_lunes_viernes: data.horario_lunes_viernes || '',
        horario_sabados: data.horario_sabados || '',
        horario_domingos: data.horario_domingos || '',
        activo: data.activo ?? true,
      });
    
    // Previsualizar imágenes existentes con corrección de URLs
    setLogoPreview(getCorrectImageUrl(data.logo_url));
    setHeroPreview(getCorrectImageUrl(data.hero_imagen_url));
    setHeroMobilePreview(getCorrectImageUrl(data.hero_imagen_mobile_url));
    setCategoriasDesktopPreview(getCorrectImageUrl(data.categorias_header_desktop_url));
    setCategoriasMobilePreview(getCorrectImageUrl(data.categorias_header_mobile_url));
    setServiciosDesktopPreview(getCorrectImageUrl(data.servicios_header_desktop_url));
    setServiciosMobilePreview(getCorrectImageUrl(data.servicios_header_mobile_url));
    setContactoDesktopPreview(getCorrectImageUrl(data.contacto_header_desktop_url));
    setContactoMobilePreview(getCorrectImageUrl(data.contacto_header_mobile_url));
    setGaleriaDesktopPreview(getCorrectImageUrl(data.galeria_header_desktop_url));
    setGaleriaMobilePreview(getCorrectImageUrl(data.galeria_header_mobile_url));
    setReservasDesktopPreview(getCorrectImageUrl(data.reservas_header_desktop_url));
    setReservasMobilePreview(getCorrectImageUrl(data.reservas_header_mobile_url));
    
  } catch (err: any) {
    console.error('❌ Error cargando configuración:', err);
    setError(err.message || 'Error al cargar configuración');
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (
    file: File | null,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    readerCallback?: (result: string) => void
  ) => {
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        if (readerCallback) readerCallback(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCorrectImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
    const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8080';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
        .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
        .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
        .replace('http://127.0.0.1:8080', LOCAL_DOMAIN);
    }
    
    if (url.startsWith('/media/')) {
      const baseUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : LOCAL_DOMAIN;
      return `${baseUrl}${url}`;
    }
    
    return url;
  };

  const guardarConfiguracion = async () => {
    // Validaciones básicas
    if (!formData.nombre_salon?.trim()) {
      alert('❌ El nombre del salón es obligatorio');
      return;
    }
    if (!formData.email?.trim()) {
      alert('❌ El email es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      setMensajeExito(null);
      
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const datosFormData = new FormData();
      
      // Campos de texto
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'boolean') {
            datosFormData.append(key, value.toString());
          } else {
            datosFormData.append(key, value.toString());
          }
        }
      });
      
      // Archivos de imagen
      if (logoFile) datosFormData.append('logo', logoFile);
      if (heroFile) datosFormData.append('hero_imagen', heroFile);
      if (heroMobileFile) datosFormData.append('hero_imagen_mobile', heroMobileFile);
      if (categoriasDesktopFile) datosFormData.append('categorias_header_desktop', categoriasDesktopFile);
      if (categoriasMobileFile) datosFormData.append('categorias_header_mobile', categoriasMobileFile);
      if (serviciosDesktopFile) datosFormData.append('servicios_header_desktop', serviciosDesktopFile);
      if (serviciosMobileFile) datosFormData.append('servicios_header_mobile', serviciosMobileFile);
      if (contactoDesktopFile) datosFormData.append('contacto_header_desktop', contactoDesktopFile);
      if (contactoMobileFile) datosFormData.append('contacto_header_mobile', contactoMobileFile);
      if (galeriaDesktopFile) datosFormData.append('galeria_header_desktop', galeriaDesktopFile);
      if (galeriaMobileFile) datosFormData.append('galeria_header_mobile', galeriaMobileFile);
      if (reservasDesktopFile) datosFormData.append('reservas_header_desktop', reservasDesktopFile);
      if (reservasMobileFile) datosFormData.append('reservas_header_mobile', reservasMobileFile);

      let res: Response;
      let url: string;
      
      if (configuracion && configuracion.id) {
        url = `${apiUrl}/configuracion/${configuracion.id}/`;
        res = await fetch(url, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: datosFormData,
        });
      } else {
        url = `${apiUrl}/configuracion/`;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: datosFormData,
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error del backend:', errorData);
        throw new Error(errorData.detail || errorData.nombre_salon?.[0] || 'Error al guardar configuración');
      }

      const data = await res.json();
      console.log('✅ Configuración guardada:', data);
      
      setMensajeExito('✅ Configuración guardada exitosamente');
      setConfiguracion(data);
      
      // Limpiar archivos
      setLogoFile(null);
      setHeroFile(null);
      setHeroMobileFile(null);
      setCategoriasDesktopFile(null);
      setCategoriasMobileFile(null);
      setServiciosDesktopFile(null);
      setServiciosMobileFile(null);
      setContactoDesktopFile(null);
      setContactoMobileFile(null);
      setGaleriaDesktopFile(null);
      setGaleriaMobileFile(null);
      setReservasDesktopFile(null);
      setReservasMobileFile(null);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err: any) {
      console.error('Error guardando configuración:', err);
      setError(err.message || 'Error al guardar configuración');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">⚙️ Configuración del Salón</h1>
        <p className="text-gray-600 mt-2">Administra la información y apariencia de tu salón</p>
      </div>

      {/* Mensajes */}
      {mensajeExito && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {mensajeExito}
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}

      {/* Formulario */}
      <div className="space-y-8">
        
        {/* ==================== INFORMACIÓN BÁSICA ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🏢</span> Información Básica del Salón
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre del Salón */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Salón *</label>
              <input
                type="text"
                value={formData.nombre_salon ?? ''}
                onChange={(e) => handleInputChange('nombre_salon', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: DZ Salón & Spa"
              />
            </div>

            {/* Slogan */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Slogan</label>
              <input
                type="text"
                value={formData.slogan ?? ''}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Transformando tu belleza y bienestar"
              />
            </div>

            {/* Logo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo del Salón</label>
              <p className="text-xs text-gray-500 mb-2">Recomendado: 200x80 px, formato PNG con fondo transparente</p>
              {logoPreview && (
                <div className="mb-2">
                  <img 
                    src={getCorrectImageUrl(logoPreview) || ''} 
                    alt="Logo preview" 
                    className="h-20 object-contain border rounded-lg p-2"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoFile, setLogoPreview)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {configuracion?.logo_url && !logoFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Actual: <a href={getCorrectImageUrl(configuracion.logo_url) || '#'} target="_blank" className="text-blue-600 hover:underline">{configuracion.logo}</a>
                </p>
              )}
            </div>

            {/* Teléfonos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono 1</label>
              <input
                type="text"
                value={formData.telefono_1 ?? ''}
                onChange={(e) => handleInputChange('telefono_1', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+57 300 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono 2</label>
              <input
                type="text"
                value={formData.telefono_2 ?? ''}
                onChange={(e) => handleInputChange('telefono_2', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+57 300 123 4567"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp ?? ''}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+57 300 123 4567"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={formData.email ?? ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="contacto@dzsalon.com"
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <textarea
                value={formData.direccion ?? ''}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Centro Comercial Nao, Bocagrande"
              />
            </div>

            {/* URL de Google Maps Embed */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">URL de Google Maps (Embed)</label>
              <p className="text-xs text-gray-500 mb-2">
                Copiar desde Google Maps: Compartir → Insertar un mapa → Copiar HTML → Extraer solo la URL del iframe
              </p>
              <textarea
                value={formData.mapa_embed_url ?? ''}
                onChange={(e) => handleInputChange('mapa_embed_url', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
            </div>
          </div>
        </div>

        {/* ==================== HERO SECTION ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🖼️</span> Hero Section (Página Principal)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hero Desktop */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen Hero Desktop</label>
              <p className="text-xs text-gray-500 mb-2">Recomendado: 1920x1080 px</p>
              {heroPreview && (
                <div className="mb-2">
                  <img 
                    src={getCorrectImageUrl(heroPreview) || ''} 
                    alt="Hero preview" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, setHeroFile, setHeroPreview)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hero Mobile */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen Hero Mobile</label>
              <p className="text-xs text-gray-500 mb-2">Recomendado: 768x1024 px (vertical)</p>
              {heroMobilePreview && (
                <div className="mb-2">
                  <img 
                    src={getCorrectImageUrl(heroMobilePreview) || ''} 
                    alt="Hero mobile preview" 
                    className="w-32 h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, setHeroMobileFile, setHeroMobilePreview)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Hero Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Título del Hero</label>
              <input
                type="text"
                value={formData.hero_titulo ?? ''}
                onChange={(e) => handleInputChange('hero_titulo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DZ Salón"
              />
            </div>

            {/* Hero Subtítulo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtítulo del Hero</label>
              <input
                type="text"
                value={formData.hero_subtitulo ?? ''}
                onChange={(e) => handleInputChange('hero_subtitulo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Transformando tu belleza y bienestar"
              />
            </div>
          </div>
        </div>

        {/* ==================== HEADERS POR SECCIÓN ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📸</span> Headers por Sección
          </h2>
          
          {/* Categorías */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📁 Categorías</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Desktop</label>
                <p className="text-xs text-gray-500 mb-2">1920x320px</p>
                {categoriasDesktopPreview && (
                  <img src={getCorrectImageUrl(categoriasDesktopPreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setCategoriasDesktopFile, setCategoriasDesktopPreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.categorias_header_desktop_url ?? ''}
                  onChange={(e) => handleInputChange('categorias_header_desktop_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header desktop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Mobile</label>
                <p className="text-xs text-gray-500 mb-2">768x320px</p>
                {categoriasMobilePreview && (
                  <img src={getCorrectImageUrl(categoriasMobilePreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setCategoriasMobileFile, setCategoriasMobilePreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.categorias_header_mobile_url ?? ''}
                  onChange={(e) => handleInputChange('categorias_header_mobile_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header mobile"
                />
              </div>
            </div>
          </div>

          {/* Servicios */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🛠️ Servicios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Desktop</label>
                <p className="text-xs text-gray-500 mb-2">1920x320px</p>
                {serviciosDesktopPreview && (
                  <img src={getCorrectImageUrl(serviciosDesktopPreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setServiciosDesktopFile, setServiciosDesktopPreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.servicios_header_desktop_url ?? ''}
                  onChange={(e) => handleInputChange('servicios_header_desktop_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header desktop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Mobile</label>
                <p className="text-xs text-gray-500 mb-2">768x320px</p>
                {serviciosMobilePreview && (
                  <img src={getCorrectImageUrl(serviciosMobilePreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setServiciosMobileFile, setServiciosMobilePreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.servicios_header_mobile_url ?? ''}
                  onChange={(e) => handleInputChange('servicios_header_mobile_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header mobile"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📞 Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Desktop</label>
                <p className="text-xs text-gray-500 mb-2">1920x320px</p>
                {contactoDesktopPreview && (
                  <img src={getCorrectImageUrl(contactoDesktopPreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setContactoDesktopFile, setContactoDesktopPreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.contacto_header_desktop_url ?? ''}
                  onChange={(e) => handleInputChange('contacto_header_desktop_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header desktop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Mobile</label>
                <p className="text-xs text-gray-500 mb-2">768x320px</p>
                {contactoMobilePreview && (
                  <img src={getCorrectImageUrl(contactoMobilePreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setContactoMobileFile, setContactoMobilePreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.contacto_header_mobile_url ?? ''}
                  onChange={(e) => handleInputChange('contacto_header_mobile_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header mobile"
                />
              </div>
            </div>
          </div>

          {/* Galería */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📷 Galería</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Desktop</label>
                <p className="text-xs text-gray-500 mb-2">1920x320px</p>
                {galeriaDesktopPreview && (
                  <img src={getCorrectImageUrl(galeriaDesktopPreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setGaleriaDesktopFile, setGaleriaDesktopPreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.galeria_header_desktop_url ?? ''}
                  onChange={(e) => handleInputChange('galeria_header_desktop_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header desktop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Mobile</label>
                <p className="text-xs text-gray-500 mb-2">768x320px</p>
                {galeriaMobilePreview && (
                  <img src={getCorrectImageUrl(galeriaMobilePreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setGaleriaMobileFile, setGaleriaMobilePreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.galeria_header_mobile_url ?? ''}
                  onChange={(e) => handleInputChange('galeria_header_mobile_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header mobile"
                />
              </div>
            </div>
          </div>

          {/* Reservas */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Reservas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Desktop</label>
                <p className="text-xs text-gray-500 mb-2">1920x320px</p>
                {reservasDesktopPreview && (
                  <img src={getCorrectImageUrl(reservasDesktopPreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setReservasDesktopFile, setReservasDesktopPreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.reservas_header_desktop_url ?? ''}
                  onChange={(e) => handleInputChange('reservas_header_desktop_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header desktop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Header Mobile</label>
                <p className="text-xs text-gray-500 mb-2">768x320px</p>
                {reservasMobilePreview && (
                  <img src={getCorrectImageUrl(reservasMobilePreview) || ''} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setReservasMobileFile, setReservasMobilePreview)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.reservas_header_mobile_url ?? ''}
                  onChange={(e) => handleInputChange('reservas_header_mobile_url', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 text-sm"
                  placeholder="URL alternativa para header mobile"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== PAGOS Y REDES SOCIALES ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💳</span> Pagos y Redes Sociales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bold Payment */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bold Payment Link</label>
              <input
                type="url"
                value={formData.bold_payment_link ?? ''}
                onChange={(e) => handleInputChange('bold_payment_link', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://checkout.bold.co/payment/XXX"
              />
              <p className="text-xs text-gray-500 mt-1">Link de checkout de Bold para pagos en línea</p>
            </div>

            {/* ← NUEVO: Porcentaje Bold */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💳 Comisión Bold (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.porcentaje_bold ?? 3.50}
                  onChange={(e) => handleInputChange('porcentaje_bold', parseFloat(e.target.value) || 0)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="3.50"
                />
                <span className="text-sm text-gray-500">
                  Porcentaje que cobra Bold por transacción (ej: 3.5% = 3.50)
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                ℹ️ Este porcentaje se usará para calcular la ganancia neta del salón cuando se pague con Bold
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.bold_payment_activo}
                  onChange={(e) => handleInputChange('bold_payment_activo', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">✅ Activar pago con Bold</span>
              </label>
              {/* Botón para ir a Cuentas Bancarias */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">🏦 Cuentas Bancarias</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Configura las cuentas para recibir pagos de reservas
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/cuentas-bancarias')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Gestionar Cuentas
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instagram URL</label>
              <input
                type="url"
                value={formData.instagram_url ?? ''}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/dzspa"
              />
            </div>

            {/* Facebook */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
              <input
                type="url"
                value={formData.facebook_url ?? ''}
                onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/dzsalon"
              />
            </div>

            {/* Web URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Web URL</label>
              <input
                type="url"
                value={formData.web_url ?? ''}
                onChange={(e) => handleInputChange('web_url', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.dorianzambrano.com"
              />
            </div>
          </div>
        </div>

        {/* ==================== HORARIOS ==================== */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🕐</span> Horarios de Atención
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lunes a Viernes</label>
              <input
                type="text"
                value={formData.horario_lunes_viernes ?? ''}
                onChange={(e) => handleInputChange('horario_lunes_viernes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="9:00 AM - 7:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sábados</label>
              <input
                type="text"
                value={formData.horario_sabados ?? ''}
                onChange={(e) => handleInputChange('horario_sabados', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="9:00 AM - 5:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Domingos</label>
              <input
                type="text"
                value={formData.horario_domingos ?? ''}
                onChange={(e) => handleInputChange('horario_domingos', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Cerrado"
              />
            </div>
          </div>

          {/* Estado Activo */}
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => handleInputChange('activo', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">✅ Salón activo (visible en el sitio)</span>
            </label>
          </div>
        </div>

        {/* ==================== BOTONES DE ACCIÓN ==================== */}
        <div className="flex flex-col md:flex-row gap-4 pb-8">
          <button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}