import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../utils/colors';
import {
  GarageInfo, garageVacio, fechaISO, partesFecha, formatearFechaCorta,
  proximoAceite, reprogramarAvisosVehiculo,
} from '../utils/garage';

function CampoFecha({ label, dia, mes, anio, onDia, onMes, onAnio }: {
  label: string; dia: string; mes: string; anio: string;
  onDia: (v: string) => void; onMes: (v: string) => void; onAnio: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[styles.inputFecha, { flex: 1 }]} placeholder="DD" placeholderTextColor={C.gris} value={dia} onChangeText={onDia} keyboardType="numeric" maxLength={2} />
        <TextInput style={[styles.inputFecha, { flex: 1 }]} placeholder="MM" placeholderTextColor={C.gris} value={mes} onChangeText={onMes} keyboardType="numeric" maxLength={2} />
        <TextInput style={[styles.inputFecha, { flex: 1.4 }]} placeholder="AAAA" placeholderTextColor={C.gris} value={anio} onChangeText={onAnio} keyboardType="numeric" maxLength={4} />
      </View>
    </View>
  );
}

export default function GarageVehiculo() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const [seguroDia, setSeguroDia] = useState('');
  const [seguroMes, setSeguroMes] = useState('');
  const [seguroAnio, setSeguroAnio] = useState('');

  const [aceiteDia, setAceiteDia] = useState('');
  const [aceiteMes, setAceiteMes] = useState('');
  const [aceiteAnio, setAceiteAnio] = useState('');
  const [aceiteIntervalo, setAceiteIntervalo] = useState('6');

  const [km, setKm] = useState('');

  const [nuevoServicioFecha, setNuevoServicioFecha] = useState('');
  const [nuevoServicioTexto, setNuevoServicioTexto] = useState('');
  const [servicios, setServicios] = useState<GarageInfo['servicios']>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const existing = await AsyncStorage.getItem('vehiculos');
    const lista = existing ? JSON.parse(existing) : [];
    const v = lista.find((x: any) => x.id === id);
    if (v) {
      setVehiculo(v);
      const g: GarageInfo = v.garage || garageVacio();
      const ps = partesFecha(g.seguroFecha);
      setSeguroDia(ps.dia); setSeguroMes(ps.mes); setSeguroAnio(ps.anio);
      const pa = partesFecha(g.aceiteFecha);
      setAceiteDia(pa.dia); setAceiteMes(pa.mes); setAceiteAnio(pa.anio);
      setAceiteIntervalo(g.aceiteIntervaloMeses ? String(g.aceiteIntervaloMeses) : '6');
      setKm(g.km || '');
      setServicios(g.servicios || []);
    }
    setCargando(false);
  }, [id]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const agregarServicio = () => {
    const iso = nuevoServicioFecha.length === 10 ? nuevoServicioFecha : null;
    if (!nuevoServicioTexto.trim()) return;
    const nuevo = {
      id: `${Date.now()}`,
      fecha: iso || new Date().toISOString().split('T')[0],
      descripcion: nuevoServicioTexto.trim(),
    };
    setServicios([nuevo, ...servicios]);
    setNuevoServicioFecha('');
    setNuevoServicioTexto('');
  };

  const eliminarServicio = (sid: string) => {
    setServicios(servicios.filter(s => s.id !== sid));
  };

  const guardar = async () => {
    const seguroISO = fechaISO(seguroDia, seguroMes, seguroAnio);
    const aceiteISO = fechaISO(aceiteDia, aceiteMes, aceiteAnio);

    if ((seguroDia || seguroMes || seguroAnio) && !seguroISO) {
      Alert.alert('Fecha de seguro inválida', 'Revisa el día, mes y año.');
      return;
    }
    if ((aceiteDia || aceiteMes || aceiteAnio) && !aceiteISO) {
      Alert.alert('Fecha de aceite inválida', 'Revisa el día, mes y año.');
      return;
    }

    const garage: GarageInfo = {
      seguroFecha: seguroISO || undefined,
      aceiteFecha: aceiteISO || undefined,
      aceiteIntervaloMeses: aceiteISO ? (parseInt(aceiteIntervalo) || 6) : undefined,
      km: km.trim() || undefined,
      servicios,
    };

    const existing = await AsyncStorage.getItem('vehiculos');
    const lista = existing ? JSON.parse(existing) : [];
    const nuevos = lista.map((v: any) => v.id === id ? { ...v, garage } : v);
    await AsyncStorage.setItem('vehiculos', JSON.stringify(nuevos));

    const titulo = vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : 'tu carro';
    await reprogramarAvisosVehiculo(id, titulo, garage);

    router.back();
  };

  if (cargando || !vehiculo) {
    return <View style={[styles.container, { paddingTop: insets.top + 12 }]} />;
  }

  const proxAceiteISO = proximoAceite({
    aceiteFecha: fechaISO(aceiteDia, aceiteMes, aceiteAnio) || undefined,
    aceiteIntervaloMeses: parseInt(aceiteIntervalo) || 6,
    servicios: [],
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ paddingLeft: insets.left, paddingRight: insets.right }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={styles.volver}>‹ Garage</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>{vehiculo.tipo?.split(' ')[0] || '🚗'} {vehiculo.marca} {vehiculo.modelo}</Text>
        <Text style={styles.subtitulo}>{vehiculo.anio}</Text>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Seguro</Text>
          <CampoFecha label="Fecha de vencimiento" dia={seguroDia} mes={seguroMes} anio={seguroAnio} onDia={setSeguroDia} onMes={setSeguroMes} onAnio={setSeguroAnio} />
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Cambio de aceite</Text>
          <CampoFecha label="Fecha del último cambio" dia={aceiteDia} mes={aceiteMes} anio={aceiteAnio} onDia={setAceiteDia} onMes={setAceiteMes} onAnio={setAceiteAnio} />
          <Text style={styles.campoLabel}>Cada cuántos meses</Text>
          <TextInput style={styles.input} value={aceiteIntervalo} onChangeText={setAceiteIntervalo} keyboardType="numeric" maxLength={2} placeholder="6" placeholderTextColor={C.gris} />
          {proxAceiteISO && (
            <Text style={styles.proximaFecha}>Próximo cambio estimado: {formatearFechaCorta(proxAceiteISO)}</Text>
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Kilometraje</Text>
          <Text style={styles.campoLabel}>Solo referencial, para ti</Text>
          <TextInput style={styles.input} value={km} onChangeText={setKm} keyboardType="numeric" placeholder="Ej. 45000" placeholderTextColor={C.gris} />
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Otros servicios</Text>
          {servicios.length === 0 && <Text style={styles.sinServicios}>Aún no has registrado ninguno.</Text>}
          {servicios.map(s => (
            <View key={s.id} style={styles.servicioFila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.servicioFecha}>{formatearFechaCorta(s.fecha)}</Text>
                <Text style={styles.servicioTexto}>{s.descripcion}</Text>
              </View>
              <TouchableOpacity onPress={() => eliminarServicio(s.id)}>
                <Text style={styles.eliminar}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ marginTop: 12, gap: 8 }}>
            <TextInput
              style={styles.input}
              value={nuevoServicioTexto}
              onChangeText={setNuevoServicioTexto}
              placeholder="Ej. Cambio de pastillas de freno"
              placeholderTextColor={C.gris}
            />
            <TouchableOpacity style={styles.btnAgregarServicio} onPress={agregarServicio} disabled={!nuevoServicioTexto.trim()}>
              <Text style={styles.btnAgregarServicioTexto}>+ Agregar servicio (hoy)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btnGuardar} onPress={guardar}>
          <Text style={styles.btnGuardarTexto}>Guardar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo },
  volver: { color: C.marca, fontSize: 15 },
  titulo: { color: C.blanco, fontSize: 22, fontWeight: 'bold' },
  subtitulo: { color: C.gris, fontSize: 14, marginBottom: 20 },
  seccion: { backgroundColor: C.superficie, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.borde },
  seccionTitulo: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  campoLabel: { color: C.gris, fontSize: 13, marginBottom: 6 },
  inputFecha: { backgroundColor: C.superficie2, color: C.blanco, fontSize: 15, padding: 12, borderRadius: 10, textAlign: 'center' },
  input: { backgroundColor: C.superficie2, color: C.blanco, fontSize: 15, padding: 12, borderRadius: 10 },
  proximaFecha: { color: C.marca, fontSize: 12, marginTop: 10 },
  sinServicios: { color: C.gris, fontSize: 13, fontStyle: 'italic' },
  servicioFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.divider },
  servicioFecha: { color: C.gris, fontSize: 11 },
  servicioTexto: { color: C.blanco, fontSize: 14, marginTop: 2 },
  eliminar: { color: C.rojo, fontSize: 16, padding: 8 },
  btnAgregarServicio: { borderWidth: 1, borderColor: 'rgba(46,230,197,0.4)', borderRadius: 12, padding: 12, alignItems: 'center' },
  btnAgregarServicioTexto: { color: C.marca, fontSize: 14 },
  btnGuardar: { backgroundColor: C.marca, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnGuardarTexto: { color: C.fondo, fontSize: 16, fontWeight: 'bold' },
});
