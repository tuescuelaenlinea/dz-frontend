// components/admin/valoracion/PhotoUploader.tsx
'use client';

import { useState, useRef } from 'react';

interface PhotoUploaderProps {
  onPhotoSelect: (file: File | null, previewUrl: string | null) => void;
  existingPhoto?: string;
  label?: string;
  required?: boolean;
  maxSizeMB?: number;
  accept?: string;
}

export default function PhotoUploader({
  onPhotoSelect,
  existingPhoto,
  label = 'Subir foto',
  required = false,
  maxSizeMB = 5,
  accept = 'image/*',
}: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(existingPhoto || null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return false;
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`La imagen no debe superar ${maxSizeMB}MB`);
      return false;
    }

    setError('');
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onPhotoSelect(file, result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoSelect(null, null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
            }
          `}
        >
          <div className="space-y-2">
            <div className="text-4xl mb-2">📸</div>
            <p className="text-sm text-gray-400">
              Arrastra una imagen o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500">
              Máximo {maxSizeMB}MB • JPG, PNG, WEBP
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            required={required}
          />
        </div>
      ) : (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-gray-700">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🗑️ Eliminar foto
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            ✅ Imagen cargada correctamente
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}