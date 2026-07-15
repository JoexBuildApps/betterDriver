import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Linking, Modal, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardarViaje, Evento, PuntoGPS } from '../../utils/viajes';
import { mensajeAleatorio } from '../../utils/mensajes';
import { CONFIG } from '../../utils/config';

const VELOCIDAD_MINIMA = 8;
const TIEMPO_NUEVO_VIAJE = 3 * 60 * 1000;
const TOLERANCIA = 1.10;
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
  arcoBase: '#1a3050',
};

function Velocimetro({ velocidad, limite, size = 260 }: { velocidad: number; limite: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.40;
  const strokeWidth = size * 0.07;

  // Arco de 135 grados a 405 grados (270 grados total, empezando abajo-izquierda)
  const startDeg = 135;
  const totalDeg = 270;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = {
      x: cx + r * Math.cos(toRad(startAngle)),
      y: cy + r * Math.sin(toRad(startAngle)),
    };
    const end = {
      x: cx + r * Math.cos(toRad(endAngle)),
      y: cy + r * Math.sin(toRad(endAngle)),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const velocidadMax = Math.max(limite * 2, 120);
  const porcentaje = Math.min(velocidad / velocidadMax, 1);
  const endDeg = startDeg + porcentaje * totalDeg;

  const getColor = () => {
    if (velocidad > limite * TOLERANCIA) return C.rojo;
    if (velocidad > limite) return C.amarillo;
    return C.marca;
  };

  return (
    <Svg width={size} height={size}>
      {/* Arco base gris */}
      <Path
        d={describeArc(startDeg, startDeg + totalDeg)}
        fill="none"
        stroke={C.arcoBase}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Arco activo coloreado */}
      {velocidad > 0 && (
        <Path
          d={describeArc(startDeg, endDeg)}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      {/* Número central */}
      <SvgText
        x={cx}
        y={cy + size * 0.08}
        textAnchor="middle"
        fill={getColor()}
        fontSize={size * 0.30}
        fontWeight="200"
      >
        {velocidad}
      </SvgText>
      {/* km/h */}
      <SvgText
        x={cx}
        y={cy + size * 0.22}
        textAnchor="middle"
        fill={C.gris}
        fontSize={size * 0.08}
        letterSpacing={2}
      >
        km/h
      </SvgText>
    </Svg>
  );
}

export default function Conducir() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [velocidad, setVelocidad] = useState(0);
  const [limite, setLimite] = useState(50);
  const [topSpeed, setTopSpeed] = useState(0);
  const [viajeActivo, setViajeActivo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [perfil, setPerfil] = useState<any>(null);
  const [alertaTop, setAlertaTop] = useState(false);
  const [mostrarLimite, setMostrarLimite] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [limiteTemp, setLimiteTemp] = useState(50);

  const segundosBien = useRef(0);
  const segundosEnExceso = useRef(0);
  const totalVelocidades = useRef(0);
  const muestrasVelocidad = useRef(0);
  const distanciaM = useRef(0);
  const ultimaPos = useRef<{ lat: number; lon: number } | null>(null);
  const historialVelocidad = useRef<number[]>([]);

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
    let c = 5;
    setCountdown(5);
    const timerAuto = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerAuto);
        iniciarModalLimite();
      }
    }, 1000);
    return () => {
      try { deactivateKeepAwake(); } catch (e) {}
      clearInterval(timerAuto);
    };
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
    historialVelocidad.current = [];
    eventosViaje.current = [];
    rutaViaje.current = [];
    setTopSpeed(0);
    inicioViaje.current = Date.now();
  };

  const terminarViaje = async () => {
    if (timerParado.current) clearTimeout(timerParado.current);
    if (timerMensajeAleatorio.current) clearTimeout(timerMensajeAleatorio.current);
    const duracion = Math.round((Date.now() - inicioViaje.current) / 1000);
    if (duracion < 60 || distanciaM.current < 100) { setViajeActivo(false); return; }

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
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 5 },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const rawKmh = (speed ?? 0) * 3.6;
          historialVelocidad.current.push(rawKmh);
          if (historialVelocidad.current.length > 3) historialVelocidad.current.shift();
          const promRaw = historialVelocidad.current.reduce((a, b) => a + b, 0) / historialVelocidad.current.length;
          const kmh = promRaw < 5 ? 0 : Math.round(promRaw);

          setVelocidad(kmh);

          if (kmh > 0 && viajeActivo) {
            if (ultimaPos.current) {
              const dlat = latitude - ultimaPos.current.lat;
              const dlon = longitude - ultimaPos.current.lon;
              const d = Math.sqrt(dlat * dlat + dlon * dlon) * 111000;
              distanciaM.current += d;
            }
            ultimaPos.current = { lat: latitude, lon: longitude };
            totalVelocidades.current += kmh;
            muestrasVelocidad.current++;

            setTopSpeed(prev => {
              if (kmh > prev && kmh > 5) { flashearTop(); return kmh; }
              return prev;
            });

            const enExceso = kmh > limite * TOLERANCIA;
            const enPrecaucion = kmh > limite && !enExceso;
            const color = enExceso ? 'rojo' : enPrecaucion ? 'amarillo' : 'verde';
            if (rutaViaje.current.length === 0 || Date.now() - rutaViaje.current[rutaViaje.current.length - 1].timestamp > 10000) {
              rutaViaje.current.push({ lat: latitude, lon: longitude, velocidad: kmh, limite, timestamp: Date.now(), color });
            }

            if (enExceso) {
              segundosEnExceso.current++;
              if (timerMensajeAleatorio.current) { clearTimeout(timerMensajeAleatorio.current); timerMensajeAleatorio.current = null; }
              if (!alertaActiva.current) {
                alertaActiva.current = true;
                try { player.play(); } catch (e) {}
                hablar(mensajeAleatorio('exceso'));
                eventosViaje.current.push({ tipo: 'exceso', timestamp: Date.now(), velocidad: kmh, limite });
                setTimeout(() => { alertaActiva.current = false; }, 8000);
              }
            } else {
              segundosBien.current++;
              if (!timerMensajeAleatorio.current && !alertaActiva.current) {
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
    return () => suscripcion?.remove();
  }, [viajeActivo, limite]);

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

  const puntosActuales = Math.max(0,
    Math.floor(segundosBien.current / 60) -
    (eventosViaje.current.length * 3) -
    Math.floor(segundosEnExceso.current / 60)
  );

  const getColorPuntos = () => {
    if (puntosActuales >= 10) return C.verde;
    if (puntosActuales >= 5) return C.amarillo;
    return C.rojo;
  };

  const velocimetroSize = isLandscape ? Math.min(height * 0.75, 220) : Math.min(width * 0.75, 280);

  const PanelStats = () => (
    <View style={[styles.statsPanel, isLandscape && styles.statsPanelLandscape]}>
      <View style={styles.statsRow}>
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

      <View style={styles.limiteRow}>
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

      <TouchableOpacity
        style={[styles.cafeBtn, isLandscape && { position: 'relative', bottom: 0, right: 0, alignSelf: 'flex-end', marginTop: 12 }]}
        onPress={() => Linking.openURL(CONFIG.paypal)}
      >
        <Text style={styles.cafeBtnTexto}>☕</Text>
        <Text style={styles.cafeBtnLabel}>Invítame un café</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.marca}>betterDriver</Text>

      {isLandscape ? (
        <View style={styles.landscapeContainer}>
          <View style={styles.landscapeLeft}>
            <Velocimetro velocidad={velocidad} limite={limite} size={velocimetroSize} />
          </View>
          <View style={styles.divisor} />
          <PanelStats />
        </View>
      ) : (
        <View style={styles.portraitContainer}>
          <View style={styles.portraitHeader}>
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

          <Velocimetro velocidad={velocidad} limite={limite} size={velocimetroSize} />

          <View style={styles.limiteRow}>
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

          <TouchableOpacity style={styles.cafeBtn} onPress={() => Linking.openURL(CONFIG.paypal)}>
            <Text style={styles.cafeBtnTexto}>☕</Text>
            <Text style={styles.cafeBtnLabel}>Invítame un café</Text>
          </TouchableOpacity>

          {perfil && (
            <Text style={styles.perfilTexto}>{perfil.nombre} · {perfil.ciudad}</Text>
          )}
        </View>
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
  container: { flex: 1, backgroundColor: C.fondo },
  marca: { textAlign: 'center', paddingTop: 20, color: C.marca, fontSize: 22, fontWeight: '600', letterSpacing: 1 },
  portraitContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  portraitHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginBottom: 8 },
  landscapeContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  landscapeLeft: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divisor: { width: 1, height: '70%', backgroundColor: '#1a3050' },
  statsPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  statsPanelLandscape: { alignItems: 'stretch' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  headerLabel: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerValor: { color: C.blanco, fontSize: 22, fontWeight: '500', marginTop: 2 },
  limiteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  limiteBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.blanco, alignItems: 'center', justifyContent: 'center' },
  limiteBadgeTexto: { color: C.blanco, fontSize: 16, fontWeight: '600' },
  limiteLabel: { color: C.gris, fontSize: 14 },
  estado: { fontSize: 13, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
  mensajeContainer: { marginTop: 12, marginHorizontal: 16, backgroundColor: C.superficie, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: C.marca },
  mensajeTexto: { color: C.blanco, fontSize: 13, lineHeight: 20 },
  btnIniciar: { marginTop: 20, backgroundColor: C.verde, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  btnIniciarTexto: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  btnTerminar: { marginTop: 20, borderColor: C.rojo, borderWidth: 1, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  btnTerminarTexto: { color: C.rojo, fontSize: 16 },
  cafeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.superficie, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.marca, marginTop: 16 },
  cafeBtnTexto: { fontSize: 22 },
  cafeBtnLabel: { color: C.marca, fontSize: 13, fontStyle: 'italic', fontWeight: '600' },
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
