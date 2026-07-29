import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../utils/colors';
import { backfillIdsVehiculos, estadoGarage } from '../utils/garage';

const colorNivel: Record<string, string> = {
  ok: C.verde,
  pronto: C.amarillo,
  vencido: C.rojo,
  vacio: C.gris,
};

export default function Garage() {
  const insets = useSafeAreaInsets();
  const [vehiculos, setVehiculos] = useState<any[]>([]);

  const cargar = async () => {
    const lista = await backfillIdsVehiculos();
    setVehiculos(lista);
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  return (
    <ScrollView
      style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
    >
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Text style={styles.volver}>‹ Perfil</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>🔧 Garage</Text>
      <Text style={styles.subtitulo}>Seguro, aceite y mantenimientos de tus carros</Text>

      {vehiculos.length === 0 ? (
        <View style={styles.vacioBox}>
          <Text style={styles.vacioTexto}>No tienes vehículos agregados todavía.</Text>
          <TouchableOpacity style={styles.btnAgregar} onPress={() => router.push('/agregar_vehiculo')}>
            <Text style={styles.btnAgregarTexto}>+ Agregar vehículo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {vehiculos.map((v) => {
            const estado = estadoGarage(v.garage);
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.card}
                onPress={() => router.push({ pathname: '/garage_vehiculo', params: { id: v.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNombre}>{v.tipo?.split(' ')[0] || '🚗'} {v.marca} {v.modelo}</Text>
                  <Text style={styles.cardAnio}>{v.anio}</Text>
                </View>
                <View style={[styles.estadoPill, { borderColor: colorNivel[estado.nivel] }]}>
                  <Text style={[styles.estadoTexto, { color: colorNivel[estado.nivel] }]}>{estado.texto}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.nota}>
        Te avisamos 7 días antes del vencimiento del seguro o del próximo cambio de aceite.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo, padding: 16 },
  volver: { color: C.marca, fontSize: 15 },
  titulo: { color: C.blanco, fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitulo: { color: C.gris, fontSize: 14, marginBottom: 20 },
  vacioBox: { alignItems: 'center', gap: 16, marginTop: 40 },
  vacioTexto: { color: C.gris, fontSize: 14, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.superficie, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.borde,
  },
  cardNombre: { color: C.blanco, fontSize: 16, fontWeight: '500' },
  cardAnio: { color: C.gris, fontSize: 13, marginTop: 2 },
  estadoPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  estadoTexto: { fontSize: 11, fontWeight: '600' },
  btnAgregar: { borderWidth: 1, borderColor: 'rgba(46,230,197,0.4)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  btnAgregarTexto: { color: C.marca, fontSize: 15 },
  nota: { color: C.gris, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
