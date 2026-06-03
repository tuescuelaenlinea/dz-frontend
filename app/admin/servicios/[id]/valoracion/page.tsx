// app/admin/servicios/[id]/valoracion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ValoracionConfig } from '@/types/valoracion';
import ConfiguracionValoracion from '@/components/admin/valoracion/ConfiguracionValoracion';

export default function ValoracionAdminPage() {
  const params = useParams();
  const router = useRouter();
  const servicioId = parseInt(params.id as string);
  
  const [config, setConfig] = useState<ValoracionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, [servicioId]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      // ← ← ← CORREGIR: URL sin duplicar /api
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://179.43.112.64:8080/api';
      const url = `${baseUrl}/servicios/${servicioId}/valoracion-config/`;
      
      console.log('🔍 Cargando configuración desde:', url);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Configuración cargada:', data);
        setConfig(data);
      } else if (res.status === 404) {
        console.log('ℹ️ No hay configuración, creando vacía');
        setConfig({
          servicio: servicioId,
          titulo: '',
          descripcion: '',
          activo: true,
          secciones: [],
        });
      } else {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
    } catch (error: any) {
      console.error('❌ Error cargando configuración:', error);
      toast.error('Error al cargar configuración: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // En app/admin/servicios/[id]/valoracion/page.tsx

const guardarConfiguracion = async (configData: ValoracionConfig) => {
  setSaving(true);
  try {
    const token = localStorage.getItem('admin_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://179.43.112.64:8080/api';
    const url = `${baseUrl}/servicios/${servicioId}/valoracion-config/`;
    
    console.log('💾 Guardando configuración en:', url);
    
    const method = config?.id ? 'PUT' : 'POST';
    
    // ← ← ← VERIFICAR SI HAY FOTOS NUEVAS ← ← ←
    let tieneFotos = false;
    configData.secciones.forEach((seccion) => {
      seccion.opciones?.forEach((opcion) => {
        if (opcion.foto instanceof File) {
          tieneFotos = true;
        }
      });
    });
    
    let response: Response;
    
    if (tieneFotos) {
      // ← ← ← USAR FORMDATA SI HAY FOTOS ← ← ←
      const formData = new FormData();
      
      // Campos principales
      formData.append('titulo', configData.titulo || '');
      formData.append('descripcion', configData.descripcion || '');
      formData.append('activo', configData.activo ? 'true' : 'false');
      
      // ← ← ← SERIALIZAR SECCIONES CON IDs Y FOTOS SEPARADAS ← ← ←
      const seccionesParaEnviar = configData.secciones.map((seccion, sIdx) => {
        const opcionesLimpias = seccion.opciones?.map((opcion, oIdx) => {
          // ← ← ← CLAVE: Conservar el ID si existe ← ← ←
          const opcionBase: any = {
            titulo: opcion.titulo,
            descripcion: opcion.descripcion || '',
            valor_adicional: opcion.valor_adicional || 0,
            orden: opcion.orden || oIdx,
            activo: opcion.activo ?? true,
          };
          
          // ← ← ← CLAVE: Incluir ID si existe (para actualización) ← ← ←
          if (opcion.id) {
            opcionBase.id = opcion.id;
          }
          
          return opcionBase;
        }) || [];
        
        const seccionBase: any = {
          tipo: seccion.tipo,
          titulo: seccion.titulo,
          instruccion: seccion.instruccion || '',
          orden: seccion.orden || sIdx,
          obligatoria: seccion.obligatoria ?? false,
          seleccion_multiple: seccion.seleccion_multiple ?? false,
          condicion_visible: seccion.condicion_visible || {},
          opciones: opcionesLimpias,
        };
        
        // ← ← ← CLAVE: Incluir ID de sección si existe ← ← ←
        if (seccion.id) {
          seccionBase.id = seccion.id;
        }
        
        return seccionBase;
      });
      
      formData.append('secciones', JSON.stringify(seccionesParaEnviar));
      
      // ← ← ← AGREGAR FOTOS CON CLAVES ESPECÍFICAS ← ← ←
      configData.secciones.forEach((seccion, sIdx) => {
        seccion.opciones?.forEach((opcion, oIdx) => {
          if (opcion.foto instanceof File) {
            const fotoKey = `foto_seccion_${sIdx}_opcion_${oIdx}`;
            formData.append(fotoKey, opcion.foto);
            console.log(`📸 Agregando foto: ${fotoKey} → ${opcion.foto.name}`);
          }
        });
      });
      
      response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO poner Content-Type, el navegador lo hace automáticamente
        },
        body: formData,
      });
    } else {
      // ← ← ← USAR JSON SI NO HAY FOTOS ← ← ←
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(configData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error del servidor:', errorData);
      throw new Error(errorData.detail || errorData.error || `Error ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Configuración guardada:', data);
    setConfig(data);
    
    return data;
    
  } catch (error: any) {
    console.error('❌ Error guardando:', error);
    throw error;
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← Volver al servicio
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Configurar Valoración del Servicio
        </h1>
        <p className="text-gray-600 mt-2">
          Crea secciones personalizadas para que los clientes puedan valorar su servicio
        </p>
      </div>

      {config && (
        <ConfiguracionValoracion
          config={config}
          onSave={guardarConfiguracion}
          saving={saving}
        />
      )}
    </div>
  );
}