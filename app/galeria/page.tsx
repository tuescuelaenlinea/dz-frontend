'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GaleriaItem {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: number;  // ← ID numérico de la categoría
  categoria_nombre?: string;  // ← Nombre de categoría (desde backend)
  
  // Campos para antes/después
  imagen_antes: string | null;
  imagen_antes_url: string | null;
  imagen_despues: string | null;
  imagen_despues_url: string | null;
  
  // Campo para imagen única (fallback)
  imagen?: string | null;
  imagen_url?: string | null;
  
  destacado: boolean;
  orden: number;
  activo: boolean;
  fecha: string;
}

interface CategoriaItem {
  id: number;
  nombre: string;
  slug: string;
}

interface Configuracion {
  galeria_header_desktop: string | null;
  galeria_header_mobile: string | null;
  galeria_header_desktop_url: string | null;
  galeria_header_mobile_url: string | null;
}

export default function GaleriaPage() {
  const [galeria, setGaleria] = useState<GaleriaItem[]>([]);
  const [categorias, setCategorias] = useState<Array<{id: number | string, nombre: string}>>([
    { id: 'todas', nombre: 'Todas' }  // ← Opción por defecto
  ]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // ← CAMBIO: filtroCategoria ahora maneja string (para 'todas') o número convertido
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    tipo: 'antes' | 'despues';
    titulo: string;
  } | null>(null);

  // Constantes de API
  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  // Función getImageUrl (igual que app/page.tsx)
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

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ← CAMBIO: Cargar datos incluyendo categorías dinámicas
  useEffect(() => {
    async function loadData() {
      try {
        // Cargar galería, configuración y categorías en paralelo
        const [galeriaData, configData, categoriasData] = await Promise.all([
          fetch(`${API_URL}/galeria/?activo=true&ordering=-destacado,orden`).then(res => res.json()),
          api.getConfiguracion().catch(() => null),
          fetch(`${API_URL}/categorias/?activo=true&ordering=orden`).then(res => res.json()).catch(() => []),
        ]);
        
        // Procesar galería
        const galeriaList = Array.isArray(galeriaData) ? galeriaData : (galeriaData.results || galeriaData);
        setGaleria(galeriaList.filter((item: GaleriaItem) => item.activo));
        
        // ← PROCESAR CATEGORÍAS DINÁMICAS
        const catsFromApi = Array.isArray(categoriasData) ? categoriasData : (categoriasData.results || []);
        setCategorias([
          { id: 'todas', nombre: 'Todas' },  // ← Opción para mostrar todo
          ...catsFromApi.map((c: CategoriaItem) => ({ 
            id: c.id, 
            nombre: c.nombre 
          }))
        ]);
        
        // Procesar configuración
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
  }, []);  // ← Sin dependencias para cargar solo al montar

  // ← CAMBIO: Filtrar por ID numérico, no por nombre string
  const galeriaFiltrada = filtroCategoria === 'todas'
    ? galeria
    : galeria.filter(item => item.categoria === Number(filtroCategoria));

  // Ordenar: destacados primero, luego por orden
  const galeriaOrdenada = [...galeriaFiltrada].sort((a, b) => {
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return a.orden - b.orden;
  });

  // URLs de header
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
      
      {/* ========== HEADER REORGANIZADO: Dos Secciones Verticales ========== */}
      <div className="w-full" style={{ maxHeight: '400px' }}>
        
        {/* SECCIÓN SUPERIOR (80% - Imagen de fondo) */}
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
        
        {/* SECCIÓN INFERIOR (20% - Fondo negro con textos) */}
        <div className="w-full h-20 bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
            
            {/* Título */}
            <h1 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              Nuestra Galería
            </h1>
            
            {/* Separador vertical en desktop */}
            <span className="hidden md:block w-px h-6 bg-white/30" />
            
            {/* Subtítulo */}
            <p className="text-xs md:text-base text-gray-300 text-center md:text-left drop-shadow">
              Transformaciones reales de nuestros clientes. Resultados que hablan por sí solos.
            </p>
            
          </div>
        </div>
        
      </div>
      {/* ========== FIN HEADER ========== */}

      {/* ========== FILTROS DE CATEGORÍA (DINÁMICOS) ========== */}
      <section className="py-8 bg-gray-200 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFiltroCategoria(cat.id.toString())}  // ← Convertir a string para el estado
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filtroCategoria === cat.id.toString()  // ← Comparar como string
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========== GRID DE GALERÍA ========== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {galeriaOrdenada.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">
                {filtroCategoria === 'todas' 
                  ? 'No hay imágenes en la galería aún.' 
                  : 'No hay imágenes en esta categoría aún.'}
              </p>
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

      {/* ========== MODAL LIGHTBOX ========== */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Imagen */}
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
            <a
              href="/citas"
              className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Reservar Cita
            </a>
            <a
              href="https://wa.me/573001234567"
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

// ========== COMPONENTE: TARJETA DE GALERÍA ==========
function GalleryCard({ 
  item, 
  getImageUrl, 
  onImageClick 
}: { 
  item: GaleriaItem; 
  getImageUrl: (path: string | null, url?: string | null) => string | null;
  onImageClick: (data: { url: string; tipo: 'antes' | 'despues'; titulo: string }) => void;
}) {
  const [showAfter, setShowAfter] = useState(false);
  
  // Soporte para ambos modelos: antes/después o imagen única
  const beforeUrl = getImageUrl(item.imagen_antes, item.imagen_antes_url);
  const afterUrl = getImageUrl(item.imagen_despues, item.imagen_despues_url);
  const singleImageUrl = getImageUrl(item.imagen || null, item.imagen_url || null);
  
  // Determinar qué URLs usar
  const finalBeforeUrl = beforeUrl || singleImageUrl;
  const finalAfterUrl = afterUrl;
  
  // Determinar qué imagen mostrar
  const currentUrl = showAfter && finalAfterUrl ? finalAfterUrl : finalBeforeUrl;

  // Si no hay ninguna imagen, mostrar placeholder
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

  // ← CAMBIO: Mostrar nombre de categoría desde backend (categoria_nombre) o fallback
  const categoriaDisplay = item.categoria_nombre || `Categoría #${item.categoria}`;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 group hover:shadow-2xl transition-shadow">
      {/* Badge de destacado */}
      {item.destacado && (
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg">
            ⭐ Destacado
          </span>
        </div>
      )}
      
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={currentUrl}
          alt={item.titulo}
          className="w-full h-full object-cover transition-opacity duration-500"
          loading="lazy"
          onError={(e) => {
            console.error(`❌ Error cargando imagen:`, currentUrl);
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
        
        {/* Badge de categoría */}
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-blue-600/90 text-white text-xs font-medium rounded-full shadow">
            📁 {categoriaDisplay}
          </span>
        </div>
        
        {/* Overlay con controles (solo si hay after) */}
        {finalAfterUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Toggle antes/después */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAfter(false); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    !showAfter 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                  }`}
                >
                  Antes
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAfter(true); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    showAfter 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                  }`}
                >
                  Después
                </button>
              </div>
              
              {/* Botones de ver detalle */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick({ url: finalBeforeUrl!, tipo: 'antes', titulo: item.titulo });
                  }}
                  className="flex-1 py-2 bg-white/90 text-gray-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                >
                  Ver Imagen
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
      
      {/* Información */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          {/* ← CAMBIO: Mostrar nombre de categoría */}
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