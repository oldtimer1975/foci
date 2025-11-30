import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from "react-native";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { runAlgoritmus } from "../lib/algorithms/runAlgoritmus";

export default function AlgoritmusScreen() {
  const [homeTeam, setHomeTeam] = useState("Ferencváros");
  const [awayTeam, setAwayTeam] = useState("Újpest");
  const [homeOdds, setHomeOdds] = useState("1.85");
  const [drawOdds, setDrawOdds] = useState("3.40");
  const [awayOdds, setAwayOdds] = useState("4.20");
  const [result, setResult] = useState<any>(null);
  const [rawLoaded, setRawLoaded] = useState<string>("");

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require("../assets/football/matches.txt"));
      await asset.downloadAsync();
      const txt = await FileSystem.readAsStringAsync(asset.localUri!);
      setRawLoaded(txt);
    })();
  }, []);

  function calculate() {
    if (!rawLoaded) return;
    const market = {
      home: parseFloat(homeOdds),
      draw: parseFloat(drawOdds),
      away: parseFloat(awayOdds),
    };
    const out = runAlgoritmus(rawLoaded, homeTeam, awayTeam, market);
    setResult(out);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Foci Tipp Algoritmus</Text>
      <Text style={styles.label}>Hazai csapat</Text>
      <TextInput style={styles.input} value={homeTeam} onChangeText={setHomeTeam} />
      <Text style={styles.label}>Vendég csapat</Text>
      <TextInput style={styles.input} value={awayTeam} onChangeText={setAwayTeam} />
      <Text style={styles.label}>Odds (Home / Draw / Away)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.odds]} value={homeOdds} onChangeText={setHomeOdds} keyboardType="decimal-pad" />
        <TextInput style={[styles.input, styles.odds]} value={drawOdds} onChangeText={setDrawOdds} keyboardType="decimal-pad" />
        <TextInput style={[styles.input, styles.odds]} value={awayOdds} onChangeText={setAwayOdds} keyboardType="decimal-pad" />
      </View>
      <Button title="Számol" onPress={calculate} disabled={!rawLoaded} />

      {result && (
        <View style={styles.block}>
          <Text style={styles.subtitle}>Valószínűségek</Text>
            <Text>Home win: {(result.probs.homeWin * 100).toFixed(2)}%</Text>
            <Text>Draw: {(result.probs.draw * 100).toFixed(2)}%</Text>
            <Text>Away win: {(result.probs.awayWin * 100).toFixed(2)}%</Text>
            <Text style={styles.subtitle}>Legvalószínűbb tipp: {result.tip.tip} ({(result.tip.prob*100).toFixed(2)}%)</Text>
            <Text style={styles.subtitle}>Fair odds</Text>
            <Text>Home: {result.fairOdds.home.toFixed(2)} | Draw: {result.fairOdds.draw.toFixed(2)} | Away: {result.fairOdds.away.toFixed(2)}</Text>
            <Text style={styles.subtitle}>Gólvárakozás (λ)</Text>
            <Text>Hazai: {result.lambdaHome.toFixed(2)} | Vendég: {result.lambdaAway.toFixed(2)}</Text>
            {!!result.kelly.length && (
              <>
                <Text style={styles.subtitle}>Kelly (0.25 frakció)</Text>
                {result.kelly.map((k: any) => (
                  <Text key={k.selection}>
                    {k.selection}: prob {(k.prob*100).toFixed(1)}% odds {k.odds} stake fraction {(k.fraction*100).toFixed(2)}%
                  </Text>
                ))}
              </>
            )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  subtitle: { marginTop: 12, fontWeight: "600" },
  label: { marginTop: 8, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 6, marginTop: 4, flex: 1 },
  row: { flexDirection: "row", gap: 8, marginVertical: 8 },
  odds: { flex: 1 },
  block: { marginTop: 16, padding: 12, backgroundColor: "#f4f6fa", borderRadius: 8 }
});
