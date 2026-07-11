import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';

const C = {
  fondo: '#0a1628',
  marca: '#4fc3f7',
  blanco: '#ffffff',
  gris: '#607d8b',
  superficie: '#0f1f3a',
  verde: '#30d158',
};

export default function Onboarding() {
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [paso, setPaso] = useState(1);
  const [detectandoCiudad, setDetectandoCiudad] = useState(false);

  useEffect(() => {
    if (paso === 3) detectarCiudad();
  }, [paso]);

  const detectarCiudad = async () => {
    setDetectandoCiudad(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const resultado = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (resultado.length > 0) {
        const r = resultado[0];
        setCiudad(r.city || r.subregion || r.region || '');
      }
    } catch (e) {}
    setDetectandoCiudad(false);
  };

  const siguiente = () => setPaso(p => p + 1);

  const finalizar = async () => {
    const perfilData = { nombre, ciudad };
    await AsyncStorage.setItem('perfil', JSON.stringify(perfilData));
    const vehiculo = { marca, modelo, anio };
    await AsyncStorage.setItem('vehiculos', JSON.stringify([vehiculo]));
    await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(vehiculo));
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.marca}>betterDriver</Text>

        <View style={styles.progreso}>
          {[1,2,3].map(n => (
            <View key={n} style={[styles.dot, paso >= n && styles.dotActivo]} />
          ))}
        </View>

        {paso === 1 && (
          <View style={styles.paso}>
            <Text style={styles.titulo}>Bienvenido</Text>
            <Text style={styles.subtitulo}>La abuela va contigo. ¿Cómo te llamas?</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre o apodo"
              placeholderTextColor={C.gris}
              value={nombre}
              onChangeText={setNombre}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.btn, !nombre.trim() && styles.btnDesactivado]}
              onPress={siguiente}
              disabled={!nombre.trim()}
            >
              <Text style={styles.btnTexto}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {paso === 2 && (
          <View style={styles.paso}>
            <Text style={styles.titulo}>Tu vehículo</Text>
            <Text style={styles.subtitulo}>¿Qué carro manejas?</Text>
            <TextInput
              style={styles.input}
              placeholder="Marca (ej. Audi, Ford, Toyota)"
              placeholderTextColor={C.gris}
              value={marca}
              onChangeText={setMarca}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Modelo (ej. A3, F-150, Corolla)"
              placeholderTextColor={C.gris}
              value={modelo}
              onChangeText={setModelo}
            />
            <TextInput
              style={styles.input}
              placeholder="Año (ej. 2021)"
              placeholderTextColor={C.gris}
              value={anio}
              onChangeText={setAnio}
              keyboardType="numeric"
              maxLength={4}
            />
            <TouchableOpacity
              style={[styles.btn, (!marca.trim() || !modelo.trim() || !anio.trim()) && styles.btnDesactivado]}
              onPress={siguiente}
              disabled={!marca.trim() || !modelo.trim() || !anio.trim()}
            >
              <Text style={styles.btnTexto}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {paso === 3 && (
          <View style={styles.paso}>
            <Text style={styles.titulo}>Tu ciudad</Text>
            <Text style={styles.subtitulo}>Detectando tu ubicación...</Text>
            {detectandoCiudad ? (
              <ActivityIndicator color={C.marca} style={{ marginVertical: 20 }} />
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Ciudad"
                placeholderTextColor={C.gris}
                value={ciudad}
                onChangeText={setCiudad}
              />
            )}
            <TouchableOpacity
              style={[styles.btn, (!ciudad.trim() || detectandoCiudad) && styles.btnDesactivado]}
              onPress={finalizar}
              disabled={!ciudad.trim() || detectandoCiudad}
            >
              <Text style={styles.btnTexto}>Empezar a conducir</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  marca: { color: C.marca, fontSize: 26, fontWeight: '600', textAlign: 'center', marginBottom: 32, letterSpacing: 1 },
  progreso: { flexDirection: 'row', gap: 8, marginBottom: 40, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.superficie },
  dotActivo: { backgroundColor: C.marca },
  paso: { gap: 16 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: C.blanco },
  subtitulo: { fontSize: 15, color: C.gris, marginBottom: 8 },
  input: {
    backgroundColor: C.superficie,
    color: C.blanco,
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a3050',
  },
  btn: { backgroundColor: C.marca, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDesactivado: { backgroundColor: C.superficie },
  btnTexto: { color: C.fondo, fontSize: 16, fontWeight: 'bold' },
});
