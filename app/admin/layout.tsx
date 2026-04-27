'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-100 flex bg-repeat" >
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white 
        transform transition-transform duration-300 ease-in-out z-30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        flex flex-col
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 bg-gray-800 px-4 flex-shrink-0">
          <h1 className="text-xl font-bold">DZ Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menú - Scrollable */}
        <nav className="flex-1 overflow-y-auto mt-8 px-4 space-y-2">
          <Link
            href="/admin"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            📊 Dashboard
          </Link>
          <Link
            href="/admin/citas"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            📅 Citas
          </Link>
           <Link
            href="/admin/clientes"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            👥 Clientes
          </Link>

          <Link
              href="/admin/categorias"
              className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              📁 Categorías
            </Link>
          <Link
            href="/admin/servicios"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            🛠️ Servicios
          </Link>          
          <Link
            href="/admin/productos"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            📦 Productos
          </Link>
          <Link
            href="/admin/horarios"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            🕐 Horarios
          </Link>
          <Link
            href="/admin/profesionales"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            👥 Profesionales
          </Link>
          <Link
            href="/admin/galeria"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            📸 Galería
          </Link>
          <Link
            href="/admin/configuracion"
            className="block px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            ⚙️ Configuración
          </Link>

          <div className="p-4 border-t border-gray-800 flex-shrink-0">
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
        </nav>

        {/* Logout - Fixed al fondo */}
        
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ← CAMBIO: Header solo visible en móvil (lg:hidden) */}
        <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <h2 className="text-lg font-semibold text-gray-800">
              Panel Administrativo
            </h2>

            <div className="w-6"></div> {/* Espaciador para balance */}
          </div>
        </header>

        {/* Contenido scrollable */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}