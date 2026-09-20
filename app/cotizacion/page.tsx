// app/cotizacion/page.tsx
'use client';
import CotizacionForm from '@/components/cotizacion/CotizacionForm';
import { useState } from 'react';

export default function CotizacionPage() {
  const [imagenFondo, setImagenFondo] = useState('/images/fondo-cotizacion.jpg'); // ← ← ← AGREGA TU IMAGEN AQUÍ

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ← ← ← IMAGEN DE FONDO ← ← ← */}
      {/* Ubica tu imagen en: public/images/fondo-cotizacion.jpg */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${imagenFondo})`,
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