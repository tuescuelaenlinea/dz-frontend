// app\admin\galeria\page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import heic2any from 'heic2any';

interface GaleriaItem {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: number;  // ← ID de la categoría
  imagen_antes: string | null;
  imagen_antes_url: string | null;
  imagen_despues: string | null;
  imagen_despues_url: string | null;
  imagen: string | null;
  imagen_url: string | null;
  destacado: boolean;
  orden: number;
  activo: boolean;
  fecha?: string;
}

/**
 * Detecta si un archivo es HEIC/HEIF y lo convierte a JPEG si es necesario
 * @param file - Archivo original
 * @returns Promise<File> - Archivo convertido a JPEG o el original si no era HEIC
 */
const convertHeicToJpeg = async (file: File): Promise<File> => {
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  
  // ← Verificar si es realmente HEIC (por tipo MIME O extensión)
  const isHeicByType = heicTypes.includes(file.type);
  const isHeicByExt = file.name.toLowerCase().endsWith('.heic') || 
                      file.name.toLowerCase().endsWith('.heif');
  
  // ← Si NO es HEIC por tipo ni por extensión, retornar sin convertir
  if (!isHeicByType && !isHeicByExt) {
    console.log(`✅ Archivo no es HEIC, no requiere conversión: ${file.name} (${file.type})`);
    return file;
  }
  
  // ← Si es HEIC por extensión pero el tipo es JPEG/PNG, es un falso positivo
  if (isHeicByExt && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
    console.log(`⚠️ Archivo tiene extensión HEIC pero es ${file.type}, renombrando sin conversión: ${file.name}`);
    
    // Renombrar a .jpg sin convertir
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([file], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }
  
  // ← Si llegamos aquí, es probablemente un HEIC real, intentar convertir
  console.log(`🔄 Intentando convertir HEIC a JPEG: ${file.name}`);
  console.log(`   Tipo MIME: ${file.type}`);
  console.log(`   Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    // ← Intentar conversión con heic2any
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });
    
    // heic2any puede retornar Blob o Blob[]
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    
    if (!resultBlob || resultBlob.size === 0) {
      throw new Error('Resultado de conversión vacío');
    }
    
    // Crear nuevo File con nombre .jpg
    const originalName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const jpegFile = new File([resultBlob], originalName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    
    console.log(`✅ HEIC convertido exitosamente: ${file.name} → ${originalName}`);
    console.log(`   Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB → ${(jpegFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return jpegFile;
    
  } catch (err: any) {
    // ← MANEJO ESPECÍFICO del error "already browser readable"
    if (err.message && err.message.includes('already browser readable')) {
      console.log(`⚠️ ${err.message} - Renombrando sin conversión: ${file.name}`);
      
      // El archivo ya es legible, solo renombrar
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([file], newName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }
    
    // ← Otros errores de conversión
    console.error('❌ Error detallado convirtiendo HEIC:', {
      message: err.message,
      name: err.name,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      }
    });
    
    // ← FALLBACK: Retornar el archivo original renombrado
    console.warn(`⚠️ No se pudo convertir ${file.name}. Se usará el archivo original renombrado.`);
    
    const fallbackName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([file], fallbackName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }
};

// ← ← ← AGREGAR ESTA FUNCIÓN (fuera del componente) ← ← ←

/**
 * Comprime una imagen usando Canvas API
 * @param file - Archivo de imagen original
 * @param maxWidth - Ancho máximo en píxeles (default: 1920)
 * @param quality - Calidad JPEG 0.1-1.0 (default: 0.8)
 * @returns Promise<Blob> - Imagen comprimida como Blob
 */
const compressImage = async (
  file: File, 
  maxWidth: number = 1920, 
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    
    img.onload = () => {
      // Calcular dimensiones manteniendo aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      
      // Crear canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'));
        return;
      }
      
      // Dibujar imagen escalada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir a Blob JPEG comprimido
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`🗜️ Imagen comprimida: ${file.name}`);
            console.log(`   Original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Comprimida: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Reducción: ${((1 - blob.size / file.size) * 100).toFixed(1)}%`);
            resolve(blob);
          } else {
            reject(new Error('Error al comprimir imagen'));
          }
        },
        'image/jpeg',  // Forzar JPEG para mejor compresión
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Error al cargar imagen'));
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    
    reader.readAsDataURL(file);
  });
};

