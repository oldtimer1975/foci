import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';

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
  };
}

export default function AboutScreen() {
  const scheme = useColorScheme();
  const colors = themeColors(scheme);

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      margin: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    p: { marginTop: 10, fontSize: 14, color: colors.subtext, lineHeight: 20 },
    badge: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    listItem: { marginTop: 8, color: colors.subtext },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.card}>
        <Text style={styles.title}>Rólunk</Text>
        <Text style={styles.p}>
          Ez az alkalmazás mesterséges intelligencián és egyedi logikán/algoritmuson alapul. Egyedi fejlesztés, amit ketten készítettünk: te és én.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI • Egyedi algoritmus • Közös munka</Text>
        </View>

        <Text style={styles.p}>Mit tud az app?</Text>
        <Text style={styles.listItem}>• Adatböngészés: ligák, meccsek, időablak és liga szerinti szűrés</Text>
        <Text style={styles.listItem}>• Tippek és valószínűségek: AI/algoritmus alapján</Text>
        <Text style={styles.listItem}>• Gyors és stabil: lapozás, memóriabarát megjelenítés</Text>
      </View>
    </ScrollView>
  );
}
