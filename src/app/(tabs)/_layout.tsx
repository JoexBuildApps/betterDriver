import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estadoGarage, licenciaProximaAVencer } from '../../utils/garage';

export default function TabLayout() {
  const [hayAlertaGarage, setHayAlertaGarage] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const existingV = await AsyncStorage.getItem('vehiculos');
        const vehiculos = existingV ? JSON.parse(existingV) : [];
        const alertaVehiculos = vehiculos.some((v: any) => {
          const e = estadoGarage(v.garage);
          return e.nivel === 'pronto' || e.nivel === 'vencido';
        });
        const existingP = await AsyncStorage.getItem('perfil');
        const perfil = existingP ? JSON.parse(existingP) : null;
        const alertaLicencia = licenciaProximaAVencer(perfil?.licenciaFecha);
        setHayAlertaGarage(alertaVehiculos || alertaLicencia);
      })();
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#07111F', borderTopColor: '#223452' },
        tabBarActiveTintColor: '#2EE6C5',
        tabBarInactiveTintColor: '#607d8b',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conducir',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="viajes"
        options={{
          title: 'Mis viajes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="person-outline" size={size} color={color} />
              {hayAlertaGarage && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: '#FF5C5C',
                    borderWidth: 1.5,
                    borderColor: '#07111F',
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
