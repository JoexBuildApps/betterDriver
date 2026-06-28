import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const CIUDADES = ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Otra'];

export default function Onboarding() {
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [paso, setPaso] = useState(1);

  const siguiente = () => setPaso(p => p + 1);

  const finalizar = async () => {
    await AsyncStorage.setItem('perfil', JSON.stringify({ nombre, marca, modelo, anio, ciudad }));
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>

        <View style={styles.progreso}>
          {[1,2,3].map(n => (
            <View key={n} style={[styles.dot, paso >= n && styles.dotActivo]} />
          ))}
        </View>

        {paso === 1 && (
          <View style={styles.paso}>
            <Text style={styles.titulo}>Bienvenido a{'\n'}DriveCoach</Text>
            <Text style={styles.subtitulo}>Como te llamas?</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre o apodo"
              placeholderTextColor="#555"
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
            <Text style={styles.titulo}>Tu vehiculo</Text>
            <Text style={styles.subtitulo}>Que carro manejas?</Text>
            <TextInput
              style={styles.input}
              placeholder="Marca (ej. Audi, Ford, Toyota)"
              placeholderTextColor="#555"
              value={marca}
              onChangeText={setMarca}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Modelo (ej. A3, F-150, Corolla)"
              placeholderTextColor="#555"
              value={modelo}
              onChangeText={setModelo}
            />
            <TextInput
              style={styles.input}
              placeholder="Año (ej. 2021)"
              placeholderTextColor="#555"
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
            <Text style={styles.subtitulo}>Donde manejas principalmente?</Text>
            <View style={styles.opciones}>
              {CIUDADES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.opcion, ciudad === c && styles.opcionActiva]}
                  onPress={() => setCiudad(c)}
                >
                  <Text style={[styles.opcionTexto, ciudad === c && styles.opcionTextoActivo]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.btn, !ciudad && styles.btnDesactivado]}
              onPress={finalizar}
              disabled={!ciudad}
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
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  progreso: { flexDirection: 'row', gap: 8, marginBottom: 48, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotActivo: { backgroundColor: '#30d158' },
  paso: { gap: 16 },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#fff', lineHeight: 40 },
  subtitulo: { fontSize: 16, color: '#888', marginBottom: 8 },
  input: { backgroundColor: '#111', color: '#fff', fontSize: 18, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcion: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  opcionActiva: { borderColor: '#30d158', backgroundColor: '#0a2e14' },
  opcionTexto: { color: '#888', fontSize: 15 },
  opcionTextoActivo: { color: '#30d158' },
  btn: { backgroundColor: '#30d158', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnDesactivado: { backgroundColor: '#1a3d22' },
  btnTexto: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
