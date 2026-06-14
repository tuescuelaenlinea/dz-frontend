'use client';
// app/perfil/page.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PerfilData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  perfil: {
    telefono: string;
    fecha_nacimiento: string;
    genero: string;
    direccion: string;
    ciudad: string;
  };
  es_aliado: boolean;
  aliado_info: {
    empresa: string;
    descuento: number;
    convenio_id: number;
  } | null;
}

// ← ← ← NUEVO: Interfaz para errores por campo ← ← ←
interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  ciudad?: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // ← ← ← NUEVO: Estado para errores de validación por campo ← ← ←
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : null;

  // Estado del formulario
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    genero: '',
    direccion: '',
    ciudad: ''
  });

  // Cargar datos del perfil
  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    cargarPerfil();
  }, [token]);

  const cargarPerfil = async () => {
    try {
      const res = await fetch(`${apiUrl}/user/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Error cargando perfil');
      }
      
      const data = await res.json();
      setPerfil(data);
      
      // Inicializar formulario
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        telefono: data.perfil?.telefono || '',
        fecha_nacimiento: data.perfil?.fecha_nacimiento || '',
        genero: data.perfil?.genero || '',
        direccion: data.perfil?.direccion || '',
        ciudad: data.perfil?.ciudad || ''
      });
      
      // ← ← ← NUEVO: Limpiar errores al cargar ← ← ←
      setErrors({});
      setTouched({});
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  // ← ← ← NUEVO: Función de validación del formulario ← ← ←
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validar nombre (requerido)
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    // Validar apellido (requerido)
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'El apellido debe tener al menos 2 caracteres';
    }
    
    // Validar email (requerido + formato)
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un email válido';
    }
    
    // Validar teléfono (requerido + formato básico)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    } else {
      // Extraer solo dígitos
      const soloDigitos = formData.telefono.replace(/\D/g, '');
      if (soloDigitos.length < 7) {
        newErrors.telefono = 'El teléfono debe tener al menos 7 dígitos';
      }
    }
    
    // Validar fecha de nacimiento (opcional pero si se ingresa, debe ser válida)
    if (formData.fecha_nacimiento) {
      const fechaNac = new Date(formData.fecha_nacimiento);
      const hoy = new Date();
      if (fechaNac > hoy) {
        newErrors.fecha_nacimiento = 'La fecha no puede ser futura';
      }
      // Validar que no sea mayor de 120 años
      const maxAge = new Date();
      maxAge.setFullYear(hoy.getFullYear() - 120);
      if (fechaNac < maxAge) {
        newErrors.fecha_nacimiento = 'Fecha de nacimiento inválida';
      }
    }
    
    setErrors(newErrors);
    
    // Marcar todos los campos como "touched" para mostrar errores
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);
    
    // Retornar true si NO hay errores
    return Object.keys(newErrors).length === 0;
  };

  // ← ← ← NUEVO: Validar un campo individual (al salir del input) ← ← ←
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'first_name':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return undefined;
      case 'last_name':
        if (!value.trim()) return 'El apellido es requerido';
        if (value.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres';
        return undefined;
      case 'email':
        if (!value.trim()) return 'El email es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un email válido';
        return undefined;
      case 'telefono':
        if (!value.trim()) return 'El teléfono es requerido';
        const soloDigitos = value.replace(/\D/g, '');
        if (soloDigitos.length < 7) return 'El teléfono debe tener al menos 7 dígitos';
        return undefined;
      case 'fecha_nacimiento':
        if (value) {
          const fechaNac = new Date(value);
          const hoy = new Date();
          if (fechaNac > hoy) return 'La fecha no puede ser futura';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  // ← ← ← NUEVO: Manejar blur (cuando el usuario sale del campo) ← ← ←
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const fieldError = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const handleGuardar = async () => {
    // ← ← ← CAMBIO: Validar antes de enviar ← ← ←
    if (!validateForm()) {
      setError('Por favor corrige los errores antes de guardar');
      // Scroll al primer error
      const firstErrorField = document.querySelector('.border-red-500');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${apiUrl}/perfil/actualizar/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.detail || 'Error al guardar');
      }
      
      const data = await res.json();
      setPerfil(data);
      setEditMode(false);
      setErrors({});
      setTouched({});
      setSuccess('Perfil actualizado exitosamente');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // ← ← ← NUEVO: Validar en tiempo real si el campo ya fue tocado ← ← ←
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: fieldError
      }));
    }
  };

  // ← ← ← NUEVO: Verificar si hay errores para deshabilitar botón ← ← ←
  const hasErrors = Object.values(errors).some(error => error !== undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error al cargar el perfil</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  // ← ← ← NUEVO: Componente auxiliar para mostrar error de campo ← ← ←
  const FieldError = ({ fieldName }: { fieldName: keyof FormErrors }) => {
    if (!touched[fieldName] || !errors[fieldName]) return null;
    return (
      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {errors[fieldName]}
      </p>
    );
  };

  // ← ← ← NUEVO: Función para obtener clases del input según validación ← ← ←
  const getInputClasses = (fieldName: keyof FormErrors) => {
    const baseClasses = "w-full px-3 py-2 bg-gray-900 border rounded-lg text-white focus:outline-none transition-colors";
    
    if (touched[fieldName] && errors[fieldName]) {
      return `${baseClasses} border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500`;
    }
    if (touched[fieldName] && !errors[fieldName] && formData[fieldName]) {
      return `${baseClasses} border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500`;
    }
    return `${baseClasses} border-gray-600 focus:border-blue-500`;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-gray-400">Gestiona tu información personal</p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-300 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {/* Card principal */}
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header del card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold text-white">
                {perfil.first_name?.charAt(0).toUpperCase() || perfil.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {perfil.first_name} {perfil.last_name}
                </h2>
                <p className="text-blue-100">@{perfil.username}</p>
                <p className="text-blue-200 text-sm mt-1">
                  Miembro desde {new Date(perfil.date_joined).toLocaleDateString('es-CO')}
                </p>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
            </div>
          </div>

         {/* ← ← ← BADGE DE ALIADO ← ← ← */}
{perfil.es_aliado && perfil.aliado_info && (
  <div className="rounded-xl p-6 border-2 bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-700 mx-6 mt-6">
    <div className="flex items-start gap-4">
      {/* Icono */}
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-700/50">
        <svg className="w-6 h-6 text-green-300" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      
      {/* Contenido */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-green-300">
            🏆 Cliente Aliado
          </h3>
          <span className="px-2 py-0.5 bg-green-700/50 text-green-300 text-xs font-semibold rounded-full">
            ACTIVO
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Empresa:</span>
            <span className="text-white font-medium">{perfil.aliado_info.empresa}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Descuento:</span>
            <span className="font-bold text-green-400">
              {perfil.aliado_info.descuento}% en servicios
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

          {/* Contenido */}
          <div className="p-6">
            {!editMode ? (
              // Modo visualización
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Información Personal
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Nombre completo</p>
                      <p className="text-white">{perfil.first_name} {perfil.last_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white">{perfil.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Teléfono</p>
                      <p className="text-white">{perfil.perfil?.telefono || 'No especificado'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l9-4.5M9 20V7m0 13l9-4.5M9 7l9 4.5M9 7l3-1.5M12 7l3 1.5M12 7v13" />
                    </svg>
                    Información Adicional
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Fecha de nacimiento</p>
                      <p className="text-white">
                        {perfil.perfil?.fecha_nacimiento 
                          ? new Date(perfil.perfil.fecha_nacimiento).toLocaleDateString('es-CO')
                          : 'No especificada'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Género</p>
                      <p className="text-white">
                        {perfil.perfil?.genero === 'M' ? 'Masculino' : 
                         perfil.perfil?.genero === 'F' ? 'Femenino' : 
                         perfil.perfil?.genero === 'O' ? 'Otro' : 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Ciudad</p>
                      <p className="text-white">{perfil.perfil?.ciudad || 'No especificada'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Dirección</p>
                      <p className="text-white">{perfil.perfil?.direccion || 'No especificada'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Modo edición
              <div className="space-y-6">
                {/* ← ← ← NUEVO: Aviso de campos requeridos ← ← ← */}
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-blue-300 text-sm">
                    Los campos marcados con <span className="text-red-400 font-bold">*</span> son obligatorios
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Nombre <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Tu nombre"
                        className={getInputClasses('first_name')}
                      />
                      <FieldError fieldName="first_name" />
                    </div>
                    
                    {/* Apellido */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Apellido <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Tu apellido"
                        className={getInputClasses('last_name')}
                      />
                      <FieldError fieldName="last_name" />
                    </div>
                    
                    {/* Email */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="tu@email.com"
                        className={getInputClasses('email')}
                      />
                      <FieldError fieldName="email" />
                    </div>
                    
                    {/* Teléfono */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Teléfono <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="+57 300 123 4567"
                        className={getInputClasses('telefono')}
                      />
                      <FieldError fieldName="telefono" />
                    </div>
                    
                    {/* Fecha de nacimiento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Fecha de nacimiento
                      </label>
                      <input
                        type="date"
                        name="fecha_nacimiento"
                        value={formData.fecha_nacimiento}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClasses('fecha_nacimiento')}
                      />
                      <FieldError fieldName="fecha_nacimiento" />
                    </div>
                    
                    {/* Género */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Género</label>
                      <select
                        name="genero"
                        value={formData.genero}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClasses('genero')}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                      </select>
                      <FieldError fieldName="genero" />
                    </div>
                    
                    {/* Ciudad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad</label>
                      <input
                        type="text"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Tu ciudad"
                        className={getInputClasses('ciudad')}
                      />
                      <FieldError fieldName="ciudad" />
                    </div>
                    
                    {/* Dirección */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
                      <textarea
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows={2}
                        placeholder="Tu dirección completa"
                        className={`${getInputClasses('direccion')} resize-none`}
                      />
                      <FieldError fieldName="direccion" />
                    </div>
                  </div>
                </div>

                {/* ← ← ← NUEVO: Resumen de errores si existen ← ← ← */}
                {hasErrors && (
                  <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-300 font-medium">
                        Hay {Object.values(errors).filter(e => e).length} campo(s) con errores
                      </p>
                    </div>
                    <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                      {errors.first_name && <li>Nombre: {errors.first_name}</li>}
                      {errors.last_name && <li>Apellido: {errors.last_name}</li>}
                      {errors.email && <li>Email: {errors.email}</li>}
                      {errors.telefono && <li>Teléfono: {errors.telefono}</li>}
                      {errors.fecha_nacimiento && <li>Fecha nacimiento: {errors.fecha_nacimiento}</li>}
                    </ul>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setError('');
                      setErrors({});
                      setTouched({});
                      // Restaurar datos originales
                      if (perfil) {
                        setFormData({
                          first_name: perfil.first_name || '',
                          last_name: perfil.last_name || '',
                          email: perfil.email || '',
                          telefono: perfil.perfil?.telefono || '',
                          fecha_nacimiento: perfil.perfil?.fecha_nacimiento || '',
                          genero: perfil.perfil?.genero || '',
                          direccion: perfil.perfil?.direccion || '',
                          ciudad: perfil.perfil?.ciudad || ''
                        });
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={saving || hasErrors}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      saving || hasErrors
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : hasErrors ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Corrige los errores
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Guardar cambios
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Inicio</p>
                <p className="text-gray-400 text-sm">Volver al inicio</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('admin_token');
              router.push('/auth/login');
            }}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Cerrar sesión</p>
                <p className="text-gray-400 text-sm">Salir de tu cuenta</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/contacto')}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Ayuda</p>
                <p className="text-gray-400 text-sm">Soporte y preguntas</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}