export default function AdminGaleriaPage() {
  const router = useRouter();
  const [galeria, setGaleria] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState<GaleriaItem | null>(null);
   // ← AGREGAR: Estado para categorías
  const [categorias, setCategorias] = useState<Array<{id: number, nombre: string, slug: string}>>([]);
  const [formData, setFormData] = useState<Partial<GaleriaItem>>({
    titulo: '',
    descripcion: '',
    categoria: 0,
    imagen_antes: null,
    imagen_despues: null,
    imagen: null,
    destacado: false,
    orden: 0,
    activo: true,
  });
  
  // Estados para archivos
  const [imagenAntesFile, setImagenAntesFile] = useState<File | null>(null);
  const [imagenDespuesFile, setImagenDespuesFile] = useState<File | null>(null);
  const [imagenUnicaFile, setImagenUnicaFile] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState<Record<string, boolean>>({});
  useEffect(() => {
  cargarGaleria();
  cargarCategorias();  // ← AGREGAR: Cargar categorías también
}, []);

// ← AGREGAR: Función para cargar categorías
const cargarCategorias = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    const res = await fetch(`${apiUrl}/categorias/?activo=true&ordering=nombre`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const categoriasList = Array.isArray(data) ? data : (data.results || []);
      setCategorias(categoriasList);
      
      console.log('✅ Categorías cargadas:', categoriasList.length);
      
      // ← Si hay categorías, establecer la primera como default (USAR ID)
      if (categoriasList.length > 0 && formData.categoria === 0) {
        setFormData(prev => ({ ...prev, categoria: categoriasList[0].id }));  // ← USAR .id, no .slug
      }
    }
  } catch (err) {
    console.error('❌ Error cargando categorías:', err);
  }
};
// ← AGREGAR: Función para cargar galería
const cargarGaleria = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log('🔍 Cargando galería...');
    
    const res = await fetch(`${apiUrl}/galeria/?ordering=orden,fecha`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      throw new Error('Error al cargar galería');
    }

    const data = await res.json();
    const galeriaList = Array.isArray(data) ? data : (data.results || []);
    
    console.log('✅ Galería cargada:', galeriaList.length, 'elementos');
    
    setGaleria(galeriaList);
  } catch (err: any) {
    console.error('❌ Error cargando galería:', err);
  } finally {
    setLoading(false);
  }
};
const abrirModalCrear = () => {
  console.log('🆕 Abriendo modal para CREAR nueva galería');
  
  setItemEditando(null);
  setFormData({
    titulo: '',
    descripcion: '',
    categoria: categorias.length > 0 ? categorias[0].id : 0,  // ← USAR .id, no .slug
    imagen_antes: null,
    imagen_despues: null,
    imagen: null,
    destacado: false,
    orden: galeria.length,
    activo: true,
  });
  
  setImagenAntesFile(null);
  setImagenDespuesFile(null);
  setImagenUnicaFile(null);
  
  setModalAbierto(true);
};
  const abrirModalEditar = (item: GaleriaItem) => {
    setItemEditando(item);
    setFormData({ ...item });
    setModalAbierto(true);
  };

