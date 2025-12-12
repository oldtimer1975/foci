import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';

const API_BASE = 'https://api.okosfoci.xyz';

// Segéd
const todayISO = () => new Date().toISOString().slice(0, 10);
type PickRow = {
  fixtureId?: number;
  leagueName?: string;
  home?: string;
  away?: string;
  startTzLocal?: string;
  pickOutcome?: '1'|'X'|'2';
  probability?: number; // 0..1
  odds?: { home?: number; draw?: number; away?: number } | any;
};

// Alap lekérő — időablak szerint
async function fetchWindow(window: string, count: number, date?: string) {
  const d = date || todayISO();
  const tz = 'Europe/Budapest';
  const url = `${API_BASE}/rec?date=${encodeURIComponent(d)}&tz=${encodeURIComponent(tz)}&window=${encodeURIComponent(window)}&count=${count}`;
  console.log('ALG REQ', url);
  const resp = await fetch(url);
  const data = await resp.json();
  console.log('ALG RESP', { ok: data?.ok, available: data?.available, picksLen: Array.isArray(data?.picks) ? data.picks.length : 0 });
  return Array.isArray(data?.picks) ? data.picks as PickRow[] : [];
}

// Alap lekérő — Tuti
async function fetchTuti(count: number, date?: string) {
  const d = date || todayISO();
  const tz = 'Europe/Budapest';
  const url = `${API_BASE}/rec/tuti?date=${encodeURIComponent(d)}&tz=${encodeURIComponent(tz)}&window=${encodeURIComponent('00:00-23:59')}&count=${count}`;
  console.log('ALG TUTI REQ', url);
  const resp = await fetch(url);
  const data = await resp.json();
  console.log('ALG TUTI RESP', { ok: data?.ok, available: data?.available, picksLen: Array.isArray(data?.picks) ? data.picks.length : 0 });
  return Array.isArray(data?.picks) ? data.picks as PickRow[] : [];
}

// Példa algoritmus pipeline:
// - összegyűjt (window vagy tuti)
// - szűr odds/valószínűség küszöb szerint
// - rendez score alapján (probability * oddsWeight + ligaWeight)
// - top N vissza
function runAlgorithm(rows: PickRow[], cfg: {
  outcome?: '1'|'X'|'2'|'ANY';
  minProb?: number; // 0..1
  minOdds?: number; // decimális (pl. 1.5)
  oddsField?: 'home'|'draw'|'away';
  topN?: number;
}) {
  const {
    outcome = 'ANY',
    minProb = 0.5,
    minOdds = 1.5,
    oddsField = 'home',
    topN = rows.length,
  } = cfg;

  const filtered = rows.filter(r => {
    const okOutcome = outcome === 'ANY' ? true : r.pickOutcome === outcome;
    const okProb = typeof r.probability === 'number' ? r.probability >= minProb : false;
    const oddsVal = r?.odds?.[oddsField];
    const okOdds = typeof oddsVal === 'number' ? oddsVal >= minOdds : true; // ha nincs odds, ne dobjuk ki
    return okOutcome && okProb && okOdds;
  });

  // egyszerű score: probability * oddsWeight (odds min/max normalizálás nélkül)
  const oddsWeight = 1.0;
  const scored = filtered.map(r => {
    const oddsVal = r?.odds?.[oddsField];
    const score = (r.probability || 0) * (typeof oddsVal === 'number' ? oddsVal : 1) * oddsWeight;
    return { ...r, _score: score };
  });

  scored.sort((a, b) => (b._score || 0) - (a._score || 0));
  return scored.slice(0, topN);
}

