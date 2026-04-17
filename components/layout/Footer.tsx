'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Configuracion {
  logo: string | null;
  logo_url: string | null;
  nombre_salon: string;
  slogan: string;
  telefono_1: string;
  telefono_2: string;
  email: string;
  web_url: string;
  // ← AGREGAR: Campos de redes sociales
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;      // ← Opcional, si lo usas
  youtube_url?: string | null;     // ← Opcional, si lo usas
  whatsapp?: string;                // ← Ya existe para teléfono
}

export default function Footer() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);

  // Constantes de API
  const API_DOMAIN = 'https://api.dzsalon.com';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

  // Función getImageUrl (igual que app/page.tsx)
  const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
    if (imagenUrl) {
      if (imagenUrl.startsWith('https://api.dzsalon.com')) return imagenUrl;
      if (imagenUrl.startsWith('/')) return `${API_DOMAIN}${imagenUrl}`;
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

  // Cargar configuración
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await api.getConfiguracion().catch(() => null);
        if (configData) {
          const config = configData.results?.[0] || configData;
          setConfiguracion(config);
        }
      } catch (err) {
        console.error('Error cargando configuración del footer:', err);
      }
    }
    loadConfig();
  }, []);

  // URL del logo
  const logoUrl = getImageUrl(
    configuracion?.logo ?? null,
    configuracion?.logo_url ?? null
  );

  // Datos con fallback
  const nombreSalon = configuracion?.nombre_salon || 'DZ Salón';
  const slogan = configuracion?.slogan || 'Transformando tu belleza y bienestar';
  const telefono1 = configuracion?.telefono_1 || '+57 315 707 2678';
  const telefono2 = configuracion?.telefono_2 || '+57 315 705 7982';
  const email = configuracion?.email || 'info@dorianzambrano.com';
  const webUrl = configuracion?.web_url || 'www.dorianzambrano.com';

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand con Logo */}
          <div>
            {/* Logo desde BD o fallback texto */}
            {logoUrl ? (
              <div className="mb-4">
                <img
                  src={logoUrl}
                  alt={nombreSalon}
                  className="h-16 w-auto object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // Si falla la imagen, mostrar texto como fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `
                        <h3 class="text-2xl font-bold">
                          <span class="text-3xl">DZ</span>
                          <span class="block text-sm font-normal text-gray-400">${nombreSalon}</span>
                        </h3>
                      `;
                    }
                  }}
                />
              </div>
            ) : (
              <h3 className="text-2xl font-bold mb-4">
                <span className="text-3xl">DZ</span>
                <span className="block text-sm font-normal text-gray-400">{nombreSalon}</span>
              </h3>
            )}
            
            <p className="text-gray-400 text-sm">
              {slogan}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              {/*<li>
                <Link href="/servicios" className="text-gray-400 hover:text-white transition-colors">
                  Servicios
                </Link>
              </li>*/}
              <li>
                <Link href="/categorias" className="text-gray-400 hover:text-white transition-colors">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="/galeria" className="text-gray-400 hover:text-white transition-colors">
                  Galería
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-gray-400 hover:text-white transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center space-x-3">
                <span className="text-lg">📱</span>
                <a href={`tel:${telefono1.replace(/\D/g, '')}`} className="hover:text-white transition-colors text-sm">
                  {telefono1}
                </a>
              </li>
              {telefono2 && (
                <li className="flex items-center space-x-3">
                  <span className="text-lg">📞</span>
                  <a href={`tel:${telefono2.replace(/\D/g, '')}`} className="hover:text-white transition-colors text-sm">
                    {telefono2}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center space-x-3">
                  <span className="text-lg">✉️</span>
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors text-sm">
                    {email}
                  </a>
                </li>
              )}
              <li className="flex items-center space-x-3">
                <span className="text-lg">🌐</span>
                <a href={webUrl.startsWith('http') ? webUrl : `https://${webUrl}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm">
                  {webUrl.replace('https://', '').replace('http://', '')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Redes Sociales Dinámicas */}
        <div className="flex gap-4 mt-8 pt-8 border-t border-gray-800">
          
          {/* Instagram */}
          {configuracion?.instagram_url && (
            <a
              href={configuracion.instagram_url.startsWith('http') 
                ? configuracion.instagram_url 
                : `https://${configuracion.instagram_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
              </svg>
            </a>
          )}
          
          {/* Facebook */}
          {configuracion?.facebook_url && (
            <a
              href={configuracion.facebook_url.startsWith('http') 
                ? configuracion.facebook_url 
                : `https://${configuracion.facebook_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          )}
          
          {/* TikTok (Opcional) */}
          {configuracion?.tiktok_url && (
            <a
              href={configuracion.tiktok_url.startsWith('http') 
                ? configuracion.tiktok_url 
                : `https://${configuracion.tiktok_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
              aria-label="TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
          )}
          
          {/* YouTube (Opcional) */}
          {configuracion?.youtube_url && (
            <a
              href={configuracion.youtube_url.startsWith('http') 
                ? configuracion.youtube_url 
                : `https://${configuracion.youtube_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              aria-label="YouTube"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          )}
          
          {/* WhatsApp (usando telefono_1 o campo dedicado) */}
          {(configuracion?.whatsapp || configuracion?.telefono_1) && (
            <a
              href={`https://wa.me/${(configuracion.whatsapp || configuracion.telefono_1).replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors"
              aria-label="WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}
          {/* Fallback si no hay ninguna red configurada */}
            {!configuracion?.instagram_url && 
             !configuracion?.facebook_url && 
             !configuracion?.tiktok_url && 
             !configuracion?.youtube_url && 
             !(configuracion?.whatsapp || configuracion?.telefono_1) && (
              <p className="text-gray-500 text-sm">
                📱 Síguenos en redes sociales (próximamente)
              </p>
            )}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} {nombreSalon}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}