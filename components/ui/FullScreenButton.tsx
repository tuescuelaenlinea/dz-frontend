// components/ui/FullScreenButton.tsx
'use client';

import { useState, useEffect } from 'react';

interface FullScreenButtonProps {
  // Elemento objetivo (por defecto document.documentElement = toda la página)
  targetElement?: HTMLElement | null;
  // Estilo del botón
  variant?: 'floating' | 'inline' | 'icon';
  // Posición del botón flotante
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  // Tamaño del botón
  size?: 'sm' | 'md' | 'lg';
  // Tooltip personalizado
  tooltipEnter?: string;
  tooltipExit?: string;
}

export default function FullScreenButton({
  targetElement = null,
  variant = 'floating',
  position = 'top-right',
  size = 'md',
  tooltipEnter = 'Pantalla completa',
  tooltipExit = 'Salir de pantalla completa',
}: FullScreenButtonProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Detectar si el navegador soporta pantalla completa
  useEffect(() => {
    const supported = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    // Verificar si la API está disponible
    const hasFullscreenAPI = !!(
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen ||
      (document.documentElement as any).mozRequestFullScreen ||
      (document.documentElement as any).msRequestFullscreen
    );
    
    setIsSupported(hasFullscreenAPI);
  }, []);

  // Escuchar cambios de estado de pantalla completa
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullScreen(isCurrentlyFullScreen);
    };

    // Agregar listeners para todos los navegadores
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, []);

  // Función para entrar/salir de pantalla completa
  const toggleFullScreen = async () => {
    try {
      const element = targetElement || document.documentElement;

      if (!isFullScreen) {
        // ENTRAR a pantalla completa
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          // Safari/Chrome
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          // Firefox
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          // IE/Edge
          await (element as any).msRequestFullscreen();
        }
      } else {
        // SALIR de pantalla completa
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('❌ Error al cambiar pantalla completa:', error);
      alert('No se pudo activar pantalla completa. Tu navegador puede haber bloqueado esta función.');
    }
  };

  // Atajo de teclado: F11 o Ctrl/Cmd + Shift + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 (solo en algunos navegadores)
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      }
      // Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleFullScreen();
      }
      // ESC para salir (el navegador lo hace automáticamente, pero sincronizamos estado)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Si no está soportado, no renderizar
  if (!isSupported) return null;

  // Tamaños
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Posiciones para variante flotante
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Tooltip
  const tooltip = isFullScreen ? tooltipExit : tooltipEnter;

  // Variante flotante (fijo en esquina)
  if (variant === 'floating') {
    return (
      <button
        onClick={toggleFullScreen}
        className={`
          fixed ${positionClasses[position]} z-[9999]
          ${sizeClasses[size]}
          bg-gray-900/80 hover:bg-gray-800 backdrop-blur-sm
          border border-gray-700 hover:border-purple-500
          rounded-lg shadow-lg
          flex items-center justify-center
          text-gray-300 hover:text-purple-400
          transition-all duration-200
          group
        `}
        title={tooltip}
        aria-label={tooltip}
      >
        {isFullScreen ? (
          // Ícono: Salir de pantalla completa
          <svg
            className={`${iconSize[size]} transition-transform group-hover:scale-110`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        ) : (
          // Ícono: Entrar a pantalla completa
          <svg
            className={`${iconSize[size]} transition-transform group-hover:scale-110`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        )}
      </button>
    );
  }

  // Variante inline (dentro de un contenedor)
  if (variant === 'inline') {
    return (
      <button
        onClick={toggleFullScreen}
        className={`
          ${sizeClasses[size]}
          bg-gray-800 hover:bg-gray-700
          border border-gray-600 hover:border-purple-500
          rounded-lg
          flex items-center justify-center
          text-gray-300 hover:text-purple-400
          transition-all duration-200
          group
        `}
        title={tooltip}
        aria-label={tooltip}
      >
        {isFullScreen ? (
          <svg
            className={`${iconSize[size]} transition-transform group-hover:scale-110`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        ) : (
          <svg
            className={`${iconSize[size]} transition-transform group-hover:scale-110`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        )}
      </button>
    );
  }

  // Variante solo ícono (minimalista)
  return (
    <button
      onClick={toggleFullScreen}
      className="text-gray-400 hover:text-purple-400 transition-colors"
      title={tooltip}
      aria-label={tooltip}
    >
      {isFullScreen ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
          />
        </svg>
      )}
    </button>
  );
}