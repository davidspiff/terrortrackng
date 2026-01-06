import React from 'react';
import { Incident } from '../types';
import { X, ShieldAlert, ExternalLink, MapPin, Calendar, AlertTriangle, Users, PlusCircle, Link2 } from 'lucide-react';

interface InvestigateModalProps {
  incident: Incident | null;
  onClose: () => void;
}

const InvestigateModal: React.FC<InvestigateModalProps> = ({ incident, onClose }) => {
  if (!incident) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openGoogleSearch = () => {
    const query = `${incident.title} ${incident.location.state} Nigeria`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  // Get source URL if available
  const sourceUrl = (incident as any).source_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="tactical-glass w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border-emerald-500/20 max-h-[90vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/30">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide font-mono uppercase">Incident Report</h2>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">ID: {incident.id.slice(0, 8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          
          {/* Title & Type */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-3">{incident.title}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 uppercase">
                {incident.type}
              </span>
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase border ${
                incident.severity === 'Critical' ? 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20' :
                incident.severity === 'High' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20' :
                incident.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20' :
                'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
              }`}>
                {incident.severity} Severity
              </span>
              {incident.verified && (
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/20 rounded-lg text-center">
              <AlertTriangle size={16} className="mx-auto mb-1 text-red-500" />
              <span className="text-2xl font-black text-red-600 dark:text-red-500 font-mono block">{incident.fatalities}</span>
              <span className="text-[9px] text-slate-500 uppercase font-bold">Fatalities</span>
            </div>
            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-500/20 rounded-lg text-center">
              <PlusCircle size={16} className="mx-auto mb-1 text-sky-500" />
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono block">{incident.injuries}</span>
              <span className="text-[9px] text-slate-500 uppercase font-bold">Injuries</span>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-lg text-center">
              <Users size={16} className="mx-auto mb-1 text-amber-500" />
              <span className="text-2xl font-black text-amber-600 dark:text-amber-500 font-mono block">{incident.kidnapped}</span>
              <span className="text-[9px] text-slate-500 uppercase font-bold">Abducted</span>
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
              <MapPin size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Location</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{incident.location.lga}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{incident.location.state} State</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
              <Calendar size={18} className="text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Date & Time</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(incident.date)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {incident.description && (
            <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Summary</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {incident.description}
              </p>
            </div>
          )}

          {/* Source Link */}
          {sourceUrl && (
            <a 
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 transition-colors group"
            >
              <Link2 size={18} className="text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Original Source</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{sourceUrl}</p>
              </div>
              <ExternalLink size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3 transition-colors">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded text-[11px] font-bold text-slate-500 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all uppercase tracking-widest"
          >
            Close
          </button>
          <button 
            onClick={openGoogleSearch}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <ExternalLink size={14} /> Search News
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestigateModal;
