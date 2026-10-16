import React, { useState } from 'react';
import { Alert as AlertType } from '@shared/types';
import { X, Bell, CheckCheck, AlertTriangle, AlertCircle, Info, ExternalLink, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertType[];
  onRefreshAlerts: () => void;
  onNavigateTab: (tab: any) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onRefreshAlerts,
  onNavigateTab
}) => {
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'WARNING' | 'INFO'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/alerts/read-all');
      onRefreshAlerts();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      onRefreshAlerts();
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (a.resolved) return false;
    if (filter === 'ALL') return true;
    return a.severity === filter;
  });

  const getActionTab = (triggerType: string): string | null => {
    if (triggerType.includes('REPAYMENT') || triggerType.includes('OVERDUE')) return 'repayments';
    if (triggerType.includes('BUDGET') || triggerType.includes('EXPENSE')) return 'budgets';
    if (triggerType.includes('DEFICIT') || triggerType.includes('DTI')) return 'suggestions';
    if (triggerType.includes('KYC')) return 'profile';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md h-full bg-[#0F172A] border-l border-slate-800 flex flex-col shadow-2xl animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight">Notification Centre</h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {alerts.filter(a => !a.resolved).length} active financial notifications
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Bar & Filter Pills */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-slate-950/40">
          <div className="flex items-center gap-1.5 text-[11px]">
            {(['ALL', 'URGENT', 'WARNING', 'INFO'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || filteredAlerts.length === 0}
            className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-600 mb-3">
                <CheckCheck size={24} />
              </div>
              <span className="font-bold text-sm text-slate-400">All caught up!</span>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                No pending alerts or financial warnings at this time.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const actionTab = getActionTab(alert.triggerType);
              const isUrgent = alert.severity === 'URGENT' || alert.level === 'RED';
              const isWarning = alert.severity === 'WARNING' || alert.level === 'YELLOW';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                    isUrgent
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isUrgent ? (
                        <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                      ) : (
                        <Info size={16} className="text-cyan-400 shrink-0" />
                      )}
                      <span className={`text-xs font-black uppercase tracking-wider ${
                        isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {alert.title || alert.triggerType}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      title="Dismiss alert"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {alert.description}
                  </p>

                  {alert.recommendedAction && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 leading-normal">
                      💡 <strong className="text-slate-300">Action:</strong> {alert.recommendedAction}
                    </div>
                  )}

                  {actionTab && (
                    <button
                      onClick={() => {
                        onNavigateTab(actionTab);
                        onClose();
                      }}
                      className="mt-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start cursor-pointer transition-colors"
                    >
                      View in {actionTab.charAt(0).toUpperCase() + actionTab.slice(1)} <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
