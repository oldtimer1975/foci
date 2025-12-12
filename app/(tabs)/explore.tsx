import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, useColorScheme, Image } from 'react-native';

// Laptop LAN IP
const API_BASE = 'http://192.168.0.115:8081';

// Labda ikon – pontos útvonal a megadott helyhez
const BALL = require('../../assets/images/soccerball.png');

type Row = {
  fixtureId?: number|string;
  leagueName?: string;
  home?: string;
  away?: string;
  startTzLocal?: string;
  startUTC?: string;
  pickOutcome?: '1'|'X'|'2';
  probability?: number;
  score?: string | null;
  halftime?: string | null;
};

function themeColors(scheme: 'light'|'dark'|null|undefined) {
  const isDark = scheme === 'dark';
  return {
    bg: isDark ? '#0f1115' : '#f7f7f9',
    card: isDark ? '#181b22' : '#ffffff',
    border: isDark ? '#2a2f3a' : '#e7e9ee',
    text: isDark ? '#e6e8eb' : '#1f2430',
    subtext: isDark ? '#aeb4bd' : '#5c6470',
    primary: '#2563eb',
    shadow: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(16,24,40,0.08)',
    accent: '#22c55e',
  };
}

async function fetchFiles(): Promise<string[]> {
  const resp = await fetch(`${API_BASE}/files`);
  const json = await resp.json();
  if (!json?.ok) throw new Error(json?.error || 'files failed');
  return Array.isArray(json.files) ? json.files : [];
}

async function fetchBrowse(opts: { file: string; page: number; limit: number; window?: string; league?: string }) {
  const params = new URLSearchParams();
  params.set('file', opts.file);
  params.set('page', String(opts.page));
  params.set('limit', String(opts.limit));
  if (opts.window) params.set('window', opts.window);
  if (opts.league) params.set('league', opts.league);
  const url = `${API_BASE}/browse?${params.toString()}`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (!json?.ok) throw new Error(json?.error || 'browse failed');
  return json as { ok: boolean; page: number; limit: number; total: number; data: Row[] };
}

