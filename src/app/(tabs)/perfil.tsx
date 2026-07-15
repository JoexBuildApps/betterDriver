import { CONFIG } from '../../utils/config';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Linking } from 'react-native';
import { useCallback } from 'react';
import { getViajes, Viaje } from '../../utils/viajes';
import { calcularScore, calcularEstrellas } from '../../utils/puntos';

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

export default function Perfil() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vehiculoActivo, setVehiculoActivo] = useState<any>(null);

  const cargarDatos = async () => {
    getViajes().then(setViajes);
    AsyncStorage.getItem('perfil').then(p => { if (p) setPerfil(JSON.parse(p)); });
    AsyncStorage.getItem('vehiculos').then(v => { if (v) setVehiculos(JSON.parse(v)); });
    AsyncStorage.getItem('vehiculoActivo').then(v => { if (v) setVehiculoActivo(JSON.parse(v)); });
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const seleccionarVehiculo = async (v: any) => {
    await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(v));
    setVehiculoActivo(v);
  };

  const eliminarVehiculo = async (idx: number) => {
    const nuevos = vehiculos.filter((_, i) => i !== idx);
    await AsyncStorage.setItem('vehiculos', JSON.stringify(nuevos));
    if (vehiculoActivo && vehiculos[idx].marca === vehiculoActivo.marca && vehiculos[idx].modelo === vehiculoActivo.modelo) {
      await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(nuevos[0] || null));
      setVehiculoActivo(nuevos[0] || null);
    }
    setVehiculos(nuevos);
  };

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

  const estrellasGeneral = calcularEstrellas(promedioPuntos, 60);
  const scoreGeneral = calcularScore(estrellasGeneral);

  const colorScore = () => {
    if (promedioPuntos >= 900) return C.verde;
    if (promedioPuntos >= 700) return C.amarillo;
    return C.rojo;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{perfil?.nombre?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View>
          <Text style={styles.nombre}>{perfil?.nombre || 'Conductor'}</Text>
          <Text style={styles.ciudad}>{perfil?.ciudad || ''}</Text>
          {totalViajes > 0 && <Text style={[styles.scoreGeneral, { color: colorScore() }]}>{scoreGeneral}</Text>}
        </View>
      </View>

      {totalViajes > 0 && (
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
      )}

      {totalViajes > 0 && (
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
        </View>
      )}

      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Mis vehículos</Text>
        {vehiculos.map((v, i) => (
          <View key={i} style={styles.vehiculoFila}>
            <TouchableOpacity style={styles.vehiculoInfo} onPress={() => seleccionarVehiculo(v)}>
              <View style={[styles.vehiculoActivo, vehiculoActivo?.marca === v.marca && vehiculoActivo?.modelo === v.modelo && styles.vehiculoActivoOn]} />
              <View>
                <Text style={styles.vehiculoNombre}>{v.marca} {v.modelo}</Text>
                <Text style={styles.vehiculoAnio}>{v.anio}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => eliminarVehiculo(i)}>
              <Text style={styles.eliminar}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.btnAgregar} onPress={() => router.push('/agregar_vehiculo')}>
          <Text style={styles.btnAgregarTexto}>+ Agregar vehículo</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.btnContacto}
        onPress={() => Linking.openURL('mailto:' + CONFIG.email + '?subject=betterDriver%20-%20Soporte')}
      >
        <Text style={styles.btnContactoTexto}>📧 Contacto y soporte</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 50, marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: C.marca, fontSize: 24, fontWeight: 'bold' },
  nombre: { color: C.blanco, fontSize: 20, fontWeight: '500' },
  ciudad: { color: C.gris, fontSize: 13, marginTop: 2 },
  scoreGeneral: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: { flex: 1, backgroundColor: C.superficie, borderRadius: 12, padding: 16, alignItems: 'center' },
  cardValor: { color: C.blanco, fontSize: 24, fontWeight: 'bold' },
  cardLabel: { color: C.gris, fontSize: 11, marginTop: 4, textAlign: 'center' },
  seccion: { backgroundColor: C.superficie, borderRadius: 12, padding: 16, marginBottom: 24 },
  seccionTitulo: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#1a3050' },
  filaLabel: { color: C.gris, fontSize: 14 },
  filaValor: { color: C.blanco, fontSize: 14, fontWeight: '500' },
  vehiculoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1a3050' },
  vehiculoInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehiculoActivo: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.superficie, borderWidth: 1, borderColor: C.gris },
  vehiculoActivoOn: { backgroundColor: C.marca, borderColor: C.marca },
  vehiculoNombre: { color: C.blanco, fontSize: 15 },
  vehiculoAnio: { color: C.gris, fontSize: 13, marginTop: 2 },
  eliminar: { color: C.rojo, fontSize: 16, padding: 8 },
  btnAgregar: { borderWidth: 1, borderColor: C.marca, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  btnAgregarTexto: { color: C.marca, fontSize: 15 },
  btnContacto: { borderWidth: 1, borderColor: C.gris, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 40 },
  btnContactoTexto: { color: C.gris, fontSize: 14 },
});
