import React, { useState } from 'react';
import { DataDrivenRecommendation } from '@shared/types';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Compass,
  ArrowRight,
  ShieldAlert,
  Database,
  Layers,
  Info
} from 'lucide-react';

interface DataDrivenRecommendationsCardProps {
  recommendations: DataDrivenRecommendation[];
  loading: boolean;
  onNavigateTab: (tab: any) => void;
  onRefresh?: () => void;
}

export const DataDrivenRecommendationsCard: React.FC<DataDrivenRecommendationsCardProps> = ({
  recommendations,
  loading,
  onNavigateTab,
  onRefresh
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Advisory Items' },
    { id: 'AFFORDABILITY', label: 'Affordability & Terms' },
    { id: 'REPAYMENT', label: 'Repayment Discipline' },
    { id: 'CASH_FLOW', label: 'Cash Flow & Spend' },
    { id: 'CREDIT_BUILDING', label: 'Credit Building' },
    { id: 'DATA_QUALITY', label: 'Data Quality' }
  ];

  const filtered = selectedCategory === 'ALL'
    ? recommendations
    : recommendations.filter(r => r.category === selectedCategory);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
          Evaluating Data-Driven Recommendations...
        </div>
        <div className="h-28 rounded-2xl bg-slate-850/60 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-xl flex flex-col gap-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <Compass size={14} /> Deterministic Recommendation Engine
          </span>
          <h3 className="text-xl font-black text-white">Intelligent Financial Recommendations</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Derived directly from cashflow surplus, DTI ratios, repayment consistency, and ML risk evaluations.
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 self-start sm:self-auto">
          {recommendations.length} Active Guidance Items
        </span>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-black shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Recommendation List */}
      {filtered.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
          No recommendations found for the selected category.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(rec => {
            const isHighPriority = rec.priority === 'HIGH';
            const isMedium = rec.priority === 'MEDIUM';

            return (
              <div
                key={rec.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col gap-3 shadow-md ${
                  isHighPriority
                    ? 'bg-red-950/20 border-red-500/40'
                    : isMedium
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Condition & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${
                      isHighPriority ? 'bg-red-500/20 text-red-400' : isMedium ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isHighPriority ? <ShieldAlert size={16} /> : isMedium ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    </span>
                    <h4 className="font-extrabold text-sm text-white">{rec.condition}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {rec.category}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-extrabold ${
                      isHighPriority ? 'bg-red-500/30 text-red-300' : isMedium ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/30 text-emerald-300'
                    }`}>
                      {rec.priority} PRIORITY
                    </span>
                  </div>
                </div>

                {/* Supporting Data Pill Box */}
                {rec.supportingData && Object.keys(rec.supportingData).length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Supporting Telemetry:</span>
                    {Object.entries(rec.supportingData).map(([key, val]) => (
                      <span key={key} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-slate-400">{key}:</strong>{' '}
                        <span className="text-emerald-400">
                          {typeof val === 'number' ? `₹${val.toLocaleString('en-IN')}` : String(val)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Action */}
                <div className="flex items-start gap-2 text-xs">
                  <span className="font-bold text-emerald-400 shrink-0">👉 Suggested Action:</span>
                  <span className="text-slate-200 font-medium">{rec.suggestedAction}</span>
                </div>

                {/* Reason / Rationale */}
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="font-bold text-slate-500 shrink-0">Reason:</span>
                  <span>{rec.reason}</span>
                </div>

                {/* Trade-off (if provided) */}
                {rec.tradeOff && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
                    <span className="font-bold block mb-0.5">⚖️ Financial Trade-off:</span>
                    {rec.tradeOff}
                  </div>
                )}

                {/* Action CTA Button */}
                {rec.isActionable && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        if (rec.category === 'AFFORDABILITY') onNavigateTab('calculator');
                        else if (rec.category === 'REPAYMENT') onNavigateTab('repayments');
                        else if (rec.category === 'DATA_QUALITY' || rec.category === 'CASH_FLOW') onNavigateTab('transactions');
                        else onNavigateTab('suggestions');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs transition-all cursor-pointer"
                    >
                      Take Action in {rec.category === 'AFFORDABILITY' ? 'Calculator' : rec.category === 'REPAYMENT' ? 'Repayments' : 'Transactions'}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
