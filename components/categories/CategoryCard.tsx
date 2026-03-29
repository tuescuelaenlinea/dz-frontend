// components/categories/CategoryCard.tsx
'use client';
import Link from 'next/link';
import { api } from '@/lib/api';

interface CategoryCardProps {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  servicio_count?: number;
}

export default function CategoryCard({
  id,
  nombre,
  slug,
  icono,
  imagen,
  imagen_url,
  servicio_count = 0,
}: CategoryCardProps) {
  const imageUrl = api.getImageUrl(imagen, imagen_url);

  return (
    <Link
      href={`/categorias/${slug}`}
      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Imagen */}
      <div className="relative h-48 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-6xl text-white">💆</span>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {nombre}
        </h3>
        
        {servicio_count > 0 && (
          <p className="text-sm text-gray-500">
            {servicio_count} {servicio_count === 1 ? 'servicio' : 'servicios'}
          </p>
        )}
      </div>
    </Link>
  );
}