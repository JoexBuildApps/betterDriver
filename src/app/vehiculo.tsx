import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const C = {
  fondo: '#0a1628',
  marca: '#4fc3f7',
  blanco: '#ffffff',
  gris: '#607d8b',
  superficie: '#0f1f3a',
  verde: '#30d158',
};

export default function SeleccionVehiculo() {
  const [vehiculos, setVehiculos] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('vehiculos').then(v => {
      if (v) setVehiculos(JSON.parse(v));
    });
  }, []);

  const seleccionar = async (vehiculo: any) => {
    await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(vehiculo));
    router.replace('/(tabs)');
  };

  const agregar = () => {
    router.push('/onboarding_vehiculo');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.marca}>betterDriver</Text>
      <Text style={styles.titulo}>¿En qué carro vas hoy?</Text>
      <Text style={styles.subtitulo}>Selecciona tu vehículo</Text>

      <ScrollView style={styles.lista}>
        {vehiculos.map((v, i) => (
          <TouchableOpacity key={i} style={styles.card} onPress={() => seleccionar(v)}>
            <Text style={styles.cardTitulo}>{v.marca} {v.modelo}</Text>
            <Text style={styles.cardSub}>{v.anio}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.btnAgregar} onPress={agregar}>
        <Text style={styles.btnAgregarTexto}>+ Agregar vehículo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo, padding: 24 },
  marca: { color: C.marca, fontSize: 26, fontWeight: '600', textAlign: 'center', marginTop: 60, marginBottom: 32, letterSpacing: 1 },
  titulo: { color: C.blanco, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { color: C.gris, fontSize: 15, marginBottom: 24 },
  lista: { flex: 1 },
  card: { backgroundColor: C.superficie, borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1a3050' },
  cardTitulo: { color: C.blanco, fontSize: 18, fontWeight: '500' },
  cardSub: { color: C.gris, fontSize: 14, marginTop: 4 },
  btnAgregar: { borderWidth: 1, borderColor: C.marca, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  btnAgregarTexto: { color: C.marca, fontSize: 16 },
});
