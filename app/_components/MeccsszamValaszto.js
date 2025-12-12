import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function MeccsszamValaszto() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const window =
    typeof params.window === 'string'
      ? params.window
      : Array.isArray(params.window)
      ? params.window[0]
      : undefined;

  const counts = [3, 6, 8, 10];

  const onPickCount = (count) => {
    // Expo Router: fájl-útvonalra navigálunk
    router.push({ pathname: '/_components/TippekLista', params: { window, count } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Időablak: {window || '-'}</Text>
      <Text style={styles.subtitle}>Válaszd ki a meccsek számát:</Text>

      <View style={styles.grid}>
        {counts.map((c) => (
          <TouchableOpacity key={c} style={styles.card} onPress={() => onPickCount(c)}>
            <Text style={styles.cardTitle}>{c}</Text>
            <Text style={styles.cardSub}>meccs</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#5c6470' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#e7e9ee',
    elevation: 2,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSub: { marginTop: 4, color: '#5c6470' },
});
