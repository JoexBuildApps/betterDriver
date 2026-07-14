import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Linking, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarViaje, Evento, PuntoGPS } from '../../utils/viajes';
import { mensajeAleatorio } from '../../utils/mensajes';

const VELOCIDAD_MINIMA = 8;
const TIEMPO_NUEVO_VIAJE = 3 * 60 * 1000; // 3 minutos
const TOLERANCIA = 1.10; // 10%
const LIMITES_OPCIONES = [20, 30, 40, 50, 60, 80];

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

export default function Conducir() {
  const [velocidad, setVelocidad] = useState(0);
  const [limite, setLimite] = useState(50);
  const [topSpeed, setTopSpeed] = useState(0);
  const [viajeActivo, setViajeActivo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [perfil, setPerfil] = useState<any>(null);
  const [alertaTop, setAlertaTop] = useState(false);
  const [mostrarLimite, setMostrarLimite] = useState(false);
  const [autoInicio, setAutoInicio] = useState(false);
  const [countdownInicio, setCountdownInicio] = useState(5);
  const [countdown, setCountdown] = useState(5);
  const [limiteTemp, setLimiteTemp] = useState(50);

  // Stats del viaje
  const segundosBien = useRef(0);
  const historialVelocidad = useRef<number[]>([]);
  const segundosEnExceso = useRef(0);
  const totalVelocidades = useRef(0);
  const muestrasVelocidad = useRef(0);
  const distanciaM = useRef(0);
  const ultimaPos = useRef<{ lat: number; lon: number } | null>(null);

  const flashAnim = useRef(new Animated.Value(1)).current;
  const alertaActiva = useRef(false);
  const timerParado = useRef<any>(null);
  const timerCountdown = useRef<any>(null);
  const timerMensajeAleatorio = useRef<any>(null);
  const inicioViaje = useRef<number>(Date.now());
  const eventosViaje = useRef<Evento[]>([]);
  const rutaViaje = useRef<PuntoGPS[]>([]);
  const player = useAudioPlayer({ uri: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3' });

  useEffect(() => {
    try { activateKeepAwakeAsync(); } catch (e) {}
    AsyncStorage.getItem('perfil').then(p => { if (p) setPerfil(JSON.parse(p)); });
    AsyncStorage.getItem('limiteUltimo').then(l => {
      if (l) { setLimite(parseInt(l)); setLimiteTemp(parseInt(l)); }
    });
    // Auto inicio
    setAutoInicio(true);
    let c = 5;
    setCountdownInicio(5);
    const timerAuto = setInterval(() => {
      c--;
      setCountdownInicio(c);
      if (c <= 0) {
        clearInterval(timerAuto);
        setAutoInicio(false);
        iniciarModalLimite();
      }
    }, 1000);
    return () => clearInterval(timerAuto);
    return () => { try { deactivateKeepAwake(); } catch (e) {} };
  }, []);

  const flashearTop = () => {
    setAlertaTop(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      { iterations: 5 }
    ).start(() => { flashAnim.setValue(1); });
    setTimeout(() => setAlertaTop(false), 3500);
  };

  const hablar = (texto: string) => {
    setMensaje(texto);
    try { Speech.speak(texto, { language: 'es', rate: 0.9 }); } catch (e) {}
    setTimeout(() => setMensaje(''), 6000);
  };

  const iniciarModalLimite = () => {
    setMostrarLimite(true);
    setCountdown(5);
    let c = 5;
    timerCountdown.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerCountdown.current);
        confirmarLimite(limiteTemp);
      }
    }, 1000);
  };

  const confirmarLimite = (l: number) => {
    clearInterval(timerCountdown.current);
    setLimite(l);
    AsyncStorage.setItem('limiteUltimo', String(l));
    setMostrarLimite(false);
    resetearViaje();
    setViajeActivo(true);
  };

  const resetearViaje = () => {
    segundosBien.current = 0;
    segundosEnExceso.current = 0;
    totalVelocidades.current = 0;
    muestrasVelocidad.current = 0;
    distanciaM.current = 0;
    ultimaPos.current = null;
    eventosViaje.current = [];
    rutaViaje.current = [];
    setTopSpeed(0);
    inicioViaje.current = Date.now();
  };

  const terminarViaje = async () => {
    if (timerParado.current) clearTimeout(timerParado.current);
    const duracion = Math.round((Date.now() - inicioViaje.current) / 1000);
    if (duracion < 30) { setViajeActivo(false); return; } // ignorar viajes muy cortos

    const velocidadPromedio = muestrasVelocidad.current > 0
      ? Math.round(totalVelocidades.current / muestrasVelocidad.current)
      : 0;
    const distanciaKm = Math.round(distanciaM.current / 100) / 10;

    const vActivo = await AsyncStorage.getItem('vehiculoActivo');
    const vehiculoStr = vActivo ? JSON.parse(vActivo) : null;
    const vehiculoNombre = vehiculoStr ? `${vehiculoStr.marca} ${vehiculoStr.modelo}` : undefined;

    await guardarViaje({
      fecha: inicioViaje.current,
      duracion,
      topSpeed,
      velocidadPromedio,
      distanciaKm,
      limite,
      eventos: eventosViaje.current,
      ruta: rutaViaje.current,
      vehiculo: vehiculoNombre,
      segundosEnExceso: segundosEnExceso.current,
    });

    setViajeActivo(false);
    setTopSpeed(0);
  };

  useEffect(() => {
    let suscripcion: any;
    let intervaloStats: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const rawKmh = (speed ?? 0) * 3.6;
          // Suavizado: promedio de ultimas 3 lecturas
          historialVelocidad.current.push(rawKmh);
          if (historialVelocidad.current.length > 3) historialVelocidad.current.shift();
          const promRaw = historialVelocidad.current.reduce((a, b) => a + b, 0) / historialVelocidad.current.length;
          const kmh = promRaw < VELOCIDAD_MINIMA ? 0 : Math.round(promRaw);

          setVelocidad(kmh);

          if (kmh > 0 && viajeActivo) {
            // calcular distancia
            if (ultimaPos.current) {
              const dlat = latitude - ultimaPos.current.lat;
              const dlon = longitude - ultimaPos.current.lon;
              const d = Math.sqrt(dlat * dlat + dlon * dlon) * 111000;
              distanciaM.current += d;
            }
            ultimaPos.current = { lat: latitude, lon: longitude };

            // velocidad promedio
            totalVelocidades.current += kmh;
            muestrasVelocidad.current++;

            // top speed
            setTopSpeed(prev => {
              if (kmh > prev) { flashearTop(); return kmh; }
              return prev;
            });

            // punto GPS para ruta
            const enExceso = kmh > limite * TOLERANCIA;
            const enPrecaucion = kmh > limite && !enExceso;
            const color = enExceso ? 'rojo' : enPrecaucion ? 'amarillo' : 'verde';
            if (rutaViaje.current.length === 0 || Date.now() - rutaViaje.current[rutaViaje.current.length - 1].timestamp > 10000) {
              rutaViaje.current.push({ lat: latitude, lon: longitude, velocidad: kmh, limite, timestamp: Date.now(), color });
            }

            // stats de puntos
            if (enExceso) {
              segundosEnExceso.current++;
              if (!alertaActiva.current) {
                alertaActiva.current = true;
                try { player.play(); } catch (e) {}
                hablar(mensajeAleatorio('exceso'));
                eventosViaje.current.push({ tipo: 'exceso', timestamp: Date.now(), velocidad: kmh, limite });
                setTimeout(() => { alertaActiva.current = false; }, 8000);
              }
            } else {
              segundosBien.current++;
              // Mensaje aleatorio tier 1 cada 3-5 minutos
                const delay = (180 + Math.random() * 120) * 1000;
                timerMensajeAleatorio.current = setTimeout(() => {
                  hablar(mensajeAleatorio('aleatorio'));
                  timerMensajeAleatorio.current = null;
                }, delay);
              }
            }

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
        }
      );
    })();

    return () => {
      suscripcion?.remove();
      if (intervaloStats) clearInterval(intervaloStats);
    };
  }, [viajeActivo, limite]);

  const getColorVelocidad = () => {
    if (velocidad > limite * TOLERANCIA) return C.rojo;
    if (velocidad > limite) return C.amarillo;
    return C.blanco;
  };

  const getEstado = () => {
    if (velocidad > limite * TOLERANCIA) return 'Exceso de velocidad';
    if (velocidad > limite) return 'Precaución';
    return velocidad === 0 ? 'Detenido' : 'Velocidad normal';
  };

  const getColorEstado = () => {
    if (velocidad > limite * TOLERANCIA) return C.rojo;
    if (velocidad > limite) return C.amarillo;
    return C.gris;
  };

  // Puntos en tiempo real
  const puntosActuales = Math.max(0,
    Math.floor(segundosBien.current / 60) -
    (eventosViaje.current.length * 10) -
    Math.floor(segundosEnExceso.current / 60)
  );

  const getColorPuntos = () => {
    if (puntosActuales >= 10) return C.verde;
    if (puntosActuales >= 5) return C.amarillo;
    return C.rojo;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.marca}>betterDriver</Text>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>puntos</Text>
          <Text style={[styles.headerValor, { color: getColorPuntos() }]}>{puntosActuales}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.headerLabel, alertaTop && { color: C.rojo }]}>
            {alertaTop ? '⚠ alerta' : 'top speed'}
          </Text>
          <Animated.Text style={[styles.headerValor, alertaTop && { color: C.rojo }, { opacity: alertaTop ? flashAnim : 1 }]}>
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

      {!viajeActivo ? (
        <TouchableOpacity style={styles.btnIniciar} onPress={iniciarModalLimite}>
          <Text style={styles.btnIniciarTexto}>Iniciar viaje</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.btnTerminar} onPress={terminarViaje}>
          <Text style={styles.btnTerminarTexto}>Terminar viaje</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cafeBtn} onPress={() => Linking.openURL('https://paypal.me/joebuildapps')}>
        <Text style={styles.cafeBtnTexto}>☕</Text>
        <Text style={styles.cafeBtnLabel}>Invítame un café</Text>
      </TouchableOpacity>

      {perfil && (
        <Text style={styles.perfilTexto}>{perfil.nombre} · {perfil.ciudad}</Text>
      )}

      <Modal visible={mostrarLimite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>¿Límite de velocidad?</Text>
            <Text style={styles.modalSub}>Velocidad urbana sugerida: 50 km/h</Text>

            <View style={styles.limitesGrid}>
              {LIMITES_OPCIONES.map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.limiteOpcion, limiteTemp === l && styles.limiteOpcionActiva]}
                  onPress={() => { setLimiteTemp(l); confirmarLimite(l); }}
                >
                  <Text style={[styles.limiteOpcionTexto, limiteTemp === l && styles.limiteOpcionTextoActiva]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalCountdown}>Confirmando {limiteTemp} km/h en {countdown}s...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' },
  marca: { position: 'absolute', top: 55, color: C.marca, fontSize: 26, fontWeight: '600', letterSpacing: 1 },
  header: { position: 'absolute', top: 100, flexDirection: 'row', justifyContent: 'space-between', width: '90%' },
  headerLabel: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerValor: { color: C.blanco, fontSize: 22, fontWeight: '500', marginTop: 2 },
  velocimetro: { alignItems: 'center', marginBottom: 8 },
  velocidadNumero: { fontSize: 160, fontWeight: '200', lineHeight: 170, letterSpacing: -6 },
  unidad: { color: C.gris, fontSize: 22, letterSpacing: 3, marginTop: -12 },
  limiteContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  limiteBadge: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: C.blanco, alignItems: 'center', justifyContent: 'center' },
  limiteBadgeTexto: { color: C.blanco, fontSize: 18, fontWeight: '600' },
  limiteLabel: { color: C.gris, fontSize: 14 },
  estado: { fontSize: 13, marginTop: 14, letterSpacing: 1, textTransform: 'uppercase' },
  mensajeContainer: { position: 'absolute', bottom: 180, left: 20, right: 20, backgroundColor: C.superficie, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: C.marca },
  mensajeTexto: { color: C.blanco, fontSize: 14, lineHeight: 22 },
  btnIniciar: { marginTop: 32, backgroundColor: C.verde, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  btnIniciarTexto: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  btnTerminar: { marginTop: 32, borderColor: C.rojo, borderWidth: 1, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  btnTerminarTexto: { color: C.rojo, fontSize: 16 },
  cafeBtn: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'column', alignItems: 'center', gap: 4, backgroundColor: C.superficie, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: C.marca },
  cafeBtnTexto: { fontSize: 28 },
  cafeBtnLabel: { color: C.marca, fontSize: 12, fontStyle: 'italic', fontWeight: '600' },
  perfilTexto: { position: 'absolute', bottom: 100, color: C.gris, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.superficie, borderRadius: 20, padding: 24, width: '85%', borderWidth: 1, borderColor: C.marca },
  modalTitulo: { color: C.blanco, fontSize: 20, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  modalSub: { color: C.gris, fontSize: 13, textAlign: 'center', marginBottom: 24 },
  limitesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  limiteOpcion: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: C.gris, alignItems: 'center', justifyContent: 'center' },
  limiteOpcionActiva: { borderColor: C.marca, backgroundColor: 'rgba(79,195,247,0.15)' },
  limiteOpcionTexto: { color: C.gris, fontSize: 18, fontWeight: '500' },
  limiteOpcionTextoActiva: { color: C.marca },
  modalCountdown: { color: C.gris, fontSize: 13, textAlign: 'center' },
});
