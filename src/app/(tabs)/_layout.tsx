import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
        tabBarActiveTintColor: '#30d158',
        tabBarInactiveTintColor: '#555',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Conducir' }} />
      <Tabs.Screen name="viajes" options={{ title: 'Mis viajes' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
    </Tabs>
  );
}
