import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { getViajes, Viaje } from '../../utils/viajes';

export default function Perfil() {
  const [viajes, setViajes] = useState<Viaje[]>([]);

  useEffect(() => {
    getViajes().then(setViajes);
  }, []);

  const totalViajes = viajes.length;
  const promedioPuntos = totalViajes > 0
    ? Math.round(viajes.reduce((a, v) => a + v.puntosFinales, 0) / totalViajes)
    : 0;
  const topSpeedHistorico = totalViajes > 0
    ? Math.max(...viajes.map(v => v.topSpeed))
    : 0;
  const mejorViaje = totalViajes > 0
    ? viajes.reduce((a, v) => v.puntosFinales > a.puntosFinales ? v : a)
    : null;
  const peorViaje = totalViajes > 0
    ? viajes.reduce((a, v) => v.puntosFinales < a.puntosFinales ? v : a)
    : null;

  const getColorPuntos = (pts: number) => {
    if (pts >= 900) return '#30d158';
    if (pts >= 700) return '#ff9500';
    return '#ff3b30';
  };

  if (totalViajes === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sin datos aun.</Text>
        <Text style={styles.emptySubText}>Completa tu primer viaje para ver tu perfil.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Mi perfil</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValor}>{totalViajes}</Text>
          <Text style={styles.cardLabel}>viajes</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValor, { color: getColorPuntos(promedioPuntos) }]}>{promedioPuntos}</Text>
          <Text style={styles.cardLabel}>promedio pts</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValor}>{topSpeedHistorico}</Text>
          <Text style={styles.cardLabel}>top speed km/h</Text>
        </View>
      </View>

      {mejorViaje && (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Mejor viaje</Text>
          <View style={styles.viajeResumen}>
            <Text style={[styles.viajeScore, { color: '#30d158' }]}>{mejorViaje.puntosFinales} pts</Text>
            <Text style={styles.viajeDato}>Top: {mejorViaje.topSpeed} km/h</Text>
            <Text style={styles.viajeDato}>{mejorViaje.eventos.length} infracciones</Text>
          </View>
        </View>
      )}

      {peorViaje && (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Peor viaje</Text>
          <View style={styles.viajeResumen}>
            <Text style={[styles.viajeScore, { color: '#ff3b30' }]}>{peorViaje.puntosFinales} pts</Text>
            <Text style={styles.viajeDato}>Top: {peorViaje.topSpeed} km/h</Text>
            <Text style={styles.viajeDato}>{peorViaje.eventos.length} infracciones</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: '#555', fontSize: 14 },
  titulo: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 50, marginBottom: 24 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center' },
  cardValor: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  cardLabel: { color: '#555', fontSize: 11, marginTop: 4 },
  seccion: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 12 },
  seccionTitulo: { color: '#555', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  viajeResumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viajeScore: { fontSize: 24, fontWeight: 'bold' },
  viajeDato: { color: '#888', fontSize: 14 },
});
