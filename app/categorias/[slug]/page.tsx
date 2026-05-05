'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ServiceCard from '@/components/services/ServiceCard';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  imagen: string | null;
  imagen_url: string | null;
  activo: boolean;
}

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion_corta: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
  destacado: boolean;
  disponible: boolean;
}

export default function CategoriaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ← ← ← REFERENCIA PARA SCROLL DE SERVICIOS ← ← ←
  const serviciosScrollRef = useRef<HTMLDivElement>(null);
  
  // ← ← ← ESTADO PARA INDICADORES DE SCROLL ← ← ←
  const [serviciosScrollPosition, setServiciosScrollPosition] = useState({
    start: 1,
    end: 1,
    total: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        console.log('🔍 Buscando categoría con slug:', slug);
        
        const catData = await api.getCategorias();
        const categorias = catData.results || catData;
        
        console.log('📂 Categorías cargadas:', categorias.length);
        
        const categoriaEncontrada = categorias.find(
          (c: Categoria) => c.slug.toLowerCase() === slug.toLowerCase() && c.activo !== false
        );
        
        if (!categoriaEncontrada) {
          setError(`Categoría "${slug}" no encontrada`);
          setLoading(false);
          return;
        }
        
        console.log('✅ Categoría encontrada:', categoriaEncontrada.nombre);
        setCategoria(categoriaEncontrada);
        
        const allServicios = await api.getAllServicios();
        console.log('🛍️ Total de servicios cargados:', allServicios.length);
        
        const serviciosFiltrados = allServicios.filter(
          (s: Servicio) => s.categoria === categoriaEncontrada.id && s.disponible !== false
        );
        
        console.log(`✅ Servicios de "${categoriaEncontrada.nombre}":`, serviciosFiltrados.length);
        
        setServicios(serviciosFiltrados);
        
        // ← ← ← INICIALIZAR POSICIÓN DE SCROLL ← ← ←
        setServiciosScrollPosition({
          start: 1,
          end: Math.min(3, serviciosFiltrados.length),
          total: serviciosFiltrados.length
        });
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Error:', err);
        setError('Error al cargar la categoría');
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // ← ← ← ACTUALIZAR INDICADORES DE SCROLL ← ← ←
  const updateServiciosScrollIndicators = () => {
    const container = serviciosScrollRef.current;
    if (!container || servicios.length === 0) return;
    
    const cardWidth = 256; // w-64 = 256px en móvil
    const gap = 24; // gap-6 = 24px
    const totalWidth = container.scrollWidth;
    const visibleWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    const start = Math.floor(scrollLeft / (cardWidth + gap)) + 1;
    const visibleCards = Math.floor(visibleWidth / (cardWidth + gap));
    const end = Math.min(start + visibleCards - 1, servicios.length);
    
    setServiciosScrollPosition({ start, end, total: servicios.length });
  };

  useEffect(() => {
    const container = serviciosScrollRef.current;
    if (!container) return;
    
    updateServiciosScrollIndicators();
    container.addEventListener('scroll', updateServiciosScrollIndicators);
    window.addEventListener('resize', updateServiciosScrollIndicators);
    return () => {
      container.removeEventListener('scroll', updateServiciosScrollIndicators);
      window.removeEventListener('resize', updateServiciosScrollIndicators);
    };
  }, [servicios]);

  // ← ← ← FUNCIONES PARA SCROLL CON BOTONES ← ← ←
  const scrollServiciosLeft = () => {
    if (serviciosScrollRef.current) {
      serviciosScrollRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };
  
  const scrollServiciosRight = () => {
    if (serviciosScrollRef.current) {
      serviciosScrollRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  // ← ← ← DRAG SCROLL PARA DESKTOP ← ← ←
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const handleServiciosMouseDown = (e: React.MouseEvent) => {
    if (!serviciosScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - serviciosScrollRef.current.offsetLeft);
    setScrollLeftStart(serviciosScrollRef.current.scrollLeft);
    serviciosScrollRef.current.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleServiciosMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !serviciosScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - serviciosScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    serviciosScrollRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const handleServiciosMouseUp = () => {
    if (!serviciosScrollRef.current) return;
    setIsDragging(false);
    serviciosScrollRef.current.style.cursor = 'grab';
  };

  const handleServiciosMouseLeave = () => {
    setIsDragging(false);
    if (serviciosScrollRef.current) {
      serviciosScrollRef.current.style.cursor = 'grab';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !categoria) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Categoría no encontrada'}</p>
          <button
            onClick={() => router.push('/categorias')}
            className="text-blue-600 hover:underline flex items-center gap-1 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a categorías
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = api.getImageUrl(categoria.imagen, categoria.imagen_url);

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* ← ← ← HEADER CON IMAGEN Y LINK DE REGRESO ← ← ← */}
      <section className="relative h-64 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={categoria.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-black opacity-50" />
        
        
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {categoria.nombre}
            </h1>
            {categoria.descripcion && (
              <p className="text-xl text-gray-200 max-w-2xl mx-auto px-4">
                {categoria.descripcion}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ← ← ← SERVICIOS CON SCROLL HORIZONTAL ← ← ← */}
      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 relative">

          
          {/* ← ← ← INDICADOR DE SCROLL PARA MÓVIL ← ← ← */}
          {servicios.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-gray-600 font-medium">
                {serviciosScrollPosition.start} - {serviciosScrollPosition.end} de {serviciosScrollPosition.total}
              </span>
              <div className="flex gap-1">
                {servicios.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index + 1 >= serviciosScrollPosition.start && index + 1 <= serviciosScrollPosition.end
                        ? 'bg-blue-600 w-4'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-2">← Desliza →</span>
            </div>
          )}
          
          {/* ← ← ← BOTONES DE NAVEGACIÓN (SOLO DESKTOP) ← ← ← */}
          <button
            onClick={scrollServiciosLeft}
            disabled={serviciosScrollPosition.start <= 1}
            className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 lg:w-16 lg:h-16 
              ${serviciosScrollPosition.start > 1
                ? 'bg-white/95 hover:bg-white cursor-pointer shadow-xl' 
                : 'bg-gray-100 cursor-not-allowed opacity-50 shadow-md'} 
              rounded-full items-center justify-center text-gray-700 hover:text-blue-600 transition-all group border border-gray-200 hover:scale-110 hover:shadow-2xl hover:border-blue-300 active:scale-95`}
            aria-label="Servicios anteriores"
            title={serviciosScrollPosition.start > 1 ? 'Servicios anteriores' : 'Primer servicio'}
            style={{ marginLeft: '-28px' }}
          >
            <svg className="w-7 h-7 lg:w-8 lg:h-8 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={scrollServiciosRight}
            disabled={serviciosScrollPosition.end >= serviciosScrollPosition.total}
            className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-14 lg:w-16 lg:h-16 
              ${serviciosScrollPosition.end < serviciosScrollPosition.total
                ? 'bg-white/95 hover:bg-white cursor-pointer shadow-xl' 
                : 'bg-gray-100 cursor-not-allowed opacity-50 shadow-md'} 
              rounded-full items-center justify-center text-gray-700 hover:text-blue-600 transition-all group border border-gray-200 hover:scale-110 hover:shadow-2xl hover:border-blue-300 active:scale-95`}
            aria-label="Siguientes servicios"
            title={serviciosScrollPosition.end < serviciosScrollPosition.total ? 'Siguientes servicios' : 'Último servicio'}
            style={{ marginRight: '-28px' }}
          >
            <svg className="w-7 h-7 lg:w-8 lg:h-8 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* ← ← ← GRADIENTES LATERALES PARA INDICAR SCROLL ← ← ← */}
          {serviciosScrollPosition.start > 1 && (
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-20 pointer-events-none hidden md:block" />
          )}
          {serviciosScrollPosition.end < serviciosScrollPosition.total && (
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-20 pointer-events-none hidden md:block" />
          )}

          {/* ← ← ← CONTAINER CON SCROLL HORIZONTAL + DRAG ← ← ← */}
          <div 
            ref={serviciosScrollRef}
            className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing select-none pl-2 pr-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={handleServiciosMouseDown}
            onMouseMove={handleServiciosMouseMove}
            onMouseUp={handleServiciosMouseUp}
            onMouseLeave={handleServiciosMouseLeave}
          >
            {servicios.map((servicio) => (
              <ServiceCardHorizontal
                key={servicio.id}
                servicio={servicio}
              />
            ))}
          </div>
        </div>
      {/* ← ← ← BOTÓN DE REGRESO (ESQUINA SUPERIOR IZQUIERDA) ← ← ← */}
        <button
          onClick={() => router.push('/categorias')}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-full text-gray-700 hover:text-blue-600 transition-all shadow-lg group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium hidden sm:inline">Volver a Categorías</span>
        </button>
      </section>

    </div>
  );


}


// ← ← ← COMPONENTE: CARD HORIZONTAL DE SERVICIO ← ← ←
function ServiceCardHorizontal({ servicio }: { servicio: Servicio }) {
  const imageUrl = api.getImageUrl(servicio.imagen, servicio.imagen_url) || 
                   'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';

  const servicioUrl = `/servicios/${servicio.slug}`;

  return (
    <a
      href={servicioUrl}
      className="flex-shrink-0 w-64 md:w-72 lg:w-80 group relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 snap-start"
    >
      {/* ← ← ← IMAGEN CON NOMBRE SOBRE ELLA ← ← ← */}
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={imageUrl}
          alt={servicio.nombre}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80';
          }}
        />
        
        {/* Overlay gradient para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* ← ← ← NOMBRE Y PRECIO SOBRE LA IMAGEN ← ← ← */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg group-hover:text-yellow-300 transition-colors">
            {servicio.nombre}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-blue-300">
              ${parseInt(servicio.precio_min).toLocaleString('es-CO')}
            </span>
            {servicio.precio_max && parseInt(servicio.precio_max) > parseInt(servicio.precio_min) && (
              <span className="text-xs text-gray-300">
                - ${parseInt(servicio.precio_max).toLocaleString('es-CO')}
              </span>
            )}
          </div>
          {servicio.duracion && (
            <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {servicio.duracion}
            </p>
          )}
        </div>
        
        {/* Badge Destacado */}
        {servicio.destacado && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-yellow-500/95 text-white text-xs font-bold rounded-full shadow">
              ⭐
            </span>
          </div>
        )}
        
        {/* Icono de flecha al hover */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-white/90 rounded-full shadow-lg">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ← ← ← SECCIÓN INFERIOR BLANCA CON DESCRIPCIÓN ← ← ← */}
      <div className="p-4 bg-white border-t border-gray-100">
        <p className="text-sm text-gray-600 line-clamp-2">
          {servicio.descripcion_corta || 'Servicio disponible para reservar'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${
            servicio.disponible 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            {servicio.disponible ? '✓ Disponible' : '✗ No disponible'}
          </span>
          <span className="text-xs text-blue-600 font-medium group-hover:underline">
            Ver detalle →
          </span>
        </div>
      </div>
    </a>
  );
}