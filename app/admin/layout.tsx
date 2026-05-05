'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ← ← ← NUEVO: Estado para sidebar colapsado ← ← ←
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // ← ← ← ITEMS DEL MENÚ (para reutilizar) ← ← ←
  const menuItems = [
    { href: '/admin', label: '📊 Dashboard' },
    { href: '/admin/citas', label: '📅 Citas' },
    { href: '/admin/clientes', label: '👥 Clientes' },
    { href: '/admin/categorias', label: '📁 Categorías' },
    { href: '/admin/servicios', label: '🛠️ Servicios' },
    { href: '/admin/productos', label: '📦 Productos' },
    { href: '/admin/horarios', label: '🕐 Horarios' },
    { href: '/admin/profesionales', label: '👥 Profesionales' },
    { href: '/admin/galeria', label: '📸 Galería' },
    { href: '/admin/configuracion', label: '⚙️ Configuración' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex bg-repeat">
      
      {/* ← ← ← OVERLAY PARA MÓVIL ← ← ← */}
      {sidebarOpenMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpenMobile(false)}
        />
      )}

      {/* ← ← ← SIDEBAR COLAPSABLE ← ← ← */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 bg-gray-900 text-white 
        transition-all duration-300 ease-in-out z-30
        flex flex-col
        ${sidebarCollapsed ? 'w-12' : 'w-64'}
        ${sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* ← ← ← BOTÓN PARA EXPANDIR/COLAPSAR (SIEMPRE VISIBLE) ← ← ← */}
        <div className="h-16 bg-gray-800 flex items-center justify-center border-r border-gray-700 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full h-full flex items-center justify-center hover:bg-gray-700 transition-colors group"
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {/* ← ← ← LÍNEA VERTICAL CON TEXTO "MENÚ" ← ← ← */}
            <div className={`
              flex items-center justify-center text-xs font-semibold text-gray-300
              transition-all duration-300
              ${sidebarCollapsed ? 'rotate-90 whitespace-nowrap' : ''}
            `}>
              {sidebarCollapsed ? (
                <span className="writing-mode-vertical transform rotate-180 tracking-widest">
                  MENÚ
                </span>
              ) : (
                <span className="text-lg font-bold">DZ Admin</span>
              )}
            </div>
          </button>
        </div>

        {/* ← ← ← MENÚ DE NAVEGACIÓN (SOLO CUANDO EXPANDIDO) ← ← ← */}
        <nav className={`
          flex-1 overflow-y-auto px-2 py-4 space-y-1
          transition-opacity duration-200
          ${sidebarCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}
        `}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => {
                setSidebarOpenMobile(false);
                // Opcional: colapsar al seleccionar en móvil
                if (window.innerWidth < 1024) setSidebarCollapsed(true);
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ← ← ← LOGOUT (SOLO CUANDO EXPANDIDO) ← ← ← */}
        <div className={`
          p-4 border-t border-gray-800 flex-shrink-0
          transition-opacity duration-200
          ${sidebarCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}
        `}>
          <button
            onClick={() => {
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_user');
              router.push('/admin/login');
            }}
            className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ← ← ← CONTENIDO PRINCIPAL ← ← ← */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* ← ← ← HEADER MÓVIL ← ← ← */}
        <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpenMobile(true)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800">Panel Administrativo</h2>
            <div className="w-6"></div>
          </div>
        </header>

        {/* ← ← ← CONTENIDO SCROLLABLE ← ← ← */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}