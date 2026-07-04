'use client';

import { useState, useEffect } from 'react';
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
  combos?: ComboNovia[];
}

export default function BlogNoviasPage() {
  const [data, setData] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galeriaVisible, setGaleriaVisible] = useState<number[]>([0, 1, 2, 3, 4]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      const res = await fetch(`${apiUrl}/blog-posts/activo/`);
      if (res.ok) {
        const jsonData = await res.json();
        console.log('📥 DATOS COMPLETOS DEL BACKEND:', jsonData);
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

  useEffect(() => {
    if (!data) return;

    const tiempos = [
      data.tiempo_cambio_1 * 1000,
      data.tiempo_cambio_2 * 1000,
      data.tiempo_cambio_3 * 1000,
      data.tiempo_cambio_4 * 1000,
      data.tiempo_cambio_5 * 1000,
    ];

    const intervals = tiempos.map((tiempo, index) => {
      return setInterval(() => {
        setGaleriaVisible((prev) => {
          const nuevo = [...prev];
          nuevo[index] = (nuevo[index] + 1) % 2;
          return nuevo;
        });
      }, tiempo);
    });

    return () => intervals.forEach(clearInterval);
  }, [data]);

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

  const getComboColumns = () => {
    const count = data.combos?.length || 0;
    if (count === 1) return 'grid-cols-1 max-w-md';
    if (count === 2) return 'grid-cols-2 max-w-2xl';
    if (count === 3) return 'grid-cols-3 max-w-3xl';
    if (count === 4) return 'grid-cols-4 max-w-4xl';
    return 'grid-cols-4 max-w-5xl';
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
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
      `}</style>

      {/* SECCIÓN 1: HEADER - SIN Bordes redondeados abajo */}
      <section className="relative w-full max-w-7xl mx-auto">
        <div className="h-[280px] md:h-[550px] overflow-hidden">
          {getImageUrl(data.header_imagen, data.header_imagen_url) && (
            <Image
              src={getImageUrl(data.header_imagen, data.header_imagen_url)!}
              alt={data.titulo}
              fill
              className="object-cover"
              priority
              loading="eager"
              unoptimized
            />
          )}
        </div>
      </section>

      {/* SECCIÓN 2: GALERÍA DINÁMICA - CON FONDO CREMA */}
      <section className="w-full max-w-7xl mx-auto px-4 bg-[#F5E6D3]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0">
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
                className="relative aspect-[3/4] overflow-hidden p-[10px]"
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
                    <span className="text-gray-500 text-sm">Sin imagen</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3: SERVICIOS */}
      <section className="w-full max-w-7xl mx-auto px-4">
        <div className="relative h-[200px] md:h-[330px] -mx-4 overflow-hidden">
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
                  className="object-cover"
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

      {/* SECCIÓN 4: COMBOS - SIN bordes redondeados arriba */}
      <section className="w-full relative h-[500px] md:h-[600px] max-w-7xl mx-auto px-4 py-0">
        {(() => {
          const combosBgUrl = getImageUrl(data.combos_imagen_fondo, data.combos_imagen_fondo_url);
          if (combosBgUrl) {
            return (
              <>
                <Image
                  src={combosBgUrl}
                  alt="Fondo Combos"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </>
            );
          }
          return <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-white" />;
        })()}
  
        <div className="relative z-10 px-20 py-15">
          <div className="flex justify-end mb-12">
            {(() => {
              if (data.combos && data.combos.length > 0) {
                return (
                  <div className={`grid ${getComboColumns()} gap-6`}>
                    {data.combos.map((combo, index) => (
                      <div
                        key={combo.id || index}
                        className={`bg-white rounded-2xl shadow-xl p-6 transition-transform hover:-translate-y-2 ${
                          combo.destacado ? 'border-2 border-yellow-400' : ''
                        }`}
                      >
                        <div className="text-center mb-6">
                          {/*<div className="w-16 h-16 bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">{combo.icono}</span>
                          </div>*/}
                          <h3 className="text-2xl font-serif text-gray-800 mb-2">
                            {combo.nombre}
                          </h3>
                          <p className="text-2xl font-bold text-yellow-600">
                            ${parseInt(combo.precio).toLocaleString()} {/*{combo.moneda}*/}
                          </p>
                        </div>

                        <ul className="space-y-1 mb-6">
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
                        >
                          Reservar
                        </a>
                      </div>
                    ))}
                  </div>
                );
              } else {
                return (
                  <div className="w-full text-center py-12 bg-white/90 rounded-lg shadow">
                    <p className="text-gray-500 text-lg mb-2">No hay combos disponibles</p>
                  </div>
                );
              }
            })()}
          </div>
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