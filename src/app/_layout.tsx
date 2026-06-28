import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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

  if (!listo) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
