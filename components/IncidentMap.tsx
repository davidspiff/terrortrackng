import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Incident } from '../types';
import { NIGERIA_CENTER, NIGERIA_BOUNDS, ZOOM_LEVEL, SEVERITY_COLORS } from '../constants';

interface IncidentMapProps {
  incidents: Incident[];
  onMarkerClick: (incident: Incident) => void;
  theme: 'dark' | 'light';
}

const IncidentMap: React.FC<IncidentMapProps> = ({ incidents, onMarkerClick, theme }) => {
  // Use reactive tile sets from CartoDB
  const tileUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className="w-full h-full relative z-0 sentinel-map">
      <MapContainer 
        center={NIGERIA_CENTER} 
        zoom={ZOOM_LEVEL}
        minZoom={6}
        maxZoom={12}
        maxBounds={NIGERIA_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true} 
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          key={theme} // Key forces re-render of TileLayer on theme change for smooth transition
          attribution='&copy; Sentinel Intelligence'
          url={tileUrl}
        />

        {incidents.map((inc) => (
          <CircleMarker
            key={inc.id}
            center={[inc.location.lat, inc.location.lng]}
            pathOptions={{ 
              color: SEVERITY_COLORS[inc.severity], 
              fillColor: SEVERITY_COLORS[inc.severity],
              fillOpacity: 0.4,
              weight: 2,
              className: 'pulse-marker'
            }}
            radius={Math.max(8, Math.min(inc.fatalities * 2, 30))} 
            eventHandlers={{
              click: () => onMarkerClick(inc)
            }}
          >
            <Tooltip 
              direction="top" 
              offset={[0, -10]} 
              opacity={1} 
              className="tactical-tooltip"
            >
              <div className="font-mono text-[10px] p-1">
                <div className="font-bold border-b border-white/20 mb-1 uppercase">{inc.location.lga}</div>
                <div className="text-emerald-500">{inc.type}</div>
                <div className="text-red-500 font-bold">FATALITIES: {inc.fatalities}</div>
              </div>
            </Tooltip>
            
            <Popup className="tactical-popup">
              <div className="p-4 w-64 bg-slate-900 border border-emerald-500/40 rounded shadow-2xl">
                <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-tighter truncate">
                  {inc.title}
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-950 p-2 rounded border border-red-500/20 text-center">
                    <span className="block text-xl font-black text-red-500 font-mono">{inc.fatalities}</span>
                    <span className="text-[7px] text-slate-500 uppercase font-bold">Fatalities</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-amber-500/20 text-center">
                    <span className="block text-xl font-black text-amber-500 font-mono">{inc.kidnapped}</span>
                    <span className="text-[7px] text-slate-500 uppercase font-bold">Abducted</span>
                  </div>
                </div>
                <button 
                  onClick={() => onMarkerClick(inc)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Investigate Sector
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <style>{`
        .tactical-tooltip {
          background-color: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(16, 185, 129, 0.5) !important;
          color: white !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          padding: 6px !important;
        }
        .tactical-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          color: white !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .tactical-popup .leaflet-popup-tip {
          background: #0f172a !important;
          border: 1px solid rgba(16, 185, 129, 0.5) !important;
        }
        .tactical-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        @keyframes pulse-ring {
          0% { transform: scale(.5); opacity: 0.8; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        .pulse-marker::before {
          content: '';
          display: block;
          width: 100%; height: 100%;
          border-radius: 50%;
          background-color: inherit;
          animation: pulse-ring 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default IncidentMap;