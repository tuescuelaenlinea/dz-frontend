// app/categorias/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import CategoryGrid from '@/components/categories/CategoryGrid';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  activo: boolean;
  servicio_count?: number;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getCategorias();
        setCategorias(data.results || data);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar categorías');
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
      {/* Header */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestras Categorías
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Explora nuestra amplia gama de servicios organizados por categoría
          </p>
        </div>
      </section>

      {/* Grid de Categorías */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categorias.length > 0 ? (
            <CategoryGrid categorias={categorias} />
          ) : (
            <p className="text-center text-gray-600 text-lg">
              No hay categorías disponibles
            </p>
          )}
        </div>
      </section>
    </div>
  );
}