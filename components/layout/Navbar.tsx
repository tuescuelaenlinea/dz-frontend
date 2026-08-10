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
  const [opinionModalOpen, setOpinionModalOpen] = useState(false);

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

  // ← ← ← Bloquear scroll del body cuando el modal está abierto ← ← ←
  useEffect(() => {
    if (opinionModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [opinionModalOpen]);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpinionModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/categorias', label: 'Servicios' },
    { href: '/blog-novias', label: 'Novias' },
    { href: '/galeria', label: 'Galería' },
    { href: '/experiencia', label: 'Tu Opinión', isOpinion: true }, // ← Marcador especial
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

  // ← ← ← HANDLER: Abrir modal o navegar directamente ← ← ←
  const handleNavClick = (link: typeof navLinks[0], e: React.MouseEvent) => {
    if (link.isOpinion) {
      e.preventDefault();
      setOpinionModalOpen(true);
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo + Slogan */}
            <div className="flex items-center space-x-3">
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
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(link, e)}
                  className={`transition-colors font-medium ${
                    link.isOpinion
                      ? 'text-[#C6A15B] hover:text-[#A9853D] border-b-2 border-[#C6A15B] pb-1'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {link.isOpinion && '✨ '}{link.label}
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
                  onClick={(e) => handleNavClick(link, e)}
                  className={`block py-2 transition-colors duration-200 ${
                    link.isOpinion
                      ? 'text-[#C6A15B] font-semibold'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {link.isOpinion && '✨ '}{link.label}
                </Link>
              ))}

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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ═══════════ MODAL: TU OPINIÓN (Valoración / Encuesta) ═════════ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {opinionModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setOpinionModalOpen(false)}
        >
          {/* ← Fondo oscuro con blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* ← Contenido del modal */}
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ← Encabezado del modal */}
            <div className="bg-[#0d0d0d] px-6 py-6 text-center relative">
              <button
                onClick={() => setOpinionModalOpen(false)}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <div className="text-[#C6A15B] text-3xl mb-2">✨</div>
              <h2 className="text-2xl font-bold text-[#C6A15B] tracking-widest">
                TU OPINIÓN IMPORTA
              </h2>
              <p className="text-gray-300 text-sm mt-1">
                Ayúdanos a mejorar eligiendo cómo quieres compartir tu experiencia
              </p>
            </div>

            {/* ← Cuerpo: dos tarjetas */}
            <div className="p-6 grid md:grid-cols-2 gap-4">
              {/* ═══ TARJETA 1: VALORACIÓN RÁPIDA (PQR / 5⭐) ═══ */}
              <Link
                href="/experiencia"
                onClick={() => setOpinionModalOpen(false)}
                className="group relative bg-gradient-to-br from-[#faf7ef] to-white border-2 border-[#e8e0cf] rounded-xl p-6 hover:border-[#C6A15B] hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Badge */}
                <span className="absolute top-3 right-3 bg-[#C6A15B] text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                  RÁPIDO
                </span>

                {/* Icono */}
                <div className="w-16 h-16 rounded-full bg-[#C6A15B] flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  ⭐
                </div>

                {/* Contenido */}
                <h3 className="text-lg font-bold text-gray-900 tracking-wide mb-2">
                  VALORACIÓN RÁPIDA
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Califícanos de 1 a 5 estrellas y cuéntanos tu experiencia.
                  Si todo salió bien, podrás dejarnos una reseña pública en Google o Tripadvisor.
                </p>

                {/* Características */}
                <ul className="space-y-1.5 text-xs text-gray-500 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>Calificación de 1 a 5 estrellas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>1-3 ⭐: Formulario PQR privado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>4-5 ⭐: Reseña en Google/Tripadvisor</span>
                  </li>
                </ul>

                {/* Botón */}
                <div className="flex items-center justify-between pt-3 border-t border-[#e8e0cf]">
                  <span className="text-xs text-gray-400">⏱️ 1 minuto</span>
                  <span className="text-[#C6A15B] font-semibold text-sm group-hover:translate-x-1 transition-transform">
                    Continuar →
                  </span>
                </div>
              </Link>

              {/* ═══ TARJETA 2: ENCUESTA DE SATISFACCIÓN ═══ */}
              <Link
                href="/encuesta"
                onClick={() => setOpinionModalOpen(false)}
                className="group relative bg-gradient-to-br from-[#faf7ef] to-white border-2 border-[#e8e0cf] rounded-xl p-6 hover:border-[#C6A15B] hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Badge */}
                <span className="absolute top-3 right-3 bg-[#0d0d0d] text-[#C6A15B] text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                  DETALLADO
                </span>

                {/* Icono */}
                <div className="w-16 h-16 rounded-full bg-[#0d0d0d] text-[#C6A15B] flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  📋
                </div>

                {/* Contenido */}
                <h3 className="text-lg font-bold text-gray-900 tracking-wide mb-2">
                  ENCUESTA DE SATISFACCIÓN
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Responde 12 preguntas Sí/No sobre tu experiencia completa.
                  Nos ayuda a mejorar cada detalle de nuestro servicio.
                </p>

                {/* Características */}
                <ul className="space-y-1.5 text-xs text-gray-500 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>12 preguntas Sí / No</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>Indica el servicio recibido</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C6A15B]">✓</span>
                    <span>Comentario opcional</span>
                  </li>
                </ul>

                {/* Botón */}
                <div className="flex items-center justify-between pt-3 border-t border-[#e8e0cf]">
                  <span className="text-xs text-gray-400">⏱️ 3 minutos</span>
                  <span className="text-[#C6A15B] font-semibold text-sm group-hover:translate-x-1 transition-transform">
                    Continuar →
                  </span>
                </div>
              </Link>
            </div>

            {/* ← Pie del modal */}
            <div className="bg-[#faf7ef] px-6 py-4 flex items-center justify-between border-t border-[#e8e0cf]">
              <p className="text-xs text-gray-500 italic">
                💛 Agradecemos sinceramente tu tiempo y confianza
              </p>
              <button
                onClick={() => setOpinionModalOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-700 font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ← ← ← Estilos para las animaciones del modal ← ← ← */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}