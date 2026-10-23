import React, { useState } from 'react';
import {
  CreditAssessmentResult,
  CreditFactorItem
} from '@shared/types';
import {
  X,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cpu,
  BarChart3,
  HelpCircle
} from 'lucide-react';

interface CreditScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: CreditAssessmentResult | null;
}

export const CreditScoreBreakdownModal: React.FC<CreditScoreBreakdownModalProps> = ({
  isOpen,
  onClose,
  assessment
}) => {
  if (!isOpen || !assessment) return null;

  // Simulator state
  const [simBillReduction, setSimBillReduction] = useState<number>(0); // percent
  const [simOnTimeMonths, setSimOnTimeMonths] = useState<number>(3); // additional months

  // Estimate simulated score impact
  const baseScore = assessment.creditScore;
  const simulatedScore = Math.min(
    900,
    Math.max(300, baseScore + Math.round(simBillReduction * 0.4) + simOnTimeMonths * 8)
  );
  const simDelta = simulatedScore - baseScore;

  const shapEntries = Object.entries(assessment.shapExplanation || {}).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0F172A] border border-slate-700 shadow-2xl p-6 md:p-8 flex flex-col gap-6 text-white">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Detailed Credit Score Breakdown & Explainability
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Model: {assessment.modelUsed} · Version {assessment.modelVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Score Overview Banner */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Assessed Score</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">{assessment.creditScore}</span>
            <span className="text-[11px] text-slate-500">Range: 300 – 900</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Risk Classification</span>
            <span className="text-base font-extrabold text-cyan-400 mt-2 block">{assessment.riskCategory}</span>
            <span className="text-[11px] text-slate-500">Model Tier</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Default Probability</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {(assessment.defaultProbability * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">Predicted default likelihood</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Data Confidence</span>
            <span className="text-sm font-bold text-emerald-300 mt-2 block">
              {assessment.dataSufficiency.quality}
            </span>
            <span className="text-[10px] text-slate-500">{assessment.dataSufficiency.telemetryStats.transactionCount} transactions analyzed</span>
          </div>
        </div>

        {/* Score Range Tiers Visualizer */}
        <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-300 uppercase tracking-wider">Credit Scoring Range Bands</span>
            <span className="text-emerald-400 font-mono">Current: {assessment.creditScore}</span>
          </div>

          {/* Tier bar */}
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono text-center">
            <div className={`p-2 rounded-lg border ${assessment.creditScore < 580 ? 'bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/50' : 'bg-red-950/20 border-red-900 text-red-400'}`}>
              <span className="font-bold block">Critical</span>
              <span className="text-[10px] text-slate-400">300 – 579</span>
            </div>
            <div className={`p-2 rounded-lg border ${assessment.creditScore >= 580 && assessment.creditScore < 670 ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/50' : 'bg-amber-950/20 border-amber-900 text-amber-400'}`}>
              <span className="font-bold block">Elevated</span>
              <span className="text-[10px] text-slate-400">580 – 669</span>
            </div>
            <div className={`p-2 rounded-lg border ${assessment.creditScore >= 670 && assessment.creditScore < 750 ? 'bg-blue-500/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/50' : 'bg-blue-950/20 border-blue-900 text-blue-400'}`}>
              <span className="font-bold block">Moderate</span>
              <span className="text-[10px] text-slate-400">670 – 749</span>
            </div>
            <div className={`p-2 rounded-lg border ${assessment.creditScore >= 750 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50' : 'bg-emerald-950/20 border-emerald-900 text-emerald-400'}`}>
              <span className="font-bold block">Prime (Low)</span>
              <span className="text-[10px] text-slate-400">750 – 900</span>
            </div>
          </div>
        </div>

        {/* TreeExplainer SHAP Feature Attribution Chart */}
        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" /> SHAP Feature Importance Attribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated directly from XGBoost tree branch decisions. Negative values lower default probability (positive for score).
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:block">TreeExplainer v2</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {shapEntries.slice(0, 8).map(([feature, val]) => {
              const isPositive = val < 0; // negative default prob contribution = good for borrower
              const absVal = Math.abs(val);
              const barWidth = Math.min(100, Math.round(absVal * 600));

              return (
                <div key={feature} className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-950/50 border border-slate-850">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200 font-mono uppercase">{feature}</span>
                    <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {val > 0 ? `+${val.toFixed(4)}` : val.toFixed(4)} ({isPositive ? 'Lowers Default Risk' : 'Increases Default Risk'})
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.max(5, barWidth)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Credit Score Simulator */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-[#0F172A] border border-emerald-500/30 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sliders size={18} /> Interactive Credit Score Simulator
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Projected Score: </span>
              <span className="text-lg font-black text-emerald-400">{simulatedScore}</span>
              {simDelta > 0 && <span className="text-xs text-emerald-300 font-mono font-bold ml-1.5">(+{simDelta} pts)</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold">Reduce Monthly Credit Utilization</span>
                <span className="text-emerald-400 font-mono font-bold">-{simBillReduction}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={simBillReduction}
                onChange={e => setSimBillReduction(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400">
                Paying down statement balances lowers bill-to-income utilization.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold">Consecutive On-Time Repayments</span>
                <span className="text-cyan-400 font-mono font-bold">+{simOnTimeMonths} Months</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={simOnTimeMonths}
                onChange={e => setSimOnTimeMonths(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400">
                Consistent on-time debt servicing is the strongest positive SHAP contributor.
              </span>
            </div>
          </div>
        </div>

        {/* Actionable Next Steps */}
        <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> Actionable Next Steps to Enhance Score
          </span>
          <ul className="list-disc list-inside text-slate-300 space-y-1 ml-1 leading-relaxed">
            <li>Ensure all upcoming micro-loan instalments are paid on or before their due dates.</li>
            <li>Maintain total revolving monthly debt obligations under 30% of your net income.</li>
            <li>Upload or import transaction CSVs regularly to provide fresh cashflow telemetry to the model.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
