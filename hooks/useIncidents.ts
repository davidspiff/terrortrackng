import { useState, useEffect } from 'react';
import { supabase, toIncident, DbIncident } from '../lib/supabase';
import { Incident } from '../types';
import { MOCK_INCIDENTS } from '../constants';

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured, use mock data
      setLoading(false);
      return;
    }

    async function fetchIncidents() {
      try {
        const { data, error: fetchError } = await supabase
          .from('incidents')
          .select('*')
          .order('date', { ascending: false });

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          setIncidents((data as DbIncident[]).map(toIncident));
        }
        // If no data, keep mock incidents
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch');
        // Keep mock data on error
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();

    // Real-time subscription
    const channel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const newIncident = toIncident(payload.new as DbIncident);
          setIncidents((prev) => [newIncident, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { incidents, loading, error };
}
