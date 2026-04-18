'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';  
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

// ← Interface actualizada con campos _url (igual que app/page.tsx)
interface Configuracion {
  id: number;
  categorias_header_desktop: string | null;
  categorias_header_mobile: string | null;
  categorias_header_desktop_url: string | null;
  categorias_header_mobile_url: string | null;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar datos: categorías + configuración
  useEffect(() => {
    async function loadData() {
      try {
        const [catData, configData] = await Promise.all([
          api.getCategorias(),
          api.getConfiguracion().catch(() => null),
        ]);
        
        setCategorias(catData.results || catData);
        
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        setError('Error al cargar categorías');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ← URLs de header usando getImageUrl (igual que app/page.tsx)
  const headerDesktopImage = getImageUrl(
    configuracion?.categorias_header_desktop ?? null,
    configuracion?.categorias_header_desktop_url ?? null
  );
  
  const headerMobileImage = getImageUrl(
    configuracion?.categorias_header_mobile ?? null,
    configuracion?.categorias_header_mobile_url ?? null
  );

  // ← Fallbacks si no hay imagen en backend
  const headerImageUrl = isMobile
    ? (headerMobileImage || 'https://pagosapp.website/header_categorias_mobile.jpg')
    : (headerDesktopImage || 'https://pagosapp.website/header_categorias.jpg');

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
      
      {/* ========== HEADER REORGANIZADO ========== */}
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
        
        {/* SECCIÓN INFERIOR (20% - Fondo negro con textos) */}
        <div className="w-full h-20 bg-black flex items-center justify-center px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {/* Título */}
            <h3 className="text-lg md:text-2xl font-bold text-white text-center md:text-left drop-shadow-lg">
              Nuestras Categorías
            </h3>
            
            {/* Separador vertical en desktop */}
            <span className="hidden md:block w-px h-6 bg-white/30" />
            
            {/* Subtítulo */}
            <p className="text-xs md:text-base text-white/90 text-center md:text-left drop-shadow">
              Explora nuestra amplia gama de servicios organizados por categoría
            </p>
            
            {/* ← BOTÓN: Buscar Servicios (redirige a /servicios) */}
            <Link
              href="/servicios"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Buscar Servicios
            </Link>
          </div>
        </div>
        
      </div>
      {/* ========== FIN HEADER ========== */}

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