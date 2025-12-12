import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

// háttér (opcionális): a saját assets/background.jpg
const BG = require('../assets/background.jpg');

export default function Loading() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // kis animáció
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();

    // 3 mp után főoldal – pontosan az index route-ra
    const t = setTimeout(() => {
      router.replace('/'); // app/index.js
    }, 3000);

    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [router, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ImageBackground source={BG} style={styles.bg} imageStyle={styles.bgImg}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Betöltés…</Text>
          <Text style={styles.sub}>
            Ez az alkalmazás mesterséges intelligencián és egyedi logikán/algoritmuson alapul.
          </Text>
          <Text style={styles.badge}>GitHub Copilot és Nágel Zoltán közös fejlesztése</Text>
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
          <Text style={styles.small}>Kérlek, várj néhány másodpercet…</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  bgImg: { resizeMode: 'cover', opacity: 0.45 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '88%',
    maxWidth: 520,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  sub: { marginTop: 8, fontSize: 14, color: '#333', textAlign: 'center' },
  badge: { marginTop: 10, fontSize: 13, fontWeight: '800', color: '#fff', backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  spinner: { marginTop: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', opacity: 0.3 },
  small: { marginTop: 10, fontSize: 12, color: '#555', textAlign: 'center' },
});
