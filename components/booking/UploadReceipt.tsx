// components/booking/UploadReceipt.tsx
'use client';
import { useState, useRef } from 'react';

interface UploadReceiptProps {
  citaId: number;
  pagoId: number; 
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UploadReceipt({ citaId, pagoId, onSuccess, onCancel }: UploadReceiptProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Solo se permiten imágenes (JPG, PNG) o PDF');
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('El archivo no puede superar los 5MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  // ← FUNCIÓN: Preparar datos para WhatsApp (PERO NO ABRIRLO)
 // ← FUNCIÓN: Preparar datos para WhatsApp (CAMBIO: ahora al admin)
async function prepararWhatsAppParaProfesional(citaId: number) {
  try {
    // ← CAMBIO #1: Buscar admin_token primero
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    console.log('🔍 [UploadReceipt] Obteniendo datos de la cita #', citaId);
    const citaRes = await fetch(`${apiUrl}/citas/${citaId}/`, { headers });
    
    if (!citaRes.ok) {
      const errorText = await citaRes.text();
      console.error('❌ [UploadReceipt] Error obteniendo cita:', citaRes.status, errorText);
      return;
    }
    
    const cita = await citaRes.json();
    console.log('📋 [UploadReceipt] Datos de la cita:', {
      id: cita.id,
      profesional: cita.profesional,
      codigo_reserva: cita.codigo_reserva
    });
    
    // ← MANTENER: Validar que existe profesional asignado
    if (!cita.profesional) {
      console.warn('⚠️ [UploadReceipt] La cita #', citaId, 'no tiene profesional asignado');
      // ← CAMBIO: No retornar, continuar para enviar al admin de todas formas
    }
    
    // ← CAMBIO #2: Obtener WhatsApp del admin desde config
    const configRes = await fetch(`${apiUrl}/configuracion/activa/`);
    let whatsappAdmin = '';
    
    if (configRes.ok) {
      const configData = await configRes.json();
      const config = configData.results?.[0] || configData;
      whatsappAdmin = config?.whatsapp || '';
    }
    
    if (!whatsappAdmin) {
      console.warn('⚠️ [UploadReceipt] No hay WhatsApp de administración configurado');
      return;
    }
    
    console.log('💼 [UploadReceipt] WhatsApp del admin:', whatsappAdmin);
    
    // ← CAMBIO #3: Mensaje actualizado (para admin)
    const mensaje = `*📤 COMPROBANTE SUBIDO*%0A%0A` +
      `*Código:* ${cita.codigo_reserva}%0A` +
      `*Cliente:* ${cita.cliente_nombre}%0A` +
      `*Servicio:* ${cita.servicio_nombre || 'Servicio'}%0A` +
      `*Fecha:* ${cita.fecha}%0A` +
      `*Hora:* ${cita.hora_inicio}%0A` +
      `*Total:* $${cita.precio_total}%0A%0A` +
      `⏳ Pendiente de verificación por admin`;
    
    // ← CAMBIO #4: Usar WhatsApp del admin
    const telefonoLimpio = whatsappAdmin.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
    
    // ← Guardar en localStorage
    localStorage.setItem(`cita_${citaId}_whatsapp_admin`, whatsappUrl);
    
    console.log('✅ [UploadReceipt] URL de WhatsApp guardada para administrador');
    
  } catch (err) {
    console.error('❌ [UploadReceipt] Error preparando WhatsApp:', err);
  }
}
  const handleUpload = async () => {
  if (!file) {
    setError('Por favor selecciona un archivo');
    return;
  }
  
  setUploading(true);
  setError(null);
  
  try {
    const formData = new FormData();
    formData.append('comprobante', file);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';
    
    // ← CAMBIO #3: Usar pagoId en lugar de citaId
    const res = await fetch(`${apiUrl}/pagos/${pagoId}/subir-comprobante/`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Error al subir comprobante');
    }
    
    alert('✅ Comprobante subido exitosamente! Tu cita está pendiente de verificación.');
    
    // ← Preparar WhatsApp (usando citaId, que sí es correcto aquí)
   // await prepararWhatsAppParaProfesional(citaId);
    
    onSuccess();
    
  } catch (err: any) {
    console.error('❌ Error en handleUpload:', err);
    setError(err.message || 'Error al subir el comprobante');
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          📤 Subir Comprobante de Pago
        </h3>
        
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            📋 Sube una foto o PDF de tu comprobante de transferencia, Nequi o Daviplata.
          </p>
          <p className="text-xs text-blue-600 mt-2">
            ⏱️ Verificaremos tu pago en menos de 24 horas.
          </p>
        </div>
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
        >
          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              <p className="text-sm text-gray-600">{file?.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                🗑️ Eliminar
              </button>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Haz clic para subir un archivo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG o PDF (máx. 5MB)
              </p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Subiendo...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Subir Comprobante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}