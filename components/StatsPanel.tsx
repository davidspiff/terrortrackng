import React from 'react';
import { Incident } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { INCIDENT_COLORS, SEVERITY_COLORS } from '../constants';
import { Shield, Zap, Target, Activity, AlertCircle } from 'lucide-react';

interface StatsPanelProps {
  incidents: Incident[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ incidents }) => {
  
  const stateStats = incidents.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.location.state);
    if (existing) {
      existing.fatalities += curr.fatalities;
      existing.kidnapped += curr.kidnapped;
      existing.injuries += curr.injuries;
    } else {
      acc.push({ 
        name: curr.location.state, 
        fatalities: curr.fatalities, 
        kidnapped: curr.kidnapped,
        injuries: curr.injuries 
      });
    }
    return acc;
  }, [] as { name: string; fatalities: number; kidnapped: number; injuries: number }[]).sort((a, b) => (b.fatalities + b.injuries) - (a.fatalities + a.injuries)).slice(0, 8);

  const typeStats = incidents.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: curr.type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const tooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono',
    borderWidth: '1px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  return (
    <div className="space-y-8 pb-12 transition-colors">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tighter uppercase italic">
            <Target className="text-emerald-500" size={28} /> Intelligence_Deck
          </h2>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500/60 font-mono tracking-widest mt-1">SITUATIONAL ANALYTICS // GRID_v4.0.1</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono p-3 rounded bg-emerald-500/5 border border-emerald-500/10">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-slate-500 dark:text-slate-400">NETWORK STATUS: <span className="text-emerald-600 dark:text-emerald-500">OPERATIONAL</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Impact Chart */}
        <div className="lg:col-span-2 tactical-glass p-8 rounded-xl relative overflow-hidden group transition-colors">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Regional Lethality Matrix
            </h3>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Filter: State Performance</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateStats}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                <Bar dataKey="fatalities" name="Killed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="injuries" name="Injured" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="kidnapped" name="Abducted" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution Chart */}
        <div className="tactical-glass p-8 rounded-xl transition-colors">
          <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Incident Distribution
          </h3>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {typeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INCIDENT_COLORS[entry.name as keyof typeof INCIDENT_COLORS] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{incidents.length}</span>
              <span className="text-[8px] text-slate-500 uppercase font-black">TOTAL LOGS</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {typeStats.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: INCIDENT_COLORS[t.name as keyof typeof INCIDENT_COLORS] }}></div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">{t.name}</span>
                </div>
                <span className="text-[10px] text-slate-900 dark:text-white font-mono">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      <div className="p-8 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <AlertCircle size={80} className="text-red-500" />
        </div>
        <div className="flex gap-6 items-center">
          <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-500 shrink-0">
            <Zap size={32} />
          </div>
          <div>
            <h4 className="text-red-600 dark:text-red-500 font-black text-lg uppercase tracking-tight">Active Security Alert</h4>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl">
              Kinetic engagement frequency has escalated by <span className="text-red-600 dark:text-red-500 font-bold">14.2%</span> in Northern sectors. 
              AI suggests immediate reinforcement of logistical corridors between Kaduna and FCT.
            </p>
          </div>
        </div>
        <button className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded transition-all shadow-lg shadow-red-600/20 whitespace-nowrap">
          Full Threat Report
        </button>
      </div>
    </div>
  );
};

export default StatsPanel;