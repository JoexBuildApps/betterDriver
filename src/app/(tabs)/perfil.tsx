import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getViajes, Viaje, calcularScore } from '../../utils/viajes';

export default function Perfil() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    getViajes().then(setViajes);
    AsyncStorage.getItem('perfil').then(p => {
      if (p) setPerfil(JSON.parse(p));
    });
  }, []);

  const totalViajes = viajes.length;
  const promedioPuntos = totalViajes > 0
    ? Math.round(viajes.reduce((a, v) => a + v.puntosFinales, 0) / totalViajes)
    : 0;
  const topSpeedHistorico = totalViajes > 0
    ? Math.max(...viajes.map(v => v.topSpeed))
    : 0;
  const totalInfracciones = viajes.reduce((a, v) => a + v.eventos.length, 0);

  const infraccionMasFrecuente = () => {
    const conteo = { exceso: 0, frenada: 0, aceleracion: 0 };
    viajes.forEach(v => v.eventos.forEach(e => { conteo[e.tipo]++ }));
    const max = Math.max(...Object.values(conteo));
    if (max === 0) return 'Ninguna';
    if (conteo.exceso === max) return 'Exceso de velocidad';
    if (conteo.frenada === max) return 'Frenadas bruscas';
    return 'Aceleraciones bruscas';
  };

  const rachaSinInfracciones = () => {
    let racha = 0;
    for (const v of viajes) {
      if (v.eventos.length === 0) racha++;
      else break;
    }
    return racha;
  };

  const scoreGeneral = calcularScore(promedioPuntos);

  const colorScore = () => {
    if (promedioPuntos >= 900) return '#30d158';
    if (promedioPuntos >= 700) return '#ff9500';
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
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>
            {perfil?.nombre?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.nombre}>{perfil?.nombre || 'Conductor'}</Text>
          <Text style={styles.vehiculo}>
            {perfil ? `${perfil.marca} ${perfil.modelo} ${perfil.anio}` : ''}
          </Text>
          <Text style={[styles.scoreGeneral, { color: colorScore() }]}>{scoreGeneral}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValor}>{totalViajes}</Text>
          <Text style={styles.cardLabel}>viajes</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardValor, { color: colorScore() }]}>{promedioPuntos}</Text>
          <Text style={styles.cardLabel}>pts promedio</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValor}>{topSpeedHistorico}</Text>
          <Text style={styles.cardLabel}>top speed km/h</Text>
        </View>
      </View>

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Detalles</Text>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Infracciones totales</Text>
          <Text style={styles.filaValor}>{totalInfracciones}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Infracción más frecuente</Text>
          <Text style={styles.filaValor}>{infraccionMasFrecuente()}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Viajes sin infracciones seguidos</Text>
          <Text style={styles.filaValor}>{rachaSinInfracciones()}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Ciudad</Text>
          <Text style={styles.filaValor}>{perfil?.ciudad || '-'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: '#555', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 50, marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#30d158', fontSize: 24, fontWeight: 'bold' },
  nombre: { color: '#fff', fontSize: 20, fontWeight: '500' },
  vehiculo: { color: '#555', fontSize: 13, marginTop: 2 },
  scoreGeneral: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center' },
  cardValor: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  cardLabel: { color: '#555', fontSize: 11, marginTop: 4, textAlign: 'center' },
  seccion: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 24 },
  seccionTitulo: { color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#222' },
  filaLabel: { color: '#888', fontSize: 14 },
  filaValor: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
