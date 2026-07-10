'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ComboNovia {
  id: number;
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
}

interface BlogPostData {
  id: number;
  titulo: string;
  header_imagen: string;
  header_imagen_url?: string;
  header_titulo_principal: string;
  header_subtitulo: string;
  header_texto: string;
  galeria_imagen_1: string;
  galeria_imagen_1_url?: string;
  galeria_imagen_2: string;
  galeria_imagen_2_url?: string;
  galeria_imagen_3: string;
  galeria_imagen_3_url?: string;
  galeria_imagen_4: string;
  galeria_imagen_4_url?: string;
  galeria_imagen_5: string;
  galeria_imagen_5_url?: string;
  tiempo_cambio_1: number;
  tiempo_cambio_2: number;
  tiempo_cambio_3: number;
  tiempo_cambio_4: number;
  tiempo_cambio_5: number;
  servicios_titulo?: string;
  servicios_subtitulo?: string;
  servicios_descripcion?: string;
  servicios_imagen?: string | null;
  servicios_imagen_url?: string;
  combos_imagen_fondo?: string | null;
  combos_imagen_fondo_url?: string;
  combos_imagen_fondo_mobile?: string | null;
  combos_imagen_fondo_mobile_url?: string;
  combos?: ComboNovia[];
}

export default function BlogNoviasPage() {
  const [data, setData] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ← ← ← NUEVO: Referencia al contenedor de scroll y estado de arrastre ← ← ←
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const res = await fetch(`${apiUrl}/blog-posts/activo/`);
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      } else {
        console.error('❌ Error al cargar datos:', res.status);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← NUEVO: Verificar si hay scroll disponible ← ← ←
  useEffect(() => {
    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
          container.scrollLeft < container.scrollWidth - container.clientWidth - 1
        );
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [data]);

  // ← ← ← NUEVO: Handlers para drag-to-scroll en desktop ← ← ←
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiplicador para velocidad
    container.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  // ← ← ← NUEVO: Scroll con rueda del mouse (sin necesidad de shift) ← ← ←
  const handleWheel = (e: React.WheelEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Si hay scroll vertical disponible en la página, no interferir
    // Solo interceptar si el contenedor tiene scroll horizontal
    if (container.scrollWidth > container.clientWidth) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  // ← ← ← NUEVO: Funciones para botones de navegación ← ← ←
  const scrollByAmount = (amount: number) => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-gray-600">No hay contenido disponible</p>
      </div>
    );
  }

  const getImageUrl = (path: string | null | undefined, urlCompleta?: string): string | null => {
    if (urlCompleta && urlCompleta.startsWith('http')) {
      return urlCompleta;
    }
    if (!path) return null;
    if (path.startsWith('http')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}${cleanPath}`;
  };

  return (
    // ← ← ← FIX 1: Cambiar overflow-hidden a overflow-x-hidden ← ← ←
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* ESTRELLAS DE FONDO */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* ← ← ← NUEVO: Estilo para cursor de arrastre ← ← ← */
        .drag-scroll {
          cursor: grab;
          user-select: none;
        }
        .drag-scroll:active {
          cursor: grabbing;
        }
      `}</style>

      {/* SECCIÓN 1: HEADER */}
      <section className="relative w-full max-w-7xl mx-auto">
        <div className="h-[230px] sm:h-[450px] md:h-[550px] overflow-hidden bg-black">
          {getImageUrl(data.header_imagen, data.header_imagen_url) && (
            <Image
              src={getImageUrl(data.header_imagen, data.header_imagen_url)!}
              alt={data.titulo}
              fill
              className="object-cover object-left"
              priority
              loading="eager"
              unoptimized
            />
          )}
        </div>
      </section>

      {/* SECCIÓN 2: GALERÍA */}
      <section className="w-full max-w-7xl mx-auto bg-[#F5E6D3]">
        <div className="flex gap-0 w-full">
          {[
            { path: data.galeria_imagen_1, url: data.galeria_imagen_1_url },
            { path: data.galeria_imagen_2, url: data.galeria_imagen_2_url },
            { path: data.galeria_imagen_3, url: data.galeria_imagen_3_url },
            { path: data.galeria_imagen_4, url: data.galeria_imagen_4_url },
            { path: data.galeria_imagen_5, url: data.galeria_imagen_5_url },
          ].map((imagen, index) => {
            const imageUrl = getImageUrl(imagen.path, imagen.url);
            return (
              <div 
                key={index} 
                className="flex-1 min-w-0 aspect-[3/4] p-[6px] md:p-[10px]"
              >
                {imageUrl ? (
                  <div className="relative w-full h-full overflow-hidden rounded-lg shadow-lg">
                    <Image                  
                      src={imageUrl}
                      alt={`Galería ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-110"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center rounded-lg">
                    <span className="text-gray-500 text-xs">Sin imagen</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3: SERVICIOS */}
      <section className="w-full max-w-7xl mx-auto px-4">
        <div className="relative h-[100px] sm:h-[250px] md:h-[330px] -mx-4 overflow-hidden bg-black">
          {(() => {
            const serviciosImageUrl = getImageUrl(
              data.servicios_imagen, 
              data.servicios_imagen_url
            );
            
            if (serviciosImageUrl) {
              return (
                <Image
                  src={serviciosImageUrl}
                  alt={data.servicios_titulo || 'Servicios'}
                  fill
                  className="object-cover object-center"
                  unoptimized
                />
              );
            } else {
              return (
                <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">Imagen de servicios no disponible</p>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      </section>

      {/* SECCIÓN 4: COMBOS - Scroll horizontal funcional en TODAS las vistas */}
      <section className="w-full relative min-h-[600px] md:min-h-[650px] max-w-7xl mx-auto py-10">
        {/* Fondo */}
        {(() => {
          const webBgUrl = getImageUrl(data.combos_imagen_fondo, data.combos_imagen_fondo_url);
          const mobileBgUrl = getImageUrl(data.combos_imagen_fondo_mobile, data.combos_imagen_fondo_mobile_url);
          
          if (mobileBgUrl && webBgUrl) {
            return (
              <>
                <div className="absolute inset-0 md:hidden">
                  <Image src={mobileBgUrl} alt="Fondo Combos Móvil" fill className="object-cover" unoptimized />
                </div>
                <div className="absolute inset-0 hidden md:block">
                  <Image src={webBgUrl} alt="Fondo Combos Web" fill className="object-cover" unoptimized />
                </div>
              </>
            );
          }
          
          if (webBgUrl) {
            return (
              <Image src={webBgUrl} alt="Fondo Combos" fill className="object-cover" unoptimized />
            );
          }
          
          return <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-white" />;
        })()}

        {/* Contenido de combos */}
        <div className="relative z-10 w-full py-10">
          {data.combos && data.combos.length > 0 ? (
            <div className="relative">
              {/* ← ← ← BOTÓN IZQUIERDO (solo visible si hay scroll) ← ← ← */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollByAmount(-350)}
                  className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 
                             w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full 
                             items-center justify-center shadow-lg transition-all
                             hover:scale-110 backdrop-blur-sm"
                  aria-label="Scroll izquierdo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* ← ← ← BOTÓN DERECHO (solo visible si hay scroll) ← ← ← */}
              {canScrollRight && (
                <button
                  onClick={() => scrollByAmount(350)}
                  className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 
                             w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full 
                             items-center justify-center shadow-lg transition-all
                             hover:scale-110 backdrop-blur-sm"
                  aria-label="Scroll derecho"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* ← ← ← FIX 2 & 3: Contenedor con scroll horizontal + drag-to-scroll ← ← ← */}
              <div 
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-6 px-6 md:px-12 drag-scroll"
                style={{ 
                  WebkitOverflowScrolling: 'touch'
                  // ← ← ← FIX 2: Quitar scrollBehavior: 'smooth' ← ← ←
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onWheel={handleWheel}
              >
                {/* Spacer izquierdo */}
                <div className="flex-shrink-0 w-0 md:w-6" />
                
                {data.combos.map((combo, index) => (
                  <div
                    key={combo.id || index}
                    className={`
                      flex-shrink-0 
                      min-w-[280px] w-[280px] sm:min-w-[300px] sm:w-[300px] md:min-w-[250px] md:w-[250px]
                      snap-center
                      bg-white rounded-2xl shadow-xl p-5 md:p-6 
                      transition-transform hover:-translate-y-2 
                      ${combo.destacado ? 'border-2 border-yellow-400' : ''}
                    `}
                  >
                    <div className="text-center mb-5">
                      <h3 className="text-xl md:text-2xl font-serif text-gray-800 mb-2">
                        {combo.nombre}
                      </h3>
                      <p className="text-xl md:text-2xl font-bold text-yellow-600">
                        ${parseInt(combo.precio).toLocaleString()}
                      </p>
                    </div>

                    <ul className="space-y-1 mb-5">
                      {combo.caracteristica_1 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_1}</span>
                        </li>
                      )}
                      {combo.caracteristica_2 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_2}</span>
                        </li>
                      )}
                      {combo.caracteristica_3 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_3}</span>
                        </li>
                      )}
                      {combo.caracteristica_4 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_4}</span>
                        </li>
                      )}
                      {combo.caracteristica_5 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_5}</span>
                        </li>
                      )}
                      {combo.caracteristica_6 && (
                        <li className="flex items-start gap-1.5 text-gray-600">
                          <span className="text-yellow-600 text-xs">✓</span>
                          <span className="text-xs leading-tight">{combo.caracteristica_6}</span>
                        </li>
                      )}
                    </ul>

                    <a
                      href={combo.link_reserva}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Reservar
                    </a>
                  </div>
                ))}
                
                {/* Spacer derecho */}
                <div className="flex-shrink-0 w-0 md:w-6" />
              </div>
              
              {/* ← ← ← INDICADOR VISUAL ← ← ← */}
              <div className="hidden md:flex justify-center mt-4 gap-2">
                <span className="text-white/80 text-sm">
                  {canScrollLeft || canScrollRight 
                    ? '🖱️ Arrastra o usa la rueda del mouse para ver más combos' 
                    : '✨ Todos los combos visibles'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full text-center py-12 bg-white/90 rounded-lg shadow">
              <p className="text-gray-500 text-lg mb-2">No hay combos disponibles</p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12 px-4 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-2xl font-serif mb-4">Vive tu cuento en Cartagena</p>
          <p className="text-gray-400 mb-8">Y nosotras lo hacemos inolvidable</p>
          
          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} DZ Salón. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}