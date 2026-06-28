import { StyleSheet, Text, View } from 'react-native';

export default function Conducir() {
  return (
    <View style={styles.container}>
      <Text style={styles.texto}>DriveCoach</Text>
      <Text style={styles.sub}>v2 funcionando</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  sub: { color: '#555', fontSize: 16, marginTop: 8 },
});
