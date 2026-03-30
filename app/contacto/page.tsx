'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Configuracion {
  id: number;
  contacto_header_desktop: string | null;
  contacto_header_mobile: string | null;
  contacto_header_desktop_url: string | null;
  contacto_header_mobile_url: string | null;
  whatsapp: string;
  telefono_1: string;
  email: string;
  direccion: string;
  horario_lunes_viernes: string;
  horario_sabados: string;
  mapa_embed_url: string | null;
  direccion_mapa: string | null;
}

export default function ContactoPage() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });
  const [loading, setLoading] = useState(false);

  // Constantes de API
  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  // Función getImageUrl (igual que app/page.tsx)
  const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
    if (imagenUrl) {
      if (imagenUrl.startsWith('https://api.dzsalon.com')) {
        return imagenUrl;
      }
      if (imagenUrl.startsWith('/')) {
        return `${API_DOMAIN}${imagenUrl}`;
      }
      if (imagenUrl.startsWith('http')) {
        return imagenUrl
          .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
          .replace(/https?:\/\/localhost/, API_DOMAIN)
          .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
      }
    }
    
    if (!imagenPath) return null;
    
    if (imagenPath.startsWith('http')) {
      return imagenPath
        .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
        .replace(/https?:\/\/localhost/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
    }
    
    const imagePath = imagenPath.startsWith('/') ? imagenPath : `/${imagenPath}`;
    return `${API_DOMAIN}${imagePath}`;
  };

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar configuración
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await api.getConfiguracion().catch(() => null);
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
      } catch (err) {
        console.error('Error cargando configuración:', err);
      }
    }
    loadConfig();
  }, []);

  // URLs de header
  const headerDesktopImage = getImageUrl(
    configuracion?.contacto_header_desktop ?? null,
    configuracion?.contacto_header_desktop_url ?? null
  );
  
  const headerMobileImage = getImageUrl(
    configuracion?.contacto_header_mobile ?? null,
    configuracion?.contacto_header_mobile_url ?? null
  );

  const headerImageUrl = isMobile
    ? (headerMobileImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=768&q=80')
    : (headerDesktopImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&q=80');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  // Construir mensaje para WhatsApp
  const mensaje = `*NUEVO MENSAJE DESDE LA WEB*%0A%0A` +
    `*Nombre:* ${formData.nombre}%0A` +
    `*Teléfono:* ${formData.telefono}%0A` +
    `*Asunto:* ${formData.asunto}%0A` +
    `*Mensaje:* ${formData.mensaje}%0A%0A` +
    `Espero tu respuesta. Gracias!`;

  // Obtener número de WhatsApp - LIMPIAR FORMATO
  const whatsappNumber = configuracion?.whatsapp
    ?.replace(/\D/g, '')  // Eliminar TODO lo que no sea número
    .replace(/^0/, '57')  // Si empieza con 0, reemplazar por 57 (Colombia)
    || '573001234567';     // Fallback

  // Construir URL de WhatsApp
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensaje}`;

  // Detectar si es iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Método compatible con iOS
  if (isIOS && isSafari) {
    // iOS Safari: usar window.location para mejor compatibilidad
    setTimeout(() => {
      window.location.href = whatsappUrl;
      setLoading(false);
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        setFormData({
          nombre: '',
          telefono: '',
          asunto: '',
          mensaje: '',
        });
      }, 2000);
    }, 500);
  } else {
    // Android/Desktop: usar window.open
    setTimeout(() => {
      const newWindow = window.open(whatsappUrl, '_blank');
      
      // Si se bloquea el popup, fallback a window.location
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = whatsappUrl;
      }
      
      setLoading(false);
      
      // Limpiar formulario
      setTimeout(() => {
        setFormData({
          nombre: '',
          telefono: '',
          asunto: '',
          mensaje: '',
        });
      }, 1000);
    }, 500);
  }
};

  // Datos de contacto
  const direccion = configuracion?.direccion || 'Calle 123 # 45-67, Bogotá, Colombia';
  const telefono = configuracion?.telefono_1 || '+57 300 123 4567';
  const email = configuracion?.email || 'info@dzsalon.com';
  const horarioLF = configuracion?.horario_lunes_viernes || 'Lunes a Viernes: 9:00 am - 7:00 pm';
  const horarioSab = configuracion?.horario_sabados || 'Sábados: 10:00 am - 5:00 pm';

  return (
    <div className="min-h-screen bg-gray-50">
            {/* ========== HEADER REORGANIZADO: Dos Secciones Verticales ========== */}
      <div className="w-full" style={{ maxHeight: '400px' }}>
        
        {/* SECCIÓN SUPERIOR (80% - Imagen de fondo) */}
        <div 
          className="w-full"
          style={{
            height: '320px',  // 80% de 400px
            backgroundImage: `url(${headerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* SECCIÓN INFERIOR (20% - Fondo negro con textos) */}
        <div className="w-full h-20 bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
            
            {/* Título */}
            <h1 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              Contáctanos
            </h1>
            
            {/* Separador vertical en desktop */}
            <span className="hidden md:block w-px h-6 bg-white/30" />
            
            {/* Subtítulo */}
            <p className="text-xs md:text-base text-gray-300 text-center md:text-left drop-shadow">
              Estamos aquí para ayudarte. Escríbenos y te responderemos pronto.
            </p>
            
          </div>
        </div>
        
      </div>
      {/* ========== FIN HEADER ========== */}

      {/* Contenido Principal */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Columna Izquierda: Información de Contacto */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Información de Contacto
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                Visítanos en nuestro salón o contáctanos por cualquiera de estos medios.
              </p>

              {/* Datos de Contacto */}
              <div className="space-y-6">
                {/* Dirección */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Dirección</h3>
                    <p className="text-gray-600">{direccion}</p>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
                    <p className="text-gray-600">{telefono}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">{email}</p>
                  </div>
                </div>

                {/* Horarios */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Horario de Atención</h3>
                    <div className="text-gray-600 space-y-1">
                      <p>{horarioLF}</p>
                      <p>{horarioSab}</p>
                      <p>Domingos: Cerrado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redes Sociales */}
              <div className="mt-10">
                <h3 className="font-semibold text-gray-900 mb-4">Síguenos en Redes Sociales</h3>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com/dzsalon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                    </svg>
                  </a>
                  <a
                    href="https://facebook.com/dzsalon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a
                    href={`https://wa.me/${configuracion?.whatsapp?.replace(/\D/g, '') || '573001234567'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      // Prevenir comportamiento default en iOS y usar método compatible
                      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                        e.preventDefault();
                        const number = configuracion?.whatsapp?.replace(/\D/g, '') || '573001234567';
                        window.location.href = `https://wa.me/${number}`;
                      }
                    }}
                    className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Formulario de Contacto */}
            <div>
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Envíanos un Mensaje
                </h2>
                <p className="text-gray-600 mb-6">
                  Completa el formulario y te redireccionaremos a WhatsApp
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder="+57 300 123 4567"
                    />
                  </div>

                  {/* Asunto */}
                  <div>
                    <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 mb-2">
                      Asunto *
                    </label>
                    <select
                      id="asunto"
                      name="asunto"
                      value={formData.asunto}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="Reserva de cita">Reserva de cita</option>
                      <option value="Información de servicios">Información de servicios</option>
                      <option value="Solicitar presupuesto">Solicitar presupuesto</option>
                      <option value="Queja o reclamo">Queja o reclamo</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje *
                    </label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      value={formData.mensaje}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                      placeholder="Escribe tu mensaje aquí..."
                    />
                  </div>

                  {/* Botón de enviar */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 bg-gray-900 text-white rounded-lg text-lg font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                        Redireccionando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Enviar por WhatsApp
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Al hacer clic, se abrirá WhatsApp con tu mensaje predefinido
                  </p>
                </form>
              </div>
            </div>
          </div>

          {/* Mapa de Ubicación */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              Nuestra Ubicación
            </h2>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="aspect-w-16 aspect-h-9 h-96 bg-gray-200">
                 <iframe
                // ← URL dinámica desde Django Admin, con fallback
                src={
                  configuracion?.mapa_embed_url || 
                  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.123456789!2d-74.123456789!3d4.123456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNMKwMDcnMjQuNCJOIDc0wrAwNycyNC40Ilc!5e0!3m2!1ses!2sco!4v1234567890123!5m2!1ses!2sco"
                }
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full grayscale hover:grayscale-0 transition-all duration-500"
                title={configuracion?.direccion_mapa || "Ubicación DZ Salón"}
              />
              </div>
            </div>
            {/* Dirección debajo del mapa */}
            {configuracion?.direccion_mapa && (
              <p className="text-center text-gray-600 mt-4">
                📍 {configuracion.direccion_mapa}
              </p>
            )}
          </div>

          {/* CTA: Reservar Cita */}
          <div className="mt-16 text-center">
            <div className="bg-gray-900 rounded-2xl shadow-xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                ¿Listo para tu cita?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Reserva ahora y transforma tu look con nuestros expertos estilistas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/citas"
                  className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Reservar Cita Online
                </a>
               <a
                  href={`https://wa.me/${configuracion?.whatsapp?.replace(/\D/g, '') || '573001234567'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // Prevenir comportamiento default en iOS y usar método compatible
                    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                      e.preventDefault();
                      const number = configuracion?.whatsapp?.replace(/\D/g, '') || '573001234567';
                      window.location.href = `https://wa.me/${number}`;
                    }
                  }}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Escribir por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}