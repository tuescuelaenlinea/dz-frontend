'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

// ← ← ← INTERFACES ← ← ←
interface GaleriaItem {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: number;
  categoria_nombre?: string;
  imagen_antes: string | null;
  imagen_antes_url: string | null;
  imagen_despues: string | null;
  imagen_despues_url: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  destacado: boolean;
  orden: number;
  activo: boolean;
  fecha: string;
}

interface CategoriaConGaleria {
  id: number;
  nombre: string;
  slug: string;
  imagen?: string | null;
  imagen_url?: string | null;
  gallery_count: number;
  primera_imagen?: string | null;
  primera_imagen_url?: string | null;
}

interface Configuracion {
  galeria_header_desktop: string | null;
  galeria_header_mobile: string | null;
  galeria_header_desktop_url: string | null;
  galeria_header_mobile_url: string | null;
}

// ← ← ← COMPONENTE PRINCIPAL ← ← ←
export default function GaleriaPage() {
  const [galeria, setGaleria] = useState<GaleriaItem[]>([]);
  const [categoriasConGaleria, setCategoriasConGaleria] = useState<CategoriaConGaleria[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const [vistaActual, setVistaActual] = useState<'categorias' | 'galeria'>('categorias');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    tipo: 'antes' | 'despues';
    titulo: string;
  } | null>(null);

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

  useEffect(() => {
    async function loadData() {
      try {
        const [galeriaData, configData, categoriasData] = await Promise.all([
          fetch(`${API_URL}/galeria/?activo=true&ordering=-destacado,orden`).then(res => res.json()),
          api.getConfiguracion().catch(() => null),
          fetch(`${API_URL}/categorias/?activo=true&ordering=orden`).then(res => res.json()).catch(() => []),
        ]);
        
        const galeriaList = Array.isArray(galeriaData) ? galeriaData : (galeriaData.results || galeriaData);
        const galeriaActiva = galeriaList.filter((item: GaleriaItem) => item.activo);
        setGaleria(galeriaActiva);
        
        const catsFromApi = Array.isArray(categoriasData) ? categoriasData : (categoriasData.results || []);
        
        const galeriaPorCategoria = new Map<number, GaleriaItem[]>();
        galeriaActiva.forEach((item: GaleriaItem) => {
          if (item.categoria) {
            const existing = galeriaPorCategoria.get(item.categoria) || [];
            existing.push(item);
            galeriaPorCategoria.set(item.categoria, existing);
          }
        });
        
        const categoriasConGaleriaList: CategoriaConGaleria[] = catsFromApi
          .filter((c: any) => galeriaPorCategoria.has(c.id))
          .map((c: any) => {
            const items = galeriaPorCategoria.get(c.id) || [];
            const primeraImagen = items[0];
            return {
              id: c.id,
              nombre: c.nombre,
              slug: c.slug,
              imagen: c.imagen || null,
              imagen_url: c.imagen_url || null,
              gallery_count: items.length,
              primera_imagen: primeraImagen?.imagen_antes || primeraImagen?.imagen_despues || primeraImagen?.imagen || null,
              primera_imagen_url: primeraImagen?.imagen_antes_url || primeraImagen?.imagen_despues_url || primeraImagen?.imagen_url || null,
            };
          });
        
        setCategoriasConGaleria(categoriasConGaleriaList);
        
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error cargando galería:', err);
        setError('Error al cargar la galería');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const galeriaFiltrada = categoriaSeleccionada
    ? galeria.filter(item => item.categoria === categoriaSeleccionada)
    : galeria;

  const galeriaOrdenada = [...galeriaFiltrada].sort((a, b) => {
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return a.orden - b.orden;
  });

  const nombreCategoriaSeleccionada = categoriaSeleccionada
    ? categoriasConGaleria.find(c => c.id === categoriaSeleccionada)?.nombre
    : null;

  const headerDesktopImage = getImageUrl(
    configuracion?.galeria_header_desktop ?? null,
    configuracion?.galeria_header_desktop_url ?? null
  );
  const headerMobileImage = getImageUrl(
    configuracion?.galeria_header_mobile ?? null,
    configuracion?.galeria_header_mobile_url ?? null
  );
  const headerImageUrl = isMobile
    ? (headerMobileImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=768&q=80')
    : (headerDesktopImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&q=80');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-red-400 text-lg">{error}</p>
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
        <div className="w-full h-20 bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
            <h1 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              {vistaActual === 'categorias' ? 'Nuestra Galería' : nombreCategoriaSeleccionada}
            </h1>
            <span className="hidden md:block w-px h-6 bg-white/30" />
            <p className="text-xs md:text-base text-gray-300 text-center md:text-left drop-shadow">
              {vistaActual === 'categorias' 
                ? 'Transformaciones reales de nuestros clientes'
                : `${galeriaOrdenada.length} transformaciones`}
            </p>
          </div>
        </div>
      </div>


      


      {/* ========== VISTA: CATEGORÍAS SCROLL HORIZONTAL ========== */}
      {vistaActual === 'categorias' && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Explora por Categoría
            </h2>
            
            {/* Scroll Horizontal de Categorías */}
            <CategoryScrollHorizontal
              categorias={categoriasConGaleria}
              getImageUrl={getImageUrl}
              onCategoryClick={(id) => {
                setCategoriaSeleccionada(id);
                setVistaActual('galeria');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
            />
          </div>
        </section>
      )}

      {/* ========== VISTA: GALERÍA CON SLIDER AUTOMÁTICO ========== */}
      {vistaActual === 'galeria' && (
        <>
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => {
                  setVistaActual('categorias');
                  setCategoriaSeleccionada(null);
                }}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <span className="text-sm text-gray-500">
                {galeriaOrdenada.length} {galeriaOrdenada.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
          </div>

          <section className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              {galeriaOrdenada.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No hay imágenes en esta categoría.</p>
                </div>
              ) : (
                <GallerySlider
                  items={galeriaOrdenada}
                  getImageUrl={getImageUrl}
                  onImageClick={setSelectedImage}
                />
              )}
            </div>
          </section>
        </>
      )}

      {/* ========== MODAL LIGHTBOX CON ZOOM ========== */}
      {selectedImage && (
        <ImageZoomModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* ========== CTA FINAL ========== */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para tu transformación?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Agenda tu cita hoy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/citas"
              className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Reservar Cita
            </Link>
            <a
              href="https://wa.me/573157072678"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ← ← ← COMPONENTE: SCROLL HORIZONTAL DE CATEGORÍAS CON DRAG ← ← ←
function CategoryScrollHorizontal({ 
  categorias, 
  getImageUrl, 
  onCategoryClick 
}: { 
  categorias: CategoriaConGaleria[]; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
  onCategoryClick: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {categorias.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryClick(cat.id)}
          className="flex-shrink-0 w-72 group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 snap-start"
        >
          <div className="aspect-[4/3] overflow-hidden bg-gray-100">
            <img
              src={getImageUrl(cat.imagen ?? null, cat.imagen_url ?? null) || 
                   getImageUrl(cat.primera_imagen ?? null, cat.primera_imagen_url ?? null) ||
                   'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80'}
              alt={cat.nombre}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            <div className="absolute top-3 right-3">
              <span className="px-3 py-1 bg-white/95 text-gray-900 text-sm font-bold rounded-full shadow">
                {cat.gallery_count} {cat.gallery_count === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
                {cat.nombre}
              </h3>
              <p className="text-sm text-gray-200 mt-1 flex items-center gap-1">
                Ver galería 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ← ← ← COMPONENTE: SLIDER DE GALERÍA CON AUTO-PLAY ← ← ←
function GallerySlider({ 
  items, 
  getImageUrl, 
  onImageClick 
}: { 
  items: GaleriaItem[]; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
  onImageClick: (data: { url: string; tipo: 'antes' | 'despues'; titulo: string }) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showAfter, setShowAfter] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = items[currentIndex];
  
  const beforeUrl = getImageUrl(currentItem.imagen_antes, currentItem.imagen_antes_url);
  const afterUrl = getImageUrl(currentItem.imagen_despues, currentItem.imagen_despues_url);
  const singleImageUrl = getImageUrl(currentItem.imagen || null, currentItem.imagen_url || null);
  
  const currentImageUrl = showAfter && afterUrl ? afterUrl : (beforeUrl || singleImageUrl);

  useEffect(() => {
    if (isPlaying && items.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setShowAfter(false);
      }, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, items.length]);

  const handleTogglePlay = useCallback(() => setIsPlaying(prev => !prev), []);
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setShowAfter(false);
  }, [items.length]);
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setShowAfter(false);
  }, [items.length]);
  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowAfter(false);
  }, []);

  if (!currentItem || !currentImageUrl) return null;

  return (
    <div className="space-y-6">
      {/* Controls Superiores */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handleTogglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isPlaying ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pausar
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Reproducir
              </>
            )}
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold text-blue-600">{currentIndex + 1}</span>
            <span>/</span>
            <span>{items.length}</span>
          </div>
        </div>
        {afterUrl && (
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowAfter(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !showAfter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Antes
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                showAfter ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Después
            </button>
          </div>
        )}
      </div>

      {/* Imagen Principal Grande */}
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3] md:aspect-[16/9]">
        <img
          src={currentImageUrl}
          alt={`${currentItem.titulo} - ${showAfter ? 'Después' : 'Antes'}`}
          className="w-full h-full object-contain cursor-zoom-in transition-opacity duration-500"
          onClick={() => onImageClick({ url: currentImageUrl!, tipo: showAfter ? 'despues' : 'antes', titulo: currentItem.titulo })}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{currentItem.titulo}</h3>
              <p className="text-gray-300 text-sm max-w-2xl">{currentItem.descripcion}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrev} className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={handleNext} className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {currentItem.destacado && (
          <div className="absolute top-4 left-4">
            <span className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1">
              ⭐ Destacado
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails Navegables */}
      <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {items.map((item, index) => {
          const itemBeforeUrl = getImageUrl(item.imagen_antes, item.imagen_antes_url);
          const itemAfterUrl = getImageUrl(item.imagen_despues, item.imagen_despues_url);
          const itemSingleUrl = getImageUrl(item.imagen || null, item.imagen_url || null);
          const thumbUrl = itemBeforeUrl || itemSingleUrl;
          if (!thumbUrl) return null;
          return (
            <button
              key={item.id}
              onClick={() => handleThumbnailClick(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex 
                  ? 'border-blue-600 ring-2 ring-blue-600/30 scale-105' 
                  : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={thumbUrl} alt={item.titulo} className="w-full h-full object-cover" />
              {index === currentIndex && <div className="absolute inset-0 bg-blue-600/20" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ← ← ← COMPONENTE: MODAL CON ZOOM ← ← ←
function ImageZoomModal({ 
  image, 
  onClose 
}: { 
  image: { url: string; tipo: 'antes' | 'despues'; titulo: string };
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      {/* Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full z-10">
        <button onClick={(e) => { e.stopPropagation(); handleZoomOut(); }} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Alejar (-)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <span className="text-white text-sm font-medium min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={(e) => { e.stopPropagation(); handleZoomIn(); }} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Acercar (+)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors ml-2" title="Reset (0)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
        <div className="w-px h-6 bg-white/30 mx-2" />
        <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Cerrar (ESC)">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      {/* Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm px-6 py-3 rounded-full z-10">
        <div className="text-center">
          <span className="text-sm font-medium uppercase tracking-wide text-gray-400">{image.tipo === 'antes' ? '📸 Antes' : '✨ Después'}</span>
          <p className="text-lg font-semibold text-white mt-1">{image.titulo}</p>
        </div>
      </div>
      {/* Imagen con Zoom */}
      <div className="relative overflow-hidden cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={(e) => e.stopPropagation()}>
        <img ref={imgRef} src={image.url} alt={image.titulo} style={{ transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out', maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} className="select-none" />
      </div>
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-sm">Arrastra para mover • Rueda del ratón para zoom • ESC para cerrar</div>
    </div>
  );
}