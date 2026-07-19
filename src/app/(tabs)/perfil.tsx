import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { getViajes, Viaje } from '../../utils/viajes';
import { calcularScore, calcularEstrellas } from '../../utils/puntos';
import { CONFIG } from '../../utils/config';
import { C } from '../../utils/colors';

export default function Perfil() {
  const insets = useSafeAreaInsets();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [vehiculoActivo, setVehiculoActivo] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [editandoVehiculo, setEditandoVehiculo] = useState<number | null>(null);
  const [modoDebug, setModoDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [debugData, setDebugData] = useState<any>({});
  const [marcaVEdit, setMarcaVEdit] = useState('');
  const [modeloVEdit, setModeloVEdit] = useState('');
  const [anioVEdit, setAnioVEdit] = useState('');
  const [tipoVEdit, setTipoVEdit] = useState('🚗 Automóvil');
  const [nombreEdit, setNombreEdit] = useState('');
  const [ciudadEdit, setCiudadEdit] = useState('');

  useEffect(() => {
    if (!modoDebug) return;
    const interval = setInterval(async () => {
      const gps = await AsyncStorage.getItem('debugGPS');
      const accel = await AsyncStorage.getItem('debugAccel');
      setDebugInfo({ ...(gps ? JSON.parse(gps) : {}), ...(accel ? JSON.parse(accel) : {}) });
    }, 500);
    return () => clearInterval(interval);
  }, [modoDebug]);

  const cargarDatos = async () => {
    getViajes().then(setViajes);
    AsyncStorage.getItem('perfil').then(p => { if (p) setPerfil(JSON.parse(p)); });
    AsyncStorage.getItem('vehiculos').then(v => { if (v) setVehiculos(JSON.parse(v)); });
    AsyncStorage.getItem('vehiculoActivo').then(v => { if (v) setVehiculoActivo(JSON.parse(v)); });
    try {
      const gps = await AsyncStorage.getItem('debugGPS');
      const accel = await AsyncStorage.getItem('debugAccel');
      setDebugData({ ...(gps ? JSON.parse(gps) : {}), ...(accel ? JSON.parse(accel) : {}) });
    } catch(e) {}
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const abrirEditor = () => { setNombreEdit(perfil?.nombre || ''); setCiudadEdit(perfil?.ciudad || ''); setEditando(true); };
  const guardarEdicion = async () => {
    const nuevo = { ...perfil, nombre: nombreEdit.trim(), ciudad: ciudadEdit.trim() };
    await AsyncStorage.setItem('perfil', JSON.stringify(nuevo));
    setPerfil(nuevo);
    setEditando(false);
  };

  const cambiarUnidad = async (u: 'kmh' | 'mph') => {
    const perfilActual = await AsyncStorage.getItem('perfil');
    if (perfilActual) {
      const parsed = JSON.parse(perfilActual);
      parsed.unidad = u;
      await AsyncStorage.setItem('perfil', JSON.stringify(parsed));
      setPerfil(parsed);
    }
  };

  const abrirEditorVehiculo = (idx: number) => {
    const v = vehiculos[idx];
    setMarcaVEdit(v.marca);
    setModeloVEdit(v.modelo);
    setAnioVEdit(v.anio);
    setTipoVEdit(v.tipo || '🚗 Automóvil');
    setEditandoVehiculo(idx);
  };

  const guardarVehiculo = async () => {
    const nuevos = vehiculos.map((v, i) =>
      i === editandoVehiculo ? { ...v, marca: marcaVEdit, modelo: modeloVEdit, anio: anioVEdit, tipo: tipoVEdit } : v
    );
    await AsyncStorage.setItem('vehiculos', JSON.stringify(nuevos));
    if (vehiculoActivo && vehiculos[editandoVehiculo!]?.marca === vehiculoActivo.marca) {
      await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(nuevos[editandoVehiculo!]));
      setVehiculoActivo(nuevos[editandoVehiculo!]);
    }
    setVehiculos(nuevos);
    setEditandoVehiculo(null);
  };

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

  // Stats
  const totalViajes = viajes.length;
  const promedioPuntos = totalViajes > 0 ? Math.round(viajes.reduce((a, v) => a + v.puntosFinales, 0) / totalViajes) : 0;
  const estrellasGeneral = calcularEstrellas(promedioPuntos, 60);
  const scoreGeneral = calcularScore(estrellasGeneral);
  const colorScore = promedioPuntos >= 10 ? C.verde : promedioPuntos >= 5 ? C.amarillo : C.rojo;
  const inicial = (perfil?.nombre || '?').charAt(0).toUpperCase();

  const exportarDatos = async () => {
    try {
      const perfilData = await AsyncStorage.getItem('perfil');
      const vehiculosData = await AsyncStorage.getItem('vehiculos');
      const vehiculoActivoData = await AsyncStorage.getItem('vehiculoActivo');
      const viajesData = await AsyncStorage.getItem('viajes');
      const limiteData = await AsyncStorage.getItem('limiteUltimo');
      const modoData = await AsyncStorage.getItem('ultimoModo');

      const backup = {
        version: '1.0',
        fecha: new Date().toISOString(),
        perfil: perfilData ? JSON.parse(perfilData) : null,
        vehiculos: vehiculosData ? JSON.parse(vehiculosData) : [],
        vehiculoActivo: vehiculoActivoData ? JSON.parse(vehiculoActivoData) : null,
        viajes: viajesData ? JSON.parse(viajesData) : [],
        limiteUltimo: limiteData || '50',
        ultimoModo: modoData || 'viaje',
      };

      const json = JSON.stringify(backup, null, 2);
      const fecha = new Date().toISOString().split('T')[0];
      const path = `${FileSystem.cacheDirectory}betterDriver_backup_${fecha}.json`;
      await FileSystem.writeAsStringAsync(path, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar backup de betterDriver',
        });
      } else {
        Alert.alert('Exportado', `Backup guardado en: ${path}`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar los datos');
    }
  };

  const importarDatos = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const json = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backup = JSON.parse(json);

      if (!backup.version || !backup.perfil) {
        Alert.alert('Error', 'El archivo no es un backup válido de betterDriver');
        return;
      }

      Alert.alert(
        'Importar datos',
        `¿Restaurar backup del ${new Date(backup.fecha).toLocaleDateString('es-CO')}? Esto reemplazará todos tus datos actuales.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.setItem('perfil', JSON.stringify(backup.perfil));
              await AsyncStorage.setItem('vehiculos', JSON.stringify(backup.vehiculos));
              await AsyncStorage.setItem('vehiculoActivo', JSON.stringify(backup.vehiculoActivo));
              await AsyncStorage.setItem('viajes', JSON.stringify(backup.viajes));
              await AsyncStorage.setItem('limiteUltimo', backup.limiteUltimo);
              await AsyncStorage.setItem('ultimoModo', backup.ultimoModo);
              cargarDatos();
              Alert.alert('Listo', 'Datos restaurados correctamente');
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo leer el archivo');
    }
  };

  const contactar = async () => {
    const cuerpo = [
      `Nombre: ${perfil?.nombre || 'N/A'}`,
      `Ciudad: ${perfil?.ciudad || 'N/A'}`,
      `Dispositivo: ${Device.modelName || 'N/A'}`,
      `Android: ${Device.osVersion || 'N/A'}`,
      `App version: ${CONFIG.version}`,
      '---',
      'Escribe tu mensaje aquí:',
    ].join('%0A');
    Linking.openURL(`mailto:${CONFIG.email}?subject=betterDriver%20-%20Soporte&body=${cuerpo}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Header con avatar */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colorScore === C.verde ? 'rgba(48,209,88,0.2)' : 'rgba(46,230,197,0.2)' }]}>
          <Text style={[styles.avatarTexto, { color: C.marca }]}>{inicial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.nombre}>{perfil?.nombre || 'Conductor'}</Text>
            <TouchableOpacity onPress={abrirEditor}>
              <Text style={styles.editarBtn}>Editar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.ciudad}>{perfil?.ciudad || ''}</Text>
          {totalViajes > 0 && (
            <Text style={[styles.scoreGeneral, { color: colorScore }]}>{scoreGeneral}</Text>
          )}
        </View>
      </View>

      {/* Vehiculo activo */}
      {vehiculoActivo && (
        <View style={styles.vehiculoActivoCard}>
          <Text style={styles.vehiculoActivoLabel}>Vehículo activo</Text>
          <Text style={styles.vehiculoActivoNombre}>{vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.anio}</Text>
        </View>
      )}

      {/* Mis vehiculos */}
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
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => abrirEditorVehiculo(i)}>
              <Text style={{ color: C.marca, fontSize: 13 }}>Editar</Text>
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

      {/* Preferencias */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Preferencias</Text>
        <Text style={styles.prefLabel}>Unidad de velocidad</Text>
        <View style={styles.unidadBtns}>
          <TouchableOpacity
            style={[styles.unidadBtn, (perfil?.unidad || 'kmh') === 'kmh' && styles.unidadBtnActivo]}
            onPress={() => cambiarUnidad('kmh')}
          >
            <Text style={[styles.unidadBtnTexto, (perfil?.unidad || 'kmh') === 'kmh' && styles.unidadBtnTextoActivo]}>km/h</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unidadBtn, perfil?.unidad === 'mph' && styles.unidadBtnActivo]}
            onPress={() => cambiarUnidad('mph')}
          >
            <Text style={[styles.unidadBtnTexto, perfil?.unidad === 'mph' && styles.unidadBtnTextoActivo]}>mph</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Datos */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Mis datos</Text>
        <TouchableOpacity style={styles.btnDatos} onPress={exportarDatos}>
          <Text style={styles.btnDatosTexto}>📤 Exportar mis datos</Text>
          <Text style={styles.btnDatosDesc}>Guarda un backup de viajes, vehículos y perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnDatos, { marginTop: 8 }]} onPress={importarDatos}>
          <Text style={styles.btnDatosTexto}>📥 Importar datos</Text>
          <Text style={styles.btnDatosDesc}>Restaura desde un backup anterior</Text>
        </TouchableOpacity>
      </View>

      {/* Acerca de */}
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Acerca de betterDriver</Text>
        <Text style={styles.acercaTexto}>
          betterDriver nació para hacerte consciente de tu velocidad. No para juzgarte — para recordarte que la calle es de todos.
        </Text>
        <Text style={styles.acercaTexto}>
          Hecha en Colombia 🇨🇴 para el mundo. Creemos que manejar mejor es un hábito que se puede construir, sin importar en qué ciudad del planeta estés. Seguiremos mejorando con el tiempo.
        </Text>
        <Text style={styles.acercaTexto}>
          ¿Tienes ideas para mejorar la app? Escríbenos — nos encanta escuchar.
        </Text>
        <Text style={styles.acercaTexto}>
          Si betterDriver te hizo manejar un poco más despacio, ya cumplió su propósito. El botón ☕ en Mis viajes está ahí si quieres apoyar el proyecto.
        </Text>

        <TouchableOpacity style={styles.btnContacto} onPress={contactar}>
          <Text style={styles.btnContactoTexto}>📧 Contacto y soporte</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Versión {CONFIG.version} · {CONFIG.marca}</Text>
      </View>

      {/* Modal editar vehiculo */}
      {/* Debug GPS + Acelerometro */}
      <View style={[styles.seccion, { marginTop: 8 }]}>
        <Text style={styles.seccionTitulo}>Diagnóstico del dispositivo</Text>
        <Text style={{ color: C.gris, fontSize: 11, marginBottom: 10 }}>Valores actualizados mientras conduces.</Text>
        <View style={{ gap: 8 }}>
          <Text style={styles.debugLinea}>📡 GPS raw: <Text style={styles.debugValor}>{debugData.gpsRaw ?? '--'} km/h</Text></Text>
          <Text style={styles.debugLinea}>📡 GPS prom: <Text style={styles.debugValor}>{debugData.gpsProm ?? '--'} km/h</Text></Text>
          <Text style={styles.debugLinea}>📳 Accel magnitud: <Text style={styles.debugValor}>{debugData.accel ?? '--'}</Text> (1.0 = quieto)</Text>
          <Text style={styles.debugLinea}>📳 Teléfono quieto: <Text style={[styles.debugValor, { color: debugData.quieto ? C.verde : C.rojo }]}>{debugData.quieto === undefined ? '--' : debugData.quieto ? 'SÍ' : 'NO'}</Text></Text>
          <Text style={styles.debugLinea}>⏱ Segundos bajo vel: <Text style={styles.debugValor}>{debugData.segundosBajo ?? '--'}</Text></Text>
        </View>
      </View>

      <Modal visible={editandoVehiculo !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Editar vehículo</Text>
            <TextInput style={styles.input} value={marcaVEdit} onChangeText={setMarcaVEdit} placeholder="Marca" placeholderTextColor={C.gris} />
            <TextInput style={styles.input} value={modeloVEdit} onChangeText={setModeloVEdit} placeholder="Modelo" placeholderTextColor={C.gris} />
            <TextInput style={styles.input} value={anioVEdit} onChangeText={setAnioVEdit} placeholder="Año" placeholderTextColor={C.gris} keyboardType="numeric" maxLength={4} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {['🚗 Automóvil', '🚙 SUV', '🏍 Moto', '🚐 Van', '🚛 Camión'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: tipoVEdit === t ? C.marca : C.divider, backgroundColor: tipoVEdit === t ? 'rgba(46,230,197,0.15)' : 'transparent' }}
                  onPress={() => setTipoVEdit(t)}
                >
                  <Text style={{ color: tipoVEdit === t ? C.marca : C.gris, fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btnGuardar} onPress={guardarVehiculo}>
              <Text style={styles.btnGuardarTexto}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditandoVehiculo(null)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal editar */}
      <Modal visible={editando} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Editar perfil</Text>
            <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} placeholder="Nombre" placeholderTextColor={C.gris} />
            <TextInput style={styles.input} value={ciudadEdit} onChangeText={setCiudadEdit} placeholder="Ciudad" placeholderTextColor={C.gris} />
            <TouchableOpacity style={styles.btnGuardar} onPress={guardarEdicion}>
              <Text style={styles.btnGuardarTexto}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={() => setEditando(false)}>
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fondo, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 50, marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 28, fontWeight: 'bold' },
  nombre: { color: C.blanco, fontSize: 20, fontWeight: '500' },
  editarBtn: { color: C.marca, fontSize: 13 },
  ciudad: { color: C.gris, fontSize: 13, marginTop: 2 },
  scoreGeneral: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  vehiculoActivoCard: { backgroundColor: 'rgba(46,230,197,0.08)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(46,230,197,0.2)' },
  vehiculoActivoLabel: { color: C.marca, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  vehiculoActivoNombre: { color: C.blanco, fontSize: 16, fontWeight: '500' },
  seccion: { backgroundColor: C.superficie, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.borde },
  seccionTitulo: { color: C.gris, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  vehiculoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.divider },
  vehiculoInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehiculoActivo: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.superficie2, borderWidth: 1, borderColor: C.gris },
  vehiculoActivoOn: { backgroundColor: C.marca, borderColor: C.marca },
  vehiculoNombre: { color: C.blanco, fontSize: 15 },
  vehiculoAnio: { color: C.gris, fontSize: 13, marginTop: 2 },
  eliminar: { color: C.rojo, fontSize: 16, padding: 8 },
  btnAgregar: { borderWidth: 1, borderColor: C.marca, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  btnAgregarTexto: { color: C.marca, fontSize: 15 },
  prefLabel: { color: C.gris, fontSize: 14, marginBottom: 10 },
  unidadBtns: { flexDirection: 'row', gap: 12 },
  unidadBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.divider, alignItems: 'center' },
  unidadBtnActivo: { borderColor: C.marca, backgroundColor: 'rgba(46,230,197,0.15)' },
  unidadBtnTexto: { color: C.gris, fontSize: 16, fontWeight: '500' },
  unidadBtnTextoActivo: { color: C.marca },
  acercaTexto: { color: C.gris, fontSize: 14, lineHeight: 22, marginBottom: 12 },
  btnDatos: { borderWidth: 1, borderColor: C.divider, borderRadius: 12, padding: 14 },
  btnDatosTexto: { color: C.blanco, fontSize: 14, fontWeight: '500', marginBottom: 2 },
  btnDatosDesc: { color: C.gris, fontSize: 12 },
  debugLinea: { color: C.gris, fontSize: 13 },
  debugValor: { color: C.blanco, fontWeight: '600' },
  btnContacto: { borderWidth: 1, borderColor: C.divider, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  btnContactoTexto: { color: C.gris, fontSize: 14 },
  version: { color: C.divider, fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: C.superficie, borderRadius: 20, padding: 24, width: '85%', borderWidth: 1, borderColor: C.marca, gap: 12 },
  modalTitulo: { color: C.blanco, fontSize: 18, fontWeight: '600' },
  input: { backgroundColor: C.superficie2, color: C.blanco, fontSize: 16, padding: 14, borderRadius: 12 },
  btnGuardar: { backgroundColor: C.marca, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnGuardarTexto: { color: C.fondo, fontSize: 15, fontWeight: 'bold' },
  btnCancelar: { alignItems: 'center', padding: 8 },
  btnCancelarTexto: { color: C.gris, fontSize: 14 },
});
