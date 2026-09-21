// app/cotizacion/page.tsx
'use client';
import CotizacionForm from '@/components/cotizacion/CotizacionForm';
import { useState, useEffect } from 'react';

export default function CotizacionPage() {
  const [imagenFondoDesktop, setImagenFondoDesktop] = useState('/images/fondo-cotizacion-desktop.jpg');
  const [imagenFondoVertical, setImagenFondoVertical] = useState('/images/fondo-cotizacion-tablet-vertical.jpg');
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Función para detectar orientación
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // Verificar orientación inicial
    checkOrientation();

    // Escuchar cambios de orientación
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // ← ← ← MODO MÓVIL/PORTRAIT: Imagen de fondo vertical + formulario ← ← ←
  if (isPortrait) {
    return (
      <div className="relative min-h-screen bg-black">
        {/* IMAGEN DE FONDO VERTICAL */}
        <div 
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{ 
            backgroundImage: `url(${imagenFondoVertical})`,
          }}
        >
          {/* Overlay oscuro para mejorar contraste */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative z-10 min-h-screen flex items-center justify-end px-8 py-8">
          {/* Contenedor del formulario - Alineado a la derecha */}
          <div className="w-full max-w-md">
            <CotizacionForm />
          </div>
        </div>
      </div>
    );
  }

  // ← ← ← MODO DESKTOP/LANDSCAPE: Layout completo ← ← ←
  return (
    <div className="relative min-h-screen bg-black">
      {/* ← ← ← IMAGEN DE FONDO DESKTOP ← ← ← */}
      <div 
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${imagenFondoDesktop})`,
          backgroundSize: '100% auto',
        }}
      >
        {/* Overlay oscuro opcional para mejorar contraste */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 min-h-screen flex items-center justify-end px-8 lg:px-24 py-12">
        
        {/* Contenedor del formulario - Alineado a la derecha */}
        <div className="w-full max-w-2xl">
          <CotizacionForm />
        </div>

      </div>
    </div>
  );
}