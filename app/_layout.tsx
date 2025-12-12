import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack initialRouteName="loading" screenOptions={{ headerShown: false }}>
      {/* Induló képernyő */}
      <Stack.Screen name="loading" />
      {/* Fő képernyő – az általad használt index.js */}
      <Stack.Screen name="index" />
      {/* A további útvonalak maradnak – ha van Tabs vagy komponensek */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="_components/MeccsszamValaszto" />
    </Stack>
  );
}
