import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLimite } from '../../utils/velocidadCache';
import { calcularPenalizacion, guardarViaje, Evento } from '../../utils/viajes';

const VELOCIDAD_MINIMA = 3;
const TIEMPO_NUEVO_VIAJE = 2 * 60 * 1000;
const TOLERANCIA = 1.05;

export default function Conducir() {
  const [velocidad, setVelocidad] = useState(0);
  const [limite, setLimite] = useState(20);
  const [puntos, setPuntos] = useState(1000);
  const [topSpeed, setTopSpeed] = useState(0);
  const [viajeActivo, setViajeActivo] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);

  const alertaActiva = useRef(false);
  const timerParado = useRef<any>(null);
  const inicioViaje = useRef<number>(Date.now());
  const eventosViaje = useRef<Evento[]>([]);
  const puntosRef = useRef(1000);

  const player = useAudioPlayer({ uri: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3' });

  useEffect(() => {
    AsyncStorage.getItem('perfil').then(p => {
      if (p) setPerfil(JSON.parse(p));
    });
  }, []);

  const terminarViaje = async () => {
    const duracion = Math.round((Date.now() - inicioViaje.current) / 1000);
    await guardarViaje({
      fecha: inicioViaje.current,
      duracion,
      topSpeed,
      puntosFinales: puntosRef.current,
      eventos: eventosViaje.current,
    });
    setPuntos(1000);
    puntosRef.current = 1000;
    setTopSpeed(0);
    eventosViaje.current = [];
    inicioViaje.current = Date.now();
    setViajeActivo(false);
  };

  useEffect(() => {
    let suscripcion: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
        async (location) => {
          const { latitude, longitude, speed } = location.coords;
          const rawKmh = (speed ?? 0) * 3.6;
          const kmh = rawKmh < VELOCIDAD_MINIMA ? 0 : Math.round(rawKmh);

          setVelocidad(kmh);

          if (kmh > 0) {
            setViajeActivo(true);
            setTopSpeed(prev => Math.max(prev, kmh));
            if (timerParado.current) {
              clearTimeout(timerParado.current);
              timerParado.current = null;
            }
          } else if (kmh === 0 && viajeActivo) {
            if (!timerParado.current) {
              timerParado.current = setTimeout(() => {
                terminarViaje();
                timerParado.current = null;
              }, TIEMPO_NUEVO_VIAJE);
            }
          }

          const limiteActual = await getLimite(latitude, longitude);
          setLimite(limiteActual);

          if (kmh > limiteActual * TOLERANCIA) {
            const pen = calcularPenalizacion(kmh, limiteActual);
            puntosRef.current = Math.max(0, puntosRef.current - pen);
            setPuntos(puntosRef.current);
            eventosViaje.current.push({
              tipo: 'exceso',
              timestamp: Date.now(),
              velocidad: kmh,
              limite: limiteActual,
            });
            if (!alertaActiva.current) {
              alertaActiva.current = true;
              player.play();
              setTimeout(() => { alertaActiva.current = false; }, 5000);
            }
          }
        }
      );
    })();
    return () => suscripcion?.remove();
  }, [viajeActivo]);

  const getColor = () => {
    if (velocidad > limite * TOLERANCIA) return '#ff3b30';
    if (velocidad > limite) return '#ff9500';
    return '#30d158';
  };

  const getEstado = () => {
    if (velocidad > limite * TOLERANCIA) return 'Exceso de velocidad';
    if (velocidad > limite) return 'Precaucion';
    return velocidad === 0 ? 'Detenido' : 'Velocidad normal';
  };

  const getColorPuntos = () => {
    if (puntos >= 900) return '#30d158';
    if (puntos >= 700) return '#ff9500';
    return '#ff3b30';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.infoText}>
          {perfil ? `${perfil.nombre} · ${perfil.marca}` : 'DriveCoach'}
        </Text>
        <Text style={styles.infoText}>Top: {topSpeed} km/h</Text>
      </View>

      <Text style={styles.puntos}>
        Puntos: <Text style={{ color: getColorPuntos() }}>{puntos}</Text>
      </Text>

      <Text style={styles.limite}>Limite: {limite} km/h</Text>
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

      {viajeActivo && (
        <TouchableOpacity style={styles.btnTerminar} onPress={terminarViaje}>
          <Text style={styles.btnTerminarTexto}>Terminar viaje</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 50, flexDirection: 'row', justifyContent: 'space-between', width: '90%' },
  infoText: { fontSize: 14, color: '#555' },
  puntos: { fontSize: 16, color: '#555', marginBottom: 16 },
  limite: { fontSize: 16, color: '#555', marginBottom: 8 },
  velocidad: { fontSize: 120, fontWeight: 'bold' },
  unidad: { fontSize: 24, color: '#888', marginTop: -10 },
  estado: { fontSize: 18, marginTop: 16, fontWeight: '500' },
  botones: { flexDirection: 'row', gap: 20, marginTop: 40 },
  btn: { backgroundColor: '#222', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  btnTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  btnTerminar: { marginTop: 30, borderColor: '#555', borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  btnTerminarTexto: { color: '#555', fontSize: 14 },
});
