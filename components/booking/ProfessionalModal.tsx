'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Profesional {
  id: number;
  nombre: string;
  titulo: string;
  especialidad: string;
  foto: string | null;
  foto_url: string | null;
  activo: boolean;
}

interface ProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (profesional: Profesional) => void;
  servicioId?: number | null;
  profesionalSeleccionadoId?: number | null;
}

const API_DOMAIN = 'https://api.dzsalon.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

export default function ProfessionalModal({
  isOpen,
  onClose,
  onSelect,
  servicioId = null,
  profesionalSeleccionadoId = null
}: ProfessionalModalProps) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const firstCardRef = useRef<HTMLButtonElement>(null); // ← Referencia para la primera card

  const getImageUrl = (imagenPath: string | null, imagenUrl?: string | null): string | null => {
    if (imagenUrl) {
      if (imagenUrl.startsWith('https://api.dzsalon.com')) return imagenUrl;
      if (imagenUrl.startsWith('/')) return `${API_DOMAIN}${imagenUrl}`;
      if (imagenUrl.startsWith('http')) {
        return imagenUrl
          .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
          .replace(/https?:\/\/localhost/, API_DOMAIN)
          .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
      }
    }
    if (!imagenPath) return null;
    if (imagenPath.startsWith('http')) {
      return imagenPath
        .replace(/https?:\/\/127\.0\.0\.1/, API_DOMAIN)
        .replace(/https?:\/\/localhost/, API_DOMAIN)
        .replace(/https?:\/\/179\.43\.112\.64/, API_DOMAIN);
    }
    const imagePath = imagenPath.startsWith('/') ? imagenPath : `/${imagenPath}`;
    return `${API_DOMAIN}${imagePath}`;
  };

  useEffect(() => {
    if (isOpen) {
      console.log('🎯 [ProfessionalModal] Props recibidos:', {
        isOpen,
        servicioId,
        profesionalSeleccionadoId,
        apiUrl: API_URL
      });
    }
  }, [isOpen, servicioId, profesionalSeleccionadoId]);

  // ← ← ← NUEVO: Enfocar la primera card después de cargar (opcional, sin teclado)
  useEffect(() => {
    if (isOpen && !loading && profesionales.length > 0) {
      // Pequeño delay para asegurar que el DOM está renderizado
      setTimeout(() => {
        if (firstCardRef.current) {
          firstCardRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, loading, profesionales]);

  useEffect(() => {
    if (isOpen) {
      async function loadProfesionales() {
        console.log('🔍 [ProfessionalModal] Cargando profesionales...');
        setLoading(true);
        try {
          const token = localStorage.getItem('admin_token');
          
          const profsRes = await fetch(`${API_URL}/profesionales/?activo=true&ordering=orden,nombre`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          if (!profsRes.ok) {
            console.error('❌ Error cargando profesionales:', await profsRes.text());
            setLoading(false);
            return;
          }
          
          const profsData = await profsRes.json();
          let todosLosProfesionales = Array.isArray(profsData) ? profsData : (profsData.results || []);
          
          if (servicioId) {
            console.log(`🔗 Filtrando por servicio ID: ${servicioId}`);
            
            const relacionesRes = await fetch(`${API_URL}/servicios-profesionales/por_servicio/?servicio=${servicioId}&activo=true`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (relacionesRes.ok) {
              const relacionesData = await relacionesRes.json();
              const relaciones = Array.isArray(relacionesData) ? relacionesData : (relacionesData.results || []);
              
              console.log(`✅ [ProfessionalModal] Relaciones del servicio ${servicioId}:`, relaciones.length);
              
              const profesionalesIdsDelServicio = new Set(
                relaciones.map((r: any) => r.profesional).filter(Boolean)
              );
              
              const profesionalesFiltrados = todosLosProfesionales.filter(
                (p: Profesional) => profesionalesIdsDelServicio.has(p.id)
              );
              
              setProfesionales(profesionalesFiltrados);
            }
          } else {
            setProfesionales(todosLosProfesionales);
          }
          
        } catch (err) {
          console.error('❌ Error crítico:', err);
        } finally {
          setLoading(false);
        }
      }
      loadProfesionales();
    }
  }, [isOpen, servicioId]);

  const profesionalesFiltrados = profesionales.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.especialidad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (profesional: Profesional) => {
    console.log(`👤 [ProfessionalModal] Profesional seleccionado: ${profesional.nombre} (ID: ${profesional.id})`);
    onSelect(profesional);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border-2 border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <h3 className="text-base font-bold text-white">
            {servicioId ? '👨‍⚕️ Profesionales del Servicio' : '👨‍⚕️ Todos los Profesionales'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Buscador - SIN autoFocus */}
        <div className="p-3 border-b border-gray-700">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
            // ← ← ← QUITADO: autoFocus (para no abrir teclado en móviles)
          />
        </div>

        {/* Grid de Profesionales - Scrollable */}
        <div className="overflow-y-auto max-h-[60vh] p-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Cargando profesionales...</p>
            </div>
          ) : profesionalesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No se encontraron profesionales</p>
            </div>
          ) : (
            // ← ← ← CAMBIOS: Más columnas, gap más pequeño
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {profesionalesFiltrados.map((profesional, index) => {
                const fotoUrl = getImageUrl(profesional.foto, profesional.foto_url);
                const isSelected = profesional.id === profesionalSeleccionadoId;
                
                return (
                  <button
                    key={profesional.id}
                    ref={index === 0 ? firstCardRef : null} // ← ← ← Referencia a la primera card
                    onClick={() => handleSelect(profesional)}
                    tabIndex={0} // ← ← ← Permite enfocarse con tab
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? 'border-blue-500 ring-4 ring-blue-500/50'
                        : 'border-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {/* Foto o Icono */}
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt={profesional.nombre}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center bg-gray-700">
                                <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}

                    {/* Overlay con información - Más compacto */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <p className="text-white font-semibold text-[10px] sm:text-xs truncate leading-tight">
                          {profesional.titulo} {profesional.nombre}
                        </p>
                        <p className="text-gray-300 text-[9px] sm:text-[10px] truncate leading-tight">
                          {profesional.especialidad}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Badge de seleccionado */}
                    {isSelected && (
                      <div className="absolute top-1 left-1">
                        <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded">
                          ✓
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 text-center">
          <p className="text-[10px] text-gray-500">
            {profesionalesFiltrados.length} profesional{profesionalesFiltrados.length !== 1 ? 'es' : ''} encontrado{profesionalesFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}