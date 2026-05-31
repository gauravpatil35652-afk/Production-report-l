import React from 'react';
import { ProductionReport, ProductionStats } from '../types';
import { calculateStats } from '../utils/calculations';
import { 
  TrendingUp, 
  Clock, 
  Layers, 
  Sliders,
  Maximize2,
  Scale
} from 'lucide-react';

interface DashboardStatsProps {
  reports: ProductionReport[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ reports }) => {
  const stats = calculateStats(reports);

  // Human-friendly downtime hours
  const formatDowntime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Human-friendly weight formatter
  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} t`;
    }
    return `${kg.toLocaleString()} kg`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {/* CARD 1: TOTAL SHEETS PRODUCED */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between bounce-in">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Total Sheets</p>
          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
            {stats.totalSheets.toLocaleString()}
          </h3>
          <p className="text-xs text-zinc-500">
            Across <span className="font-semibold text-zinc-700">{stats.totalReports}</span> shift logs
          </p>
        </div>
        <div className="p-3 bg-zinc-50 text-zinc-650 rounded-lg">
          <Layers className="h-5 w-5" />
        </div>
      </div>

      {/* CARD 2: TOTAL AREA IN SQ METERS */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Total Surface Area</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
              {stats.totalAreaSqM.toLocaleString()}
            </h3>
            <span className="text-xs font-semibold text-zinc-500 font-mono">m²</span>
          </div>
          <p className="text-xs text-zinc-500">Converted from mm dimensions</p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
          <Maximize2 className="h-5 w-5" />
        </div>
      </div>

      {/* CARD 3: AVERAGE THICKNESS */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Avg Thickness</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
              {stats.averageThickness}
            </h3>
            <span className="text-xs font-semibold text-zinc-500 font-mono">mm</span>
          </div>
          <p className="text-xs text-zinc-500">Weighted of sheets produced</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <Sliders className="h-5 w-5" />
        </div>
      </div>

      {/* CARD 4: TOTAL MATERIAL WEIGHT */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Total Mass / Weight</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
              {formatWeight(stats.totalWeightKg)}
            </h3>
          </div>
          <p className="text-xs text-zinc-500">Based on alloy density specs</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-605 rounded-lg">
          <Scale className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      {/* CARD 5: ESTIMATED INDIAN RETAIL VALUE */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Market Value IN</p>
          <div className="flex items-baseline space-x-1">
            <h3 className="text-2xl font-bold tracking-tight text-emerald-700">
              ₹{stats.totalValueINR >= 100000 
                ? `${(stats.totalValueINR / 100000).toFixed(2)}L` 
                : stats.totalValueINR.toLocaleString('en-IN')}
            </h3>
          </div>
          <p className="text-xs text-zinc-500">Indian retail price indices</p>
        </div>
        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold font-mono text-lg flex items-center justify-center w-11 h-11">
          ₹
        </div>
      </div>

      {/* CARD 6: TOTAL DOWNTIME */}
      <div className="bg-white p-5 rounded-xl border border-zinc-100 shadow-sm flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold">Total Downtime</p>
          <h3 className="text-2xl font-bold tracking-tight text-zinc-900">
            {formatDowntime(stats.totalDowntimeMinutes)}
          </h3>
          <p className="text-xs text-zinc-500">
            Across <span className="font-semibold text-zinc-700">{reports.reduce((acc, r) => acc + (r.downtimeEvents?.length || 0), 0)}</span> incident logs
          </p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
          <Clock className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
