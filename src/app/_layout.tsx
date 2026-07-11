import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('perfil').then(perfil => {
      setListo(true);
      if (!perfil) {
        router.replace('/onboarding');
      }
    });
  }, []);

  if (!listo) return <View style={{ flex: 1, backgroundColor: '#0a1628' }} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
