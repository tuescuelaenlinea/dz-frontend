'use client';
//app/admin/aliados/page.tsx
import { useState, useEffect } from 'react';
import AliadosTab from '@/components/AliadosTab';
import ConveniosTab from '@/components/ConveniosTab';
import EmpleadosTab from '@/components/EmpleadosTab';

type TabType = 'aliados' | 'convenios' | 'empleados';

export default function AliadosPage() {
  const [activeTab, setActiveTab] = useState<TabType>('aliados');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    setToken(storedToken);
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dzsalon.com/api';

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🤝 Módulo de Aliados
        </h1>
        <p className="text-gray-400">
          Gestiona empresas aliadas, convenios de descuento y empleados afiliados
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg p-1 mb-6 inline-flex">
        <button
          onClick={() => setActiveTab('aliados')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'aliados'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏢 Empresas Aliadas
        </button>
        <button
          onClick={() => setActiveTab('convenios')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'convenios'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Convenios
        </button>
        <button
          onClick={() => setActiveTab('empleados')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'empleados'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          👥 Empleados
        </button>
      </div>

      {/* Contenido */}
      <div className="bg-gray-800 rounded-xl p-6">
        {activeTab === 'aliados' && <AliadosTab token={token} apiUrl={apiUrl} />}
        {activeTab === 'convenios' && <ConveniosTab token={token} apiUrl={apiUrl} />}
        {activeTab === 'empleados' && <EmpleadosTab token={token} apiUrl={apiUrl} />}
      </div>
    </div>
  );
}