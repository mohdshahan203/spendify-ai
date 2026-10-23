import React from 'react';
import {
  CreditAssessmentResult,
  CreditFactorItem
} from '@shared/types';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronRight,
  Database,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface CreditScoreCenterpieceProps {
  assessment: CreditAssessmentResult | null;
  loading: boolean;
  isRecalculating: boolean;
  onRecalculate: () => void;
  onOpenBreakdown: () => void;
  error?: string | null;
}

export const CreditScoreCenterpiece: React.FC<CreditScoreCenterpieceProps> = ({
  assessment,
  loading,
  isRecalculating,
  onRecalculate,
  onOpenBreakdown,
  error
}) => {
  // If loading initial state
  if (loading && !assessment) {
    return (
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0F172A] border border-slate-800 shadow-2xl flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4"></div>
        <h3 className="text-lg font-bold text-white">Analyzing Behavioral Financial Telemetry...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Querying machine learning pipeline, computing cashflow features, and generating SHAP TreeExplainer attributions.
        </p>
      </div>
    );
  }

  // ML Service Offline Error State
  if (error && !assessment) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0 mt-1">
            <AlertTriangle size={28} />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">ML Scoring Pipeline Offline</span>
            <h3 className="text-xl font-black text-white mt-0.5">Automated Credit Scorer Unavailable</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {error || 'Unable to establish connection to the FastAPI ML service on port 8000. Start the service or retry evaluation.'}
            </p>
          </div>
        </div>
        <button
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRecalculating ? 'animate-spin' : ''} />
          {isRecalculating ? 'Retrying Pipeline...' : 'Retry Assessment'}
        </button>
      </div>
    );
  }

  const score = assessment?.creditScore || 750;
  const minScore = assessment?.scoreRange?.min || 300;
  const maxScore = assessment?.scoreRange?.max || 900;
  const percentage = Math.min(100, Math.max(0, ((score - minScore) / (maxScore - minScore)) * 100));

  // Circular gauge parameters
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Tier color mapping
  const tier = assessment?.riskCategory || 'LOW';
  const tierConfig: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
    LOW: {
      label: 'PRIME / LOW RISK',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      desc: 'Prime creditworthiness with high approval probability'
    },
    MEDIUM: {
      label: 'MODERATE RISK',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
      desc: 'Stable profile with standard underwriting terms'
    },
    HIGH: {
      label: 'ELEVATED RISK',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      desc: 'Higher likelihood of repayment delays; restructuring recommended'
    },
    CRITICAL: {
      label: 'CRITICAL RISK',
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/40',
      desc: 'Significant default vulnerability; micro-loan caps applied'
    }
  };

  const currentTier = tierConfig[tier] || tierConfig.LOW;
  const delta = assessment?.scoreDelta;
  const sufficiency = assessment?.dataSufficiency;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0F172A] to-[#0A101D] border border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
              Behavioral Credit Risk Assessment
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-normal">
                v{assessment?.modelVersion || '2.0.0'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated by XGBoost Classifier + TreeExplainer SHAP attribution pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Data Sufficiency Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
              sufficiency?.quality === 'SUFFICIENT'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : sufficiency?.quality === 'PRELIMINARY'
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title={sufficiency?.message}
          >
            <Database size={11} />
            {sufficiency?.quality === 'SUFFICIENT' ? 'Verified Telemetry' : sufficiency?.quality === 'PRELIMINARY' ? 'Preliminary Telemetry' : 'Insufficient Data'}
          </span>

          {/* Recalculate Button */}
          <button
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Recalculate using live transaction records"
          >
            <RefreshCw size={12} className={isRecalculating ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
            {isRecalculating ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Main Centerpiece Content: Gauge + Metric Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Circular SVG Gauge & Big Score Display */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#1E293B"
                strokeWidth="12"
                fill="none"
              />
              {/* Animated Progress Arc */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="url(#creditScoreGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="creditScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="60%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Center Score Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                SpendiFy Score
              </span>
              <div className="text-4xl md:text-5xl font-black tracking-tight text-white mt-0.5">
                {score}
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Range: {minScore} – {maxScore}
              </span>
            </div>
          </div>

          {/* Tier Badge & Delta Change */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}>
                {currentTier.label}
              </span>

              {delta !== null && delta !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    delta > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : delta < 0
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  title="Score change relative to previous assessment"
                >
                  {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : null}
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0'} pts
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center max-w-xs mt-0.5">
              {currentTier.desc}
            </p>
          </div>
        </div>

        {/* Right Column: Key Driver Factors & Telemetry Signals */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Primary Risk & Positive Drivers (SHAP Value Attribution)
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Factors derived by TreeExplainer from your recent billing, statement, and repayment transactions:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Top Positive Drivers */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} /> Positive Impact Factors
                </span>
                <span className="text-[10px] text-emerald-500/80">Lowers Risk</span>
              </div>

              {assessment?.positiveFactors && assessment.positiveFactors.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {assessment.positiveFactors.slice(0, 2).map((factor: CreditFactorItem) => (
                    <div key={factor.feature} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-200 block">{factor.name}</span>
                      <span className="text-[11px] text-emerald-300/80 mt-0.5 block">{factor.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-400 italic">No strong positive signals recorded yet.</div>
              )}
            </div>

            {/* Top Negative Drivers */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <TrendingDown size={14} /> Risk Weighting Factors
                </span>
                <span className="text-[10px] text-amber-500/80">Raises Risk</span>
              </div>

              {assessment?.negativeFactors && assessment.negativeFactors.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {assessment.negativeFactors.slice(0, 2).map((factor: CreditFactorItem) => (
                    <div key={factor.feature} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                      <span className="font-bold text-slate-200 block">{factor.name}</span>
                      <span className="text-[11px] text-amber-300/80 mt-0.5 block">{factor.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-emerald-400 font-mono">No significant risk penalty factors found.</div>
              )}
            </div>
          </div>

          {/* Model Metrics & Breakdown CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 font-mono">
              <span>Last Assessed: {assessment?.calculatedAt ? new Date(assessment.calculatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Live'}</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>Default Prob: {assessment?.defaultProbability ? (assessment.defaultProbability * 100).toFixed(1) + '%' : 'N/A'}</span>
            </div>

            <button
              onClick={onOpenBreakdown}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Layers size={13} />
              View Full Score Breakdown & Charts
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