export default function AlgoritmusTab() {
  const [date, setDate] = React.useState(todayISO());
  const [window, setWindow] = React.useState('00:00-23:59');
  const [count, setCount] = React.useState(8);

  const [useTuti, setUseTuti] = React.useState(true);
  const [outcome, setOutcome] = React.useState<'1'|'X'|'2'|'ANY'>('ANY');
  const [minProb, setMinProb] = React.useState(0.52);
  const [minOdds, setMinOdds] = React.useState(1.5);
  const [oddsField, setOddsField] = React.useState<'home'|'draw'|'away'>('home');

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<PickRow[]>([]);
  const [result, setResult] = React.useState<PickRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const base = useTuti ? await fetchTuti(count, date) : await fetchWindow(window, count, date);
      setRows(base);
      const res = runAlgorithm(base, { outcome, minProb, minOdds, oddsField, topN: count });
      setResult(res);
    } catch (e) {
      console.log('ALG ERROR', String(e));
      setRows([]);
      setResult([]);
    } finally {
      setLoading(false);
    }
  }, [useTuti, window, count, date, outcome, minProb, minOdds, oddsField]);

  React.useEffect(() => {
    // első betöltés
    load();
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Algoritmus</Text>

      {/* Paraméterek */}
      <View style={styles.row}>
        <Text style={styles.label}>Dátum</Text>
        <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="YYYY-MM-DD" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Ablak</Text>
        <TextInput value={window} onChangeText={setWindow} style={styles.input} placeholder="00:00-23:59" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Count</Text>
        <TextInput value={String(count)} onChangeText={(t)=>setCount(parseInt(t||'0',10)||0)} style={styles.input} keyboardType="numeric" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Forrás</Text>
        <TouchableOpacity style={[styles.button, useTuti ? styles.buttonPrimary : null]} onPress={()=>setUseTuti(true)}><Text style={styles.buttonText}>Tuti</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, !useTuti ? styles.buttonPrimary : null]} onPress={()=>setUseTuti(false)}><Text style={styles.buttonText}>Ablak</Text></TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Kimenet</Text>
        {(['ANY','1','X','2'] as const).map(k=>(
          <TouchableOpacity key={k} style={[styles.button, outcome===k?styles.buttonPrimary:null]} onPress={()=>setOutcome(k)}>
            <Text style={styles.buttonText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Min. Prob</Text>
        <TextInput value={String(minProb)} onChangeText={(t)=>setMinProb(parseFloat(t)||0)} style={styles.input} keyboardType="decimal-pad" />
        <Text style={styles.label}>Min. Odds</Text>
        <TextInput value={String(minOdds)} onChangeText={(t)=>setMinOdds(parseFloat(t)||0)} style={styles.input} keyboardType="decimal-pad" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Odds mező</Text>
        {(['home','draw','away'] as const).map(f=>(
          <TouchableOpacity key={f} style={[styles.button, oddsField===f?styles.buttonPrimary:null]} onPress={()=>setOddsField(f)}>
            <Text style={styles.buttonText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.runButton]} onPress={load}>
        <Text style={styles.runButtonText}>Futtatás</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      {/* Eredmény lista */}
      <FlatList
        style={{ marginTop: 12 }}
        data={result}
        keyExtractor={(item, idx) => String(item.fixtureId ?? idx)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.league}>{item.leagueName ?? '-'}</Text>
            <Text style={styles.match}>{item.home} vs {item.away}</Text>
            {item.startTzLocal && <Text style={styles.meta}>Kezdés: {item.startTzLocal}</Text>}
            {item.pickOutcome && <Text style={styles.meta}>Kimenet: {item.pickOutcome}{typeof item.probability==='number' ? ` • ${Math.round(item.probability*100)}%` : ''}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={{ padding: 12 }}>Nincs találat a szűrésre.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#f7f7f9' },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  label: { fontWeight: '700', color: '#333' },
  input: { flexGrow: 1, minWidth: 120, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e9ee', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  button: { backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  buttonPrimary: { backgroundColor: '#2563eb' },
  buttonText: { color: '#111', fontWeight: '700' },
  runButton: { marginTop: 10, backgroundColor: '#111', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  runButtonText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e7e9ee', padding: 12 },
  league: { fontSize: 14, fontWeight: '700', color: '#1f2430' },
  match: { marginTop: 4, fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 4, color: '#5c6470' },
});
