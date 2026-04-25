// components/booking/ServiceSelector.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Servicio {
  id: number;
  nombre: string;
  slug: string;
  precio_min: string;
  precio_max: string | null;
  duracion: string;
  categoria: number;
  categoria_nombre: string;
  imagen: string | null;
  imagen_url: string | null;
  disponible_salon: boolean;
  disponible_domicilio: boolean;
  adicional_domicilio?: string;
  disponible?: boolean;
}

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
}

interface ServiceSelectorProps {
  selectedService: number | null;
  onServiceSelect: (servicio: Servicio | null) => void;
  mode: 'salon' | 'domicilio';
  onModeChange: (mode: 'salon' | 'domicilio') => void;
  preSelectedService?: Servicio | null;
}

export default function ServiceSelector({
  selectedService,
  onServiceSelect,
  mode,
  onModeChange,
  preSelectedService,
}: ServiceSelectorProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function loadData() {
    try {
      const [catData, servData] = await Promise.all([
        api.getCategorias(),
        api.getAllServicios ? api.getAllServicios() : api.getServicios(),
      ]);
      
      setCategorias(catData.results || catData);
      
      const serviciosList = Array.isArray(servData) ? servData : (servData.results || servData);
      const serviciosFiltrados = serviciosList.filter((s: Servicio) => s.disponible !== false);
      setServicios(serviciosFiltrados);
      
      // ← VERIFICAR: Si hay pre-selección, validar que sea válida para los filtros actuales
      if (preSelectedService) {
        const servicioValido = serviciosFiltrados.find((s: Servicio) =>
    s.id === preSelectedService.id &&
    (mode === 'salon' ? s.disponible_salon : s.disponible_domicilio)
  );
        
        if (servicioValido) {
          onServiceSelect(preSelectedService);
        } else {
          onServiceSelect(null);  // ← Resetear si no es válido
          console.log('🔄 Pre-selección inválida, reseteada');
        }
      }
    } catch (err) {
      console.error('Error cargando servicios:', err);
    } finally {
      setLoading(false);
    }
  }
  loadData();
}, [mode]);  // ← Agregar mode como dependencia

  // ← NUEVO: Resetear servicio seleccionado al cambiar categoría
useEffect(() => {
  if (selectedService !== null && selectedCategoria) {
    // Verificar si el servicio seleccionado pertenece a la nueva categoría
    const servicioActual = servicios.find(s => s.id === selectedService);
    if (servicioActual && servicioActual.categoria?.toString() !== selectedCategoria) {
      onServiceSelect(null);  // ← Resetear selección
      console.log('🔄 Servicio reseteado por cambio de categoría');
    }
  }
}, [selectedCategoria, servicios]);

// ← NUEVO: Resetear servicio seleccionado al cambiar modo (salón/domicilio)
useEffect(() => {
  if (selectedService !== null) {
    const servicioActual = servicios.find(s => s.id === selectedService);
    if (servicioActual) {
      const esValidoParaModo = mode === 'salon' 
        ? servicioActual.disponible_salon 
        : servicioActual.disponible_domicilio;
      
      if (!esValidoParaModo) {
        onServiceSelect(null);  // ← Resetear selección
        console.log('🔄 Servicio reseteado por cambio de modo');
      }
    }
  }
}, [mode, servicios]);

  const filteredServices = servicios.filter((s) => {
    if (selectedCategoria && s.categoria?.toString() !== selectedCategoria) return false;
    if (searchTerm && !s.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (mode === 'salon' && !s.disponible_salon) return false;
    if (mode === 'domicilio' && !s.disponible_domicilio) return false;
    return true;
  });

  const formatPrice = (servicio: Servicio) => {
    const min = parseInt(servicio.precio_min).toLocaleString();
    if (servicio.precio_max && servicio.precio_max !== servicio.precio_min) {
      const max = parseInt(servicio.precio_max).toLocaleString();
      return `$${min} - $${max}`;
    }
    return `$${min}`;
  };

  if (loading) {
    return <div className="p-3 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  return (
    <div className="space-y-3">
      {/* ← Título 
      <h2 className="text-base font-bold text-gray-900">Selecciona tu servicio</h2>*/}

      {/* ← FILA ÚNICA: Categoría + Búsqueda + Modo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Filtro de categorías */}
        <select
          value={selectedCategoria}
          onChange={(e) => setSelectedCategoria(e.target.value)}
          className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
          ))}
        </select>
        
        {/* Búsqueda */}
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        
        {/* ← Botones de modo (Salón/Domicilio) */}
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => onModeChange('salon')}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
              mode === 'salon'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            title="Servicios en salón"
          >
            🏠 Salon
          </button>
          <button
            type="button"
            onClick={() => onModeChange('domicilio')}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${
              mode === 'domicilio'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            title="Servicios a domicilio"
          >
            🚗 Domicilio
          </button>
        </div>
      </div>

      {/* ← GRID DE CARDS - Altura reducida */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
        {filteredServices.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 text-xs py-4">
            No hay servicios disponibles
          </div>
        ) : (
          filteredServices.map((servicio) => {
            const isSelected = selectedService === servicio.id;
            const imageUrl = api.getImageUrl(servicio.imagen, servicio.imagen_url);
            
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => onServiceSelect(isSelected ? null : servicio)}
                className={`relative rounded-lg overflow-hidden text-left transition-all hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : 'ring-1 ring-gray-200'
                }`}
              >
                {/* Imagen */}
                <div className="relative h-24">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={servicio.nombre}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-3xl">💆</span>
                    </div>
                  )}
                  
                  {/* Overlay gradiente inferior */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                  
                  {/* Badge categoría */}
                  <div className="absolute top-1 right-1 z-10">
                    <span className="px-1.5 py-0.5 bg-blue-500/90 text-white text-[9px] font-bold rounded-full backdrop-blur-sm shadow-sm">
                      {servicio.categoria_nombre?.slice(0, 12)}{servicio.categoria_nombre?.length > 12 ? '...' : ''}
                    </span>
                  </div>
                  
                  {/* Check de selección */}
                  {isSelected && (
                    <div className="absolute top-1 left-1 z-10 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Info en parte inferior */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 z-10">
                    <h3 className="font-bold text-xs text-white line-clamp-1 mb-0.5 drop-shadow">
                      
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-green-400 drop-shadow">
                        {formatPrice(servicio)}
                      </span>
                      {servicio.duracion && (
                        <span className="text-[12px] text-gray-200 drop-shadow">
                          ⏱️ {servicio.duracion.replace(' minutos', 'm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tags adicionales compactos */}
                <div className="px-1.5 py-1 bg-white border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {mode === 'salon' && servicio.disponible_salon && (
                        <span className="px-1 py-0.5 bg-green-100 text-black-700 text-[12px] rounded font-medium">
                          🏠 {servicio.nombre}
                        </span>
                      )}
                      {mode === 'domicilio' && servicio.disponible_domicilio && (
                        <span className="px-1 py-0.5 bg-purple-100 text-black-700 text-[12px] rounded font-medium">
                          🚗 {servicio.nombre}
                        </span>
                      )}
                    </div>
                    {mode === 'domicilio' && servicio.adicional_domicilio && parseInt(servicio.adicional_domicilio) > 0 && (
                      <span className="text-[12px] text-orange-600 font-semibold">
                      Domicilio  ${parseInt(servicio.adicional_domicilio).toLocaleString()} 
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}