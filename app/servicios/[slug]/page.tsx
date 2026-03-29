// app/servicios/[slug]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import RelatedServices from '@/components/services/RelatedServices';

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  descripcion_corta: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
  destacado: boolean;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio: string;
  es_medico: boolean;
  requiere_valoracion: boolean;
  sesiones_incluidas: number;
}

export default function ServicioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [serviciosRelacionados, setServiciosRelacionados] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  // ← Definir loadRelatedServices ANTES de usarla
  async function loadRelatedServices(categoriaId: number, currentSlug: string) {
    try {
      const allServicios = await (api.getAllServicios 
        ? api.getAllServicios() 
        : api.getServicios());
      
      const serviciosList = Array.isArray(allServicios) 
        ? allServicios 
        : (allServicios.results || allServicios);
      
      const relacionados = serviciosList
        .filter((s: Servicio) => 
          s.categoria === categoriaId && 
          s.slug?.toLowerCase() !== currentSlug.toLowerCase()
        )
        .slice(0, 3);
      
      // Aquí podrías setear un estado si necesitas mostrar relacionados
      // setRelatedServices(relacionados);
    } catch (err) {
      console.warn('⚠️ No se pudieron cargar servicios relacionados:', err);
    }
  }

  // ← Función principal de carga
  async function loadData() {
    try {
      console.log('🔍 Buscando servicio con slug:', slug);
      
      // Cargar todos los servicios y filtrar por slug
      const allServicios = await (api.getAllServicios 
        ? api.getAllServicios() 
        : api.getServicios());
      
      const serviciosList = Array.isArray(allServicios) 
        ? allServicios 
        : (allServicios.results || allServicios);
      
      console.log(`📦 Total servicios cargados: ${serviciosList.length}`);
      
      // Buscar por slug (case-insensitive)
      const servicioEncontrado = serviciosList.find(
        (s: Servicio) => s.slug?.toLowerCase() === slug.toLowerCase()
      );
      
      if (!servicioEncontrado) {
        console.error('❌ Servicio no encontrado:', slug);
        setError(`Servicio "${slug}" no encontrado`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Servicio encontrado:', servicioEncontrado.nombre);
      setServicio(servicioEncontrado);
      
      // ← Ahora sí podemos llamar a loadRelatedServices
      await loadRelatedServices(servicioEncontrado.categoria, servicioEncontrado.slug);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Error al cargar el servicio');
      setLoading(false);
    }
  }
  
  loadData();
}, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !servicio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Servicio no encontrado'}</p>
          <Link 
            href="/servicios" 
            className="text-blue-600 hover:underline inline-flex items-center gap-2"
          >
            ← Volver a servicios
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = api.getImageUrl(servicio.imagen, servicio.imagen_url);

  const formatPrice = () => {
    const min = parseInt(servicio.precio_min).toLocaleString();
    if (servicio.precio_max && servicio.precio_max !== servicio.precio_min) {
      const max = parseInt(servicio.precio_max).toLocaleString();
      return { min, max, isRange: true };
    }
    return { min, max: null, isRange: false };
  };

  const price = formatPrice();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Image */}
      <section className="relative h-80 md:h-96 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={servicio.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-black opacity-40" />
      </section>

      {/* Contenido Principal */}
      <section className="py-12 -mt-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
            {/* Badge Categoría */}
            <span className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              {servicio.categoria_nombre}
            </span>

            {/* Título */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {servicio.nombre}
            </h1>

            {/* Precio Destacado */}
            <div className="mb-6">
              {price.isRange ? (
                <p className="text-3xl font-bold text-green-600">
                  ${price.min} - ${price.max}
                </p>
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  ${price.min}
                </p>
              )}
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-6 border-b">
              {servicio.duracion && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <p className="text-xs text-gray-500">Duración</p>
                    <p className="font-semibold text-sm">{servicio.duracion}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-xl">💆</span>
                <div>
                  <p className="text-xs text-gray-500">Sesiones</p>
                  <p className="font-semibold text-sm">{servicio.sesiones_incluidas} incluida(s)</p>
                </div>
              </div>

              {servicio.es_medico && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨‍⚕️</span>
                  <div>
                    <p className="text-xs text-gray-500">Profesional</p>
                    <p className="font-semibold text-sm">Dra. Marta Marzán</p>
                  </div>
                </div>
              )}

              {servicio.destacado && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className="font-semibold text-sm text-yellow-600">Destacado</p>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Descripción</h2>
              <p className="text-gray-700 leading-relaxed">
                {servicio.descripcion || servicio.descripcion_corta}
              </p>
            </div>

            {/* Características */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Características</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {servicio.disponible_salon && (
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700 text-sm">Disponible en Salón</span>
                  </div>
                )}
                
                {servicio.disponible_domicilio && (
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <span className="text-blue-600">✓</span>
                    <span className="text-gray-700 text-sm">
                      Disponible a Domicilio
                      {servicio.adicional_domicilio && parseInt(servicio.adicional_domicilio) > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (+${parseInt(servicio.adicional_domicilio).toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                
                {servicio.requiere_valoracion && (
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-gray-700 text-sm">Requiere Valoración Previa</span>
                  </div>
                )}
                
                {servicio.es_medico && (
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                    <span className="text-purple-600">👨‍⚕️</span>
                    <span className="text-gray-700 text-sm">Monitoreado por Médico</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/citas?servicio=${servicio.id}`}  // ← AGREGAR ?servicio={id}
                className="flex-1 text-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                📅 Reservar Cita
              </Link>
              
              <Link
                href="/servicios"
                className="flex-1 text-center px-6 py-3 bg-gray-100 text-gray-900 rounded-full font-semibold hover:bg-gray-200 transition-all duration-300"
              >
                ← Volver a Servicios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Relacionados */}
      {serviciosRelacionados.length > 0 && (
        <RelatedServices
          servicios={serviciosRelacionados}
          currentSlug={slug}
        />
      )}
    </div>
  );
}