import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      const eula = await AsyncStorage.getItem('eulaAceptado');
      const perfil = await AsyncStorage.getItem('perfil');
      const vehiculoActivo = await AsyncStorage.getItem('vehiculoActivo');
      const vehiculos = await AsyncStorage.getItem('vehiculos');

      setListo(true);

      if (!eula) {
        router.replace('/eula');
      } else if (!perfil) {
        router.replace('/onboarding');
      } else if (!vehiculoActivo && vehiculos && JSON.parse(vehiculos).length > 1) {
        router.replace('/vehiculo');
      }
    })();
  }, []);

  if (!listo) return <View style={{ flex: 1, backgroundColor: '#0a1628' }} />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="eula" />
      <Stack.Screen name="vehiculo" />
    </Stack>
  );
}
