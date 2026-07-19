import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const C = {
  fondo: '#0a1628',
  marca: '#4fc3f7',
  blanco: '#ffffff',
  gris: '#607d8b',
  superficie: '#0f1f3a',
};

export default function AgregarVehiculo() {
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [tipo, setTipo] = useState('🚗 Automóvil');

  const guardar = async () => {
    const nuevo = { marca, modelo, anio, tipo };
    const existing = await AsyncStorage.getItem('vehiculos');
    const vehiculos = existing ? JSON.parse(existing) : [];
    vehiculos.push(nuevo);
    await AsyncStorage.setItem('vehiculos', JSON.stringify(vehiculos));
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.marca}>betterDriver</Text>
        <Text style={styles.titulo}>Agregar vehículo</Text>
        <Text style={styles.subtitulo}>¿Qué otro carro manejas?</Text>

        <TextInput
          style={styles.input}
          placeholder="Marca (ej. Audi, Ford)"
          placeholderTextColor={C.gris}
          value={marca}
          onChangeText={setMarca}
          autoFocus
        />
        <TextInput
          style={styles.input}
          placeholder="Modelo (ej. A3, F-150)"
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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {['🚗 Automóvil', '🚙 SUV', '🏍 Moto', '🚐 Van', '🚛 Camión'].map(t => (
          <TouchableOpacity
            key={t}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: tipo === t ? '#2EE6C5' : '#1a3050', backgroundColor: tipo === t ? 'rgba(46,230,197,0.15)' : 'transparent' }}
            onPress={() => setTipo(t)}
          >
            <Text style={{ color: tipo === t ? '#2EE6C5' : '#607d8b', fontSize: 13 }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
          style={[styles.btn, (!marca.trim() || !modelo.trim() || !anio.trim()) && styles.btnDesactivado]}
          onPress={guardar}
          disabled={!marca.trim() || !modelo.trim() || !anio.trim()}
        >
          <Text style={styles.btnTexto}>Guardar vehículo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnCancelar} onPress={() => router.back()}>
          <Text style={styles.btnCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  marca: { color: C.marca, fontSize: 22, fontWeight: '600', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  titulo: { color: C.blanco, fontSize: 24, fontWeight: 'bold' },
  subtitulo: { color: C.gris, fontSize: 15, marginBottom: 8 },
  input: { backgroundColor: C.superficie, color: C.blanco, fontSize: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1a3050' },
  btn: { backgroundColor: C.marca, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDesactivado: { backgroundColor: C.superficie },
  btnTexto: { color: C.fondo, fontSize: 16, fontWeight: 'bold' },
  btnCancelar: { alignItems: 'center', padding: 12 },
  btnCancelarTexto: { color: C.gris, fontSize: 15 },
});
