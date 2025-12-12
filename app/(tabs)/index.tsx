import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

// Ha van háttérképed és labda ikonod, állítsd be az elérési utat.
// Példa: const BG = require('../../assets/background.jpg');
const BG = undefined as any; // ha nincs háttérkép, maradhat undefined
// A labda ikon útvonala, ahogy jelezted: assets/images/soccerball.png
const BALL = require('../../assets/images/soccerball.png');

function themeColors(scheme: 'light'|'dark'|null|undefined) {
  const isDark = scheme === 'dark';
  return {
    bg: isDark ? '#0f1115' : '#f7f7f9',
    card: isDark ? '#181b22' : '#ffffff',
    border: isDark ? '#2a2f3a' : '#e7e9ee',
    text: isDark ? '#e6e8eb' : '#1f2430',
    subtext: isDark ? '#aeb4bd' : '#5c6470',
    primary: '#2563eb',
    accent: '#22c55e',
    shadow: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(16,24,40,0.08)',
    overlay: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)',
  };
}

export default function Home() {
  const scheme = useColorScheme();
  const colors = themeColors(scheme);
  const router = useRouter();

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    heroWrap: { paddingTop: 18, paddingBottom: 8 },
    ballsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    ball: { width: 42, height: 42, opacity: 0.85 },
    title: { marginTop: 6, fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.subtext, marginTop: 6, textAlign: 'center', paddingHorizontal: 18 },
    content: { paddingHorizontal: 16, paddingBottom: 24 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    cardText: { marginTop: 6, color: colors.subtext },
    row: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnText: { color: colors.text, fontWeight: '800' },
    btnTextPrimary: { color: '#fff' },
    footerCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 16,
      alignItems: 'center',
    },
    footerText: { color: colors.subtext, fontSize: 12 },
    footerStrong: { color: colors.text, fontWeight: '800' },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.heroWrap}>
        <View style={styles.ballsRow}>
          <Image source={BALL} style={styles.ball} />
          <Image source={BALL} style={styles.ball} />
          <Image source={BALL} style={styles.ball} />
        </View>
        <Text style={styles.title}>Okosfoci</Text>
        <Text style={styles.subtitle}>AI-alapú tippek és adatböngészés – stabil, gyors, egyedi.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gyors elérés</Text>
          <Text style={styles.cardText}>Böngéssz ligákat és meccseket, szűrj időablakra, és nézd meg a tippeket.</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.btnText}>Adat böngésző</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => router.push('/(tabs)/tuti')}>
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Tuti tippek</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            Ez az alkalmazás mesterséges intelligencián és egyedi logikán/algoritmuson alapul.{' '}
            <Text style={styles.footerStrong}>GitHub Copilot és Nágel Zoltán</Text> közös fejlesztése.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
