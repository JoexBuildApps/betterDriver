import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Linking, Modal, useWindowDimensions, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { guardarViaje, Evento, PuntoGPS } from '../../utils/viajes';
import { mensajeAleatorio } from '../../utils/mensajes';
import { CONFIG } from '../../utils/config';
import { C } from '../../utils/colors';

const VELOCIDAD_MINIMA = 8;
const TIEMPO_NUEVO_VIAJE = 3 * 60 * 1000;
const TOLERANCIA = 1.10;
const LIMITES_OPCIONES = [50, 60, 70, 80];

function Velocimetro({ velocidad, limite, size = 260, unidadLabel = 'km/h' }: { velocidad: number; limite: number; size?: number; unidadLabel?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.40;
  const strokeWidth = size * 0.07;
  const startDeg = 135;
  const totalDeg = 270;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
    const end = { x: cx + r * Math.cos(toRad(endAngle)), y: cy + r * Math.sin(toRad(endAngle)) };
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
      <Path d={describeArc(startDeg, startDeg + totalDeg)} fill="none" stroke={C.divider} strokeWidth={strokeWidth} strokeLinecap="round" />
      {velocidad > 0 && (
        <Path d={describeArc(startDeg, endDeg)} fill="none" stroke={getColor()} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      <SvgText x={cx} y={cy + size * 0.08} textAnchor="middle" fill={getColor()} fontSize={size * 0.30} fontWeight="200">{velocidad}</SvgText>
      <SvgText x={cx} y={cy + size * 0.22} textAnchor="middle" fill={C.gris} fontSize={size * 0.08} letterSpacing={2}>{unidadLabel}</SvgText>
    </Svg>
  );
}

export default function Conducir() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<any>(null);
  const [modoManual, setModoManual] = useState(false);
  const [limiteManual, setLimiteManual] = useState('');
  const [unidad, setUnidad] = useState<'kmh' | 'mph'>('kmh');
  const [modoRoaming, setModoRoaming] = useState(false);

  const [mostrarSelectorModo, setMostrarSelectorModo] = useState(false);
  const [modoDebug, setModoDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ gpsRaw: 0, gpsProm: 0, accel: 0, quieto: false, segundosBajo: 0 });
  const origenRef = useRef<string | undefined>(undefined);

  const segundosBien = useRef(0);
  const segundosEnExceso = useRef(0);
  const totalVelocidades = useRef(0);
  const muestrasVelocidad = useRef(0);
  const distanciaM = useRef(0);
  const ultimaPos = useRef<{ lat: number; lon: number } | null>(null);
  const historialVelocidad = useRef<number[]>([]);
  const timerDesaceleracion = useRef<any>(null);
  const segundosBajoVelocidad = useRef(0);
  const velocidadDisplay = useRef(0);
  const accelMagnitud = useRef(0);
  const quietoAcelerometro = useRef(false);

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
    AsyncStorage.getItem('perfil').then(p => {
      if (p) { const parsed = JSON.parse(p); setPerfil(parsed); setUnidad(parsed.unidad || 'kmh'); }
    });
    AsyncStorage.getItem('limiteUltimo').then(l => {
      if (l) { setLimite(parseInt(l)); setLimiteTemp(parseInt(l)); }
    });
    AsyncStorage.getItem('vehiculos').then(v => { if (v) setVehiculos(JSON.parse(v)); });
    AsyncStorage.getItem('vehiculoActivo').then(v => { if (v) setVehiculoSeleccionado(JSON.parse(v)); });
    AsyncStorage.getItem('ultimoModo').then(m => { if (m === 'roaming') setEsRoaming(true); else setEsRoaming(false); });

    setMostrarSelectorModo(true);
    return () => {
      try { deactivateKeepAwake(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!viajeActivo && !modoRoaming) return;
    Accelerometer.setUpdateInterval(200);
    const accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitud = Math.sqrt(x * x + y * y + z * z);
      accelMagnitud.current = magnitud;
      quietoAcelerometro.current = Math.abs(magnitud - 1) < 0.12;
      const quieto = Math.abs(magnitud - 1) < 0.12;
      quietoAcelerometro.current = quieto;
      AsyncStorage.setItem('debugAccel', JSON.stringify({ accel: Math.round(magnitud * 100) / 100, quieto }));
      setDebugInfo(prev => ({ ...prev, accel: Math.round(magnitud * 100) / 100, quieto }));
    });
    return () => accelSub.remove();
  }, [viajeActivo, modoRoaming]);

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
    setModoManual(false);
    setLimiteManual('');
    setCountdown(5);
    let c = 5;
    timerCountdown.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(timerCountdown.current); confirmarLimite(limiteTemp); }
    }, 1000);
  };

  const [esRoaming, setEsRoaming] = useState(false);

  const confirmarLimite = (l: number) => {
    clearInterval(timerCountdown.current);
    setLimite(l);
    setModoManual(false);
    setLimiteManual('');
    AsyncStorage.setItem('limiteUltimo', String(l));
    setMostrarSelectorModo(false);
    AsyncStorage.setItem('ultimoModo', 'viaje');
    if (esRoaming) {
      iniciarRoaming(l);
      return;
    }
    if (vehiculoSeleccionado) AsyncStorage.setItem('vehiculoActivo', JSON.stringify(vehiculoSeleccionado));
    setMostrarLimite(false);
    resetearViaje();
    setViajeActivo(true);
    // Capturar origen
    Location.getCurrentPositionAsync({}).then(loc => {
      Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }).then(res => {
        if (res.length > 0) {
          const r = res[0];
          origenRef.current = r.district || r.subregion || r.city || undefined;
        }
      }).catch(() => {});
    }).catch(() => {});
  };

  const iniciarRoaming = (l: number) => {
    setLimite(l);
    AsyncStorage.setItem('ultimoModo', 'roaming');
    setModoRoaming(true);
    setMostrarSelectorModo(false);
    setMostrarLimite(false);
  };

  const detenerRoaming = () => {
    setModoRoaming(false);
    setVelocidad(0);
    velocidadDisplay.current = 0;
  };

  const confirmarManual = () => {
    const l = parseInt(limiteManual);
    if (l > 0 && l <= 200) confirmarLimite(l);
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

    const velocidadPromedio = muestrasVelocidad.current > 0 ? Math.round(totalVelocidades.current / muestrasVelocidad.current) : 0;
    let destinoBarrio: string | undefined;
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const res = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (res.length > 0) { const r = res[0]; destinoBarrio = r.district || r.subregion || r.city || undefined; }
    } catch (e) {}
    const distanciaKm = Math.round(distanciaM.current / 100) / 10;
    const vActivo = await AsyncStorage.getItem('vehiculoActivo');
    const vehiculoStr = vActivo ? JSON.parse(vActivo) : null;
    const vehiculoNombre = vehiculoStr ? `${vehiculoStr.marca} ${vehiculoStr.modelo}` : undefined;

    await guardarViaje({
      fecha: inicioViaje.current, duracion, topSpeed, velocidadPromedio,
      distanciaKm, limite, eventos: eventosViaje.current,
      ruta: rutaViaje.current, vehiculo: vehiculoNombre,
      segundosEnExceso: segundosEnExceso.current,
      origenBarrio: origenRef.current,
      destinoBarrio,
      tipoVehiculo: vehiculoStr?.tipo,
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
          if (historialVelocidad.current.length > 5) historialVelocidad.current.shift();
          const promRaw = historialVelocidad.current.reduce((a, b) => a + b, 0) / historialVelocidad.current.length;
          const kmhReal = Math.round(promRaw);

          AsyncStorage.setItem('debugGPS', JSON.stringify({ gpsRaw: Math.round(rawKmh), gpsProm: kmhReal, segundosBajo: segundosBajoVelocidad.current }));
          if (modoDebug) {
            setDebugInfo(prev => ({ ...prev, gpsRaw: Math.round(rawKmh), gpsProm: kmhReal, segundosBajo: segundosBajoVelocidad.current }));
          }
          const telefonoQuieto = quietoAcelerometro.current;
          const gpsLento = kmhReal < 20;

          // GPS manda siempre - acelerometro solo confirma parada cuando GPS < 20
          if (gpsLento && telefonoQuieto) {
            segundosBajoVelocidad.current++;
            if (segundosBajoVelocidad.current >= 3) {
              if (!timerDesaceleracion.current && velocidadDisplay.current > 0) {
                timerDesaceleracion.current = setInterval(() => {
                  velocidadDisplay.current = Math.max(0, velocidadDisplay.current - 5);
                  setVelocidad(velocidadDisplay.current);
                  if (velocidadDisplay.current <= 0) { clearInterval(timerDesaceleracion.current); timerDesaceleracion.current = null; }
                }, 300);
              }
            }
          } else {
            segundosBajoVelocidad.current = 0;
            if (timerDesaceleracion.current) { clearInterval(timerDesaceleracion.current); timerDesaceleracion.current = null; }
            velocidadDisplay.current = kmhReal;
            setVelocidad(kmhReal);
          }
          const kmh = (gpsLento && telefonoQuieto && segundosBajoVelocidad.current >= 3) ? 0 : kmhReal;

          if (kmh > 0 && (viajeActivo || modoRoaming)) {
            if (ultimaPos.current) {
              const dlat = latitude - ultimaPos.current.lat;
              const dlon = longitude - ultimaPos.current.lon;
              distanciaM.current += Math.sqrt(dlat * dlat + dlon * dlon) * 111000;
            }
            ultimaPos.current = { lat: latitude, lon: longitude };
            totalVelocidades.current += kmh;
            muestrasVelocidad.current++;
            if (kmhReal > topSpeed && kmhReal > 5) { setTopSpeed(kmhReal); flashearTop(); }

            const enExceso = kmh > limite * TOLERANCIA;
            const color = enExceso ? 'rojo' : kmh > limite ? 'amarillo' : 'verde';
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
            if (timerParado.current) { clearTimeout(timerParado.current); timerParado.current = null; }
          } else if (kmh === 0 && viajeActivo) {
            if (!timerParado.current) {
              timerParado.current = setTimeout(() => { terminarViaje(); timerParado.current = null; }, TIEMPO_NUEVO_VIAJE);
            }
          }
        }
      );
    })();
    return () => suscripcion?.remove();
  }, [viajeActivo, limite]);

  const kmhToDisplay = (kmh: number) => unidad === 'mph' ? Math.round(kmh * 0.621371) : kmh;
  const unidadLabel = unidad === 'mph' ? 'mph' : 'km/h';

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
    Math.floor(segundosBien.current / 60) - (eventosViaje.current.length * 3) - Math.floor(segundosEnExceso.current / 60)
  );

  const getColorPuntos = () => puntosActuales >= 10 ? C.verde : puntosActuales >= 5 ? C.amarillo : C.rojo;
  const velocimetroSize = isLandscape ? Math.min(height * 0.75, 220) : Math.min(width * 0.75, 280);

  const HeaderStats = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 8 }}>
      <View>
        <Text style={styles.headerLabel}>puntos</Text>
        <Text style={[styles.headerValor, { color: getColorPuntos() }]}>{puntosActuales}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.headerLabel, alertaTop && { color: C.rojo }]}>{alertaTop ? '⚠ alerta' : 'top speed'}</Text>
        <Animated.Text style={[styles.headerValor, alertaTop && { color: C.rojo }, { opacity: alertaTop ? flashAnim : 1 }]}>
          {kmhToDisplay(topSpeed)} {unidadLabel}
        </Animated.Text>
      </View>
    </View>
  );

  const BotonesViaje = () => {
    if (modoRoaming) {
      return (
        <TouchableOpacity style={styles.btnRoaming} onPress={detenerRoaming}>
          <Text style={[styles.btnRoamingTexto, { color: C.marca }]}>🎙 Modo libre activo · Detener</Text>
        </TouchableOpacity>
      );
    }
    if (viajeActivo) {
      return (
        <TouchableOpacity style={styles.btnTerminar} onPress={terminarViaje}>
          <Text style={styles.btnTerminarTexto}>Terminar viaje</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <TouchableOpacity
          style={[styles.btnModoLibre]}
          onPress={() => { setEsRoaming(true); setMostrarSelectorModo(true); }}
        >
          <Text style={styles.btnModoLibreTexto}>🎙 Modo libre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnIniciar, { flex: 1 }]}
          onPress={() => { setEsRoaming(false); setMostrarSelectorModo(true); }}
        >
          <Text style={styles.btnIniciarTexto}>🚗 Iniciar viaje</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text style={styles.marca}>betterDriver</Text>

      {isLandscape ? (
        <View style={styles.landscapeContainer}>
          <View style={styles.landscapeLeft}>
            <Velocimetro velocidad={kmhToDisplay(velocidad)} limite={limite} size={velocimetroSize} unidadLabel={unidadLabel} />
            <View style={styles.limiteRow}>
              <View style={styles.limiteBadge}><Text style={styles.limiteBadgeTexto}>{limite}</Text></View>
              <Text style={styles.limiteLabel}>límite</Text>
            </View>
          </View>
          <View style={styles.divisor} />
          <View style={styles.landscapeRight}>
            <HeaderStats />
            <Text style={[styles.estado, { color: getColorEstado(), marginVertical: 12 }]}>{getEstado()}</Text>
            <BotonesViaje />
            {mensaje !== '' && (
              <View style={[styles.mensajeContainer, { position: 'relative', bottom: 0, left: 0, right: 0, marginTop: 12 }]}>
                <Text style={styles.mensajeTexto}>{mensaje}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.portraitContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.portraitHeader}><HeaderStats /></View>
          <Velocimetro velocidad={kmhToDisplay(velocidad)} limite={limite} size={velocimetroSize} unidadLabel={unidadLabel} />
          <View style={styles.limiteRow}>
            <View style={styles.limiteBadge}><Text style={styles.limiteBadgeTexto}>{limite}</Text></View>
            <Text style={styles.limiteLabel}>límite de zona</Text>
          </View>
          <Text style={[styles.estado, { color: getColorEstado() }]}>{getEstado()}</Text>
          {mensaje !== '' && (
            <View style={styles.mensajeContainer}>
              <Text style={styles.mensajeTexto}>{mensaje}</Text>
            </View>
          )}
          <BotonesViaje />

          {perfil && <Text style={styles.perfilTexto}>{perfil.nombre} · {perfil.ciudad}</Text>}


        </ScrollView>
      )}

      <Modal visible={mostrarSelectorModo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>¿Cómo vas hoy?</Text>

            {/* Selector de modo */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: height * 0.02 }}>
              <TouchableOpacity
                style={[styles.modoBtnCompacto, { height: Math.min(height * 0.15, 120) }, esRoaming && { borderColor: C.marca, backgroundColor: 'rgba(46,230,197,0.1)' }]}
                onPress={() => setEsRoaming(true)}
              >
                <Text style={styles.modoBtnIcon}>🎙</Text>
                <Text style={[styles.modoBtnTituloCompacto, esRoaming && { color: C.marca }]}>Modo libre</Text>
                <Text style={styles.modoBtnSubCompacto}>Sin registros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modoBtnCompacto, { height: Math.min(height * 0.15, 120) }, !esRoaming && { borderColor: C.verde, backgroundColor: 'rgba(48,209,88,0.1)' }]}
                onPress={() => setEsRoaming(false)}
              >
                <Text style={styles.modoBtnIcon}>🚗</Text>
                <Text style={[styles.modoBtnTituloCompacto, !esRoaming && { color: C.verde }]}>Iniciar viaje</Text>
                <Text style={styles.modoBtnSubCompacto}>Con historial</Text>
              </TouchableOpacity>
            </View>

            {/* Selector de velocidad */}
            <Text style={[styles.modalTitulo, { fontSize: 15, marginBottom: 10 }]}>¿Límite de velocidad?</Text>
            <View style={styles.limitesGrid}>
              <TouchableOpacity
                style={[styles.limiteOpcion, modoManual && styles.limiteOpcionActiva]}
                onPress={() => { setModoManual(true); }}
              >
                <Text style={[styles.limiteOpcionTexto, modoManual && styles.limiteOpcionTextoActiva]}>Manual</Text>
              </TouchableOpacity>
              {[50, 60, 70, 80].map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.limiteOpcion, limiteTemp === l && !modoManual && styles.limiteOpcionActiva]}
                  onPress={() => { setModoManual(false); setLimiteTemp(l); }}
                >
                  <Text style={[styles.limiteOpcionTexto, limiteTemp === l && !modoManual && styles.limiteOpcionTextoActiva]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {modoManual && (
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <TextInput
                  style={styles.manualInput}
                  value={limiteManual}
                  onChangeText={setLimiteManual}
                  placeholder="Ej: 45"
                  placeholderTextColor={C.gris}
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus
                />
              </View>
            )}

            {/* Selector de vehiculo - solo si hay 2+ y es viaje */}
            {!esRoaming && vehiculos.length > 1 && (
              <>
                <Text style={[styles.modalTitulo, { fontSize: 15, marginBottom: 10 }]}>¿En qué carro?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {vehiculos.map((v, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.vehiculoBtn, vehiculoSeleccionado?.marca === v.marca && vehiculoSeleccionado?.modelo === v.modelo && styles.vehiculoBtnActivo]}
                      onPress={() => setVehiculoSeleccionado(v)}
                    >
                      <Text style={[styles.vehiculoBtnTexto, vehiculoSeleccionado?.marca === v.marca && vehiculoSeleccionado?.modelo === v.modelo && styles.vehiculoBtnTextoActivo]}>
                        {v.tipo?.split(' ')[0] || '🚗'} {v.marca} {v.modelo}
                      </Text>
                      <Text style={styles.vehiculoBtnAnio}>{v.anio}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Boton empezar */}
            <TouchableOpacity
              style={[styles.btnEmpezar, { backgroundColor: esRoaming ? C.marca : C.verde }]}
              onPress={() => {
                const l = modoManual ? parseInt(limiteManual) || limiteTemp : limiteTemp;
                if (esRoaming) {
                  iniciarRoaming(l);
                } else {
                  confirmarLimite(l);
                }
              }}
              disabled={modoManual && !limiteManual}
            >
              <Text style={styles.btnEmpezarTexto}>Empezar →</Text>
            </TouchableOpacity>

          </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={mostrarLimite} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {vehiculos.length > 1 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.modalTitulo}>¿En qué carro vas hoy?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {vehiculos.map((v, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.vehiculoBtn, vehiculoSeleccionado?.marca === v.marca && vehiculoSeleccionado?.modelo === v.modelo && styles.vehiculoBtnActivo]}
                        onPress={() => setVehiculoSeleccionado(v)}
                      >
                        <Text style={[styles.vehiculoBtnTexto, vehiculoSeleccionado?.marca === v.marca && vehiculoSeleccionado?.modelo === v.modelo && styles.vehiculoBtnTextoActivo]}>
                          {v.marca} {v.modelo}
                        </Text>
                        <Text style={styles.vehiculoBtnAnio}>{v.anio}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.modalTitulo}>¿Límite de velocidad?</Text>
              <View style={styles.limitesGrid}>
                <TouchableOpacity
                  style={[styles.limiteOpcion, modoManual && styles.limiteOpcionActiva]}
                  onPress={() => { setModoManual(true); clearInterval(timerCountdown.current); }}
                >
                  <Text style={[styles.limiteOpcionTexto, modoManual && styles.limiteOpcionTextoActiva]}>Manual</Text>
                </TouchableOpacity>
                {LIMITES_OPCIONES.map(l => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.limiteOpcion, limiteTemp === l && !modoManual && styles.limiteOpcionActiva]}
                    onPress={() => { setModoManual(false); setLimiteTemp(l); confirmarLimite(l); }}
                  >
                    <Text style={[styles.limiteOpcionTexto, limiteTemp === l && !modoManual && styles.limiteOpcionTextoActiva]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {modoManual ? (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 }}>
                  <TextInput
                    style={styles.manualInput}
                    value={limiteManual}
                    onChangeText={setLimiteManual}
                    placeholder="Ej: 45"
                    placeholderTextColor={C.gris}
                    keyboardType="numeric"
                    maxLength={3}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.manualOk, !limiteManual && { backgroundColor: C.superficie2 }]}
                    onPress={confirmarManual}
                    disabled={!limiteManual}
                  >
                    <Text style={styles.manualOkTexto}>OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.modalCountdown}>Confirmando {limiteTemp} km/h en {countdown}s...</Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  marca: { textAlign: 'center', paddingTop: 20, color: C.marca, fontSize: 22, fontWeight: '600', letterSpacing: 1 },
  portraitContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  portraitHeader: { width: '90%', marginBottom: 8 },
  landscapeContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  landscapeLeft: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  landscapeRight: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  divisor: { width: 1, height: '70%', backgroundColor: C.divider },
  headerLabel: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerValor: { color: C.blanco, fontSize: 22, fontWeight: '500', marginTop: 2 },
  limiteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  limiteBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.blanco, alignItems: 'center', justifyContent: 'center' },
  limiteBadgeTexto: { color: C.blanco, fontSize: 16, fontWeight: '600' },
  limiteLabel: { color: C.gris, fontSize: 14 },
  estado: { fontSize: 13, marginTop: 10, letterSpacing: 1, textTransform: 'uppercase' },
  mensajeContainer: { position: 'absolute', top: 90, left: 16, right: 16, backgroundColor: C.superficie, borderRadius: 16, padding: 14, borderLeftWidth: 3, borderLeftColor: C.marca, zIndex: 100 },
  mensajeTexto: { color: C.blanco, fontSize: 13, lineHeight: 20 },
  btnIniciar: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: C.verde,
    shadowColor: C.verde,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  btnIniciarTexto: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  btnTerminar: { marginTop: 20, borderColor: C.rojo, borderWidth: 1, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 32 },
  btnTerminarTexto: { color: C.rojo, fontSize: 16 },
  perfilTexto: { marginTop: 12, color: C.gris, fontSize: 12 },
  modoBtnCompacto: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.divider, gap: 4 },
  modoBtnTituloCompacto: { color: C.gris, fontSize: 14, fontWeight: '600' },
  modoBtnSubCompacto: { color: C.gris, fontSize: 11 },
  btnEmpezar: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 32, alignItems: 'center', marginTop: 4 },
  btnEmpezarTexto: { color: C.fondo, fontSize: 16, fontWeight: 'bold' },
  modoBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,230,197,0.4)', marginBottom: 12 },
  modoBtnIcon: { fontSize: 28 },
  modoBtnTitulo: { color: C.marca, fontSize: 16, fontWeight: '600' },
  modoBtnSub: { color: C.gris, fontSize: 12, marginTop: 2 },
  debugBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#223452' },
  debugBtnTexto: { color: '#607d8b', fontSize: 11 },
  debugOverlay: { position: 'absolute', bottom: 100, left: 12, right: 12, backgroundColor: 'rgba(7,17,31,0.95)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2EE6C5', zIndex: 200 },
  debugTitulo: { color: '#2EE6C5', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  debugLinea: { color: '#A4B2C5', fontSize: 12, marginBottom: 4 },
  debugValor: { color: '#F4F8FC', fontWeight: '600' },
  btnModoLibre: { flex: 1, paddingVertical: 14, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(46,230,197,0.4)', alignItems: 'center' },
  btnModoLibreTexto: { color: C.marca, fontSize: 15, fontWeight: '500' },
  btnRoaming: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.divider },
  btnRoamingActivo: { borderColor: C.marca },
  btnRoamingTexto: { color: C.gris, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: 'rgba(18, 31, 55, 0.97)', borderRadius: 20, padding: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(46,230,197,0.4)' },
  modalTitulo: { color: C.blanco, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  limitesGrid: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 },
  limiteOpcion: { flex: 1, aspectRatio: 1, borderRadius: 999, borderWidth: 2, borderColor: C.divider, alignItems: 'center', justifyContent: 'center', maxHeight: 64 },
  limiteOpcionActiva: { borderColor: C.marca, backgroundColor: 'rgba(46,230,197,0.15)' },
  limiteOpcionTexto: { color: C.gris, fontSize: 16, fontWeight: '500' },
  limiteOpcionTextoActiva: { color: C.marca },
  modalCountdown: { color: C.gris, fontSize: 13, textAlign: 'center' },
  vehiculoBtn: { borderWidth: 1, borderColor: C.divider, borderRadius: 12, padding: 12, marginRight: 8, minWidth: 100, alignItems: 'center' },
  vehiculoBtnActivo: { borderColor: C.marca, backgroundColor: 'rgba(46,230,197,0.15)' },
  vehiculoBtnTexto: { color: C.gris, fontSize: 13, fontWeight: '500' },
  vehiculoBtnTextoActivo: { color: C.marca },
  vehiculoBtnAnio: { color: C.gris, fontSize: 11, marginTop: 2 },
  manualInput: { flex: 1, backgroundColor: C.superficie2, color: C.blanco, fontSize: 20, padding: 12, borderRadius: 12, textAlign: 'center' },
  manualOk: { backgroundColor: C.marca, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  manualOkTexto: { color: C.fondo, fontSize: 16, fontWeight: 'bold' },
});
