import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet, ScrollView } from 'react-native';

export default function TippekLista() {
  const [meccsek, setMeccsek] = useState([]);
  const [tippek, setTippek] = useState([]);
  const [loading, setLoading] = useState(true);

  // Szükség esetén módosítsd az URL-t, ahonnan a meccslistát kapod!
  useEffect(() => {
    fetch('http://zoltannagel.xyz/meccsek.json') // vagy a saját meccslista api/adat
      .then(response => response.json())
      .then(data => setMeccsek(data));
  }, []);

  // Szerveres tippek letöltése
  useEffect(() => {
    fetch('http://zoltannagel.xyz/tippek_FULL.json')
      .then(response => response.json())
      .then(data => {
        setTippek(data);
        setLoading(false);
      });
  }, []);

  // Párosítjuk a tippet + oddsot a meccsekhez
  const meccsTippekkel = meccsek.map(meccs => {
    // Ha a FULL JSON szerkezet home/away-t tartalmaz:
    // const tippObj = tippek.find(t =>
    //      t.home === meccs.home && t.away === meccs.away
    // );
    // Ha csak "match" (string), akkor így:
    const tippObj = tippek.find(t =>
      t.match.trim().toLowerCase() ===
      `${meccs.home} vs ${meccs.away}`.trim().toLowerCase()
    );
    return {
      ...meccs,
      tip: tippObj ? tippObj.tip : "-",
      odds: tippObj ? tippObj.odds : "-"
    };
  });

  // Lista renderelése
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#56c470" />
      ) : (
        <FlatList
          data={meccsTippekkel}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.league}>{item.league}</Text>
              <Text style={styles.match}>{item.home} vs {item.away}</Text>
              <Text style={styles.time}>Kezdés: {item.startTime}</Text>
              <Text style={styles.tipOdds}>
                Tipp: <Text style={styles.tip}>{item.tip}</Text>  
                Odds: <Text style={styles.odds}>{item.odds}</Text>
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// Stílusok
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 14 },
  card: { marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5', elevation: 2 },
  league: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  match: { fontSize: 16, marginBottom: 6 },
  time: { fontSize: 15, color: '#555', marginBottom: 4 },
  tipOdds: { fontSize: 17, marginTop: 4 },
  tip: { color: 'green', fontWeight: 'bold', fontSize: 17 },
  odds: { color: 'blue', fontWeight: 'bold', fontSize: 17 }
});
