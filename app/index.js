import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { TIME_WINDOWS } from "../api/footballApi";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// egyszerű, mobilra optimalizált hotspotok (relX/relY relatív a képernyőhöz)
const BALLS = [
  { label: "0-8 óra", relX: 0.18, relY: 0.72, relSize: 0.26 },
  { label: "8-16 óra", relX: 0.50, relY: 0.60, relSize: 0.18 },
  { label: "16-24 óra", relX: 0.82, relY: 0.74, relSize: 0.12 },
];

export default function IndexScreen() {
  const router = useRouter();
  const [container, setContainer] = useState({ w: SCREEN_W, h: SCREEN_H });
  const [selectedIndex, setSelectedIndex] = useState(null);
  const pressTimer = useRef(null);
  const scales = useRef(BALLS.map(() => new Animated.Value(1))).current;

  function onLayout(e) {
    const { width, height } = e.nativeEvent.layout;
    setContainer({ w: width, h: height });
  }

  function animatePress(i) {
    Animated.sequence([
      Animated.timing(scales[i], { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scales[i], { toValue: 1.05, duration: 140, useNativeDriver: true }),
      Animated.timing(scales[i], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  function handleBallPress(index) {
    animatePress(index);

    // első nyomás = kijelölés + infó megjelenítése
    if (selectedIndex !== index) {
      setSelectedIndex(index);
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => {
        setSelectedIndex(null);
        pressTimer.current = null;
      }, 5000);
      return;
    }

    // második nyomás ugyanarra = navigálás a meccsszám választóra
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setSelectedIndex(null);
    const winKey = TIME_WINDOWS[index]?.key ?? TIME_WINDOWS[0].key;
    router.push({ pathname: "/MeccsszamValaszto", params: { windowKey: winKey } });
  }

  function getAbsStyle(ball) {
    const size = Math.round(container.w * ball.relSize);
    const left = Math.round(container.w * ball.relX) - Math.round(size / 2);
    const top = Math.round(container.h * ball.relY) - Math.round(size / 2);
    return { width: size, height: size, borderRadius: size / 2, left, top };
  }

  return (
    <ImageBackground
      source={require("../assets/background.jpg")}
      style={styles.bg}
      imageStyle={{ resizeMode: "cover", opacity: 0.96 }}
    >
      <View style={styles.wrapper} onLayout={onLayout}>
        <Text style={styles.title}>⚽ Okosfoci Tippmix</Text>

        <View style={styles.ballsLayer} pointerEvents="box-none">
          {BALLS.map((b, idx) => {
            const absStyle = getAbsStyle(b);
            const isSelected = selectedIndex === idx;
            return (
              <Animated.View
                key={idx}
                style={[styles.ballRoot, absStyle, { transform: [{ scale: scales[idx] }] }]}
                pointerEvents="box-none"
              >
                <Pressable
                  onPress={() => handleBallPress(idx)}
                  style={({ pressed }) => [
                    styles.ball,
                    {
                      borderColor: isSelected ? "#33ffb0" : "#45eba5",
                      backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                      shadowOpacity: isSelected ? 0.32 : 0.16,
                    },
                  ]}
                  android_ripple={{ color: "rgba(69,235,165,0.12)", borderless: true }}
                  hitSlop={12}
                  accessibilityLabel={b.label}
                >
                  <Text style={[styles.ballLabel, isSelected && styles.ballLabelSelected]}>
                    {b.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {selectedIndex !== null && (
          <View style={styles.hintBox} pointerEvents="none">
            <Text style={styles.hintText}>
              Kiválasztott időablak:{" "}
              <Text style={{ color: "#45eba5", fontWeight: "700" }}>{BALLS[selectedIndex].label}</Text>
            </Text>
            <Text style={styles.hintSub}>Nyomj rá MÉG egyszer a labdára az átlépéshez</Text>
          </View>
        )}

        <Text style={styles.footer}>Válassz időablakot a labdákra koppintva! Okosfoci 🚀</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#000" },
  wrapper: { flex: 1, alignItems: "center", paddingTop: Platform.OS === "ios" ? 56 : 48 },
  title: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 20,
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "#071",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 12,
  },
  ballsLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  ballRoot: { position: "absolute", justifyContent: "center", alignItems: "center" },
  ball: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#45eba5",
    backgroundColor: "rgba(255,255,255,0.02)",
    shadowColor: "#45eba5",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  ballLabel: { color: "#45eba5", fontWeight: "700", textAlign: "center", fontSize: 16 },
  ballLabelSelected: { color: "#00f4a0", textShadowColor: "#062", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  hintBox: { position: "absolute", alignSelf: "center", bottom: 120, backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  hintText: { color: "#45eba5", fontWeight: "600", textAlign: "center" },
  hintSub: { color: "#ddd", fontSize: 12, textAlign: "center", marginTop: 6 },
  footer: { position: "absolute", bottom: 28, alignSelf: "center", color: "#fff", opacity: 0.9, fontStyle: "italic" },
});
