'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ← ← ← ESTADOS DEL SIDEBAR ← ← ←
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Desktop: colapsado por defecto
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false); // Móvil: cerrado por defecto
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }
    
    if (token && user) {
      setIsAuthenticated(true);
    } else {
      router.push('/admin/login');
    }
    
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-start bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/citas', label: ' Citas', icon: '📅' },
    { href: '/admin/clientes', label: ' Clientes', icon: '👥' },
    { href: '/admin/categorias', label: ' Categorías', icon: '📁' },
    { href: '/admin/servicios', label: ' Servicios', icon: '🛠️' },
    { href: '/admin/productos', label: ' Productos', icon: '📦' },
    { href: '/admin/horarios', label: ' Horarios', icon: '🕐' },
    { href: '/admin/profesionales', label: ' Profesionales', icon: '👨‍⚕️' },
    { href: '/admin/galeria', label: 'Galería', icon: '📸' },
    { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      
      {/* ← ← ← OVERLAY PARA MÓVIL ← ← ← */}
      {sidebarOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpenMobile(false)}
        />
      )}

      {/* ← ← ← SIDEBAR ← ← ← */}
      <aside className={`
        /* POSICIÓN Y Z-INDEX */
        fixed lg:static inset-y-0 left-0 z-50 group
        
        /* ESTILOS BASE */
        bg-gray-900 text-white flex flex-col
        
        /* ANCHO RESPONSIVE */
        w-64 lg:w-20
        
        /* TRANSICIÓN SUAVE */
        transition-all duration-300 ease-in-out
        
        /* MÓVIL: control de visibilidad */
        -translate-x-full lg:translate-x-0
        ${sidebarOpenMobile ? 'translate-x-0' : ''}
        
        /* DESKTOP: expandir con hover o estado */
        lg:hover:w-64
        ${!sidebarCollapsed ? 'lg:w-64' : ''}
      `}>
        
        {/* ← ← ← HEADER DEL SIDEBAR ← ← ← */}
        <div className="h-16 bg-gray-800 flex items-start justify-between px-3 border-b border-gray-700 flex-shrink-0">
          
          {/* Título */}
          <span className={`
            font-bold text-lg whitespace-nowrap
            /* Móvil: visible si sidebar abierto */
            ${sidebarOpenMobile ? 'block' : 'hidden'}
            /* Desktop: control por opacidad y hover */
            lg:block lg:transition-opacity lg:duration-300
            ${sidebarCollapsed
              ? 'lg:opacity-0 group-hover:lg:opacity-100'
              : 'lg:opacity-100'
            }
          `}>
            DZ Admin
          </span>
          
          {/* Botón colapsar (solo desktop) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-start justify-start w-8 h-8 rounded hover:bg-gray-700 transition-colors flex-shrink-0"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={() => setSidebarOpenMobile(false)}
            className="lg:hidden w-8 h-8 flex items-start justify-start rounded hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ← ← ← MENÚ DE NAVEGACIÓN ← ← ← */}
        {/* ← ← ← CORRECCIÓN: px-0 para eliminar padding lateral excesivo ← ← ← */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-0 lg:px-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-start gap-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors
                ${pathname === item.href ? 'bg-gray-800 text-white font-medium' : ''}
                /* ← ← ← CORRECCIÓN CLAVE: Padding lateral controlado ← ← ← */
                ${sidebarCollapsed 
                  ? 'lg:px-0 lg:justify-start'  // Colapsado: sin padding lateral, centrado
                  : 'lg:px-4 lg:justify-start'    // Expandido: padding normal, alineado izquierda
                }
                px-4 py-3  // Móvil: padding normal
              `}
              onClick={() => setSidebarOpenMobile(false)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {/* ← ← ← Icono con contenedor fijo para alineación perfecta ← ← ← */}
              <span className={`
                text-lg flex-shrink-0
                ${sidebarCollapsed ? 'lg:w-8 lg:flex lg:justify-center' : ''}
              `}>
                {item.icon}
              </span>
              
              {/* ← ← ← Texto con control de visibilidad ← ← ← */}
              <span className={`
                whitespace-nowrap font-medium
                /* Móvil: visible si sidebar abierto */
                ${sidebarOpenMobile ? 'block' : 'hidden'}
                /* Desktop: control por opacidad y hover */
                lg:block lg:transition-opacity lg:duration-300
                ${sidebarCollapsed
                  ? 'lg:opacity-0 group-hover:lg:opacity-100'
                  : 'lg:opacity-100'
                }
              `}>
                {item.label}
              </span>
            </Link>
          ))}
          {/* ← ← ← FOOTER: LOGOUT ← ← ← */}
        <div className="p-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={() => {
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_user');
              router.push('/admin/login');
            }}
            className={`
              w-full flex items-center gap-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors
              ${sidebarCollapsed 
                ? 'lg:px-0 lg:justify-center' 
                : 'lg:px-4 lg:justify-start'
              }
              px-4 py-3
            `}
            title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <span className={`
              text-lg flex-shrink-0
              ${sidebarCollapsed ? 'lg:w-8 lg:flex lg:justify-center' : ''}
            `}>
              🚪
            </span>
            <span className={`
              whitespace-nowrap font-medium
              ${sidebarOpenMobile ? 'block' : 'hidden'}
              lg:block lg:transition-opacity lg:duration-300
              ${sidebarCollapsed
                ? 'lg:opacity-0 group-hover:lg:opacity-100'
                : 'lg:opacity-100'
              }
            `}>
              Cerrar Sesión
            </span>
          </button>
        </div>
        </nav>

        
      </aside>

      {/* ← ← ← CONTENIDO PRINCIPAL ← ← ← */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ← ← ← HEADER MÓVIL ← ← ← */}
        <header className="bg-white shadow-sm sticky top-0 z-30 flex-shrink-0 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpenMobile(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none p-2 -ml-2"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <h1 className="text-lg font-semibold text-gray-800">Panel Administrativo</h1>
            
            <div className="w-10"></div>
          </div>
        </header>

        {/* ← ← ← ÁREA DE CONTENIDO ← ← ← */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}