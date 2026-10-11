import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldCheck, Database, BrainCircuit, AlignLeft, AlertCircle } from 'lucide-react';

const ModelLab = () => {
  const [loading, setLoading] = useState(true);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await axios.get('http://localhost:8000/model/info');
        setModelInfo(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch model metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchModelInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-600 rounded-2xl flex gap-3 items-start border border-red-200 shadow-sm">
          <AlertCircle />
          <div>
            <h2 className="font-bold text-lg">Error Loading Model Metrics</h2>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-red-500">Ensure the FastAPI ML service is running on port 8000.</p>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, model_name, training_dataset, features } = modelInfo;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-12 flex flex-col gap-8">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700">
              <BrainCircuit size={24} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Model Lab</h1>
          </div>
          <p className="text-slate-500 text-lg">Live training metrics, evaluation results, and diagnostics for the production credit scoring models.</p>
        </div>

        {/* Global Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14}/> Active Model</span>
            <span className="text-xl font-black text-slate-800">{model_name}</span>
          </div>
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Database size={14}/> Dataset</span>
            <span className="text-xl font-black text-slate-800 truncate" title={training_dataset}>{training_dataset}</span>
          </div>
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={14}/> Accuracy</span>
            <span className="text-3xl font-black text-primary">{(metrics?.accuracy * 100).toFixed(2)}%</span>
          </div>
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><AlignLeft size={14}/> Features</span>
            <span className="text-3xl font-black text-slate-800">{features?.length || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-800 mb-6">Performance Evaluation (Test Set)</h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-sm font-medium">Precision</span>
                  <span className="text-2xl font-black text-slate-900">{(metrics?.precision * 100).toFixed(2)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-sm font-medium">Recall</span>
                  <span className="text-2xl font-black text-slate-900">{(metrics?.recall * 100).toFixed(2)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-sm font-medium">F1-Score</span>
                  <span className="text-2xl font-black text-slate-900">{(metrics?.f1_score * 100).toFixed(2)}%</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-sm font-medium">ROC-AUC</span>
                  <span className="text-2xl font-black text-slate-900">{(metrics?.roc_auc * 100).toFixed(2)}%</span>
                </div>
              </div>

              <h3 className="font-bold text-slate-700 mb-4">Confusion Matrix</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                  <span className="block text-xs uppercase font-bold text-green-700 mb-1">True Negatives</span>
                  <span className="text-3xl font-black text-green-900">{metrics?.confusion_matrix?.tn}</span>
                  <span className="block text-[10px] text-green-600 mt-1">Correctly predicted No Default</span>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
                  <span className="block text-xs uppercase font-bold text-red-700 mb-1">False Positives</span>
                  <span className="text-3xl font-black text-red-900">{metrics?.confusion_matrix?.fp}</span>
                  <span className="block text-[10px] text-red-600 mt-1">Incorrectly predicted Default</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <span className="block text-xs uppercase font-bold text-amber-700 mb-1">False Negatives</span>
                  <span className="text-3xl font-black text-amber-900">{metrics?.confusion_matrix?.fn}</span>
                  <span className="block text-[10px] text-amber-600 mt-1">Missed Defaults (High Risk)</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                  <span className="block text-xs uppercase font-bold text-blue-700 mb-1">True Positives</span>
                  <span className="text-3xl font-black text-blue-900">{metrics?.confusion_matrix?.tp}</span>
                  <span className="block text-[10px] text-blue-600 mt-1">Correctly caught Defaults</span>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-900 text-white rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <BrainCircuit size={120} />
              </div>
              <h2 className="text-xl font-extrabold mb-4 relative z-10">Explainable AI (SHAP) Engine</h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl relative z-10">
                The ML backend utilizes SHAP (SHapley Additive exPlanations) to break down complex non-linear XGBoost predictions into human-readable components. 
                This allows loan officers and borrowers to understand EXACTLY why a loan was approved or rejected.
              </p>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="font-extrabold text-slate-800 mb-4">Feature Importance</h2>
              <p className="text-xs text-slate-500 mb-4">Input variables used by the model for classification.</p>
              
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2">
                {features?.map((f: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <span className="text-sm font-semibold text-slate-700 uppercase">{f.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModelLab;
