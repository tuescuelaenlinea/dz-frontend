// components/booking/UploadReceipt.tsx
'use client';
import { useState, useRef } from 'react';

interface UploadReceiptProps {
  citaId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UploadReceipt({ citaId, onSuccess, onCancel }: UploadReceiptProps) {
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
  async function prepararWhatsAppParaProfesional(citaId: number) {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
      
      if (!cita.profesional) {
        console.warn('⚠️ [UploadReceipt] La cita #', citaId, 'no tiene profesional asignado');
        return;
      }
      
      console.log('🔍 [UploadReceipt] Buscando profesional ID:', cita.profesional);
      const profsRes = await fetch(`${apiUrl}/profesionales/`, { headers });
      
      if (!profsRes.ok) {
        console.error('❌ [UploadReceipt] Error obteniendo profesionales:', profsRes.status);
        return;
      }
      
      const profs = await profsRes.json();
      let profesionalesList = Array.isArray(profs) ? profs : (profs.results || []);
      
      const profesional = profesionalesList.find((p: any) => p.id === cita.profesional);
      
      if (!profesional) {
        console.warn('⚠️ [UploadReceipt] No se encontró profesional con ID:', cita.profesional);
        return;
      }
      
      console.log('👨‍⚕️ [UploadReceipt] Profesional encontrado:', {
        nombre: profesional.nombre,
        telefono_whatsapp: profesional.telefono_whatsapp
      });
      
      if (!profesional?.telefono_whatsapp) {
        console.warn('⚠️ [UploadReceipt] El profesional', profesional.nombre, 'no tiene teléfono WhatsApp registrado');
        return;
      }
      
      // ← MENSAJE DE NOTIFICACIÓN DE COMPROBANTE (solo informativo)
      const mensaje = `*📤 COMPROBANTE SUBIDO*%0A%0A` +
        `*Código:* ${cita.codigo_reserva}%0A` +
        `*Cliente:* ${cita.cliente_nombre}%0A` +
        `*Servicio:* ${cita.servicio_nombre || 'Servicio'}%0A` +
        `*Fecha:* ${cita.fecha}%0A` +
        `*Hora:* ${cita.hora_inicio}%0A` +
        `*Total:* $${cita.precio_total}%0A%0A` +
        `⏳ Pendiente de verificación`;
      
      const telefonoLimpio = profesional.telefono_whatsapp.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/57${telefonoLimpio}?text=${mensaje}`;
      
      // ← ⚠️ IMPORTANTE: SOLO guardar en localStorage, NO abrir WhatsApp
      localStorage.setItem(`cita_${citaId}_whatsapp_profesional`, whatsappUrl);
      
      console.log('✅ [UploadReceipt] URL de WhatsApp guardada (NO se abrió):', profesional.nombre);
      console.log('🔒 [UploadReceipt] WhatsApp se abrirá SOLO en BookingSuccess.tsx');
      
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
      const res = await fetch(`${apiUrl}/citas/${citaId}/subir-comprobante/`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir comprobante');
      }
      
      alert('✅ Comprobante subido exitosamente! Tu cita está pendiente de verificación.');
      
      // ← Preparar WhatsApp (PERO NO ABRIRLO)
      await prepararWhatsAppParaProfesional(citaId);
      
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