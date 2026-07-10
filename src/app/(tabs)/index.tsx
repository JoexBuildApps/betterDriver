import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLimite } from '../../utils/velocidadCache';
import { calcularPenalizacion, guardarViaje, Evento } from '../../utils/viajes';
import { mensajeAleatorio } from '../../utils/mensajes';

const VELOCIDAD_MINIMA = 8;
const TIEMPO_NUEVO_VIAJE = 2 * 60 * 1000;
const GRACIA_SEGUNDOS = 7;

function getTolerancia(limite: number): number {
  if (limite <= 30) return 1.10;
  if (limite <= 60) return 1.07;
  return 1.05;
}

export default function Conducir() {
  const [velocidad, setVelocidad] = useState(0);
  const [limite, setLimite] = useState(20);
  const [puntos, setPuntos] = useState(1000);
  const [topSpeed, setTopSpeed] = useState(0);
  const [viajeActivo, setViajeActivo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [perfil, setPerfil] = useState<any>(null);

  const alertaActiva = useRef(false);
  const timerParado = useRef<any>(null);
  const timerGracia = useRef<any>(null);
  const enGracia = useRef(false);
  const timerPerfecto = useRef<any>(null);
  const inicioViaje = useRef<number>(Date.now());
  const eventosViaje = useRef<Evento[]>([]);
  const puntosRef = useRef(1000);
  const player = useAudioPlayer({ uri: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3' });

  useEffect(() => {
    
    AsyncStorage.getItem('perfil').then(p => {
      if (p) setPerfil(JSON.parse(p));
    });
    
  }, []);

  const hablar = (texto: string) => {
    setMensaje(texto);
    Speech.speak(texto, { language: 'es' });
    setTimeout(() => setMensaje(''), 6000);
  };

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
    if (timerGracia.current) clearTimeout(timerGracia.current);
    if (timerPerfecto.current) clearTimeout(timerPerfecto.current);
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
          const tolerancia = getTolerancia(limiteActual);

          if (kmh > limiteActual * tolerancia) {
            // cancelar timer de conducción perfecta
            if (timerPerfecto.current) {
              clearTimeout(timerPerfecto.current);
              timerPerfecto.current = null;
            }

            if (!enGracia.current && !timerGracia.current) {
              // iniciar período de gracia
              enGracia.current = true;
              timerGracia.current = setTimeout(() => {
                // después de 7 segundos empieza a descontar
                timerGracia.current = null;
                enGracia.current = false;
              }, GRACIA_SEGUNDOS * 1000);
            } else if (!enGracia.current) {
              // ya pasó la gracia, descontar puntos
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
                hablar(mensajeAleatorio('exceso'));
                setTimeout(() => { alertaActiva.current = false; }, 8000);
              }
            }
          } else {
            // dentro del límite — resetear gracia
            if (timerGracia.current) {
              clearTimeout(timerGracia.current);
              timerGracia.current = null;
            }
            enGracia.current = false;

            // iniciar timer de conducción perfecta (5 minutos)
            if (!timerPerfecto.current && kmh > 0) {
              timerPerfecto.current = setTimeout(() => {
                hablar(mensajeAleatorio('perfecto'));
                timerPerfecto.current = null;
              }, 5 * 60 * 1000);
            }
          }
        }
      );
    })();
    return () => suscripcion?.remove();
  }, [viajeActivo]);

  const getColor = () => {
    const tolerancia = getTolerancia(limite);
    if (velocidad > limite * tolerancia) return '#ff3b30';
    if (velocidad > limite) return '#ff9500';
    return '#30d158';
  };

  const getEstado = () => {
    const tolerancia = getTolerancia(limite);
    if (velocidad > limite * tolerancia) return 'Exceso de velocidad';
    if (velocidad > limite) return 'Precaución';
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
          {perfil ? `${perfil.nombre} · ${perfil.marca}` : 'betterDriver'}
        </Text>
        <Text style={styles.infoText}>Top: {topSpeed} km/h</Text>
      </View>

      <Text style={styles.puntos}>
        Puntos: <Text style={{ color: getColorPuntos() }}>{puntos}</Text>
      </Text>

      <Text style={styles.limite}>Límite: {limite} km/h</Text>
      <Text style={[styles.velocidad, { color: getColor() }]}>{velocidad}</Text>
      <Text style={styles.unidad}>km/h</Text>
      <Text style={[styles.estado, { color: getColor() }]}>{getEstado()}</Text>

      {mensaje !== '' && (
        <View style={styles.mensajeContainer}>
          <Text style={styles.mensajeTexto}>{mensaje}</Text>
        </View>
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
  mensajeContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#111', borderRadius: 12, padding: 16 },
  mensajeTexto: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
