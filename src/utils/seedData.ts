import AsyncStorage from '@react-native-async-storage/async-storage';

export async function insertarViajeDemo() {
  const demo = {
    id: 'DELETEME',
    fecha: Date.now() - 3600000,
    duracion: 1247,
    topSpeed: 67,
    puntosFinales: 743,
    eventos: [
      { tipo: 'exceso', timestamp: Date.now() - 3500000, velocidad: 58, limite: 50 },
      { tipo: 'frenada', timestamp: Date.now() - 3400000, velocidad: 0, limite: 50 },
      { tipo: 'exceso', timestamp: Date.now() - 3200000, velocidad: 72, limite: 60 },
    ],
    score: 'Asi se deberia',
  };

  const existing = await AsyncStorage.getItem('viajes');
  const viajes = existing ? JSON.parse(existing) : [];
  if (!viajes.find((v: any) => v.id === 'DELETEME')) {
    viajes.unshift(demo);
    await AsyncStorage.setItem('viajes', JSON.stringify(viajes));
  }
}
