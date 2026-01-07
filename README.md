# TERRORTRACK 🛡️

**Nigeria Security Intelligence Dashboard**

A real-time security incident tracking and visualization platform for monitoring security events across Nigeria. Features an interactive map, analytics dashboard, and incident feed with filtering capabilities.

🔗 **Live Demo:** [https://terrortrackng.web.app](https://terrortrackng.web.app)

## Features

- 🗺️ **Interactive Map** - Visualize incidents across Nigeria with severity-based markers
- 📊 **Analytics Dashboard** - Charts and statistics for incident trends
- 🔍 **Advanced Filtering** - Filter by date range, state, severity, and search terms
- 🌓 **Dark/Light Mode** - Toggle between themes
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Real-time Data** - Live incident feed from Supabase

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Mapping:** Leaflet, React-Leaflet
- **Charts:** Recharts
- **Database:** Supabase
- **Hosting:** Firebase
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sentinel-nigeria.git
cd sentinel-nigeria

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Project Structure

```
├── components/          # React components
│   ├── IncidentMap.tsx  # Leaflet map component
│   ├── InvestigateModal.tsx
│   └── StatsPanel.tsx   # Analytics charts
├── hooks/               # Custom React hooks
├── lib/                 # Utilities (Supabase client)
├── scraper/             # Data scraping scripts
├── supabase/            # Database schema
├── App.tsx              # Main application
├── types.ts             # TypeScript types
└── constants.ts         # App constants
```

## License

MIT
