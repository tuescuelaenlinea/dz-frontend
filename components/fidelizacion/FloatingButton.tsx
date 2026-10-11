// components/fidelizacion/FloatingButton.tsx
import { Plus } from 'lucide-react';

export default function FloatingButton() {
  return (
    <button 
      className="fixed bottom-6 left-6 z-40 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all hover:scale-105 group"
      onClick={() => alert('Aquí se abrirá el modal o ruta de Nueva Campaña')}
    >
      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
      <span className="font-medium">Nueva Campaña</span>
    </button>
  );
}