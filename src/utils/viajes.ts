import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Evento {
  tipo: 'exceso' | 'frenada' | 'aceleracion';
  timestamp: number;
  velocidad: number;
  limite: number;
}

export interface Viaje {
  id: string;
  fecha: number;
  duracion: number; // segundos
  topSpeed: number;
  puntosFinales: number;
  eventos: Evento[];
  score: 'Excelente' | 'Bueno' | 'Regular' | 'Peligroso';
}

const PUNTOS_INICIO = 1000;

export function calcularPenalizacion(velocidad: number, limite: number): number {
  const exceso = ((velocidad - limite) / limite) * 100;
  if (exceso <= 0) return 0;
  if (exceso <= 10) return 1;
  if (exceso <= 25) return 3;
  if (exceso <= 50) return 7;
  return 15;
}

export function calcularScore(puntos: number): Viaje['score'] {
  if (puntos >= 900) return 'Excelente';
  if (puntos >= 700) return 'Bueno';
  if (puntos >= 500) return 'Regular';
  return 'Peligroso';
}

export async function guardarViaje(viaje: Omit<Viaje, 'id' | 'score'>): Promise<void> {
  const id = Date.now().toString();
  const score = calcularScore(viaje.puntosFinales);
  const viajeCompleto: Viaje = { ...viaje, id, score };

  const existing = await AsyncStorage.getItem('viajes');
  const viajes: Viaje[] = existing ? JSON.parse(existing) : [];
  viajes.unshift(viajeCompleto);

  // guardar máximo 100 viajes
  await AsyncStorage.setItem('viajes', JSON.stringify(viajes.slice(0, 100)));
}

export async function getViajes(): Promise<Viaje[]> {
  const existing = await AsyncStorage.getItem('viajes');
  return existing ? JSON.parse(existing) : [];
}

export function formatearFecha(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}