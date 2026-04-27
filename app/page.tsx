// app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  orden: number;
  activo: boolean;
}

// app/page.tsx - interfaz Servicio

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  descripcion_corta?: string;  
  tipo_precio?: string;
  precio_min: string | number | null;        // ← AGREGAR | null
  precio_max?: string | number | null;        // ← AGREGAR | null
  adicional_domicilio?: string | number | null; // ← AGREGAR | null si existe  
  duracion?: string;
  sesiones_incluidas?: string | number | null;
  es_medico?: boolean;
  requiere_valoracion?: boolean;
  disponible_salon?: boolean;
  disponible_domicilio?: boolean;
  destacado?: boolean;
  disponible?: boolean;
  imagen?: string | null;
  imagen_url?: string | null;
  categoria?: string | number | null;
  categoria_nombre?: string | null;
  profesionales_count?: string | number | null;
}

interface Configuracion {
  id: number;
  nombre_salon: string;
  descripcion?: string;
  slogan: string;
  logo: string | null;
  logo_url: string | null;
  hero_imagen: string | null;
  hero_imagen_mobile: string | null;
  hero_imagen_url: string | null;
  hero_imagen_mobile_url: string | null;
  hero_titulo: string;
  hero_subtitulo: string;
  telefono_1: string;
  telefono_2: string;
  whatsapp: string;
  email: string;
  direccion: string;
  instagram_url: string;
  facebook_url: string;
  web_url: string;
  horario_lunes_viernes: string;
  horario_sabados: string;
  horario_domingos: string;
  activo: boolean;
}

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [serviciosDestacados, setServiciosDestacados] = useState<Servicio[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

  useEffect(() => {
    async function loadData() {
      try {
        try {
          const configData = await api.getConfiguracion();
          const config = configData.results && configData.results.length > 0 
            ? configData.results[0] 
            : configData;
          setConfiguracion(config);
        } catch (configErr) {
          console.warn('No se pudo cargar configuración, usando valores por defecto:', configErr);
        }

        const categoriasData = await api.getCategorias();
        setCategorias(categoriasData.results || categoriasData);

        const serviciosData = await api.getServicios();
        const todosServicios = serviciosData.results || serviciosData;
        // ← ← ← USAR endpoint dedicado para destacados ← ← ←
        try {
          const destacados = await api.getServiciosDestacados();
          setServiciosDestacados(destacados.slice(0, 6)); // Limitar a 6 para UI
          console.log(`✅ Servicios destacados cargados: ${destacados.length}`);
        } catch (err) {
          console.error('❌ Error cargando destacados:', err);
          // Fallback: intentar filtrar manualmente si falla el endpoint
          const serviciosData = await api.getServicios();
          const todosServicios = serviciosData.results || serviciosData;
          const destacados = todosServicios.filter((s: Servicio) => s.destacado).slice(0, 6);
          setServiciosDestacados(destacados);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos. Verifica la conexión.');
        setLoading(false);
      }
    }

    loadData();
  }, []);

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


const heroDesktopImage = getImageUrl(
  configuracion?.hero_imagen ?? null,
  configuracion?.hero_imagen_url ?? null
);
const heroMobileImage = getImageUrl(
  configuracion?.hero_imagen_mobile ?? null,
  configuracion?.hero_imagen_mobile_url ?? null
);
 const logoUrl = getImageUrl(configuracion?.logo ?? null, configuracion?.logo_url ?? null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando DZ Salón...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ← ← ← FUNCIÓN HELPER PARA FORMATEAR PRECIOS ← ← ←
const formatPrice = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
};

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] overflow-hidden">
        {/* Imagen de fondo */}
        <div className="absolute inset-0">
          {heroDesktopImage && (
            <div 
              className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat animate-hero-zoom"
              style={{ backgroundImage: `url(${heroDesktopImage})` }}
            />
          )}
          {heroMobileImage && (
            <div 
              className="md:hidden absolute inset-0 bg-cover bg-top bg-no-repeat animate-hero-zoom"
              style={{ backgroundImage: `url(${heroMobileImage})` }}
            />
          )}
          {!heroDesktopImage && !heroMobileImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          )}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black opacity-1"></div>
        
        {/* Contenido */}
        <div className="relative z-10 h-full flex flex-col">
          
          {/* === VISTA DESKTOP === */}
           <div  className="hidden md:flex items-center h-full pl-32 lg:pl-24 pr-560 lg:pr-24">

            {/* Contenedor del contenido - CENTRADO internamente */}
            <div className="text-center max-w-3xl mx-auto pr-100">
              {/* Logo */}
              {logoUrl && (
                <div className="mb-6">
                  <img 
                    src={logoUrl} 
                    alt={configuracion?.nombre_salon || 'DZ Salón'}
                    className="h-48 lg:h-64 w-auto object-contain mx-auto drop-shadow-2xl"
                  />
                </div>
              )}
              
              {/* Título principal 
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
                <span className="block text-7xl lg:text-9xl mb-3 tracking-tight">DZ</span>
                <span className="block text-3xl lg:text-5xl font-light tracking-wide">
                  {configuracion?.hero_titulo || 'Dorian Zambrano Salón'}
                </span>
              </h1>*/}
              
              {/* Slogan */}
              {configuracion?.slogan && (
                <p className="text-xl lg:text-2xl text-blue-200 mb-6 font-light drop-shadow-lg italic">
                  {configuracion.slogan}
                </p>
              )}
              
              {/* Subtítulo */}
              <p className="text-lg lg:text-xl text-gray-100 mb-10 drop-shadow-md font-light leading-relaxed">
                {configuracion?.hero_subtitulo || 
                  'Transformando tu belleza y bienestar con los mejores tratamientos estéticos, peluquería y spa en Bogotá'}
              </p>
              
              {/* Botones CTA - Mejorados */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center ">
                <Link
                  href="/citas"
                  className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full text-lg font-semibold shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
                >
                  <span className="relative z-10">Reservar Cita</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 opacity-50" ></div>
                </Link>
                
                <Link
                  href="/categorias"
                  className="group relative px-10 py-4 bg-white/95 backdrop-blur-md text-gray-900 rounded-full text-lg font-semibold shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 border-2 border-white/50"
                >
                  <span className="relative z-10">Ver Servicios</span>
                </Link>
              </div>
            </div>
          </div>

          {/* === VISTA MÓVIL === */}
          <div className="md:hidden flex flex-col items-center justify-start pt-12 pb-8 h-full">
            <div className="text-center w-full px-6">
              {/* Logo */}
              {logoUrl && (
                <div className="mb-4">
                  <img 
                    src={logoUrl} 
                    alt={configuracion?.nombre_salon || 'DZ Salón'}
                    className="h-32 w-auto object-contain mx-auto drop-shadow-xl"
                  />
                </div>
              )}
              
              {/* Título 
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-xl">
                <span className="block text-6xl mb-1">DZ</span>
                <span className="block text-2xl font-light">
                  {configuracion?.hero_titulo || 'Dorian Zambrano Salón'}
                </span>
              </h1>*/}
              
              {/* Slogan */}
              {configuracion?.slogan && (
                <p className="text-base text-blue-200 mt-3 font-light drop-shadow-md italic">
                  {configuracion.slogan}
                </p>
              )}
              
              {/* Subtítulo */}
              <p className="text-sm text-gray-100 mt-4 mb-6 drop-shadow-md font-light line-clamp-3">
                {configuracion?.hero_subtitulo || 
                  'Transformando tu belleza y bienestar'}
              </p>
              
              {/* Botones */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/citas"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full text-sm font-semibold shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  Reservar Cita
                </Link>
                <Link
                  href="/categorias"
                  className="px-8 py-3 bg-white/95 backdrop-blur-md text-gray-900 rounded-full text-sm font-semibold shadow-xl border-2 border-white/50 transition-all duration-300"
                >
                  Ver Servicios
                </Link>
              </div>
            </div>
            
            {/* Scroll indicator */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
              <svg className="w-6 h-6 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* Scroll indicator desktop */}
          <div className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-8 h-8 text-white opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Categorías Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nuestras Categorías
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubre nuestra amplia gama de servicios diseñados para realzar tu belleza natural
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categorias.slice(0, 8).map((categoria) => (
              <Link
                  key={categoria.id}
                  href={`/categorias/${categoria.slug}`}  // ← Esto lleva a /categorias/barberia
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
                >
                <div className="relative h-40 overflow-hidden">
                  {categoria.imagen_url || categoria.imagen ? (
                    <img
                      src={getImageUrl(categoria.imagen, categoria.imagen_url) || ''}
                      alt={categoria.nombre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                          target.parentElement.innerHTML = '<span class="text-4xl text-white flex items-center justify-center h-full">💆</span>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl text-white">💆</span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {categoria.nombre}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/categorias"
              className="inline-block px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
            >
              Ver Todas las Categorías
            </Link>
          </div>
        </div>
      </section>

      {/* Servicios Destacados Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Servicios Destacados
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Los tratamientos más populares elegidos por nuestros clientes
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {serviciosDestacados.map((servicio) => (
              <div
                key={servicio.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="relative h-48 overflow-hidden">
                  {servicio.imagen_url || servicio.imagen ? (
                    <img
                      src={getImageUrl(servicio.imagen ?? null, servicio.imagen_url ?? null) || ''}
                      alt={servicio.nombre}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600');
                          target.parentElement.innerHTML = '<span class="text-6xl text-white flex items-center justify-center h-full">💆</span>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-6xl text-white">💆</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="text-sm text-blue-600 font-semibold mb-2">
                    {servicio.categoria_nombre}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">
                    {servicio.nombre}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {servicio.descripcion || servicio.descripcion_corta}
                  </p>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-green-600 font-bold text-lg">
                        {servicio.precio_max && servicio.precio_max !== servicio.precio_min
                          ? `$${formatPrice(servicio.precio_min)} - $${formatPrice(servicio.precio_max)}`
                          : `$${formatPrice(servicio.precio_min)}`
                        }
                      </span>
                      {servicio.duracion && (
                        <span className="text-gray-500 text-sm">
                          ⏱️ {servicio.duracion}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/servicios/${servicio.id}`}
                    className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/servicios"
              className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Ver Todos los Servicios
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}