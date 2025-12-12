import React, { useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Dimensions, Animated, ImageBackground
} from "react-native";
import { useRouter } from "expo-router";

const BG = require("../assets/background.jpg"); // háttérkép
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// három időablak + a Tuti külön gomb
const BALLS = [
  { label: "0–8 óra", window: "00:00-08:00" },
  { label: "8–16 óra", window: "08:00-16:00" },
  { label: "16–24 óra", window: "16:00-24:00" },
];

export default function IndexScreen() {
  const router = useRouter();
  const scales = useRef(BALLS.map(() => new Animated.Value(1))).current;

  function animatePress(i) {
    Animated.sequence([
      Animated.timing(scales[i], { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scales[i], { toValue: 1.05, duration: 140, useNativeDriver: true }),
      Animated.timing(scales[i], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  function gotoWindowPicker(windowVal) {
    // a régi logikád szerint
    router.push({ pathname: "/_components/MeccsszamValaszto", params: { window: windowVal } });
  }

  function gotoTutiDaily(defaultCount = 6) {
    router.push({ pathname: "/(tabs)/tuti", params: { window: "00:00-23:59", count: String(defaultCount) } });
  }

  return (
    <ImageBackground source={BG} style={styles.bg} imageStyle={styles.bgImg}>
      <View style={styles.overlay}>
        {/* Cím és alcím – a screenshotodhoz igazítva */}
        <Text style={styles.title}><Text style={{ fontSize: 22 }}>⚽</Text> Okosfoci Tippmix</Text>
        <Text style={styles.subtitle}>
          Válassz időablakot egy labdára koppintva! Modern sport dizájn — Okosfoci 🚀
        </Text>

        {/* Fehér gombok sorban: reggeli, napi, esti */}
        <View style={styles.row}>
          {BALLS.map((b, i) => (
            <Animated.View key={b.window} style={{ transform: [{ scale: scales[i] }] }}>
              <Pressable
                onPress={() => { animatePress(i); gotoWindowPicker(b.window); }}
                style={({ pressed }) => [styles.whiteBtn, pressed ? styles.whiteBtnPressed : null]}
              >
                <Text style={styles.whiteBtnText}>{b.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Plusz: A tuti gomb külön, fehér stílusban */}
        <View style={styles.tutiWrap}>
          <Pressable
            onPress={() => gotoTutiDaily(6)}
            style={({ pressed }) => [styles.whiteBtn, pressed ? styles.whiteBtnPressed : null]}
          >
            <Text style={styles.whiteBtnText}>A tuti</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgImg: { resizeMode: "cover", opacity: 0.45 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 16, justifyContent: "center" },

  title: { fontSize: 34, fontWeight: "800", color: "#fff", textAlign: "center", textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  subtitle: { marginTop: 10, fontSize: 15, color: "rgba(255,255,255,0.9)", textAlign: "center" },

  row: { marginTop: 24, flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" },
  whiteBtn: {
    minWidth: 110, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 999, backgroundColor: "#fff", borderWidth: 2, borderColor: "#34d399", // zöld karika, mint a képen
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  whiteBtnPressed: { opacity: 0.9 },
  whiteBtnText: { fontSize: 16, fontWeight: "800", color: "#111" },

  tutiWrap: { marginTop: 16, alignItems: "center" },
});
