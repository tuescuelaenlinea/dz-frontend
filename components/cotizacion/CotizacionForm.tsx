'use client';
// components/cotizacion/CotizacionForm.tsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Servicio {
  id: number;
  nombre: string;
  categoria_nombre: string;
  imagen_url: string | null;
  categoria?: number | string | null;
}

interface Categoria {
  id: number;
  nombre: string;
}

// Agregar esta interfaz para las props
interface CotizacionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CotizacionForm({ onSuccess, onCancel }: CotizacionFormProps) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    whatsapp: '',
    correo_electronico: '',
    servicios_interes: '',
    fecha_aproximada: '',
    presupuesto_aproximado: '',
    detalles_adicionales: '',
  });
  
  const [fotoReferencia, setFotoReferencia] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  
  const [modalServiciosOpen, setModalServiciosOpen] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<Servicio[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [loadingServicios, setLoadingServicios] = useState(false);

  useEffect(() => {
    if (modalServiciosOpen) {
      cargarServiciosYcategorias();
    }
  }, [modalServiciosOpen]);

  const cargarServiciosYcategorias = async () => {
    setLoadingServicios(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
      
      const [serviciosRes, categoriasData] = await Promise.all([
        fetch(`${apiUrl}/servicios/?disponible=true`),
        api.getCategorias(),
      ]);
      
      if (!serviciosRes.ok) throw new Error('Error al cargar servicios');
      
      const serviciosData = await serviciosRes.json();
      
      setServiciosDisponibles(serviciosData.results || serviciosData);
      setCategorias(categoriasData.results || categoriasData);
    } catch (err) {
      setError('Error al cargar los servicios disponibles');
    } finally {
      setLoadingServicios(false);
    }
  };

  const serviciosFiltrados = serviciosDisponibles.filter((servicio) => {
    const coincideCategoria = !filtroCategoria || servicio.categoria?.toString() === filtroCategoria;
    const coincideBusqueda = !busqueda || 
      servicio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      servicio.categoria_nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

  const toggleServicio = (servicio: Servicio) => {
    setServiciosSeleccionados(prev => {
      const existe = prev.find(s => s.id === servicio.id);
      if (existe) {
        return prev.filter(s => s.id !== servicio.id);
      } else {
        return [...prev, servicio];
      }
    });
  };

  const confirmarServicios = () => {
    const nombresServicios = serviciosSeleccionados.map(s => s.nombre).join(', ');
    setFormData(prev => ({
      ...prev,
      servicios_interes: nombresServicios
    }));
    setModalServiciosOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes (JPG, PNG)');
        return;
      }
      
      setFotoReferencia(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewFoto(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key as keyof typeof formData]);
      });
      
      if (fotoReferencia) {
        formDataToSend.append('foto_referencia', fotoReferencia);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cotizaciones/`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar la cotización');
      }

      setSuccess(true);
      setFormData({
        nombre_completo: '',
        whatsapp: '',
        correo_electronico: '',
        servicios_interes: '',
        fecha_aproximada: '',
        presupuesto_aproximado: '',
        detalles_adicionales: '',
      });
      setServiciosSeleccionados([]);
      setFotoReferencia(null);
      setPreviewFoto(null);
      
    } catch (err: any) {
      setError(err.message || 'Error al enviar la cotización');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">¡Cotización Enviada!</h2>
          <p className="text-gray-300 text-sm mb-4">Nos pondremos en contacto contigo muy pronto.</p>
          <button
            onClick={() => setSuccess(false)}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Nueva Cotización
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full relative">
      {/* Botón de cerrar sutil */}
      <button
        onClick={() => onCancel?.()}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Cerrar formulario"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header compacto */}
      <div className="mb-5 pr-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-1">Formulario de Cotización</h2>
        <p className="text-gray-400 text-sm">Diligencia tus datos y nos pondremos en contacto contigo</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-3 py-2 rounded-lg text-xs mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre completo */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500 transition-all"
              placeholder="Tu nombre"
            />
          </div>
        </div>

        {/* WhatsApp y Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              WhatsApp <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500 transition-all"
                placeholder="+57 300 123 4567"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Correo electrónico <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                name="correo_electronico"
                value={formData.correo_electronico}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500 transition-all"
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Servicio de interés */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Servicio de interés <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={() => setModalServiciosOpen(true)}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 hover:border-amber-500/50 transition-all text-left flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              <span className={`text-sm ${formData.servicios_interes ? 'text-white' : 'text-gray-500'}`}>
                {formData.servicios_interes || 'Selecciona un servicio'}
              </span>
            </div>
            <svg className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {serviciosSeleccionados.length > 0 && (
            <p className="text-xs text-amber-400 mt-1">
              {serviciosSeleccionados.length} servicio(s) seleccionado(s)
            </p>
          )}
        </div>

        {/* Fecha y Presupuesto */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Fecha aproximada <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="fecha_aproximada"
                value={formData.fecha_aproximada}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Presupuesto aproximado
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type="number"
                name="presupuesto_aproximado"
                value={formData.presupuesto_aproximado}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500 transition-all"
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        {/* Detalles adicionales */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Cuéntanos más sobre lo que necesitas <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-2.5 left-3">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <textarea
              name="detalles_adicionales"
              value={formData.detalles_adicionales}
              onChange={handleChange}
              required
              rows={3}
              className="w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500 resize-none transition-all"
              placeholder="Escribe aquí los detalles..."
            />
          </div>
        </div>

        {/* Foto de referencia */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Adjunta una foto de referencia <span className="text-gray-500">(opcional)</span>
          </label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-3 hover:border-amber-500/50 transition-colors bg-gray-800/30">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="foto-referencia"
            />
            <label htmlFor="foto-referencia" className="cursor-pointer flex items-center gap-3">
              {previewFoto ? (
                <div className="flex items-center gap-3 flex-1">
                  <img src={previewFoto} alt="Preview" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">Imagen seleccionada</p>
                    <p className="text-xs text-gray-500">Click para cambiar</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFotoReferencia(null);
                      setPreviewFoto(null);
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-gray-400">Seleccionar archivo</span>
                    <p className="text-xs text-gray-600">JPG, PNG (Máx. 5 MB)</p>
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Botón enviar */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              ENVIAR COTIZACIÓN
            </>
          )}
        </button>

        <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Tus datos están seguros con nosotros
        </p>
      </form>

      {/* Modal de Selección de Servicios */}
      {modalServiciosOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-amber-400">Selecciona servicios</h3>
              <button
                onClick={() => setModalServiciosOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Filtros */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar servicios..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm placeholder-gray-500"
                />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-white text-sm"
                >
                  <option value="">Todas</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              {serviciosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {serviciosSeleccionados.map(servicio => (
                    <span
                      key={servicio.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600/20 border border-amber-500/50 rounded text-xs text-amber-400"
                    >
                      {servicio.nombre}
                      <button onClick={() => toggleServicio(servicio)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de servicios CON IMÁGENES */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingServicios ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mx-auto"></div>
                </div>
              ) : serviciosFiltrados.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">No se encontraron servicios</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serviciosFiltrados.map(servicio => {
                    const isSelected = serviciosSeleccionados.find(s => s.id === servicio.id);
                    return (
                      <button
                        key={servicio.id}
                        onClick={() => toggleServicio(servicio)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {/* IMAGEN DEL SERVICIO */}
                          {servicio.imagen_url ? (
                            <img
                              src={servicio.imagen_url}
                              alt={servicio.nombre}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xl">💆</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">{servicio.nombre}</h4>
                            <p className="text-xs text-gray-400">{servicio.categoria_nombre}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => setModalServiciosOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarServicios}
                disabled={serviciosSeleccionados.length === 0}
                className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aceptar ({serviciosSeleccionados.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}