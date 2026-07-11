import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { EULA_ES, EULA_EN, EULA_USA } from '../utils/eula';

export default function EulaScreen() {
  const [aceptado, setAceptado] = useState(false);

  const continuar = async () => {
    await AsyncStorage.setItem('eulaAceptado', 'true');
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Términos y Condiciones</Text>
      <Text style={styles.subtitulo}>Lee y acepta antes de continuar</Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
        <Text style={styles.seccion}>📋 COLOMBIA</Text>
        <Text style={styles.texto}>{EULA_ES}</Text>
        <View style={styles.separador} />
        <Text style={styles.seccion}>📋 INTERNATIONAL</Text>
        <Text style={styles.texto}>{EULA_EN}</Text>
        <View style={styles.separador} />
        <Text style={styles.seccion}>📋 UNITED STATES (DELAWARE)</Text>
        <Text style={styles.texto}>{EULA_USA}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAceptado(!aceptado)}
        >
          <View style={[styles.check, aceptado && styles.checkActivo]}>
            {aceptado && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            He leído y acepto los términos y condiciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, !aceptado && styles.btnDesactivado]}
          onPress={continuar}
          disabled={!aceptado}
        >
          <Text style={styles.btnTexto}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  titulo: { color: '#4fc3f7', fontSize: 20, fontWeight: '600', textAlign: 'center', marginTop: 60, marginBottom: 4 },
  subtitulo: { color: '#607d8b', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  seccion: { color: '#4fc3f7', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  texto: { color: '#8899aa', fontSize: 12, lineHeight: 20 },
  separador: { height: 1, backgroundColor: '#0f1f3a', marginVertical: 20 },
  footer: { padding: 20, paddingBottom: 40, backgroundColor: '#0a1628', borderTopWidth: 1, borderTopColor: '#0f1f3a' },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  check: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#607d8b', alignItems: 'center', justifyContent: 'center' },
  checkActivo: { backgroundColor: '#4fc3f7', borderColor: '#4fc3f7' },
  checkMark: { color: '#0a1628', fontSize: 14, fontWeight: 'bold' },
  checkLabel: { color: '#fff', fontSize: 13, flex: 1 },
  btn: { backgroundColor: '#4fc3f7', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnDesactivado: { backgroundColor: '#0f1f3a' },
  btnTexto: { color: '#0a1628', fontSize: 16, fontWeight: 'bold' },
});
