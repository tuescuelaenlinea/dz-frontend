// components/fidelizacion/KPICards.tsx
import { Users, AlertTriangle, Clock, TrendingUp, Crown, DollarSign } from 'lucide-react';
import { FidelizacionDashboard } from '@/types/fidelizacion';

interface Props {
  data: FidelizacionDashboard | null;
}

export default function KPICards({ data }: Props) {
  if (!data) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;

  const cards = [
    { title: 'Próximos a regresar', value: data.proximos_a_regresar, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'En seguimiento', value: data.en_seguimiento, icon: Users, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'En riesgo', value: data.en_riesgo, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Inactivos', value: data.inactivos, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Clientes VIP', value: data.clientes_vip, icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Ventas Potenciales', value: `$${(data.ventas_potenciales / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{card.title}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}