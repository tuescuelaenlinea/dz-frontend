// components/services/RelatedServices.tsx
'use client';
import ServiceCard from './ServiceCard';

interface Servicio {
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

interface RelatedServicesProps {
  servicios: Servicio[];
  currentSlug: string;
  titulo?: string;
}

export default function RelatedServices({
  servicios,
  currentSlug,
  titulo = 'Servicios Relacionados',
}: RelatedServicesProps) {
  const relacionados = servicios
    .filter((s) => s.slug !== currentSlug)
    .slice(0, 3);

  if (relacionados.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {titulo}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relacionados.map((servicio) => (
            <ServiceCard key={servicio.id} {...servicio} />
          ))}
        </div>
      </div>
    </section>
  );
}