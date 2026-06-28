import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('perfil')
      .then(perfil => {
        setListo(true);
        if (!perfil) {
          router.replace('/onboarding');
        }
      })
      .catch(e => {
        setError(e.message || 'Error desconocido');
        setListo(true);
      });
  }, []);

  if (!listo) return null;

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#ff3b30', fontSize: 16, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
