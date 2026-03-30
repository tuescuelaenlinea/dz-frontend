// components/WhatsAppButton.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('573001234567');
  const [isIOS, setIsIOS] = useState(false);

  // Detectar iOS al montar
  useEffect(() => {
    const detectIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(detectIOS);

    // Cargar número desde configuración
    async function loadConfig() {
      try {
        const configData = await api.getConfiguracion().catch(() => null);
        if (configData) {
          const config = configData.results?.[0] || configData;
          if (config.whatsapp) {
            // Limpiar número: eliminar TODO lo que no sea dígito
            const cleanNumber = config.whatsapp.replace(/\D/g, '');
            // Si no tiene código de país, agregar 57 (Colombia)
            const finalNumber = cleanNumber.startsWith('57') ? cleanNumber : `57${cleanNumber}`;
            setPhoneNumber(finalNumber);
          }
        }
      } catch (err) {
        console.error('Error cargando configuración de WhatsApp:', err);
      }
    }
    
    loadConfig();
  }, []);

  const defaultMessage = 'Hola DZ Salón, quiero información sobre sus servicios';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    
    // iOS: usar window.location para mejor compatibilidad
    if (isIOS) {
      window.location.href = url;
    } else {
      // Android/Desktop: usar window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center group"
        aria-label="Contactar por WhatsApp"
        style={{
          animation: 'bounce 2s infinite'
        }}
      >
        {/* Efecto de onda/ping */}
        <span 
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-75"
          style={{
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        ></span>
        
        {/* Ícono oficial de WhatsApp (SVG) */}
        <svg 
          className="w-8 h-8 relative z-10 fill-white" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl whitespace-nowrap text-sm font-medium z-50 animate-fade-in">
            ¡Escríbenos por WhatsApp!
            <div 
              className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900"
            ></div>
          </div>
        )}
      </button>

      {/* Animaciones personalizadas */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}