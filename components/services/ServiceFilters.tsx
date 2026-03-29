// components/services/ServiceFilters.tsx
'use client';

interface ServiceFiltersProps {
  categorias: any[];
  filters: {
    categoria: string;
    precioMax: number;
    disponibleSalon: boolean;
    disponibleDomicilio: boolean;
    orden: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function ServiceFilters({
  categorias,
  filters,
  onFilterChange,
}: ServiceFiltersProps) {
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, categoria: e.target.value });
  };

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, precioMax: Number(e.target.value) });
  };

  const handleOrdenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, orden: e.target.value });
  };

  const toggleSalon = () => {
    onFilterChange({ ...filters, disponibleSalon: !filters.disponibleSalon });
  };

  const toggleDomicilio = () => {
    onFilterChange({ ...filters, disponibleDomicilio: !filters.disponibleDomicilio });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 sticky top-20 z-40">
      <div className="flex flex-wrap items-center gap-4">
        {/* Categoría */}
        <select
          value={filters.categoria}
          onChange={handleCategoriaChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>

        {/* Precio Máximo */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Precio máx:</span>
          <input
            type="range"
            min="0"
            max="3000000"
            step="100000"
            value={filters.precioMax}
            onChange={handlePrecioChange}
            className="w-32"
          />
          <span className="text-sm font-semibold text-gray-700">
            ${(filters.precioMax / 1000).toFixed(0)}K
          </span>
        </div>

        {/* Disponibilidad */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.disponibleSalon}
              onChange={toggleSalon}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">🏠 Salón</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.disponibleDomicilio}
              onChange={toggleDomicilio}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">🚗 Domicilio</span>
          </label>
        </div>

        {/* Ordenar */}
        <select
          value={filters.orden}
          onChange={handleOrdenChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="nombre">Ordenar por nombre</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="destacado">Destacados primero</option>
        </select>
      </div>
    </div>
  );
}