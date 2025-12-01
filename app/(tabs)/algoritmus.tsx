// ==============================
// app/(tabs)/algoritmus.tsx
// Teljes copy & paste verzió
// ==============================
//
// FONTOS: A fájl helye: app/(tabs)/algoritmus.tsx
// A runAlgoritmus fájl helye: lib/algorithms/runAlgoritmus.ts
// Mivel két szinttel feljebb kell menni (app/(tabs) -> app -> gyökér),
// a helyes relatív útvonal: ../../lib/algorithms/runAlgoritmus
//
// Ha a runAlgoritmus.ts NAMED exportot használ:
//   export function runAlgoritmus(...) { ... }
// akkor így importáld (EZ van most itt beállítva):
//   import { runAlgoritmus } from "../../lib/algorithms/runAlgoritmus";
//
// Ha DEFAULT export van benne:
//   export default function runAlgoritmus(...) { ... }
// akkor módosítsd erre:
//   import runAlgoritmus from "../../lib/algorithms/runAlgoritmus";
//
// Ha alias rendszert szeretnél (pl. @lib/algorithms/runAlgoritmus):
//   - tsconfig.json-ben add hozzá:
//       "baseUrl": ".",
//       "paths": { "@lib/*": ["lib/*"] }
//   - és import: import { runAlgoritmus } from "@lib/algorithms/runAlgoritmus";
//   Metro restart: npx expo start -c
//
// ==============================

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
// Ha NAMED export:
import { runAlgoritmus } from "../../lib/algorithms/runAlgoritmus";
// Ha DEFAULT export lenne, akkor a fenti sort cseréld erre:
// import runAlgoritmus from "../../lib/algorithms/runAlgoritmus";

type PredictionResult = {
  home: string;
  away: string;
  prediction: {
    homeGoals: number;
    awayGoals: number;
  };
  [key: string]: any;
};

export default function AlgoritmusScreen() {
  const [homeTeam, setHomeTeam] = useState("Ferencváros");
  const [awayTeam, setAwayTeam] = useState("Újpest");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Példa: fókusz eseményeknél reset
  useFocusEffect(
    useCallback(() => {
      setErrorMsg("");
      return () => {};
    }, [])
  );

  const handleRun = async () => {
    setLoading(true);
    setErrorMsg("");
    setResult(null);
    try {
      // Itt futtatjuk a tényleges algoritmust
      const r = runAlgoritmus(homeTeam, awayTeam);
      setResult(r);
    } catch (err: any) {
      setErrorMsg(err?.message || "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Algoritmus</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Hazai csapat:</Text>
        <TextInput
          style={styles.input}
          value={homeTeam}
          onChangeText={setHomeTeam}
          placeholder="Hazai csapat"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Vendég csapat:</Text>
        <TextInput
          style={styles.input}
          value={awayTeam}
          onChangeText={setAwayTeam}
          placeholder="Vendég csapat"
          autoCapitalize="none"
        />
      </View>

      <Pressable style={styles.button} onPress={handleRun} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Futtasd</Text>}
      </Pressable>

      {errorMsg ? <Text style={styles.error}>Hiba: {errorMsg}</Text> : null}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Eredmény</Text>
          <Text style={styles.resultLine}>
            {result.home} vs {result.away}
          </Text>
          <Text style={styles.resultLine}>
            Góljai (becslés): {result.prediction.homeGoals.toFixed(2)} - {result.prediction.awayGoals.toFixed(2)}
          </Text>
          {/* Ha a runAlgoritmus további mezőket ad vissza, itt jelenítsd meg */}
          {Object.keys(result)
            .filter((k) => !["home", "away", "prediction"].includes(k))
            .map((extraKey) => (
              <Text key={extraKey} style={styles.resultExtra}>
                {extraKey}: {JSON.stringify((result as any)[extraKey])}
              </Text>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

// ==============================
// Stílusok
// ==============================
const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: "#101418",
    flexGrow: 1
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
    color: "#fff"
  },
  field: {
    marginBottom: 14
  },
  label: {
    color: "#ddd",
    marginBottom: 6,
    fontSize: 14
  },
  input: {
    backgroundColor: "#1e242b",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2f3a44",
    fontSize: 15
  },
  button: {
    backgroundColor: "#3273dc",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  error: {
    color: "#ff5f56",
    marginBottom: 12
  },
  resultBox: {
    backgroundColor: "#182028",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2f3a44"
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff"
  },
  resultLine: {
    color: "#cfd8dc",
    marginBottom: 4
  },
  resultExtra: {
    color: "#9fb3c8",
    fontSize: 12
  }
});
