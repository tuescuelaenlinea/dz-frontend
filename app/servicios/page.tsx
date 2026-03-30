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

// ← Interface actualizada con campos _url (igual que app/page.tsx)
interface Configuracion {
  id: number;
  servicios_header_desktop: string | null;
  servicios_header_mobile: string | null;
  servicios_header_desktop_url: string | null;
  servicios_header_mobile_url: string | null;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categoria: '',
    precioMax: 50000000,
    disponibleSalon: false,
    disponibleDomicilio: false,
    orden: 'nombre',
  });

  // ← Constantes de API (igual que app/page.tsx)
  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  // ← Función getImageUrl (COPIADA de app/page.tsx)
  const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
    if (imagenUrl) {
      if (imagenUrl.startsWith('https://api.dzsalon.com')) {
        return imagenUrl;
      }
      if (imagenUrl.startsWith('/')) {
        return `${API_DOMAIN}${imagenUrl}`;
      }
      if (imagenUrl.startsWith('http')) {
        return imagenUrl
          .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
          .replace(/https?:\/\/localhost/, API_DOMAIN)
          .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
      }
    }
    
    if (!imagenPath) return null;
    
    if (imagenPath.startsWith('http')) {
      return imagenPath
        .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
        .replace(/https?:\/\/localhost/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
    }
    
    const imagePath = imagenPath.startsWith('/') ? imagenPath : `/${imagenPath}`;
    return `${API_DOMAIN}${imagePath}`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [servData, catData, configData] = await Promise.all([
          api.getAllServicios ? api.getAllServicios() : api.getServicios(),
          api.getCategorias(),
          api.getConfiguracion().catch(() => null),
        ]);
        
        const serviciosList = Array.isArray(servData) ? servData : (servData.results || servData);
        
        setServicios(serviciosList);
        setCategorias(catData.results || catData);
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error cargando servicios:', err);
        setError('Error al cargar servicios');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ← AGREGADO: Detectar si es móvil para cambiar imagen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ← URLs de header usando getImageUrl (igual que app/page.tsx)
  const headerDesktopImage = getImageUrl(
    configuracion?.servicios_header_desktop ?? null,
    configuracion?.servicios_header_desktop_url ?? null
  );
  
  const headerMobileImage = getImageUrl(
    configuracion?.servicios_header_mobile ?? null,
    configuracion?.servicios_header_mobile_url ?? null
  );

  // ← Fallbacks si no hay imagen en backend
  const headerImageUrl = isMobile
    ? (headerMobileImage || 'https://pagosapp.website/header_servicios_mobile.jpg')
    : (headerDesktopImage || 'https://pagosapp.website/header_servicios3.jpg?auto=format&fit=crop&w=1920&q=80');

  // Filtrar y ordenar servicios (SIN CAMBIOS)
  const filteredServices = servicios
    .filter((s) => {
      if (searchTerm && !s.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.categoria && s.categoria.toString() !== filters.categoria) {
        return false;
      }
      if (parseInt(s.precio_min) > filters.precioMax) {
        return false;
      }
      if (filters.disponibleSalon || filters.disponibleDomicilio) {
        if (!s.disponible_salon && !s.disponible_domicilio) {
          return false;
        }
        if (filters.disponibleSalon && !filters.disponibleDomicilio && !s.disponible_salon) {
          return false;
        }
        if (!filters.disponibleSalon && filters.disponibleDomicilio && !s.disponible_domicilio) {
          return false;
        }
      }
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
      {/* Header Reorganizado: Dos Secciones Verticales */}
      <div className="w-full" style={{ maxHeight: '400px' }}>
        
        {/* SECCIÓN SUPERIOR (80% - Imagen de fondo) */}
        <div 
          className="w-full"
          style={{
            height: '320px',
            backgroundImage: `url(${headerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        {/* SECCIÓN INFERIOR (20% - Fondo negro con textos) - SIN CAMBIOS */}
        <div className="w-full h-20 bg-black flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <h1 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              Nuestros Servicios
            </h1>
            <span className="hidden md:block w-px h-6 bg-white/30" />
            <p className="text-xs md:text-base text-white/90 text-center md:text-left drop-shadow">
              Descubre todos los tratamientos disponibles en DZ Salón
            </p>
          </div>
        </div>
        
      </div>

      {/* Contenido - SIN CAMBIOS */}
      <section className="py-16 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <ServiceSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          <div className="mb-8">
            <ServiceFilters
              categorias={categorias}
              filters={filters}
              onFilterChange={setFilters}
            />
          </div>

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