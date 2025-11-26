import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const OPTIONS = [3, 6, 8, 10];

export default function MeccsszamValaszto() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { windowKey } = params;

  function onSelect(n) {
    router.push({ pathname: "/TippekLista", params: { windowKey, meccsSzam: String(n) } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hány meccsre szeretnél tippet? ({windowKey})</Text>
      <View style={styles.row}>
        {OPTIONS.map((n) => (
          <Pressable key={n} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={() => onSelect(n)}>
            <Text style={styles.btnTxt}>{n === 10 ? "10+" : n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061219", justifyContent: "center", alignItems: "center", padding: 20 },
  title: { color: "#fff", fontSize: 20, marginBottom: 20, textAlign: "center" },
  row: { flexDirection: "row", gap: 12 },
  btn: { backgroundColor: "#45eba5", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
  btnPressed: { opacity: 0.8 },
  btnTxt: { color: "#021213", fontWeight: "700", fontSize: 18 }
});
