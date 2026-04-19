'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import UserMenu from '@/components/auth/UserMenu';
interface Configuracion {
  logo_url: string | null;
  nombre_salon: string;
  slogan: string;
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);

  const API_DOMAIN = 'https://api.dzsalon.com';

  useEffect(() => {
    api.getConfiguracion()
      .then(data => {
        const config = data.results && data.results.length > 0 
          ? data.results[0] 
          : data;
        setConfiguracion(config);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando configuración:', err);
        setLoading(false);
      });
  }, []);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    //{ href: '/servicios', label: 'Servicios' },
    { href: '/categorias', label: 'Servicios' },
    { href: '/galeria', label: 'Galería' },
    { href: '/contacto', label: 'Contacto' },
  ];

  const getLogoUrl = () => {
    if (configuracion?.logo_url) {
      if (configuracion.logo_url.startsWith('http')) {
        return configuracion.logo_url;
      }
      return `${API_DOMAIN}${configuracion.logo_url.startsWith('/') ? configuracion.logo_url : '/' + configuracion.logo_url}`;
    }
    return null;
  };

  const logoUrl = getLogoUrl();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo + Slogan */}
          <div className="flex items-center space-x-3">
            {/* ← CAMBIO: href="/" → href="/admin" */}
            <Link href="/admin" className="flex items-center space-x-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={configuracion?.nombre_salon || 'DZ Salón'}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="text-2xl font-bold text-gray-900">
                  <span className="text-3xl">DZ</span>
                </div>
              )}
              {/* Slogan */}
              <div className="hidden sm:block">
                <span className="text-lg font-medium text-gray-700">
                  {configuracion?.slogan || 'Peluquería y Spa'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
         <div className="hidden md:flex items-center space-x-8">
  {navLinks.map((link) => (
    <Link key={link.href} href={link.href} className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
      {link.label}
    </Link>
  ))}
  <UserMenu />
</div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

                {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Botones de auth */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                🔐 Iniciar Sesión
              </Link>
              
              <Link
                href="/auth/register"
                className="block w-full text-center py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                📝 Registrarse
              </Link>
            </div>
            
            <Link
              href="/citas"
              className="block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reservar Cita
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}