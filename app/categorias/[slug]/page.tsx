// app/categorias/[slug]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  const slug = params.slug as string;

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function loadData() {
    try {
      console.log('🔍 Buscando categoría con slug:', slug);
      
      // 1. Cargar TODAS las categorías
      const catData = await api.getCategorias();
      const categorias = catData.results || catData;
      
      console.log('📂 Categorías cargadas:', categorias.length);
      
      // 2. Buscar la categoría por slug
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
      
      // 3. Cargar TODOS los servicios (sin paginación)
      const allServicios = await api.getAllServicios();
      
      console.log('🛍️ Total de servicios cargados:', allServicios.length);
      
      // 4. Filtrar servicios por categoría
      const serviciosFiltrados = allServicios.filter(
        (s: Servicio) => s.categoria === categoriaEncontrada.id && s.disponible !== false
      );
      
      console.log(`✅ Servicios de "${categoriaEncontrada.nombre}":`, serviciosFiltrados.length);
      console.log('Servicios:', serviciosFiltrados.map(s => s.nombre));
      
      setServicios(serviciosFiltrados);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Error al cargar la categoría');
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

  if (error || !categoria) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Categoría no encontrada'}</p>
          <a href="/categorias" className="text-blue-600 hover:underline">
            ← Volver a categorías
          </a>
        </div>
      </div>
    );
  }

  const imageUrl = api.getImageUrl(categoria.imagen, categoria.imagen_url);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con imagen de categoría */}
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

      {/* Servicios de la categoría */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Servicios ({servicios.length})
          </h2>
          
          {servicios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicios.map((servicio) => (
                <ServiceCard key={servicio.id} {...servicio} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl">
              <p className="text-gray-600 text-lg mb-4">
                No hay servicios disponibles en esta categoría
              </p>
              <a href="/servicios" className="text-blue-600 hover:underline">
                Ver todos los servicios →
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}