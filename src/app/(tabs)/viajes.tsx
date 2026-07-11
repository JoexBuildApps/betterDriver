import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Animated } from 'react-native';
import { getViajes, Viaje, formatearFecha, formatearDuracion } from '../../utils/viajes';

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

const colorScore: Record<Viaje['score'], string> = {
  'Lento pero seguro': C.verde,
  'Esto es lo que se espera de ti': C.amarillo,
  'En construccion': C.amarillo,
  'Te regalaron el pase': C.rojo,
};

function getPeorInfraccion(eventos: Viaje['eventos']): string {
  if (eventos.length === 0) return 'Ninguna';
  const excesos = eventos.filter(e => e.tipo === 'exceso');
  if (excesos.length === 0) return 'Sin excesos de velocidad';
  const peor = excesos.reduce((a, b) => b.velocidad > a.velocidad ? b : a);
  return `${peor.velocidad} km/h en zona de ${peor.limite}`;
}

function getDesglose(eventos: Viaje['eventos']): string {
  const exceso = eventos.filter(e => e.tipo === 'exceso').length;
  const frenada = eventos.filter(e => e.tipo === 'frenada').length;
  const aceleracion = eventos.filter(e => e.tipo === 'aceleracion').length;
  const partes = [];
  if (exceso > 0) partes.push(`${exceso} exceso${exceso > 1 ? 's' : ''}`);
  if (frenada > 0) partes.push(`${frenada} frenada${frenada > 1 ? 's' : ''}`);
  if (aceleracion > 0) partes.push(`${aceleracion} aceleración${aceleracion > 1 ? 'es' : ''}`);
  return partes.length > 0 ? partes.join(' · ') : 'Sin infracciones';
}

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
      <Animated.Text style={[styles.estrellas, { color, opacity: anim }]}>
        {stars}
      </Animated.Text>
      <Text style={[styles.score, { color }]}>{score}</Text>
    </View>
  );
}

export default function Viajes() {
  const [viajes, setViajes] = useState<Viaje[]>([]);

  useEffect(() => {
    getViajes().then(setViajes);
  }, []);

  if (viajes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No hay viajes registrados aún.</Text>
        <Text style={styles.emptySubText}>Completa tu primer viaje para verlo aquí.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.lista}
      data={viajes}
      keyExtractor={v => v.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
            <ScoreFlash score={item.score} color={colorScore[item.score]} estrellas={item.estrellas || 3} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.stat}>
              <Text style={[styles.statValor, { color: item.puntosFinales >= 900 ? C.verde : item.puntosFinales >= 700 ? C.amarillo : C.rojo }]}>
                {item.puntosFinales}
              </Text>
              <Text style={styles.statLabel}>puntos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{item.topSpeed}</Text>
              <Text style={styles.statLabel}>top km/h</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValor, { color: item.eventos.length > 0 ? C.rojo : C.verde }]}>
                {item.eventos.length}
              </Text>
              <Text style={styles.statLabel}>infracciones</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{formatearDuracion(item.duracion)}</Text>
              <Text style={styles.statLabel}>duración</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detalle}>
            <Text style={styles.detalleLabel}>Peor momento</Text>
            <Text style={styles.detalleValor}>{getPeorInfraccion(item.eventos)}</Text>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.detalleLabel}>Desglose</Text>
            <Text style={styles.detalleValor}>{getDesglose(item.eventos)}</Text>
          </View>

          {item.vehiculo && (
            <View style={styles.detalle}>
              <Text style={styles.detalleLabel}>Vehículo</Text>
              <Text style={styles.detalleValor}>{item.vehiculo}</Text>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { flex: 1, backgroundColor: C.fondo, padding: 16 },
  empty: { flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.blanco, fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: C.gris, fontSize: 14 },
  card: { backgroundColor: C.superficie, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  fecha: { color: C.gris, fontSize: 13 },
  estrellas: { fontSize: 18, letterSpacing: 2 },
  score: { fontSize: 13, fontWeight: '600' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { alignItems: 'center' },
  statValor: { color: C.blanco, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: C.gris, fontSize: 11, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#1a3050', marginBottom: 12 },
  detalle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detalleLabel: { color: C.gris, fontSize: 13 },
  detalleValor: { color: C.blanco, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 8 },
});
