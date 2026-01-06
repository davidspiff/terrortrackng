import React from 'react';
import { Incident } from '../types';
import { X, ShieldAlert, ExternalLink, Globe, Eye, ShieldCheck } from 'lucide-react';

interface InvestigateModalProps {
  incident: Incident | null;
  onClose: () => void;
}

const InvestigateModal: React.FC<InvestigateModalProps> = ({ incident, onClose }) => {
  if (!incident) return null;

  // Build keyword searches based on incident data
  const buildKeywords = () => {
    const keywords: string[] = [];
    
    // Core keywords
    keywords.push(incident.location.state);
    keywords.push(incident.location.lga);
    keywords.push(incident.type);
    
    // Add severity-based keywords
    if (incident.fatalities > 0) keywords.push('attack', 'killed');
    if (incident.kidnapped > 0) keywords.push('kidnapping', 'abduction');
    if (incident.injuries > 0) keywords.push('violence');
    
    // Add type-specific keywords
    const typeKeywords: Record<string, string[]> = {
      'Terrorism': ['terrorist', 'insurgent', 'boko haram'],
      'Banditry': ['bandits', 'armed robbery', 'highway'],
      'Civil Unrest': ['protest', 'riot', 'demonstration'],
      'Unknown Gunmen': ['gunmen', 'attack', 'shooting'],
      'Police Clash': ['police', 'security', 'enforcement'],
      'Cult Clash': ['cult', 'gang', 'rivalry']
    };
    
    if (typeKeywords[incident.type]) {
      keywords.push(...typeKeywords[incident.type]);
    }
    
    keywords.push('Nigeria', 'news');
    
    return [...new Set(keywords)]; // Remove duplicates
  };

  const keywords = buildKeywords();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const incidentDate = formatDate(incident.date);

  const openKeywordSearch = (keyword: string) => {
    const query = `${keyword} ${incident.location.state} Nigeria ${incidentDate}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const openFullSearch = () => {
    const query = `${incident.title} ${incident.location.state} Nigeria ${incidentDate}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="tactical-glass w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border-emerald-500/20 max-h-[90vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/30">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide font-mono uppercase">INTEL_LOG: {incident.id}</h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Incident Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Core Data */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 bg-slate-100 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-4">Event classification</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{incident.title}</h3>
                <div className="flex gap-2 mb-6">
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 uppercase">
                    {incident.type}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 uppercase">
                    {incident.severity} RISK
                  </span>
                </div>
                
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-slate-500 uppercase">Sector:</span>
                    <span className="text-slate-900 dark:text-white">{incident.location.state} State</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-slate-500 uppercase">District:</span>
                    <span className="text-slate-900 dark:text-white">{incident.location.lga}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                    <span className="text-slate-500 uppercase">Timestamp:</span>
                    <span className="text-slate-900 dark:text-white">{new Date(incident.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/20 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[8px] text-slate-500 uppercase block mb-1">Fatalities</span>
                  <span className="text-2xl font-black text-red-600 dark:text-red-500 font-mono">{incident.fatalities}</span>
                </div>
                <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-500/20 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[8px] text-slate-500 uppercase block mb-1">Injuries</span>
                  <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{incident.injuries}</span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[8px] text-slate-500 uppercase block mb-1">Abducted</span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-500 font-mono">{incident.kidnapped}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-5 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} /> Incident Summary
                </h4>
                <p className="text-sm text-slate-700 dark:text-emerald-100 leading-snug">
                  {incident.description}
                </p>
              </div>
            </div>

            {/* Right Col: Keyword Search */}
            <div className="lg:col-span-2 space-y-8">
              <div className="p-8 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-emerald-500/10 shadow-inner">
                <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Eye size={14} /> Search Keywords
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Click any keyword below to search for related news and information:
                </p>
                
                <div className="flex flex-wrap gap-3">
                  {keywords.map((keyword, i) => (
                    <button
                      key={i}
                      onClick={() => openKeywordSearch(keyword)}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center gap-2"
                    >
                      <Globe size={14} />
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors">
           <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-emerald-500"></div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide leading-tight">
                Data visualized via Sentinel Grid v3.4
              </p>
           </div>
           <div className="flex gap-3 w-full sm:w-auto">
             <button 
               onClick={onClose}
               className="flex-1 sm:flex-none px-8 py-3 rounded text-[11px] font-bold text-slate-500 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all uppercase tracking-widest"
             >
               Dismiss
             </button>
             <button 
               onClick={openFullSearch}
               className="flex-1 sm:flex-none px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
             >
               <ExternalLink size={14} /> Full Investigation
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InvestigateModal;
