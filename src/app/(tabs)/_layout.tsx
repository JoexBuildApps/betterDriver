import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenListeners={{}} 
      screenOptions={{
        tabBarStyle: { backgroundColor: '#07111F', borderTopColor: '#223452' },
        animation: 'fade',
        tabBarActiveTintColor: '#30d158',
        tabBarInactiveTintColor: '#555',
        headerShown: false,
      }}
    >
      <Tabs screenListeners={{}} .Screen
        name="index"
        options={{
          title: 'Conducir',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs screenListeners={{}} .Screen
        name="viajes"
        options={{
          title: 'Mis viajes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs screenListeners={{}} .Screen
        name="perfil"
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
