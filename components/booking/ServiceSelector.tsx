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
        
        if (preSelectedService) {
          onServiceSelect(preSelectedService);
        }
      } catch (err) {
        console.error('Error cargando servicios:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredServices = servicios.filter((s) => {
    if (selectedCategoria && s.categoria.toString() !== selectedCategoria) return false;
    if (searchTerm && !s.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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
    return <div className="p-4 text-center text-gray-500">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Modo de atención */}
      <div className="flex gap-4 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          onClick={() => onModeChange('salon')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'salon'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          🏠 En Salón
        </button>
        <button
          type="button"
          onClick={() => onModeChange('domicilio')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'domicilio'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          🚗 A Domicilio
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={selectedCategoria}
          onChange={(e) => setSelectedCategoria(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
          ))}
        </select>
        
        <input
          type="text"
          placeholder="🔍 Buscar servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista de servicios */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredServices.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay servicios disponibles con estos filtros
          </p>
        ) : (
          filteredServices.map((servicio) => {
            const isSelected = selectedService === servicio.id;
            const imageUrl = api.getImageUrl(servicio.imagen, servicio.imagen_url);
            
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => onServiceSelect(isSelected ? null : servicio)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                {/* Imagen */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {imageUrl ? (
                    <img src={imageUrl} alt={servicio.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-2xl text-white">💆</span>
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{servicio.nombre}</h4>
                  <p className="text-sm text-gray-500">{servicio.categoria_nombre}</p>
                  {servicio.duracion && (
                    <p className="text-xs text-gray-400 mt-1">⏱️ {servicio.duracion}</p>
                  )}
                </div>
                
                {/* Precio */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600">{formatPrice(servicio)}</p>
                  {mode === 'domicilio' && servicio.adicional_domicilio && parseInt(servicio.adicional_domicilio) > 0 && (
                    <p className="text-xs text-gray-400">+${parseInt(servicio.adicional_domicilio).toLocaleString()} domicilio</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}