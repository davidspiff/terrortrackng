import React, { useMemo } from 'react';
import { Incident } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { INCIDENT_COLORS, SEVERITY_COLORS } from '../constants';
import { Target, Activity, TrendingUp, TrendingDown, Calendar, MapPin, Users, AlertTriangle, Skull, Clock } from 'lucide-react';

interface StatsPanelProps {
  incidents: Incident[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ incidents }) => {
  
  // State-based statistics
  const stateStats = useMemo(() => {
    return incidents.reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.location.state);
      if (existing) {
        existing.fatalities += curr.fatalities;
        existing.kidnapped += curr.kidnapped;
        existing.injuries += curr.injuries;
        existing.count += 1;
      } else {
        acc.push({ 
          name: curr.location.state, 
          fatalities: curr.fatalities, 
          kidnapped: curr.kidnapped,
          injuries: curr.injuries,
          count: 1
        });
      }
      return acc;
    }, [] as { name: string; fatalities: number; kidnapped: number; injuries: number; count: number }[])
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, 10);
  }, [incidents]);

  // Incident type distribution
  const typeStats = useMemo(() => {
    return incidents.reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: curr.type, value: 1 });
      }
      return acc;
    }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);
  }, [incidents]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months: { [key: string]: { month: string; incidents: number; fatalities: number; kidnapped: number } } = {};
    
    incidents.forEach(inc => {
      const date = new Date(inc.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!months[key]) {
        months[key] = { month: monthName, incidents: 0, fatalities: 0, kidnapped: 0 };
      }
      months[key].incidents += 1;
      months[key].fatalities += inc.fatalities;
      months[key].kidnapped += inc.kidnapped;
    });
    
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v);
  }, [incidents]);

  // Weekly pattern (day of week analysis)
  const weeklyPattern = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pattern = days.map(day => ({ day, incidents: 0, fatalities: 0 }));
    
    incidents.forEach(inc => {
      const dayIndex = new Date(inc.date).getDay();
      pattern[dayIndex].incidents += 1;
      pattern[dayIndex].fatalities += inc.fatalities;
    });
    
    return pattern;
  }, [incidents]);

  // Severity breakdown
  const severityStats = useMemo(() => {
    return incidents.reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.severity);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: curr.severity, value: 1 });
      }
      return acc;
    }, [] as { name: string; value: number }[]);
  }, [incidents]);

  // Top 5 deadliest incidents
  const deadliestIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => b.fatalities - a.fatalities)
      .slice(0, 5);
  }, [incidents]);

  // Calculate totals and trends
  const totals = useMemo(() => {
    const total = incidents.reduce((acc, inc) => ({
      fatalities: acc.fatalities + inc.fatalities,
      kidnapped: acc.kidnapped + inc.kidnapped,
      injuries: acc.injuries + inc.injuries,
    }), { fatalities: 0, kidnapped: 0, injuries: 0 });

    // Calculate 30-day vs previous 30-day trend
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recent = incidents.filter(i => new Date(i.date) >= thirtyDaysAgo);
    const previous = incidents.filter(i => {
      const d = new Date(i.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const recentFatalities = recent.reduce((sum, i) => sum + i.fatalities, 0);
    const previousFatalities = previous.reduce((sum, i) => sum + i.fatalities, 0);
    const trend = previousFatalities > 0 
      ? ((recentFatalities - previousFatalities) / previousFatalities * 100).toFixed(1)
      : '0';

    return { ...total, count: incidents.length, trend: parseFloat(trend) };
  }, [incidents]);

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '10px',
    fontFamily: 'monospace',
    borderWidth: '1px',
  };

  return (
    <div className="space-y-6 pb-12 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight uppercase">
            <Target className="text-emerald-500" size={24} /> Intelligence Deck
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-1">{incidents.length} incidents analyzed</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <Activity size={12} className="text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">LIVE DATA</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="tactical-glass p-5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-500 uppercase font-bold">Total Incidents</span>
            <Calendar size={14} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totals.count.toLocaleString()}</div>
        </div>
        <div className="tactical-glass p-5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-500 uppercase font-bold">Fatalities</span>
            <Skull size={14} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-500 font-mono">{totals.fatalities.toLocaleString()}</div>
          <div className={`text-[9px] font-mono flex items-center gap-1 mt-1 ${totals.trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {totals.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(totals.trend)}% vs prev 30d
          </div>
        </div>
        <div className="tactical-glass p-5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-500 uppercase font-bold">Kidnapped</span>
            <Users size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-500 font-mono">{totals.kidnapped.toLocaleString()}</div>
        </div>
        <div className="tactical-glass p-5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-500 uppercase font-bold">Injuries</span>
            <AlertTriangle size={14} className="text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-500 font-mono">{totals.injuries.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 tactical-glass p-6 rounded-xl">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={12} className="text-emerald-500" /> Monthly Trend (12 Months)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="kidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="fatalities" name="Fatalities" stroke="#ef4444" fill="url(#fatGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="kidnapped" name="Kidnapped" stroke="#f59e0b" fill="url(#kidGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Type Pie */}
        <div className="tactical-glass p-6 rounded-xl">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Incident Types</h3>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                  {typeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INCIDENT_COLORS[entry.name as keyof typeof INCIDENT_COLORS] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {typeStats.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: INCIDENT_COLORS[t.name as keyof typeof INCIDENT_COLORS] || '#64748b' }}></div>
                  <span className="text-slate-500 font-mono">{t.name}</span>
                </div>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Affected States */}
        <div className="tactical-glass p-6 rounded-xl">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={12} className="text-red-500" /> Most Affected States
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateStats} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="fatalities" name="Fatalities" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Pattern */}
        <div className="tactical-glass p-6 rounded-xl">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Weekly Attack Pattern</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyPattern}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="incidents" name="Incidents" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deadliest Incidents Table */}
      <div className="tactical-glass p-6 rounded-xl">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Skull size={12} className="text-red-500" /> Deadliest Incidents
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="text-left py-2 px-3 text-slate-500 font-bold uppercase">Date</th>
                <th className="text-left py-2 px-3 text-slate-500 font-bold uppercase">Title</th>
                <th className="text-left py-2 px-3 text-slate-500 font-bold uppercase">State</th>
                <th className="text-right py-2 px-3 text-slate-500 font-bold uppercase">Fatalities</th>
                <th className="text-right py-2 px-3 text-slate-500 font-bold uppercase">Kidnapped</th>
              </tr>
            </thead>
            <tbody>
              {deadliestIncidents.map((inc, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="py-3 px-3 text-slate-500 font-mono">{new Date(inc.date).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white font-medium truncate max-w-xs">{inc.title}</td>
                  <td className="py-3 px-3 text-slate-500">{inc.location.state}</td>
                  <td className="py-3 px-3 text-right text-red-600 dark:text-red-500 font-mono font-bold">{inc.fatalities}</td>
                  <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-500 font-mono">{inc.kidnapped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {severityStats.map((sev, i) => (
          <div key={i} className="tactical-glass p-4 rounded-lg border-l-4" style={{ borderLeftColor: SEVERITY_COLORS[sev.name as keyof typeof SEVERITY_COLORS] }}>
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">{sev.name}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{sev.value}</div>
            <div className="text-[9px] text-slate-400 font-mono">{((sev.value / incidents.length) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsPanel;
