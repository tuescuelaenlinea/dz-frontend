'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

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

export default function GaleriaPage() {
  const [galeria, setGaleria] = useState<GaleriaItem[]>([]);
  const [categoriasConGaleria, setCategoriasConGaleria] = useState<CategoriaConGaleria[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ← NUEVO: Control de vista - 'categorias' muestra cards, 'galeria' muestra fotos
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

  // ← NUEVO: Cargar datos y procesar categorías con galería
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
        
        // ← PROCESAR: Solo categorías que tienen items en galería
        const catsFromApi = Array.isArray(categoriasData) ? categoriasData : (categoriasData.results || []);
        
        // Agrupar galería por categoría
        const galeriaPorCategoria = new Map<number, GaleriaItem[]>();
        galeriaActiva.forEach((item: GaleriaItem) => {
          if (item.categoria) {
            const existing = galeriaPorCategoria.get(item.categoria) || [];
            existing.push(item);
            galeriaPorCategoria.set(item.categoria, existing);
          }
        });
        
        // Filtrar y enriquecer categorías con datos de galería
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

  // ← NUEVO: Filtrar galería por categoría seleccionada
  const galeriaFiltrada = categoriaSeleccionada
    ? galeria.filter(item => item.categoria === categoriaSeleccionada)
    : galeria;

  const galeriaOrdenada = [...galeriaFiltrada].sort((a, b) => {
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return a.orden - b.orden;
  });

  // ← NUEVO: Obtener nombre de categoría seleccionada
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
                ? 'Transformaciones reales de nuestros clientes. Resultados que hablan por sí solos.'
                : `${galeriaOrdenada.length} transformaciones en esta categoría`}
            </p>
          </div>
        </div>
      </div>

      {/* ========== VISTA: CARDS DE CATEGORÍAS ========== */}
      {vistaActual === 'categorias' && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {categoriasConGaleria.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">No hay categorías con galería aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoriasConGaleria.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    categoria={cat}
                    getImageUrl={getImageUrl}
                    onClick={() => {
                      setCategoriaSeleccionada(cat.id);
                      setVistaActual('galeria');
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========== VISTA: GALERÍA DE FOTOS ========== */}
      {vistaActual === 'galeria' && (
        <>
          {/* Barra de navegación */}
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
                Volver a categorías
              </button>
              <span className="text-sm text-gray-500">
                {galeriaOrdenada.length} {galeriaOrdenada.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
          </div>

          {/* Grid de galería */}
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {galeriaOrdenada.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No hay imágenes en esta categoría aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {galeriaOrdenada.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      getImageUrl={getImageUrl}
                      onImageClick={setSelectedImage}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ========== MODAL LIGHTBOX ========== */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <img
                src={selectedImage.url}
                alt={`${selectedImage.titulo} - ${selectedImage.tipo === 'antes' ? 'Antes' : 'Después'}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="p-4 bg-gray-900 text-white text-center">
                <span className="text-sm font-medium uppercase tracking-wide text-gray-400">
                  {selectedImage.tipo === 'antes' ? '📸 Antes' : '✨ Después'}
                </span>
                <p className="text-lg font-semibold mt-1">{selectedImage.titulo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CTA FINAL ========== */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para tu transformación?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Agenda tu cita hoy y descubre lo que podemos hacer por ti.
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
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ========== COMPONENTE: CARD DE CATEGORÍA ==========
function CategoryCard({ 
  categoria, 
  getImageUrl, 
  onClick 
}: { 
  categoria: CategoriaConGaleria; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
  onClick: () => void;
}) {
  // Obtener imagen para la card: prioridad 1) imagen de categoría, 2) primera imagen de galería
  const categoriaImageUrl = getImageUrl(categoria.imagen ?? null, categoria.imagen_url ?? null);
const galeriaImageUrl = getImageUrl(categoria.primera_imagen ?? null, categoria.primera_imagen_url ?? null);
  const displayImageUrl = categoriaImageUrl || galeriaImageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';

  return (
    <button
      onClick={onClick}
      className="group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 text-left w-full"
    >
      {/* Imagen de la categoría */}
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={displayImageUrl}
          alt={categoria.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Badge con count */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-white/90 text-gray-900 text-sm font-bold rounded-full shadow">
            {categoria.gallery_count} {categoria.gallery_count === 1 ? 'foto' : 'fotos'}
          </span>
        </div>
        
        {/* Icono de flecha */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-white/90 rounded-full shadow-lg">
            <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Información */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          {categoria.nombre}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Ver transformaciones →
        </p>
      </div>
    </button>
  );
}

// ========== COMPONENTE: TARJETA DE GALERÍA ==========
function GalleryCard({ 
  item, 
  getImageUrl, 
  onImageClick 
}: { 
  item: GaleriaItem; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
  onImageClick: (data: { url: string; tipo: 'antes' | 'despues'; titulo: string }) => void;  // ← CORREGIDO
}) {
  const [showAfter, setShowAfter] = useState(false);
  
  const beforeUrl = getImageUrl(item.imagen_antes, item.imagen_antes_url);
  const afterUrl = getImageUrl(item.imagen_despues, item.imagen_despues_url);
  const singleImageUrl = getImageUrl(item.imagen || null, item.imagen_url || null);
  
  const finalBeforeUrl = beforeUrl || singleImageUrl;
  const finalAfterUrl = afterUrl;
  const currentUrl = showAfter && finalAfterUrl ? finalAfterUrl : finalBeforeUrl;

  if (!currentUrl) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 font-medium mb-2">{item.titulo}</p>
          <p className="text-sm text-gray-500">Sin imágenes disponibles</p>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{item.titulo}</h3>
          <p className="text-sm text-gray-600">{item.descripcion}</p>
        </div>
      </div>
    );
  }

  const categoriaDisplay = item.categoria_nombre || `Categoría #${item.categoria}`;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 group hover:shadow-2xl transition-shadow">
      {item.destacado && (
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
            ⭐ Destacado
          </span>
        </div>
      )}
      
      <div 
        className="relative aspect-square overflow-hidden bg-gray-100 cursor-zoom-in"
        onClick={() => {
          onImageClick({ 
            url: currentUrl!, 
            tipo: showAfter ? 'despues' : 'antes', 
            titulo: item.titulo 
          });
        }}
      >
        <img
          src={currentUrl}
          alt={item.titulo}
          className="w-full h-full object-cover transition-opacity duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.parentElement!.innerHTML = `
              <div class="w-full h-full flex flex-col items-center justify-center bg-gray-200 p-4 text-center">
                <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p class="text-xs text-gray-600 font-medium">Error al cargar</p>
              </div>
            `;
          }}
        />
        
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-blue-600/90 text-white text-xs font-medium rounded-full shadow">
            📁 {categoriaDisplay}
          </span>
        </div>
        
        {finalAfterUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowAfter(false); 
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    !showAfter 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                  }`}
                >
                  Antes
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowAfter(true); 
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    showAfter 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                  }`}
                >
                  Después
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick({ url: finalBeforeUrl!, tipo: 'antes', titulo: item.titulo });
                  }}
                  className="flex-1 py-2 bg-white/90 text-gray-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                >
                  Ver en Grande
                </button>
                {finalAfterUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick({ url: finalAfterUrl, tipo: 'despues', titulo: item.titulo });
                    }}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Ver Después
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {categoriaDisplay}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(item.fecha).toLocaleDateString('es-CO', { 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {item.titulo}
        </h3>
        {item.descripcion && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.descripcion}
          </p>
        )}
      </div>
    </div>
  );
}