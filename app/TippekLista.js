import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getGamesByDate, filterGamesByWindow, TIME_WINDOWS } from "../api/footballApi";

export default function TippekLista() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { windowKey, meccsSzam } = params;
  const wanted = parseInt(meccsSzam || "3", 10);

  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);

  useEffect(() => {
    async function prepare() {
      setLoading(true);
      // demo: mai nap meccsei
      const today = new Date();
      const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD
      const games = await getGamesByDate(iso);
      // find window from TIME_WINDOWS
      const win = TIME_WINDOWS.find(w => w.key === windowKey) || TIME_WINDOWS[0];
      const filtered = filterGamesByWindow(games, win.from, win.to);
      setAvailableGames(filtered);

      // generate tips: if not enough games, reuse/randomize
      const generated = [];
      for (let i = 0; i < wanted; i++) {
        if (filtered.length === 0) {
          // fallback demo item
          generated.push({
            id: `demo-${i}`,
            home: "Ismeretlen",
            away: "Ismeretlen",
            start: "–",
            note: "Nincs elérhető meccs ebben az időablakban"
          });
        } else {
          const g = filtered[i % filtered.length];
          generated.push({
            id: String(g.GameId) + "-" + i,
            home: g.HomeTeam,
            away: g.AwayTeam,
            start: g._startDate ? g._startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "–",
            note: ""
          });
        }
      }

      setTips(generated);
      setLoading(false);
    }

    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowKey, meccsSzam]);

  function renderItem({ item, index }) {
    return (
      <View style={styles.item}>
        <Text style={styles.index}>{index + 1}.</Text>
        <View style={styles.info}>
          <Text style={styles.match}>{item.home} vs {item.away}</Text>
          <Text style={styles.meta}>{item.start} {item.note ? `· ${item.note}` : ""}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tippek ({meccsSzam} meccs) — {windowKey}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#45eba5" style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.subtitle}>Elérhető meccsek ebben az ablakban: {availableGames.length}</Text>

          <FlatList
            data={tips}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12 }}
          />

          <View style={styles.row}>
            <Pressable style={styles.btn} onPress={() => router.back()}>
              <Text style={styles.btnTxt}>Vissza</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnAlt]} onPress={() => alert("Tipp elfogadva (demo)")}>
              <Text style={[styles.btnTxt, { color: "#021213" }]}>Elfogad</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061219", padding: 18 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#89f2c4", textAlign: "center", marginTop: 10, marginBottom: 8 },
  item: { flexDirection: "row", padding: 12, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, marginHorizontal: 2, marginVertical: 6, alignItems: "center" },
  index: { color: "#45eba5", fontWeight: "800", width: 28, textAlign: "center" },
  info: { flex: 1 },
  match: { color: "#fff", fontWeight: "700" },
  meta: { color: "#ddd", marginTop: 4, fontSize: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  btn: { backgroundColor: "#45eba5", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, minWidth: 120, alignItems: "center" },
  btnAlt: { backgroundColor: "#f0f7ef" },
  btnTxt: { color: "#021213", fontWeight: "800" },
});
