import React, { useState, useMemo, useEffect } from 'react';
import { 
  Map as MapIcon, 
  BarChart2, 
  Filter,
  Users,
  AlertTriangle,
  Activity,
  ChevronRight,
  Shield,
  Radio,
  Crosshair,
  Search,
  Bell,
  Settings,
  Grid,
  Zap,
  LayoutDashboard,
  Sun,
  Moon,
  PlusCircle,
  Loader2
} from 'lucide-react';
import { Incident, FilterState, Severity } from './types';
import { SEVERITY_COLORS } from './constants';
import { useIncidents } from './hooks/useIncidents';
import IncidentMap from './components/IncidentMap';
import StatsPanel from './components/StatsPanel';
import InvestigateModal from './components/InvestigateModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'analytics'>('map');
  const { incidents, loading, error } = useIncidents();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    minFatalities: 0,
    dateRange: 'all',
    state: 'All',
    type: 'All',
    severity: 'All' as any
  });

  // Handle Theme Toggling
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const availableStates = useMemo(() => {
    const states = new Set(incidents.map(i => i.location.state));
    return ['All', ...Array.from(states).sort()];
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = now;
    
    switch (filters.dateRange) {
        case '24h': start = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '3m': start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case '1y': start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
        case 'custom': 
          if (filters.customDateStart) start = new Date(filters.customDateStart);
          if (filters.customDateEnd) end = new Date(filters.customDateEnd + 'T23:59:59');
          break;
        default: start = new Date(0); break;
    }
    return incidents.filter(inc => {
      const incDate = new Date(inc.date);
      const matchesDate = incDate >= start && incDate <= end;
      const matchesState = filters.state === 'All' || inc.location.state === filters.state;
      const matchesSearch = inc.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                           inc.location.lga.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesSeverity = filters.severity === 'All' || inc.severity === filters.severity;
      return matchesDate && matchesState && matchesSearch && matchesSeverity;
    });
  }, [incidents, filters]);

  const stats = useMemo(() => ({
    total: filteredIncidents.length,
    fatalities: filteredIncidents.reduce((sum, inc) => sum + inc.fatalities, 0),
    kidnapped: filteredIncidents.reduce((sum, inc) => sum + inc.kidnapped, 0),
    injuries: filteredIncidents.reduce((sum, inc) => sum + inc.injuries, 0),
  }), [filteredIncidents]);

  return (
    <div className="flex h-screen w-screen bg-tactical-bg text-slate-800 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-300">
      
      {/* LEFT NAVIGATION BAR (Ultra Slim) */}
      <nav className="w-16 h-full bg-white/80 dark:bg-slate-950/80 border-r border-slate-200 dark:border-white/5 flex flex-col items-center py-6 gap-6 z-50 transition-colors">
        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
          <Crosshair size={24} />
        </div>
        <div className="flex-1 flex flex-col gap-4 mt-8">
           {[
             { id: 'map', icon: MapIcon, label: 'Tactical Grid' },
             { id: 'analytics', icon: LayoutDashboard, label: 'Intelligence' }
           ].map(item => (
             <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`p-3 rounded-lg transition-all group relative ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/5'}`}
             >
                <item.icon size={20} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 uppercase tracking-widest border border-white/10 font-mono">
                  {item.label}
                </span>
             </button>
           ))}
        </div>
        <div className="flex flex-col gap-4">
           <button onClick={toggleTheme} className="p-3 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-all">
             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           <button className="p-3 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-all"><Settings size={20} /></button>
        </div>
      </nav>

      {/* LEFT SIDEBAR: INCIDENT FEED & FILTERS */}
      <aside className="w-80 h-full bg-white/40 dark:bg-slate-950/40 border-r border-slate-200 dark:border-white/5 flex flex-col z-40 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-white/5">
           <div className="flex items-center justify-between mb-6">
             <h1 className="text-sm font-black tracking-widest uppercase text-slate-900 dark:text-white font-mono italic">SENTINEL_NG</h1>
             <div className="flex items-center gap-2">
                <div className="status-pulse bg-emerald-500"></div>
                <span className="text-[9px] text-emerald-500/60 font-mono uppercase tracking-widest font-bold">LIVE</span>
             </div>
           </div>
           
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder="SEARCH SECTORS..."
                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-md py-2.5 pl-9 pr-4 text-[10px] font-mono text-slate-900 dark:text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none transition-all uppercase tracking-widest"
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
           {/* Filters */}
           <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Filter size={12} className="text-emerald-500" /> Operational Control
                </h3>
             </div>
             
             <div className="space-y-3">
               <div>
                  <label className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1.5 block">Timeframe</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: '24h', label: '24H' },
                      { value: '7d', label: '7D' },
                      { value: '30d', label: '1M' },
                      { value: '3m', label: '3M' },
                      { value: '1y', label: '1Y' },
                      { value: 'all', label: 'ALL' },
                    ].map(t => (
                      <button 
                        key={t.value}
                        onClick={() => setFilters({...filters, dateRange: t.value as any})}
                        className={`text-[9px] py-2 rounded font-bold border transition-all uppercase ${filters.dateRange === t.value ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/20' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-slate-500 hover:border-emerald-500/30 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setFilters({...filters, dateRange: 'custom'})}
                    className={`w-full mt-1.5 text-[9px] py-2 rounded font-bold border transition-all uppercase ${filters.dateRange === 'custom' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/20' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-slate-500 hover:border-emerald-500/30 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Custom Range
                  </button>
                  {filters.dateRange === 'custom' && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase block mb-1">From</label>
                        <input 
                          type="date"
                          value={filters.customDateStart || ''}
                          onChange={(e) => setFilters({...filters, customDateStart: e.target.value})}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded py-1.5 px-2 text-[10px] text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase block mb-1">To</label>
                        <input 
                          type="date"
                          value={filters.customDateEnd || ''}
                          onChange={(e) => setFilters({...filters, customDateEnd: e.target.value})}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded py-1.5 px-2 text-[10px] text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
               </div>
               <div>
                  <label className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1.5 block">Severity</label>
                  <select 
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded py-2 px-3 text-[10px] font-bold text-slate-900 dark:text-white uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    value={filters.severity}
                    onChange={(e) => setFilters({...filters, severity: e.target.value as any})}
                  >
                    <option value="All">All Priority</option>
                    {Object.values(Severity).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
             </div>
           </section>

           {/* Feed */}
           <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Alerts</h3>
                <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-bold">{filteredIncidents.length}</span>
              </div>
              
              <div className="space-y-3">
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 dark:border-white/5 rounded-lg">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono uppercase">No Intel Found</p>
                  </div>
                ) : filteredIncidents.map(inc => (
                  <div 
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="group tactical-glass p-4 rounded-lg cursor-pointer hover:tactical-glass-highlight transition-all border-slate-200 dark:border-white/5"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">#{inc.id.split('-')[1]}</span>
                       <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[inc.severity] }}></div>
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase leading-tight mb-3">
                      {inc.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500">
                        <AlertTriangle size={10} /> {inc.fatalities} KILLED
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                        <PlusCircle size={10} /> {inc.injuries} INJ
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 col-span-2">
                        <Users size={10} /> {inc.kidnapped} ABDUCTED
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </section>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative">
        
        {/* HEADER */}
        <header className="h-16 bg-white/40 dark:bg-slate-950/40 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-8 z-30 transition-colors">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded bg-emerald-500/5 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                  <Grid size={18} />
               </div>
               <div>
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">
                    {activeTab === 'map' ? 'Tactical Command Grid' : 'Intelligence Analytics'}
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-tighter">Sector Coverage: Nigeria Central</p>
               </div>
            </div>
            
            {/* Ticker HUD */}
            <div className="hidden lg:flex items-center gap-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 px-4 h-9 rounded-md overflow-hidden max-w-md">
              <span className="text-[9px] font-bold text-emerald-500 whitespace-nowrap">FEED_SYNC:</span>
              <div className="whitespace-nowrap animate-marquee text-[10px] text-slate-600 dark:text-slate-400 font-mono italic">
                 {incidents.map(i => ` /// [${i.location.state}] ${i.title.toUpperCase()} — SEVERITY: ${i.severity.toUpperCase()} `).join('')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-all flex items-center gap-2">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-[10px] font-mono hidden xl:inline uppercase tracking-widest">{theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'}</span>
             </button>
             <button className="relative p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
             </button>
             <div className="w-px h-6 bg-slate-200 dark:bg-white/5 mx-2"></div>
             <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white tracking-widest uppercase">Operator_01</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-500/60 font-mono uppercase">Clearance: Level 4</p>
               </div>
               <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                  <Shield size={16} className="text-slate-500" />
               </div>
             </div>
          </div>
        </header>

        {/* VIEWPORT */}
        <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
          {activeTab === 'map' ? (
              <IncidentMap incidents={filteredIncidents} onMarkerClick={setSelectedIncident} theme={theme} />
          ) : (
              <div className="h-full overflow-y-auto p-12 custom-scrollbar">
                 <StatsPanel incidents={filteredIncidents} />
              </div>
          )}

          {/* Floating HUD KPI (Map Only) */}
          {activeTab === 'map' && (
            <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none">
              {[
                { label: 'Fatalities', val: stats.fatalities, icon: AlertTriangle, color: 'text-red-500', bar: 'bg-red-500' },
                { label: 'Injuries', val: stats.injuries, icon: PlusCircle, color: 'text-sky-500', bar: 'bg-sky-500' },
                { label: 'Abducted', val: stats.kidnapped, icon: Users, color: 'text-amber-500', bar: 'bg-amber-500' },
                { label: 'Coverage', val: '98.4%', icon: Radio, color: 'text-emerald-500', bar: 'bg-emerald-500' }
              ].map((kpi, idx) => (
                <div key={idx} className="tactical-glass p-5 w-56 pointer-events-auto border-slate-200 dark:border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                    <kpi.icon size={14} className={kpi.color} />
                  </div>
                  <div className={`text-3xl font-black font-mono tracking-tighter ${kpi.color}`}>{kpi.val}</div>
                  <div className="mt-3 h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${kpi.bar} opacity-60 animate-pulse`} style={{ width: '70%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedIncident && (
        <InvestigateModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
        />
      )}

      {/* WELCOME HUD Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-3xl animate-in fade-in zoom-in duration-500 p-6">
          <div className="tactical-glass max-w-3xl w-full p-12 relative overflow-hidden text-center border-emerald-500/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
            <div className="mb-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-500 mb-8 shadow-2xl shadow-emerald-500/20 rotate-45">
                 <Crosshair size={48} className="-rotate-45" />
              </div>
              <h1 className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase mb-2">SENTINEL-NG</h1>
              <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-500 tracking-[0.5em] uppercase font-bold">Nigeria Security Intelligence Network</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
               <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.fatalities}</span>
                  <span className="text-[9px] block text-slate-500 uppercase font-black tracking-widest mt-1">Lethal Events</span>
               </div>
               <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.injuries}</span>
                  <span className="text-[9px] block text-slate-500 uppercase font-black tracking-widest mt-1">Injured</span>
               </div>
               <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.kidnapped}</span>
                  <span className="text-[9px] block text-slate-500 uppercase font-black tracking-widest mt-1">Abducted</span>
               </div>
               <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
                  <span className="text-[9px] block text-slate-500 uppercase font-black tracking-widest mt-1">Active Logs</span>
               </div>
            </div>

            <button 
              onClick={() => setShowWelcome(false)}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base transition-all flex items-center justify-center gap-4 tracking-widest uppercase rounded shadow-xl shadow-emerald-600/20 border border-emerald-400/20 group"
            >
              Access Command Center <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default App;