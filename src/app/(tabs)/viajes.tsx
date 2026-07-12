import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Animated, TouchableOpacity, Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getViajes, Viaje, formatearFecha, formatearDuracion, getPuntosSemanales } from '../../utils/viajes';

const C = {
  fondo: '#0a1628',
  marca: '#4fc3f7',
  blanco: '#ffffff',
  gris: '#607d8b',
  superficie: '#0f1f3a',
  verde: '#30d158',
  amarillo: '#ffd60a',
  rojo: '#ff3b30',
};

const colorScore: Record<string, string> = {
  'Lento pero seguro': C.verde,
  'Esto es lo que se espera de ti': C.amarillo,
  'En construccion': C.amarillo,
  'Te regalaron el pase': C.rojo,
  'Deberias ir en bus': C.rojo,
};

function ScoreFlash({ score, color, estrellas }: { score: string; color: string; estrellas: number }) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    ).start();
  }, []);

  const stars = Array.from({ length: 5 }, (_, i) => i < estrellas ? '★' : '☆').join('');

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Animated.Text style={[styles.estrellas, { color, opacity: anim }]}>{stars}</Animated.Text>
      <Text style={[styles.score, { color }]}>{score}</Text>
    </View>
  );
}

function generarGPX(viaje: Viaje): string {
  const puntos = viaje.ruta || [];
  const trackpoints = puntos.map(p => `
    <trkpt lat="${p.lat}" lon="${p.lon}">
      <time>${new Date(p.timestamp).toISOString()}</time>
      <extensions>
        <speed>${p.velocidad}</speed>
        <limite>${p.limite}</limite>
        <color>${p.color}</color>
      </extensions>
    </trkpt>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="betterDriver">
  <trk>
    <name>betterDriver - ${new Date(viaje.fecha).toLocaleDateString('es-CO')}</name>
    <desc>Puntos: ${viaje.puntosFinales} | Score: ${viaje.score}</desc>
    <trkseg>${trackpoints}
    </trkseg>
  </trk>
</gpx>`;
}

async function abrirRuta(viaje: Viaje) {
  if (!viaje.ruta || viaje.ruta.length === 0) {
    return;
  }
  const gpx = generarGPX(viaje);
  const path = FileSystem.documentDirectory + `viaje_${viaje.id}.gpx`;
  await FileSystem.writeAsStringAsync(path, gpx);
  await Share.share({ url: path, title: 'Ruta betterDriver' });
}

export default function Viajes() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [puntosSemanales, setPuntosSemanales] = useState<{ semana: string; puntos: number }[]>([]);
  const [tab, setTab] = useState<'viajes' | 'semanas'>('viajes');

  useEffect(() => {
    getViajes().then(setViajes);
    getPuntosSemanales().then(setPuntosSemanales);
  }, []);

  if (viajes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No hay viajes registrados aún.</Text>
        <Text style={styles.emptySubText}>Toca "Iniciar viaje" para empezar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'viajes' && styles.tabBtnActivo]}
          onPress={() => setTab('viajes')}
        >
          <Text style={[styles.tabTexto, tab === 'viajes' && styles.tabTextoActivo]}>Mis viajes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'semanas' && styles.tabBtnActivo]}
          onPress={() => setTab('semanas')}
        >
          <Text style={[styles.tabTexto, tab === 'semanas' && styles.tabTextoActivo]}>Por semana</Text>
        </TouchableOpacity>
      </View>

      {tab === 'viajes' ? (
        <FlatList
          data={viajes}
          keyExtractor={v => v.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                <ScoreFlash
                  score={item.score}
                  color={colorScore[item.score] || C.gris}
                  estrellas={item.estrellas || 3}
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.stat}>
                  <Text style={[styles.statValor, {
                    color: item.puntosFinales >= 10 ? C.verde : item.puntosFinales >= 5 ? C.amarillo : C.rojo
                  }]}>{item.puntosFinales}</Text>
                  <Text style={styles.statLabel}>puntos</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValor}>{item.topSpeed}</Text>
                  <Text style={styles.statLabel}>top km/h</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValor}>{item.velocidadPromedio || 0}</Text>
                  <Text style={styles.statLabel}>prom km/h</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValor}>{item.distanciaKm || 0}</Text>
                  <Text style={styles.statLabel}>km</Text>
                </View>
              </View>

              <View style={styles.cardBody2}>
                <View style={styles.stat}>
                  <Text style={[styles.statValor, { color: item.infracciones > 0 ? C.rojo : C.verde }]}>
                    {item.infracciones || 0}
                  </Text>
                  <Text style={styles.statLabel}>infracciones</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValor}>{formatearDuracion(item.duracion)}</Text>
                  <Text style={styles.statLabel}>duración</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValor}>{item.limite || 50}</Text>
                  <Text style={styles.statLabel}>límite usado</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValor, { color: item.segundosEnExceso > 0 ? C.rojo : C.verde }]}>
                    {item.segundosEnExceso > 0 ? formatearDuracion(item.segundosEnExceso) : '0s'}
                  </Text>
                  <Text style={styles.statLabel}>en exceso</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {item.eventos && item.eventos.length > 0 && (
                <View style={styles.detalle}>
                  <Text style={styles.detalleLabel}>Peor momento</Text>
                  <Text style={styles.detalleValor}>
                    {Math.max(...item.eventos.map(e => e.velocidad))} km/h en zona de {item.limite}
                  </Text>
                </View>
              )}

              {item.vehiculo && (
                <View style={styles.detalle}>
                  <Text style={styles.detalleLabel}>Vehículo</Text>
                  <Text style={styles.detalleValor}>{item.vehiculo}</Text>
                </View>
              )}

              {item.ruta && item.ruta.length > 0 && (
                <TouchableOpacity style={styles.btnRuta} onPress={() => abrirRuta(item)}>
                  <Text style={styles.btnRutaTexto}>🗺 Ver ruta</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={puntosSemanales}
          keyExtractor={s => s.semana}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item, index }) => (
            <View style={styles.semanaCard}>
              <View style={styles.semanaHeader}>
                <Text style={styles.semanaTitulo}>Semana {item.semana?.split('-')[1] || item.semana}</Text>
                {index === 0 && <Text style={styles.semanaActual}>Esta semana</Text>}
              </View>
              <Text style={styles.semanaPuntos}>{item.puntos} pts</Text>
              {index > 0 && puntosSemanales[0] && (
                <Text style={[styles.semanaComparacion, {
                  color: item.puntos > puntosSemanales[0].puntos ? C.verde : C.rojo
                }]}>
                  {item.puntos > puntosSemanales[0].puntos ? '↑' : '↓'} vs esta semana
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  empty: { flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.blanco, fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: C.gris, fontSize: 14 },
  tabs: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 8, marginTop: 50 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: C.superficie },
  tabBtnActivo: { backgroundColor: C.marca },
  tabTexto: { color: C.gris, fontSize: 14, fontWeight: '500' },
  tabTextoActivo: { color: C.fondo },
  card: { backgroundColor: C.superficie, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  fecha: { color: C.gris, fontSize: 13 },
  estrellas: { fontSize: 18, letterSpacing: 2 },
  score: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardBody2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValor: { color: C.blanco, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: C.gris, fontSize: 10, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#1a3050', marginVertical: 8 },
  detalle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detalleLabel: { color: C.gris, fontSize: 13 },
  detalleValor: { color: C.blanco, fontSize: 13, fontWeight: '500' },
  btnRuta: { marginTop: 10, borderWidth: 1, borderColor: C.marca, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnRutaTexto: { color: C.marca, fontSize: 14 },
  semanaCard: { backgroundColor: C.superficie, borderRadius: 12, padding: 16, marginBottom: 12 },
  semanaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  semanaTitulo: { color: C.blanco, fontSize: 16, fontWeight: '500' },
  semanaActual: { color: C.marca, fontSize: 12 },
  semanaPuntos: { color: C.verde, fontSize: 32, fontWeight: 'bold' },
  semanaComparacion: { fontSize: 12, marginTop: 4 },
});
