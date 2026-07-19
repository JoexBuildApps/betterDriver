import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
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
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
