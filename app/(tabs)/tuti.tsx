import React from 'react';
import { View, Text, ActivityIndicator, FlatList, RefreshControl } from 'react-native';

// Production API base – Expo Go-ról ugyanazon Wi‑Fi-n tesztelve NEM kell IP-re állítani
const API_BASE = 'https://api.okosfoci.xyz';

// Segédfüggvények
const todayISO = () => new Date().toISOString().slice(0, 10);

const buildTutiUrl = (date?: string, tz?: string, window?: string, count?: number) => {
  const d = encodeURIComponent(date || todayISO());
  const t = encodeURIComponent(tz || 'Europe/Budapest');
  const w = encodeURIComponent(window || '00:00-23:59'); // teljes nap, hogy biztos legyen találat
  const c = String(count || 8);
  return `${API_BASE}/rec/tuti?date=${d}&tz=${t}&window=${w}&count=${c}`;
  // Ha később kell liga szűrés:
  // const leagues = '39,140,78,61'; // Premier, LaLiga, Bundesliga, Ligue1
  // return `${API_BASE}/rec/tuti?date=${d}&tz=${t}&window=${w}&count=${c}&leagues=${encodeURIComponent(leagues)}`;
};

async function fetchTuti(date?: string) {
  const url = buildTutiUrl(date);
  console.log('REQ TUTI', url);
  try {
    const resp = await fetch(url, { method: 'GET' });
    console.log('RESP TUTI status', resp.status);
    const data = await resp.json();
    console.log('RESP TUTI body', { ok: data?.ok, available: data?.available, picksLen: data?.picks?.length });
    // Fallback: ha üres a nap, ne dobjuk el a képernyőt — jelezzük, hogy nincs ajánlás
    if (data && data.ok === true && Array.isArray(data.picks) && data.picks.length === 0) {
      return { ...data, picks: [] };
    }
    return data;
  } catch (err: any) {
    console.log('RESP TUTI error', err?.message || String(err));
    return { ok: false, error: err?.message || 'network error', picks: [], available: 0 };
  }
}

type TutiPick = {
  fixtureId?: number;
  startUTC?: string;
  startTzLocal?: string;
  leagueId?: number;
  leagueName?: string;
  home?: string;
  away?: string;
  venue?: string | null;
  status?: string | null;
  pickOutcome?: '1' | 'X' | '2';
  probability?: number; // 0..1
};

export default function TutiTab() {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [data, setData] = React.useState<{ ok: boolean; picks: TutiPick[]; available?: number; error?: string } | null>(null);

  const load = React.useCallback(async (date?: string) => {
    setLoading(true);
    const d = await fetchTuti(date);
    setData(d);
    setLoading(false);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const d = await fetchTuti();
      if (mounted) {
        setData(d);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 16 }} />;
  if (!data || !data.ok) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Hiba vagy nincs adat.</Text>
        {data?.error && <Text style={{ marginTop: 8, color: 'crimson' }}>Hiba: {data.error}</Text>}
        <Text style={{ marginTop: 8 }}>Húzd le a frissítéshez.</Text>
      </View>
    );
  }

  const picks = Array.isArray(data.picks) ? data.picks : [];
  if (!picks.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>Nincs ajánlás a mai napra.</Text>
        <Text style={{ marginTop: 8 }}>Próbáld meg holnapi napon vagy szombaton.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={picks}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyExtractor={(item, idx) => String(item.fixtureId ?? idx)}
      renderItem={({ item }) => (
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <Text style={{ fontWeight: '600' }}>{item.leagueName ?? 'Ismeretlen liga'}</Text>
          <Text>{item.home} vs {item.away}</Text>
          {item.startTzLocal && <Text>Kezdés: {item.startTzLocal}</Text>}
          {item.pickOutcome && (
            <Text style={{ marginTop: 4 }}>
              Tuti: {item.pickOutcome} {typeof item.probability === 'number' ? `(${Math.round(item.probability * 100)}%)` : ''}
            </Text>
          )}
          {item.status && <Text>Állapot: {item.status}</Text>}
        </View>
      )}
      ListHeaderComponent={
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Tuti ajánlások</Text>
          <Text style={{ color: '#666' }}>Elérhető: {data.available ?? picks.length}</Text>
        </View>
      }
    />
  );
}
