//components/categories/CategoryGrid.tsx
'use client';
import CategoryCard from './CategoryCard';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  icono: string;
  imagen: string | null;
  imagen_url: string | null;
  servicio_count?: number;
}

interface CategoryGridProps {
  categorias: Categoria[];
}

export default function CategoryGrid({ categorias }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categorias.map((categoria) => (
        <CategoryCard
          key={categoria.id}
          id={categoria.id}
          nombre={categoria.nombre}
          slug={categoria.slug}
          icono={categoria.icono}
          imagen={categoria.imagen}
          imagen_url={categoria.imagen_url}
          servicio_count={categoria.servicio_count}
        />
      ))}
    </div>
  );
}