'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';  
import { api } from '@/lib/api';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  activo: boolean;
  servicios_count?: number;
}

interface Configuracion {
  id: number;
  categorias_header_desktop: string | null;
  categorias_header_mobile: string | null;
  categorias_header_desktop_url: string | null;
  categorias_header_mobile_url: string | null;
}

// ← ← ← NUEVA INTERFACE: Datos enriquecidos de categoría ← ← ←
interface CategoriaEnriquecida extends Categoria {
  galeria_count: number;
  tiene_galeria: boolean;
  tiene_servicios: boolean;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaEnriquecida[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ← ← ← NUEVO: Estado para scroll indicators ← ← ←
  const [scrollPosition, setScrollPosition] = useState({ start: 0, end: 0, total: 0 });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
    if (imagenUrl) {
      if (imagenUrl.startsWith('https://api.dzsalon.com')) return imagenUrl;
      if (imagenUrl.startsWith('/')) return `${API_DOMAIN}${imagenUrl}`;
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ← ← ← FUNCIÓN: Verificar galería y servicios por categoría ← ← ←
  const verificarCategoria = async (categoriaId: number) => {
    try {
      // Verificar galería activa
      const galeriaRes = await fetch(`${API_URL}/galeria/?categoria=${categoriaId}&activo=true`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const galeriaData = await galeriaRes.json();
      const galeriaList = Array.isArray(galeriaData) ? galeriaData : (galeriaData.results || []);
      
      // Verificar servicios disponibles
      const serviciosRes = await fetch(`${API_URL}/categorias/${categoriaId}/servicios/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const serviciosData = await serviciosRes.json();
      
      return {
        galeria_count: galeriaList.length,
        tiene_galeria: galeriaList.length > 0,
        tiene_servicios: serviciosData.servicios_count > 0
      };
    } catch (err) {
      console.error(`Error verificando categoría ${categoriaId}:`, err);
      return { galeria_count: 0, tiene_galeria: false, tiene_servicios: false };
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, configData] = await Promise.all([
          api.getCategorias(),
          api.getConfiguracion().catch(() => null),
        ]);
        
        const categoriasList = Array.isArray(catData) ? catData : (catData.results || []);
        
        // ← ← ← ENRIQUECER CATEGORÍAS CON DATOS DE GALERÍA Y SERVICIOS ← ← ←
        const categoriasEnriquecidas = await Promise.all(
          categoriasList.map(async (cat: Categoria) => {
            const verificacion = await verificarCategoria(cat.id);
            return {
              ...cat,
              ...verificacion
            };
          })
        );
        
        setCategorias(categoriasEnriquecidas);
        
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        setError('Error al cargar categorías');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ← ← ← ACTUALIZAR SCROLL INDICATORS ← ← ←
  const updateScrollIndicators = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const cardWidth = 320; // w-80 = 320px
    const gap = 24; // gap-6 = 24px
    const totalWidth = container.scrollWidth;
    const visibleWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    const start = Math.floor(scrollLeft / (cardWidth + gap)) + 1;
    const visibleCards = Math.floor(visibleWidth / (cardWidth + gap));
    const end = Math.min(start + visibleCards - 1, categorias.length);
    
    setScrollPosition({ start, end, total: categorias.length });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    updateScrollIndicators();
    container.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [categorias]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftStart(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const handleMouseUp = () => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const headerDesktopImage = getImageUrl(
    configuracion?.categorias_header_desktop ?? null,
    configuracion?.categorias_header_desktop_url ?? null
  );
  const headerMobileImage = getImageUrl(
    configuracion?.categorias_header_mobile ?? null,
    configuracion?.categorias_header_mobile_url ?? null
  );
  const headerImageUrl = isMobile
    ? (headerMobileImage || 'https://pagosapp.website/header_categorias_mobile.jpg')
    : (headerDesktopImage || 'https://pagosapp.website/header_categorias.jpg');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ========== HEADER ========== */}
      <div className="w-full" style={{ maxHeight: '400px' }}>
        <div 
          className="w-full"
          style={{
            height: '320px',
            backgroundImage: `url(${headerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="w-full h-20 bg-black flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <h3 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              Nuestras Categorías
            </h3>
            <span className="hidden md:block w-px h-6 bg-white/30" />
            <p className="text-xs md:text-base text-white/90 text-center md:text-left drop-shadow">
              Explora nuestra amplia gama de servicios
            </p>
            <Link
              href="/servicios"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Buscar Servicios
            </Link>
          </div>
        </div>
      </div>

      {/* ========== CATEGORÍAS CON SCROLL HORIZONTAL ========== */}
      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 relative">
          
          {/* ← ← ← INDICADOR DE SCROLL PARA MÓVIL ← ← ← */}
          {isMobile && categorias.length > 1 && (
            <div >
              <span className="text-sm text-gray-600 font-medium">
                {scrollPosition.total} categorias <span className="text-xs text-gray-500 ml-2">← Desliza →</span>
              </span>
              <div className="flex gap-1">
                {categorias.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index + 1 >= scrollPosition.start && index + 1 <= scrollPosition.end
                        ? 'bg-blue-600 w-4'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
            </div>
          )}
          
          {/* ← ← ← BOTONES DE NAVEGACIÓN (SOLO DESKTOP) ← ← ← */}
          <button
            onClick={scrollLeft}
            disabled={scrollPosition.start <= 1}
            className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 lg:w-16 lg:h-16 
              ${scrollPosition.start > 1
                ? 'bg-white/95 hover:bg-white cursor-pointer shadow-xl' 
                : 'bg-gray-100 cursor-not-allowed opacity-50 shadow-md'} 
              rounded-full items-center justify-center text-gray-700 hover:text-blue-600 transition-all group border border-gray-200 hover:scale-110 hover:shadow-2xl hover:border-blue-300 active:scale-95`}
            aria-label="Categorías anteriores"
            title={scrollPosition.start > 1 ? 'Categorías anteriores' : 'Primera categoría'}
            style={{ marginLeft: '-28px' }}
          >
            <svg className="w-7 h-7 lg:w-8 lg:h-8 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={scrollRight}
            disabled={scrollPosition.end >= scrollPosition.total}
            className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 lg:w-16 lg:h-16 
              ${scrollPosition.end < scrollPosition.total
                ? 'bg-white/95 hover:bg-white cursor-pointer shadow-xl' 
                : 'bg-gray-100 cursor-not-allowed opacity-50 shadow-md'} 
              rounded-full items-center justify-center text-gray-700 hover:text-blue-600 transition-all group border border-gray-200 hover:scale-110 hover:shadow-2xl hover:border-blue-300 active:scale-95`}
            aria-label="Siguientes categorías"
            title={scrollPosition.end < scrollPosition.total ? 'Siguientes categorías' : 'Última categoría'}
            style={{ marginRight: '-28px' }}
          >
            <svg className="w-7 h-7 lg:w-8 lg:h-8 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* ← ← ← GRADIENTES LATERALES PARA INDICAR SCROLL ← ← ← */}
          {scrollPosition.start > 1 && (
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-20 pointer-events-none hidden md:block" />
          )}
          {scrollPosition.end < scrollPosition.total && (
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-20 pointer-events-none hidden md:block" />
          )}

          {/* ← ← ← CONTAINER CON SCROLL HORIZONTAL + DRAG ← ← ← */}
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing select-none pl-2 pr-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {categorias.map((categoria) => (
              <CategoryCardHorizontal
                key={categoria.id}
                categoria={categoria}
                getImageUrl={getImageUrl}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}



// ← ← ← COMPONENTE: CARD HORIZONTAL DE CATEGORÍA (CORREGIDO) ← ← ←
function CategoryCardHorizontal({ 
  categoria, 
  getImageUrl 
}: { 
  categoria: CategoriaEnriquecida; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
}) {
  const imageUrl = getImageUrl(categoria.imagen, categoria.imagen_url) || 
                   'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';

  const categoriaUrl = `/categorias/${categoria.slug}`;
  
  // ← ← ← VERIFICAR SI TIENE SERVICIOS ← ← ←
  const tieneServicios = categoria.tiene_servicios && (categoria.servicios_count ?? 0) > 0;

  // ← ← ← MANEJADOR DE CLIC PARA LA CARD ← ← ←
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevenir si no tiene servicios
    if (!tieneServicios) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Redirigir manualmente
    window.location.href = categoriaUrl;
  };

  return (
    <div
      // ← ← ← CARD COMO DIV CON CURSOR Y ESTILOS DINÁMICOS ← ← ←
      className={`flex-shrink-0 w-64 md:w-72 lg:w-80 group relative bg-white rounded-2xl overflow-hidden border transition-all duration-300 snap-start ${
        tieneServicios
          ? 'shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer border-gray-200'
          : 'shadow-md opacity-60 cursor-not-allowed border-gray-300 bg-gray-50'
      }`}
      onClick={handleCardClick}
      // ← ← ← ACCESIBILIDAD ← ← ←
      role={tieneServicios ? "link" : "presentation"}
      tabIndex={tieneServicios ? 0 : -1}
      onKeyDown={(e) => {
        if (tieneServicios && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          window.location.href = categoriaUrl;
        }
      }}
    >
      {/* ← ← ← IMAGEN CON NOMBRE SOBRE ELLA ← ← ← */}
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={imageUrl}
          alt={categoria.nombre}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            tieneServicios ? 'group-hover:scale-110' : 'grayscale opacity-70'
          }`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';
          }}
        />
        
        {/* Overlay gradient para legibilidad */}
        <div className={`absolute inset-0 ${
          tieneServicios 
            ? 'bg-gradient-to-t from-black/70 via-black/30 to-transparent' 
            : 'bg-gray-900/60'
        }`} />
        
        {/* ← ← ← NOMBRE SOBRE LA IMAGEN (parte inferior) ← ← ← */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className={`text-lg md:text-xl font-bold drop-shadow-lg transition-colors ${
            tieneServicios ? 'text-white group-hover:text-yellow-300' : 'text-gray-300'
          }`}>
            {categoria.nombre}
          </h3>
        </div>
        
        {/* ← ← ← BADGES DE ESTADO (GALERÍA Y SERVICIOS) ← ← ← */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {/* Badge Galería 
          <span className={`px-2 py-1 text-white text-xs font-bold rounded-full shadow flex items-center gap-1 ${
            categoria.tiene_galeria ? 'bg-purple-500/95' : 'bg-gray-500/95'
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {categoria.galeria_count}
          </span>*/}
          
          {/* Badge Servicios 
          <span className={`px-2 py-1 text-white text-xs font-bold rounded-full shadow flex items-center gap-1 ${
            categoria.tiene_servicios ? 'bg-blue-500/95' : 'bg-red-500/95'
          }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {categoria.servicios_count || 0}
          </span>*/}
        </div>
        
        {/* Icono de flecha al hover (solo si tiene servicios) */}
        {tieneServicios && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-2 bg-white/90 rounded-full shadow-lg">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
        
        {/* ← ← ← OVERLAY "PRÓXIMAMENTE" SI NO TIENE SERVICIOS ← ← ← */}
        {!tieneServicios && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-4 py-2 bg-red-600/90 text-white text-sm font-bold rounded-lg shadow-lg">
              🔜 Próximamente
            </span>
          </div>
        )}
      </div>

      {/* ← ← ← SECCIÓN INFERIOR BLANCA CON LINKS Y MENSAJES ← ← ← */}
      <div className={`p-4 border-t ${tieneServicios ? 'bg-white border-gray-100' : 'bg-gray-100 border-gray-200'}`}>
        
        {/* ← ← ← MENSAJES DE ESTADO ← ← ← 
        {!categoria.tiene_galeria && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sin imágenes en galería
            </p>
          </div>
        )}
        
        {!categoria.tiene_servicios && (
          <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-700 flex items-center gap-1 font-medium">
              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Sin servicios disponibles
            </p>
          </div>
        )}*/}
        
        <div className="flex gap-3">
          {/* ← ← ← BOTÓN SERVICIOS: LINK SOLO SI TIENE SERVICIOS ← ← ← */}
          {tieneServicios ? (
            <Link
              href={`/servicios?categoria=${categoria.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-sm transition-colors group/link"
              // ← ← ← EVITAR QUE EL CLIC PROPAGUE A LA CARD ← ← ←
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 group-hover/link:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Servicios ({categoria.servicios_count || 0})
            </Link>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-400 rounded-xl font-medium text-sm cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Servicios ({categoria.servicios_count || 0})
            </div>
          )}
          
          {/* ← ← ← BOTÓN GALERÍA: LINK SOLO SI TIENE GALERÍA ← ← ← */}
          {categoria.tiene_galeria ? (
            <Link
              href={`/galeria?categoria=${categoria.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-sm transition-colors group/link"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 group-hover/link:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Galería ({categoria.galeria_count})
            </Link>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-400 rounded-xl font-medium text-sm cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Galería ({categoria.galeria_count})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

