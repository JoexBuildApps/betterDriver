import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { getViajes, Viaje, formatearFecha, formatearDuracion } from '../../utils/viajes';

const colorScore: Record<Viaje['score'], string> = {
  'Lento pero seguro': '#30d158',
  'Esto es lo que se espera de ti': '#ff9500',
  'En construccion': '#ff9500',
  'Te regalaron el pase': '#ff3b30',
};

export default function Viajes() {
  const [viajes, setViajes] = useState<Viaje[]>([]);

  useEffect(() => {
    getViajes().then(setViajes);
  }, []);

  if (viajes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No hay viajes registrados aun.</Text>
        <Text style={styles.emptySubText}>Completa tu primer viaje para verlo aqui.</Text>
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
            <Text style={[styles.score, { color: colorScore[item.score] }]}>{item.score}</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{item.puntosFinales}</Text>
              <Text style={styles.statLabel}>puntos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{item.topSpeed}</Text>
              <Text style={styles.statLabel}>top km/h</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{item.eventos.length}</Text>
              <Text style={styles.statLabel}>infracciones</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValor}>{formatearDuracion(item.duracion)}</Text>
              <Text style={styles.statLabel}>duracion</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { flex: 1, backgroundColor: '#000', padding: 16 },
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: '#555', fontSize: 14 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  fecha: { color: '#888', fontSize: 13 },
  score: { fontSize: 13, fontWeight: '600' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statValor: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2 },
});
