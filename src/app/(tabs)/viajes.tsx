import { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Animated, TouchableOpacity, Alert, Modal, ScrollView, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getViajes, Viaje, formatearFecha, formatearDuracion, getPuntosSemanales } from '../../utils/viajes';

import { C } from '../../utils/colors';

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

function BarraScore({ puntos, duracion }: { puntos: number; duracion: number }) {
  const minutos = Math.max(1, Math.floor(duracion / 60));
  const ratio = Math.min(puntos / minutos, 1);
  const color = ratio >= 0.85 ? C.verde : ratio >= 0.5 ? C.amarillo : C.rojo;
  return (
    <View style={styles.barraContainer}>
      <View style={[styles.barraFill, { width: `${ratio * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

async function borrarViaje(id: string, onBorrado: () => void) {
  Alert.alert('Borrar viaje', '¿Seguro que quieres borrar este viaje?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Borrar', style: 'destructive',
      onPress: async () => {
        const existing = await AsyncStorage.getItem('viajes');
        const viajes: Viaje[] = existing ? JSON.parse(existing) : [];
        await AsyncStorage.setItem('viajes', JSON.stringify(viajes.filter(v => v.id !== id)));
        onBorrado();
      }
    }
  ]);
}

async function editarVehiculo(id: string, nuevoVehiculo: string, onEditado: () => void) {
  const existing = await AsyncStorage.getItem('viajes');
  const viajes: Viaje[] = existing ? JSON.parse(existing) : [];
  const nuevos = viajes.map(v => v.id === id ? { ...v, vehiculo: nuevoVehiculo } : v);
  await AsyncStorage.setItem('viajes', JSON.stringify(nuevos));
  onEditado();
}

export default function Viajes() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [puntosSemanales, setPuntosSemanales] = useState<{ semana: string; puntos: number }[]>([]);
  const [tab, setTab] = useState<'viajes' | 'semanas'>('viajes');
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [editandoViaje, setEditandoViaje] = useState<string | null>(null);
  const [vehiculoEditTemp, setVehiculoEditTemp] = useState('');

  const cargarDatos = async () => {
    getViajes().then(setViajes);
    getPuntosSemanales().then(setPuntosSemanales);
    AsyncStorage.getItem('vehiculos').then(v => { if (v) setVehiculos(JSON.parse(v)); });
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  if (viajes.length === 0) {
    return (
      <View style={[styles.empty, { paddingBottom: insets.bottom }]}>
        <Text style={styles.emptyText}>No hay viajes registrados aún.</Text>
        <Text style={styles.emptySubText}>Toca "Iniciar viaje" para empezar.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom }]}>
      <View style={[styles.tabs, { marginTop: isLandscape ? 8 : 50 }]}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'viajes' && styles.tabBtnActivo]} onPress={() => setTab('viajes')}>
          <Text style={[styles.tabTexto, tab === 'viajes' && styles.tabTextoActivo]}>Mis viajes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'semanas' && styles.tabBtnActivo]} onPress={() => setTab('semanas')}>
          <Text style={[styles.tabTexto, tab === 'semanas' && styles.tabTextoActivo]}>Mi historial</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.cafeStrip}
        onPress={() => { const { Linking } = require('react-native'); Linking.openURL('https://paypal.me/joebuildapps'); }}
      >
        <Text style={styles.cafeStripTexto}>☕  Invítame un café si betterDriver te funcionó</Text>
        <Text style={styles.cafeStripArrow}>→</Text>
      </TouchableOpacity>

      {tab === 'viajes' ? (
        <FlatList
          data={viajes}
          keyExtractor={v => v.id}
          contentContainerStyle={{ padding: 16 }}
          numColumns={isLandscape ? 2 : 1}
          key={isLandscape ? 'landscape' : 'portrait'}
          columnWrapperStyle={isLandscape ? { gap: 12 } : undefined}
          renderItem={({ item }) => (
            <View style={[styles.card, isLandscape && { flex: 1 }]}>
              {/* Header */}
              {/* Ruta origen → destino */}
              {(item.origenBarrio || item.destinoBarrio) && (
                <View style={styles.rutaRow}>
                  <View style={[styles.rutaDot, { backgroundColor: C.marca }]} />
                  <Text style={styles.rutaTxt}>{item.origenBarrio || '?'}</Text>
                  <View style={styles.rutaLinea} />
                  <Text style={styles.rutaKm}>{item.distanciaKm || 0} km</Text>
                  <View style={styles.rutaLinea} />
                  <View style={[styles.rutaDot, { backgroundColor: C.amarillo }]} />
                  <Text style={styles.rutaTxt}>{item.destinoBarrio || '?'}</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
                <ScoreFlash score={item.score} color={colorScore[item.score] || C.gris} estrellas={item.estrellas || 3} />
              </View>

              {/* Barra de score */}
              <BarraScore puntos={item.puntosFinales} duracion={item.duracion} />

              {/* Stats principales */}
              <View style={styles.cardBody}>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🏆</Text>
                  <Text style={[styles.statValor, { color: item.puntosFinales >= 10 ? C.verde : item.puntosFinales >= 5 ? C.amarillo : C.rojo }]}>{item.puntosFinales}</Text>
                  <Text style={styles.statLabel}>pts</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>⚡</Text>
                  <Text style={styles.statValor}>{item.topSpeed}</Text>
                  <Text style={styles.statLabel}>top km/h</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statIcon}>⏱</Text>
                  <Text style={styles.statValor}>{formatearDuracion(item.duracion)}</Text>
                  <Text style={styles.statLabel}>tiempo</Text>
                </View>
              </View>

              {/* Stats secundarios */}
              <View style={styles.cardBody}>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>⚠️</Text>
                  <Text style={[styles.statValor, { color: (item.infracciones || 0) > 0 ? C.rojo : C.verde }]}>{item.infracciones || 0}</Text>
                  <Text style={styles.statLabel}>infracc.</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🚗</Text>
                  <Text style={styles.statValor}>{item.velocidadPromedio || 0}</Text>
                  <Text style={styles.statLabel}>prom km/h</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🔴</Text>
                  <Text style={[styles.statValor, { color: (item.segundosEnExceso || 0) > 0 ? C.rojo : C.verde }]}>
                    {item.segundosEnExceso > 0 ? formatearDuracion(item.segundosEnExceso) : '0s'}
                  </Text>
                  <Text style={styles.statLabel}>en exceso</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statIcon}>🎯</Text>
                  <Text style={styles.statValor}>{item.limite || 50}</Text>
                  <Text style={styles.statLabel}>límite</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Peor momento */}
              {item.eventos && item.eventos.length > 0 && (
                <View style={styles.detalle}>
                  <Text style={styles.detalleLabel}>⚡ Peor momento</Text>
                  <Text style={styles.detalleValor}>
                    {Math.max(...item.eventos.map(e => e.velocidad))} km/h en zona de {item.limite}
                  </Text>
                </View>
              )}

              {/* Vehiculo con editar */}
              <View style={styles.detalle}>
                <Text style={styles.detalleLabel}>{item.tipoVehiculo?.split(' ')[0] || '🚗'} Vehículo</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.detalleValor}>{item.vehiculo || 'No registrado'}</Text>
                  {vehiculos.length > 1 && (
                    <TouchableOpacity onPress={() => { setEditandoViaje(item.id); setVehiculoEditTemp(item.vehiculo || ''); }}>
                      <Text style={{ color: C.marca, fontSize: 12 }}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Borrar */}
              <TouchableOpacity style={styles.btnBorrar} onPress={() => borrarViaje(item.id, cargarDatos)}>
                <Text style={styles.btnBorrarTexto}>🗑 Borrar viaje</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {(() => {
            const ahora = new Date();
            const semanaActual = (() => {
              const startOfYear = new Date(ahora.getFullYear(), 0, 1);
              const week = Math.ceil(((ahora.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
              return `${ahora.getFullYear()}-${String(week).padStart(2, '0')}`;
            })();
            const viajesSemana = viajes.filter(v => v.semana === semanaActual);
            const ptsSemana = viajesSemana.reduce((a, v) => a + v.puntosFinales, 0);
            const kmSemana = viajesSemana.reduce((a, v) => a + (v.distanciaKm || 0), 0);
            const infSemana = viajesSemana.reduce((a, v) => a + (v.infracciones || 0), 0);
            const mejorViajeSemana = viajesSemana.reduce((a, v) => v.puntosFinales > (a?.puntosFinales || 0) ? v : a, null as Viaje | null);

            const kmTotal = viajes.reduce((a, v) => a + (v.distanciaKm || 0), 0);
            const viajesUrbanos = viajes.filter(v => (v.distanciaKm || 0) <= 100);
            const roadtrips = viajes.filter(v => (v.distanciaKm || 0) > 100);
            const kmPromedio = viajesUrbanos.length > 0 ? Math.round(viajesUrbanos.reduce((a, v) => a + (v.distanciaKm || 0), 0) / viajesUrbanos.length * 10) / 10 : 0;
            const topSpeedHistorico = viajes.reduce((a, v) => Math.max(a, v.topSpeed || 0), 0);
            const sinInfracciones = viajes.filter(v => (v.infracciones || 0) === 0).length;
            const pctLimpio = viajes.length > 0 ? Math.round(sinInfracciones / viajes.length * 100) : 0;
            const infTotal = viajes.reduce((a, v) => a + (v.infracciones || 0), 0);
            const mejorSemana = puntosSemanales.length > 0 ? puntosSemanales.reduce((a, b) => b.puntos > a.puntos ? b : a) : null;

            return (
              <>
                {/* Esta semana */}
                <View style={styles.historialCard}>
                  <Text style={styles.historialTitulo}>📅 Esta semana</Text>
                  <View style={styles.historialGrid}>
                    <View style={styles.historialStat}>
                      <Text style={styles.historialValor}>{viajesSemana.length}</Text>
                      <Text style={styles.historialLabel}>viajes</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={styles.historialValor}>{kmSemana.toFixed(1)}</Text>
                      <Text style={styles.historialLabel}>km</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={[styles.historialValor, { color: C.verde }]}>{ptsSemana}</Text>
                      <Text style={styles.historialLabel}>puntos</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={[styles.historialValor, { color: infSemana > 0 ? C.rojo : C.verde }]}>{infSemana}</Text>
                      <Text style={styles.historialLabel}>infracc.</Text>
                    </View>
                  </View>
                  {mejorViajeSemana && (
                    <View style={styles.historialDetalle}>
                      <Text style={styles.historialDetalleLabel}>Mejor viaje</Text>
                      <Text style={styles.historialDetalleValor}>{mejorViajeSemana.puntosFinales} pts · {Array.from({length: 5}, (_, i) => i < (mejorViajeSemana.estrellas || 3) ? '★' : '☆').join('')}</Text>
                    </View>
                  )}
                </View>

                {/* Todo el tiempo */}
                <View style={styles.historialCard}>
                  <Text style={styles.historialTitulo}>🏆 Todo el tiempo</Text>
                  <View style={styles.historialGrid}>
                    <View style={styles.historialStat}>
                      <Text style={styles.historialValor}>{viajes.length}</Text>
                      <Text style={styles.historialLabel}>viajes</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={styles.historialValor}>{kmTotal.toFixed(1)}</Text>
                      <Text style={styles.historialLabel}>km totales</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={styles.historialValor}>{kmPromedio}</Text>
                      <Text style={styles.historialLabel}>km/viaje</Text>
                    </View>
                    <View style={styles.historialStat}>
                      <Text style={[styles.historialValor, { color: C.rojo }]}>{topSpeedHistorico}</Text>
                      <Text style={styles.historialLabel}>top speed</Text>
                    </View>
                  </View>
                  <View style={styles.historialDetalle}>
                    <Text style={styles.historialDetalleLabel}>Viajes sin infracciones</Text>
                    <Text style={styles.historialDetalleValor}>{sinInfracciones} de {viajes.length} ({pctLimpio}%)</Text>
                  </View>
                  <View style={styles.historialDetalle}>
                    <Text style={styles.historialDetalleLabel}>Infracciones totales</Text>
                    <Text style={[styles.historialDetalleValor, { color: infTotal > 0 ? C.rojo : C.verde }]}>{infTotal}</Text>
                  </View>
                  {mejorSemana && (
                    <View style={styles.historialDetalle}>
                      <Text style={styles.historialDetalleLabel}>Mejor semana</Text>
                      <Text style={styles.historialDetalleValor}>Semana {mejorSemana.semana?.split('-')[1]} · {mejorSemana.puntos} pts</Text>
                    </View>
                  )}
                </View>

                {/* Roadtrips */}
                {roadtrips.length > 0 && (
                  <View style={styles.historialCard}>
                    <Text style={styles.historialTitulo}>🛣 Roadtrips (+100 km)</Text>
                    <Text style={styles.roadtripNota}>Los viajes largos se muestran separados para no distorsionar tu promedio urbano.</Text>
                    {roadtrips.map((v, i) => (
                      <View key={i} style={styles.historialDetalle}>
                        <Text style={styles.historialDetalleLabel}>{new Date(v.fecha).toLocaleDateString('es-CO', {day:'2-digit', month:'short'})}</Text>
                        <Text style={styles.historialDetalleValor}>{v.distanciaKm} km · {v.puntosFinales} pts</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </ScrollView>
      )}

      {/* Modal editar vehiculo */}
      <Modal visible={!!editandoViaje} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>¿En qué carro ibas?</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {vehiculos.map((v, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.vehiculoOpcion, vehiculoEditTemp === `${v.marca} ${v.modelo}` && styles.vehiculoOpcionActiva]}
                  onPress={() => setVehiculoEditTemp(`${v.marca} ${v.modelo}`)}
                >
                  <Text style={[styles.vehiculoOpcionTexto, vehiculoEditTemp === `${v.marca} ${v.modelo}` && styles.vehiculoOpcionTextoActiva]}>
                    {v.marca} {v.modelo} {v.anio}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.btnGuardar}
              onPress={() => {
                if (editandoViaje && vehiculoEditTemp) {
                  editarVehiculo(editandoViaje, vehiculoEditTemp, cargarDatos);
                  setEditandoViaje(null);
                }
              }}
            >
              <Text style={styles.btnGuardarTexto}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditandoViaje(null)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  empty: { flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.blanco, fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptySubText: { color: C.gris, fontSize: 14 },
  tabs: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: C.superficie2 },
  tabBtnActivo: { backgroundColor: C.marca },
  tabTexto: { color: C.gris, fontSize: 14, fontWeight: '500' },
  tabTextoActivo: { color: C.fondo },
  card: {
    backgroundColor: C.glass,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borde,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  fecha: { color: C.gris, fontSize: 12 },
  estrellas: { fontSize: 22, letterSpacing: 2 },
  score: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  barraContainer: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  barraFill: { height: 3, borderRadius: 2 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statIcon: { fontSize: 14, marginBottom: 2 },
  statValor: { color: C.blanco, fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: C.gris, fontSize: 10, marginTop: 1 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  detalle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  detalleLabel: { color: C.gris, fontSize: 12 },
  detalleValor: { color: C.blanco, fontSize: 12, fontWeight: '500' },
  cafeStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: 'rgba(46,230,197,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(46,230,197,0.2)' },
  cafeStripTexto: { color: C.marca, fontSize: 13, fontStyle: 'italic' },
  cafeStripArrow: { color: C.marca, fontSize: 16 },
  btnBorrar: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,59,48,0.4)', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnBorrarTexto: { color: C.rojo, fontSize: 13 },
  rutaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  rutaDot: { width: 8, height: 8, borderRadius: 4 },
  rutaTxt: { color: C.blanco, fontSize: 12, fontWeight: '500' },
  rutaLinea: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  rutaKm: { color: C.gris, fontSize: 11 },
  historialCard: { backgroundColor: C.glass, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.borde },
  historialTitulo: { color: C.blanco, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  historialGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historialStat: { alignItems: 'center', flex: 1 },
  historialValor: { color: C.blanco, fontSize: 20, fontWeight: 'bold' },
  historialLabel: { color: C.gris, fontSize: 10, marginTop: 2 },
  historialDetalle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: C.divider },
  historialDetalleLabel: { color: C.gris, fontSize: 13 },
  historialDetalleValor: { color: C.blanco, fontSize: 13, fontWeight: '500' },
  roadtripNota: { color: C.gris, fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  semanaCard: { backgroundColor: C.glass, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.borde },
  semanaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  semanaTitulo: { color: C.blanco, fontSize: 16, fontWeight: '500' },
  semanaActual: { color: C.marca, fontSize: 12 },
  semanaPuntos: { color: C.verde, fontSize: 32, fontWeight: 'bold' },
  semanaComparacion: { fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.superficie2, borderRadius: 20, padding: 24, width: '85%', borderWidth: 1, borderColor: C.marca, gap: 12 },
  modalTitulo: { color: C.blanco, fontSize: 18, fontWeight: '600' },
  vehiculoOpcion: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a3050', marginBottom: 8 },
  vehiculoOpcionActiva: { borderColor: C.marca, backgroundColor: 'rgba(79,195,247,0.15)' },
  vehiculoOpcionTexto: { color: C.gris, fontSize: 15 },
  vehiculoOpcionTextoActiva: { color: C.marca },
  btnGuardar: { backgroundColor: C.marca, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnGuardarTexto: { color: C.fondo, fontSize: 15, fontWeight: 'bold' },
  btnCancelar: { alignItems: 'center', padding: 8 },
  btnCancelarTexto: { color: C.gris, fontSize: 14 },
});