const handleFileChange = async (
  file: File | null,
  setter: React.Dispatch<React.SetStateAction<File | null>>,
  fieldName: string
) => {
  if (!file) return;
  
  // ← AGREGAR: Activar indicador de conversión
  setConvirtiendo(prev => ({ ...prev, [fieldName]: true }));
  
  try {
    // ← PASO 1: Intentar convertir HEIC a JPEG
    let processedFile = await convertHeicToJpeg(file);
    
    // ← PASO 2: Validar que sea imagen (permitir fallback)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    // Si el tipo no es válido PERO el nombre termina en .jpg, permitir (fallback de HEIC)
    if (!validTypes.includes(processedFile.type)) {
      const isFallbackHeic = processedFile.name.toLowerCase().endsWith('.jpg') && 
                            (file.type === 'image/heic' || file.type === 'image/heif');
      
      if (!isFallbackHeic) {
        alert(`❌ Formato no soportado: "${processedFile.name}". Usa JPEG, PNG o WebP.`);
        return;
      } else {
        console.warn(`⚠️ Usando fallback para HEIC: ${processedFile.name} (tipo real: ${file.type})`);
      }
    }
    
    // ← PASO 3: COMPRIMIR si es JPEG/PNG y > 1MB (solo si es tipo válido)
    if (validTypes.includes(processedFile.type) && processedFile.size > 1 * 1024 * 1024) {
      console.log(`🔄 Comprimiendo ${processedFile.name}...`);
      
      try {
        const compressedBlob = await compressImage(processedFile, 1920, 0.85);
        
        processedFile = new File([compressedBlob], processedFile.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      } catch (compressErr) {
        console.warn(`⚠️ No se pudo comprimir ${processedFile.name}, se usará original:`, compressErr);
        // Continuar con el archivo sin comprimir
      }
    }
    
    // ← PASO 4: Validar tamaño final
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    
    if (processedFile.size > MAX_SIZE) {
      const sizeInMB = (processedFile.size / (1024 * 1024)).toFixed(2);
      alert(`❌ La imagen es demasiado grande (${sizeInMB} MB). El tamaño máximo permitido es 5 MB.`);
      return;
    }
    
    // ← PASO 5: Actualizar estado
    setter(processedFile);
    console.log(`✅ ${fieldName} listo: ${processedFile.name} (${(processedFile.size / 1024).toFixed(2)} KB)`);
    
  } catch (err: any) {
    console.error(`❌ Error procesando ${fieldName}:`, err);
    alert(`⚠️ ${err.message || 'No se pudo procesar la imagen. Intenta con otra.'}`);
  } finally {
    // ← AGREGAR: Desactivar indicador de conversión
    setConvirtiendo(prev => ({ ...prev, [fieldName]: false }));
  }
};

const guardarGaleria = async () => {
  if (!formData.titulo?.trim()) {
    alert('❌ El título es obligatorio');
    return;
  }
   if (!formData.categoria || formData.categoria <= 0) {
    alert('❌ Debes seleccionar una categoría válida');
    return;
  }


  try {
    setGuardando(true);
    const token = localStorage.getItem('admin_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
    
    console.log('💾 Guardando galería...');
    console.log('📝 Modo:', itemEditando ? 'EDICIÓN' : 'CREACIÓN');
    console.log('📦 formData:', formData);
    console.log('📎 Archivos:', {
      antes: imagenAntesFile?.name || 'none',
      despues: imagenDespuesFile?.name || 'none',
      unica: imagenUnicaFile?.name || 'none',
    });
    
    const datosFormData = new FormData();
    
    // ← AGREGAR: Log de lo que se está enviando
    console.log('📋 Campos que se enviarán:');
    
    // Campos de texto
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'boolean') {
          datosFormData.append(key, value.toString());
          console.log(`  ✓ ${key}: ${value} (boolean)`);
        } else if (key !== 'imagen_antes' && key !== 'imagen_despues' && key !== 'imagen') {
          datosFormData.append(key, value.toString());
          console.log(`  ✓ ${key}: ${value}`);
        }
      } else {
        console.log(`  ✗ ${key}: OMITIDO (null/undefined/vacío)`);
      }
    });
    
    // Archivos
    if (imagenAntesFile) {
      datosFormData.append('imagen_antes', imagenAntesFile);
      console.log(`  ✓ imagen_antes: ${imagenAntesFile.name} (${imagenAntesFile.type})`);
    }
    if (imagenDespuesFile) {
      datosFormData.append('imagen_despues', imagenDespuesFile);
      console.log(`  ✓ imagen_despues: ${imagenDespuesFile.name} (${imagenDespuesFile.type})`);
    }
    if (imagenUnicaFile) {
      datosFormData.append('imagen', imagenUnicaFile);
      console.log(`  ✓ imagen: ${imagenUnicaFile.name} (${imagenUnicaFile.type})`);
    }

    let res: Response;
    let url: string;
    
    if (itemEditando && itemEditando.id) {
      url = `${apiUrl}/galeria/${itemEditando.id}/`;
      console.log('🔗 URL:', url, '(PATCH)');
      
      res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: datosFormData,
      });
    } else {
      url = `${apiUrl}/galeria/`;
      console.log('🔗 URL:', url, '(POST)');
      
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: datosFormData,
      });
    }

    console.log('📥 Response status:', res.status);
    console.log('📥 Response headers:', Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      // ← MEJORAR: Obtener respuesta completa
      const contentType = res.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);
      
      let errorDetail = '';
      let errorData: Record<string, any> = {};
      
      try {
        const responseText = await res.text();
        console.log('📄 Response body (texto):', responseText);
        
        if (contentType && contentType.includes('application/json')) {
          errorData = JSON.parse(responseText);
          console.log('❌ Error data (JSON):', errorData);
          
          // Construir mensaje de error detallado
          const errors: string[] = [];
          
          if (errorData.titulo) {
            errors.push(`Título: ${Array.isArray(errorData.titulo) ? errorData.titulo.join(', ') : errorData.titulo}`);
          }
          if (errorData.categoria) {
            errors.push(`Categoría: ${Array.isArray(errorData.categoria) ? errorData.categoria.join(', ') : errorData.categoria}`);
          }
          if (errorData.non_field_errors) {
            errors.push(Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors.join(', ') : errorData.non_field_errors);
          }
          if (errorData.detail) {
            errors.push(errorData.detail);
          }
          
          errorDetail = errors.length > 0 ? errors.join(' | ') : 'Error de validación';
        } else {
          errorDetail = responseText || `Error HTTP ${res.status}`;
        }
      } catch (parseErr) {
        console.error('❌ Error parseando respuesta:', parseErr);
        errorDetail = `Error ${res.status}: No se pudo leer la respuesta`;
      }
      
      console.error('❌ Error final:', errorDetail);
      throw new Error(errorDetail);
    }

    const data = await res.json();
    console.log('✅ Galería guardada:', data);
    
    alert(`✅ Galería ${itemEditando ? 'actualizada' : 'creada'} exitosamente`);
    setModalAbierto(false);
    cargarGaleria();
  } catch (err: any) {
    console.error('❌ Error guardando galería:', err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    setGuardando(false);
  }
};

  const eliminarGaleria = async (item: GaleriaItem) => {
    if (!confirm(`¿Eliminar "${item.titulo}" de la galería?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/galeria/${item.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Error al eliminar');
      }

      alert('✅ Eliminada exitosamente');
      cargarGaleria();
    } catch (err: any) {
      console.error('Error eliminando:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const toggleActivo = async (item: GaleriaItem) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/galeria/${item.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !item.activo }),
      });

      if (res.ok) cargarGaleria();
    } catch (err) {
      console.error('Error actualizando:', err);
    }
  };

  const toggleDestacado = async (item: GaleriaItem) => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';
      
      const res = await fetch(`${apiUrl}/galeria/${item.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destacado: !item.destacado }),
      });

      if (res.ok) cargarGaleria();
    } catch (err) {
      console.error('Error actualizando destacado:', err);
    }
  };

  // ← FUNCIÓN PARA CORREGIR URLs
  // ← FUNCIÓN PARA CORREGIR URLs DE IMÁGENES
const getCorrectImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url === '' || url === 'null' || url === 'undefined') {
    return null;
  }
  
  console.log('🔗 URL original:', url);
  
  const PRODUCTION_DOMAIN = 'https://api.dzsalon.com';
  const LOCAL_DOMAIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://179.43.112.64:8080';
  
  // Si ya es URL absoluta con dominio correcto
  if (url.startsWith(PRODUCTION_DOMAIN)) {
    console.log('✅ URL ya es correcta (producción)');
    return url;
  }
  
  // Si es URL absoluta con IP o localhost, corregirla
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const corrected = url
      .replace('https://179.43.112.64', PRODUCTION_DOMAIN)
      .replace('http://179.43.112.64:8080', LOCAL_DOMAIN)
      .replace('http://127.0.0.1:8080', LOCAL_DOMAIN);
    
    console.log('🔧 URL corregida (absoluta):', corrected);
    return corrected;
  }
  
  // Si es URL relativa (empieza con /media/), construir URL absoluta
  if (url.startsWith('/media/')) {
    const baseUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_DOMAIN : LOCAL_DOMAIN;
    const fullUrl = `${baseUrl}${url}`;
    console.log('🔧 URL corregida (relativa → absoluta):', fullUrl);
    return fullUrl;
  }
  
  // Fallback: retornar null
  console.warn('⚠️ URL no reconocida:', url);
  return null;
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">📷 Galería de Trabajos</h1>
          <p className="text-gray-600 mt-2">Gestiona el antes y después de tus tratamientos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/configuracion')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Volver
          </button>
          <button
            onClick={abrirModalCrear}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir a Galería
          </button>
        </div>
      </div>

      {/* Lista de Galería */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {galeria.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            📭 No hay elementos en la galería
          </div>
        ) : (
          galeria.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
              item.destacado ? 'border-yellow-400' : 'border-gray-200'
            }`}>
              {/* Imagen Principal */}
              <div className="relative h-64 bg-gray-100">
                {item.imagen_url ? (
                  <img 
                    src={getCorrectImageUrl(item.imagen_url) || ''} 
                    alt={item.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('❌ Error cargando imagen:', item.imagen_url);
                      console.error('🔧 URL corregida:', getCorrectImageUrl(item.imagen_url));
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" fill="%239ca3af" text-anchor="middle" dy=".3em"%3ESin imagen%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : item.imagen_antes_url || item.imagen_despues_url ? (
                  <div className="grid grid-cols-2 h-full">
                    {item.imagen_antes_url && (
                      <div className="relative">
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          ANTES
                        </div>
                        <img 
                          src={getCorrectImageUrl(item.imagen_antes_url) || ''} 
                          alt="Antes"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {item.imagen_despues_url && (
                      <div className="relative">
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          DESPUÉS
                        </div>
                        <img 
                          src={getCorrectImageUrl(item.imagen_despues_url) || ''} 
                          alt="Después"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Sin imagen
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {item.destacado && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-semibold">
                      ⭐ Destacado
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    item.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{item.titulo}</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                    {item.categoria}
                  </span>
                </div>
                
                {item.descripcion && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.descripcion}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Orden: #{item.orden}</span>
                  {item.fecha && (
                    <span>{new Date(item.fecha).toLocaleDateString('es-CO')}</span>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirModalEditar(item)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(item)}
                    className={`p-2 rounded-lg ${
                      item.activo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}
                    title={item.activo ? 'Desactivar' : 'Activar'}
                  >
                    {item.activo ? '✓' : '✗'}
                  </button>
                  <button
                    onClick={() => toggleDestacado(item)}
                    className={`p-2 rounded-lg ${
                      item.destacado ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                    }`}
                    title={item.destacado ? 'Quitar destacado' : 'Marcar destacado'}
                  >
                    ⭐
                  </button>
                  <button
                    onClick={() => eliminarGaleria(item)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {itemEditando ? '✏️ Editar Galería' : '➕ Añadir a Galería'}
                </h2>
                <p className="text-sm opacity-90">
                  {itemEditando ? 'Actualiza el trabajo' : 'Agrega un nuevo antes/después'}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Título y Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={formData.titulo ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Tratamiento Facial Hidratante"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría {categorias.length === 0 && '(Cargando...)'}
                  </label>
                  <select
                    value={formData.categoria || 0}  // ← CAMBIAR: número, no string
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: Number(e.target.value) }))}  // ← CAMBIAR: Number()
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    disabled={categorias.length === 0}
                  >
                    <option value={0}>Seleccionar categoría...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>  {/* ← CAMBIAR: value={cat.id} */}
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  {categorias.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ No hay categorías disponibles. Crea categorías primero.
                    </p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe el tratamiento realizado"
                />
              </div>

              {/* Imágenes Antes/Después */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📸 Imagen Antes
                  </label>

                  {/* ← ← ← AGREGAR AQUÍ: Indicador de conversión */}
                  {convirtiendo['imagen_antes'] && (
                    <span className="text-xs text-purple-600 ml-2 animate-pulse">🔄 Convirtiendo...</span>
                  )}
                  {formData.imagen_antes_url && !imagenAntesFile && (
                    <img 
                      src={getCorrectImageUrl(formData.imagen_antes_url) || ''} 
                      alt="Antes"
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, setImagenAntesFile, 'imagen_antes')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ✨ Imagen Después
                  </label>
                  {/* ← ← ← AGREGAR AQUÍ: Indicador de conversión */}
                  {convirtiendo['imagen_antes'] && (
                    <span className="text-xs text-purple-600 ml-2 animate-pulse">🔄 Convirtiendo...</span>
                  )}
                  {formData.imagen_despues_url && !imagenDespuesFile && (
                    <img 
                      src={getCorrectImageUrl(formData.imagen_despues_url) || ''} 
                      alt="Después"
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, setImagenDespuesFile, 'imagen_despues')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Imagen Única */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📷 Imagen Única (si no hay antes/después)
                </label>
                {/* ← ← ← AGREGAR AQUÍ: Indicador de conversión */}
                  {convirtiendo['imagen_antes'] && (
                    <span className="text-xs text-purple-600 ml-2 animate-pulse">🔄 Convirtiendo...</span>
                  )}
                {formData.imagen_url && !imagenUnicaFile && (
                  <img 
                    src={getCorrectImageUrl(formData.imagen_url) || ''} 
                    alt="Imagen"
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, setImagenUnicaFile, 'imagen_unica')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Orden y Destacado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.orden ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Menor número = aparece primero</p>
                </div>

                <div className="flex items-center gap-6 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.destacado}
                      onChange={(e) => setFormData(prev => ({ ...prev, destacado: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">⭐ Destacado</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">✅ Activo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarGaleria}
                disabled={guardando}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : (itemEditando ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}