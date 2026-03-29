// components/services/ServiceCard.tsx
'use client';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ServiceCardProps {
  id: number;
  nombre: string;
  slug: string;
  descripcion_corta: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
  destacado: boolean;
}

export default function ServiceCard({
  id,
  nombre,
  slug,
  descripcion_corta,
  precio_min,
  precio_max,
  duracion,
  categoria_nombre,
  imagen,
  imagen_url,
  destacado,
}: ServiceCardProps) {
  const imageUrl = api.getImageUrl(imagen, imagen_url);

  const formatPrice = () => {
    const min = parseInt(precio_min).toLocaleString();
    if (precio_max && precio_max !== precio_min) {
      const max = parseInt(precio_max).toLocaleString();
      return `$${min} - $${max}`;
    }
    return `$${min}`;
  };

  return (
    <Link
      href={`/servicios/${slug}`}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Imagen - Más pequeña */}
      <div className="relative h-40 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-5xl text-white">💆</span>
          </div>
        )}
        
        {/* Badge Destacado - Más pequeño */}
        {destacado && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold shadow-lg">
            ⭐
          </div>
        )}
        
        {/* Badge Categoría - Más pequeño */}
        <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs font-semibold">
          {categoria_nombre}
        </div>
      </div>

      {/* Contenido - Más compacto */}
      <div className="p-3">
        <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          {nombre}
        </h3>
        
        <p className="text-gray-600 text-xs mb-2 line-clamp-2 leading-relaxed">
          {descripcion_corta}
        </p>
        
        {/* Precio y Duración */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-green-600 font-bold text-sm">
            {formatPrice()}
          </span>
          
          {duracion && (
            <span className="text-gray-500 text-xs flex items-center">
              ⏱️ {duracion}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}