export default function ExploreTab() {
  const scheme = useColorScheme();
  const colors = themeColors(scheme);

  const [availableFiles, setAvailableFiles] = React.useState<string[]>([]);
  const [file, setFile] = React.useState('football.json'); // kezdő fájl
  const [windowStr, setWindowStr] = React.useState('00:00-23:59');
  const [league, setLeague] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);

  const loadFiles = React.useCallback(async () => {
    try {
      const files = await fetchFiles();
      setAvailableFiles(files);
      if (files.length > 0 && !files.includes(file)) {
        const fallback = files.find(f => /football\.json$/i.test(f)) || files[0];
        setFile(fallback);
      }
    } catch (e) {
      console.log('FILES ERROR', String(e));
      setAvailableFiles([]);
    }
  }, [file]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBrowse({ file, page, limit, window: windowStr, league });
      setRows(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.log('EXPLORE ERROR', String(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [file, page, limit, windowStr, league]);

  React.useEffect(() => { loadFiles().then(load); }, []);

  const styles = StyleSheet.create({
    screen: { flex: 1, padding: 16, backgroundColor: colors.bg },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    quickWindows: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    ballBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    ballBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    ballIcon: { width: 20, height: 20, opacity: 0.9 },
    ballText: { color: colors.text, fontWeight: '700' },
    ballTextActive: { color: '#fff' },
    row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    label: { fontWeight: '700', color: colors.subtext, minWidth: 62 },
    input: { flexGrow: 1, minWidth: 120, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, color: colors.text },
    smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary },
    smallBtnText: { color: '#fff', fontWeight: '800' },
    fileList: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    fileChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    fileChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    fileChipText: { color: colors.text, fontWeight: '700' },
    fileChipTextActive: { color: '#fff' },
    pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    button: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    buttonText: { color: colors.text, fontWeight: '700' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      marginTop: 8,
    },
    leagueText: { fontSize: 14, fontWeight: '800', color: colors.text },
    matchText: { marginTop: 4, fontSize: 16, fontWeight: '800', color: colors.text },
    metaText: { marginTop: 4, color: colors.subtext },
    badge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  });

  const presets = [
    { key: '00:00-08:00', label: '0-8 (reggeli)' },
    { key: '08:00-16:00', label: '8-16 (napi)' },
    { key: '16:00-24:00', label: '16-24 (esti)' },
    { key: '00:00-24:00', label: '0-24 (tutik)' },
  ];

  const setWindowAndReload = (val: string) => {
    setWindowStr(val);
    setPage(1);
    load();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Adat böngésző</Text>
      </View>

      <View style={styles.quickWindows}>
        {presets.map(p => {
          const active = windowStr === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[styles.ballBtn, active ? styles.ballBtnActive : null]}
              onPress={() => setWindowAndReload(p.key)}
            >
              <Image source={BALL} style={styles.ballIcon} />
              <Text style={[styles.ballText, active ? styles.ballTextActive : null]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.fileList}>
        {availableFiles.slice(0, 16).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.fileChip, f === file ? styles.fileChipActive : null]}
            onPress={() => { setFile(f); setPage(1); load(); }}
          >
            <Text style={[styles.fileChipText, f === file ? styles.fileChipTextActive : null]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Fájl</Text>
        <TextInput value={file} onChangeText={(t)=>{ setFile(t); setPage(1); }} style={styles.input} placeholder="pl. football.json vagy europe/valami.txt" />
        <TouchableOpacity style={styles.smallBtn} onPress={() => { setPage(1); load(); }}>
          <Text style={styles.smallBtnText}>Betölt</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Időablak</Text>
        <TextInput value={windowStr} onChangeText={setWindowStr} style={styles.input} placeholder="00:00-23:59" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Liga</Text>
        <TextInput value={league} onChangeText={setLeague} style={styles.input} placeholder="pl. Premier / hungary / france" />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Limit</Text>
        <TextInput value={String(limit)} onChangeText={(t)=>setLimit(parseInt(t||'0',10)||0)} style={styles.input} keyboardType="numeric" />
      </View>

      <View style={styles.pagerRow}>
        <TouchableOpacity style={styles.button} onPress={()=>{ const p = Math.max(1, page-1); setPage(p); load(); }}>
          <Text style={styles.buttonText}>{'<'} Előző</Text>
        </TouchableOpacity>
        <Text style={styles.label}>Oldal: {page} / {Math.max(1, Math.ceil(total/Math.max(limit,1)))}</Text>
        <TouchableOpacity style={styles.button} onPress={()=>{ const p = page+1; setPage(p); load(); }}>
          <Text style={styles.buttonText}>{'Következő >'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={load}>
        <Text style={styles.buttonText}>Frissítés</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      <FlatList
        style={{ marginTop: 12 }}
        data={rows}
        keyExtractor={(item, idx) => String(item.fixtureId ?? idx)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.leagueText}>{item.leagueName ?? '-'}</Text>
            <Text style={styles.matchText}>{item.home} vs {item.away}</Text>
            {item.startTzLocal && <Text style={styles.metaText}>Kezdés: {item.startTzLocal}</Text>}
            {item.score && <View style={styles.badge}><Text style={styles.badgeText}>Eredmény: {item.score}</Text></View>}
            {item.halftime && <Text style={styles.metaText}>Félidő: {item.halftime}</Text>}
            {typeof item.probability === 'number' && <Text style={styles.metaText}>Prob: {Math.round(item.probability*100)}%</Text>}
            {item.pickOutcome && <Text style={styles.metaText}>Kimenet: {item.pickOutcome}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={{ padding: 12 }}>Nincs adat ezen a beállításon.</Text> : null}
      />
    </View>
  );
}
