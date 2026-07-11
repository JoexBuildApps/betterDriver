import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLimite } from '../../utils/velocidadCache';
import { calcularPenalizacion, guardarViaje, Evento } from '../../utils/viajes';
import { mensajeAleatorio } from '../../utils/mensajes';

const VELOCIDAD_MINIMA = 8;
const TIEMPO_NUEVO_VIAJE = 45 * 1000;
const GRACIA_SEGUNDOS = 7;

const C = {
  fondo: '#0a1628',
  marca: '#4fc3f7',
  blanco: '#ffffff',
  amarillo: '#ffd60a',
  rojo: '#ff3b30',
  verde: '#30d158',
  gris: '#607d8b',
  superficie: '#0f1f3a',
};

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
  const [alertaTop, setAlertaTop] = useState(false);
  const [viajeActivo, setViajeActivo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [perfil, setPerfil] = useState<any>(null);

  const flashAnim = useRef(new Animated.Value(1)).current;
  const alertaActiva = useRef(false);
  const timerParado = useRef<any>(null);
  const timerGracia = useRef<any>(null);
  const enGracia = useRef(false);
  const timerPerfecto = useRef<any>(null);
  const timerAlertaTop = useRef<any>(null);
  const inicioViaje = useRef<number>(Date.now());
  const eventosViaje = useRef<Evento[]>([]);
  const puntosRef = useRef(1000);
  const player = useAudioPlayer({ uri: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3' });

  useEffect(() => {
    try { activateKeepAwakeAsync(); } catch (e) {}
    AsyncStorage.getItem('perfil').then(p => {
      if (p) setPerfil(JSON.parse(p));
    });
    return () => { try { deactivateKeepAwake(); } catch (e) {} };
  }, []);

  const flashearTop = () => {
    setAlertaTop(true);
    if (timerAlertaTop.current) clearTimeout(timerAlertaTop.current);
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      { iterations: 5 }
    ).start(() => {
      flashAnim.setValue(1);
    });
    timerAlertaTop.current = setTimeout(() => setAlertaTop(false), 3500);
  };

  const hablar = (texto: string) => {
    setMensaje(texto);
    Speech.speak(texto, { language: 'es' });
    setTimeout(() => setMensaje(''), 6000);
  };

  const terminarViaje = async () => {
    const duracion = Math.round((Date.now() - inicioViaje.current) / 1000);
    const vActivo = await AsyncStorage.getItem('vehiculoActivo');
    const vehiculoStr = vActivo ? JSON.parse(vActivo) : null;
    const vehiculoNombre = vehiculoStr ? vehiculoStr.marca + ' ' + vehiculoStr.modelo : undefined;
    await guardarViaje({
      fecha: inicioViaje.current,
      duracion,
      topSpeed,
      puntosFinales: puntosRef.current,
      eventos: eventosViaje.current,
      vehiculo: vehiculoNombre,
    });
    setPuntos(1000);
    puntosRef.current = 1000;
    setTopSpeed(0);
    setAlertaTop(false);
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
            setTopSpeed(prev => {
              if (kmh > prev) {
                flashearTop();
                return kmh;
              }
              return prev;
            });
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
            if (timerPerfecto.current) {
              clearTimeout(timerPerfecto.current);
              timerPerfecto.current = null;
            }
            if (!enGracia.current && !timerGracia.current) {
              enGracia.current = true;
              timerGracia.current = setTimeout(() => {
                timerGracia.current = null;
                enGracia.current = false;
              }, GRACIA_SEGUNDOS * 1000);
            } else if (!enGracia.current) {
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
            if (timerGracia.current) {
              clearTimeout(timerGracia.current);
              timerGracia.current = null;
            }
            enGracia.current = false;
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

  const getColorVelocidad = () => {
    const tolerancia = getTolerancia(limite);
    if (velocidad > limite * tolerancia) return C.rojo;
    if (velocidad > limite) return C.amarillo;
    return C.blanco;
  };

  const getEstado = () => {
    const tolerancia = getTolerancia(limite);
    if (velocidad > limite * tolerancia) return 'Exceso de velocidad';
    if (velocidad > limite) return 'Precaución';
    return velocidad === 0 ? 'Detenido' : 'Velocidad normal';
  };

  const getColorEstado = () => {
    const tolerancia = getTolerancia(limite);
    if (velocidad > limite * tolerancia) return C.rojo;
    if (velocidad > limite) return C.amarillo;
    return C.gris;
  };

  const getColorPuntos = () => {
    if (puntos >= 900) return C.verde;
    if (puntos >= 700) return C.amarillo;
    return C.rojo;
  };

  return (
    <View style={styles.container}>

      <Text style={styles.marca}>betterDriver</Text>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>puntos</Text>
          <Text style={[styles.headerValor, { color: getColorPuntos() }]}>{puntos}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.headerLabel, alertaTop && { color: C.rojo }]}>
            {alertaTop ? '⚠ alerta' : 'top speed'}
          </Text>
          <Animated.Text style={[
            styles.headerValor,
            alertaTop && { color: C.rojo },
            { opacity: alertaTop ? flashAnim : 1 }
          ]}>
            {topSpeed} km/h
          </Animated.Text>
        </View>
      </View>

      <View style={styles.velocimetro}>
        <Text style={[styles.velocidadNumero, { color: getColorVelocidad() }]}>{velocidad}</Text>
        <Text style={styles.unidad}>km/h</Text>
      </View>

      <View style={styles.limiteContainer}>
        <View style={styles.limiteBadge}>
          <Text style={styles.limiteBadgeTexto}>{limite}</Text>
        </View>
        <Text style={styles.limiteLabel}>límite de zona</Text>
      </View>

      <Text style={[styles.estado, { color: getColorEstado() }]}>{getEstado()}</Text>

      {mensaje !== '' && (
        <View style={styles.mensajeContainer}>
          <Text style={styles.mensajeTexto}>{mensaje}</Text>
        </View>
      )}

      {perfil && (
        <Text style={styles.perfilTexto}>
          {perfil.nombre} · {perfil.marca} {perfil.modelo}
        </Text>
      )}

      <TouchableOpacity
        onPress={viajeActivo ? terminarViaje : undefined}
      >
        <Text style={styles.btnTerminarTexto}>{viajeActivo ? 'Terminar viaje' : 'Sin viaje activo'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cafeBtn}
        onPress={() => Linking.openURL('https://paypal.me/joebuildapps')}
      >
        <Text style={styles.cafeBtnTexto}>☕</Text>
        <Text style={styles.cafeBtnLabel}>Invítame un café</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marca: {
    position: 'absolute',
    top: 55,
    color: C.marca,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 1,
  },
  header: {
    position: 'absolute',
    top: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  headerLabel: {
    color: C.gris,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerValor: {
    color: C.blanco,
    fontSize: 22,
    fontWeight: '500',
    marginTop: 2,
  },
  velocimetro: {
    alignItems: 'center',
    marginBottom: 8,
  },
  velocidadNumero: {
    fontSize: 160,
    fontWeight: '200',
    lineHeight: 170,
    letterSpacing: -6,
  },
  unidad: {
    color: C.gris,
    fontSize: 22,
    letterSpacing: 3,
    marginTop: -12,
  },
  limiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  limiteBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limiteBadgeTexto: {
    color: C.blanco,
    fontSize: 18,
    fontWeight: '600',
  },
  limiteLabel: {
    color: C.gris,
    fontSize: 14,
  },
  estado: {
    fontSize: 13,
    marginTop: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mensajeContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: C.superficie,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: C.marca,
  },
  mensajeTexto: {
    color: C.blanco,
    fontSize: 14,
    lineHeight: 22,
  },
  btnTerminar: { marginTop: 20, borderColor: '#4fc3f7', borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  btnTerminarDesactivado: { borderColor: '#1a3050' },
  btnTerminarTexto: { color: '#4fc3f7', fontSize: 14 },
  cafeBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f1f3a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4fc3f7',
  },
  cafeBtnTexto: {
    fontSize: 28,
  },
  cafeBtnLabel: {
    color: '#4fc3f7',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  perfilTexto: {
    position: 'absolute',
    bottom: 160,
    color: C.gris,
    fontSize: 12,
  },
});
