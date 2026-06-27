import axios from 'axios';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LIMITE_DEFAULT = 20;

async function getLimiteVelocidad(lat: number, lon: number): Promise<number> {
  try {
    const query = `[out:json];way(around:30,${lat},${lon})[maxspeed];out;`;
    const res = await axios.post('https://overpass.kumi.systems/api/interpreter', `data=${encodeURIComponent(query)}`);
    const elements = res.data.elements;
    if (elements.length > 0 && elements[0].tags?.maxspeed) {
      const valor = parseInt(elements[0].tags.maxspeed);
      if (!isNaN(valor)) return valor;
    }
  } catch (e) {}
  return LIMITE_DEFAULT;
}

export default function HomeScreen() {
  const [velocidad, setVelocidad] = useState(0);
  const [limite, setLimite] = useState(LIMITE_DEFAULT);
  const alertaActiva = useRef(false);

  useEffect(() => {
    let suscripcion: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 10 },
        async (location) => {
          const { latitude, longitude, speed } = location.coords;
          const kmh = Math.max(0, Math.round((speed ?? 0) * 3.6));
          setVelocidad(kmh);

          const limiteActual = await getLimiteVelocidad(latitude, longitude);
          setLimite(limiteActual);

          if (kmh > limiteActual && !alertaActiva.current) {
            alertaActiva.current = true;
            Speech.speak('Vas por encima del límite de velocidad', { language: 'es' });
            setTimeout(() => { alertaActiva.current = false; }, 5000);
          }
        }
      );
    })();
    return () => suscripcion?.remove();
  }, []);

  const getColor = () => {
    if (velocidad > limite) return '#ff3b30';
    if (velocidad > limite * 0.85) return '#ff9500';
    return '#30d158';
  };

  const getEstado = () => {
    if (velocidad > limite) return '⚠ Exceso de velocidad';
    if (velocidad > limite * 0.85) return 'Precaución';
    return 'Velocidad normal';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.limite}>Límite: {limite} km/h</Text>
      <Text style={[styles.velocidad, { color: getColor() }]}>{velocidad}</Text>
      <Text style={styles.unidad}>km/h</Text>
      <Text style={[styles.estado, { color: getColor() }]}>{getEstado()}</Text>

      <View style={styles.botones}>
        <TouchableOpacity style={styles.btn} onPress={() => setVelocidad(v => Math.max(0, v - 10))}>
          <Text style={styles.btnTexto}>-10</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setVelocidad(v => v + 10)}>
          <Text style={styles.btnTexto}>+10</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  limite: { fontSize: 16, color: '#555', marginBottom: 8 },
  velocidad: { fontSize: 120, fontWeight: 'bold' },
  unidad: { fontSize: 24, color: '#888', marginTop: -10 },
  estado: { fontSize: 18, marginTop: 16, fontWeight: '500' },
  botones: { flexDirection: 'row', gap: 20, marginTop: 40 },
  btn: { backgroundColor: '#222', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  btnTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});