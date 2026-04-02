'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  titulo: string;
  foto: string | null;
  telefono_whatsapp: string;
  activo_reservas: boolean;
}

interface ProfessionalSelectorProps {
  selectedProfessional: number | null;
  onProfessionalSelect: (id: number) => void;
  servicioId: number | null;
  selectedDate: Date | null;
}

const API_DOMAIN = 'https://api.dzsalon.com';

export default function ProfessionalSelector({
  selectedProfessional,
  onProfessionalSelect,
  servicioId,
  selectedDate,
}: ProfessionalSelectorProps) {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(false);

  // ← CAMBIO 1: Solo recargar cuando cambia servicioId (no selectedDate)
  useEffect(() => {
    async function loadProfesionales() {
      if (!servicioId) {
        setProfesionales([]);
        return;
      }
      
      setLoading(true);
      try {
        // ← CAMBIO 2: Llamar endpoint con servicio_id para filtrar profesionales
        const url = `${API_DOMAIN}/api/profesionales-filtrados/?servicio=${servicioId}`;
        const res = await fetch(url);
        const data = await res.json();
        
        // ← CAMBIO 3: Manejar diferentes formatos de respuesta
        let profesionalesList: Profesional[] = [];
        
        if (Array.isArray(data)) {
          profesionalesList = data;
        } else if (data?.results && Array.isArray(data.results)) {
          profesionalesList = data.results;
        } else if (data?.data && Array.isArray(data.data)) {
          profesionalesList = data.data;
        }
        
        console.log(`✅ Profesionales cargados para servicio ${servicioId}:`, profesionalesList.length);
        setProfesionales(profesionalesList);
        
      } catch (err) {
        console.error('❌ Error cargando profesionales:', err);
        setProfesionales([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfesionales();
  }, [servicioId]);  // ← Solo depender de servicioId

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (profesionales.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        No hay profesionales disponibles para este servicio
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {profesionales.map((prof) => {
        const isSelected = selectedProfessional === prof.id;
        const imageUrl = prof.foto 
          ? (prof.foto.startsWith('http') ? prof.foto : `${API_DOMAIN}${prof.foto}`)
          : 'https://via.placeholder.com/150?text=Sin+Foto';
        
        return (
          <button
            key={prof.id}
            type="button"
            onClick={() => onProfessionalSelect(prof.id)}
            className={`relative p-3 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-blue-600 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-gray-100">
              <img
                src={imageUrl}
                alt={prof.nombre}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
              {prof.titulo} {prof.nombre}
            </p>
            <p className="text-xs text-gray-500 truncate">{prof.especialidad}</p>
            
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}