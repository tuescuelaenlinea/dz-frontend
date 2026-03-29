// components/layout/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-3xl">DZ</span>
              <span className="block text-sm font-normal text-gray-400">Dorian Zambrano Salón</span>
            </h3>
            <p className="text-gray-400 text-sm">
              Transformando tu belleza y bienestar con los mejores tratamientos estéticos y de spa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/servicios" className="text-gray-400 hover:text-white transition-colors">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-gray-400 hover:text-white transition-colors">
                  Categorías
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

          {/* Contact Info - Desde Brochure */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center space-x-2">
                <span>📱</span>
                <a href="tel:+573157072678" className="hover:text-white transition-colors">
                  +57 315 707 2678
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <span>📞</span>
                <a href="tel:+573157057982" className="hover:text-white transition-colors">
                  +57 315 705 7982
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <span>🌐</span>
                <span>www.dorianzambrano.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} DZ Salón - Dorian Zambrano. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}