// app/servicios/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceFilters from '@/components/services/ServiceFilters';
import ServiceSearch from '@/components/services/ServiceSearch';

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
  disponible_salon: boolean;
  disponible_domicilio: boolean;
}

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categoria: '',
    precioMax: 50000000,
    disponibleSalon: false,
    disponibleDomicilio: false,
    orden: 'nombre',
  });

    useEffect(() => {
    async function loadData() {
      try {
        // ✅ Usar getAllServicios() para cargar TODOS los servicios (paginación)
        const [servData, catData] = await Promise.all([
          api.getAllServicios ? api.getAllServicios() : api.getServicios(),
          api.getCategorias(),
        ]);
        
        // getAllServicios devuelve array directo, getServicios devuelve {results: []}
        const serviciosList = Array.isArray(servData) ? servData : (servData.results || servData);
        
        setServicios(serviciosList);
        setCategorias(catData.results || catData);
        setLoading(false);
      } catch (err) {
        console.error('Error detallado:', err);
        setError('Error al cargar servicios');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrar y ordenar servicios
const filteredServices = servicios
  .filter((s) => {
    // Búsqueda
    if (searchTerm && !s.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Categoría
    if (filters.categoria && s.categoria.toString() !== filters.categoria) {
      return false;
    }
    
    // Precio
    if (parseInt(s.precio_min) > filters.precioMax) {
      return false;
    }
    
    // ✅ Disponibilidad - Lógica corregida (OR en lugar de AND)
    if (filters.disponibleSalon || filters.disponibleDomicilio) {
      // Si al menos uno está activado, usar OR
      if (!s.disponible_salon && !s.disponible_domicilio) {
        return false;
      }
      // Si solo salón está activado
      if (filters.disponibleSalon && !filters.disponibleDomicilio && !s.disponible_salon) {
        return false;
      }
      // Si solo domicilio está activado
      if (!filters.disponibleSalon && filters.disponibleDomicilio && !s.disponible_domicilio) {
        return false;
      }
    }
    // Si ninguno está activado, mostrar todos
    
    return true;
  })
  .sort((a, b) => {
    switch (filters.orden) {
      case 'precio_asc':
        return parseInt(a.precio_min) - parseInt(b.precio_min);
      case 'precio_desc':
        return parseInt(b.precio_min) - parseInt(a.precio_min);
      case 'destacado':
        return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0);
      default:
        return a.nombre.localeCompare(b.nombre);
    }
  });

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
            Nuestros Servicios
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Descubre todos los tratamientos disponibles en DZ Salón
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Búsqueda */}
          <div className="mb-6">
            <ServiceSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          {/* Filtros */}
          <div className="mb-8">
            <ServiceFilters
              categorias={categorias}
              filters={filters}
              onFilterChange={setFilters}
            />
          </div>

          {/* Grid de Servicios */}
          {filteredServices.length > 0 ? (
            <>
              <p className="text-gray-600 mb-6">
                {filteredServices.length} servicios encontrados
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredServices.map((servicio) => (
                  <ServiceCard key={servicio.id} {...servicio} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg mb-4">
                No se encontraron servicios con los filtros seleccionados
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    categoria: '',
                    precioMax: 30000000,
                    disponibleSalon: true,
                    disponibleDomicilio: true,
                    orden: 'nombre',
                  });
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}