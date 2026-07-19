import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcularResumen, calcularEstrellas, calcularScore } from './puntos';

export interface Evento {
  tipo: 'exceso' | 'frenada' | 'aceleracion';
  timestamp: number;
  velocidad: number;
  limite: number;
}

export interface PuntoGPS {
  lat: number;
  lon: number;
  velocidad: number;
  limite: number;
  timestamp: number;
  color: 'verde' | 'amarillo' | 'rojo';
}

export interface Viaje {
  id: string;
  fecha: number;
  duracion: number;
  topSpeed: number;
  velocidadPromedio: number;
  distanciaKm: number;
  limite: number;
  puntosFinales: number;
  puntosBase: number;
  bonus: number;
  penalizaciones: number;
  segundosEnExceso: number;
  infracciones: number;
  eventos: Evento[];
  estrellas: number;
  score: string;
  vehiculo?: string;
  tipoVehiculo?: string;
  origenBarrio?: string;
  destinoBarrio?: string;
  tipoVehiculo?: string;
  origenBarrio?: string;
  destinoBarrio?: string;
  ruta?: PuntoGPS[];
  semana: string; // formato YYYY-WW
}

function getSemana(fecha: number): string {
  const d = new Date(fecha);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(week).padStart(2, '0')}`;
}

export async function guardarViaje(viaje: {
  fecha: number;
  duracion: number;
  topSpeed: number;
  velocidadPromedio: number;
  distanciaKm: number;
  limite: number;
  eventos: Evento[];
  ruta: PuntoGPS[];
  vehiculo?: string;
  tipoVehiculo?: string;
  origenBarrio?: string;
  destinoBarrio?: string;
  tipoVehiculo?: string;
  origenBarrio?: string;
  destinoBarrio?: string;
  segundosEnExceso: number;
}): Promise<void> {
  const resumen = calcularResumen(viaje.duracion, viaje.eventos.length, viaje.segundosEnExceso);
  const estrellas = calcularEstrellas(viaje.duracion, viaje.segundosEnExceso);
  const score = calcularScore(estrellas);

  const viajeCompleto: Viaje = {
    id: Date.now().toString(),
    fecha: viaje.fecha,
    duracion: viaje.duracion,
    topSpeed: viaje.topSpeed,
    velocidadPromedio: viaje.velocidadPromedio,
    distanciaKm: viaje.distanciaKm,
    limite: viaje.limite,
    puntosFinales: resumen.total,
    puntosBase: resumen.puntosBase,
    bonus: resumen.bonus,
    penalizaciones: resumen.penalizaciones,
    segundosEnExceso: viaje.segundosEnExceso,
    infracciones: viaje.eventos.length,
    eventos: viaje.eventos,
    estrellas,
    score,
    vehiculo: viaje.vehiculo,
    ruta: viaje.ruta,
    semana: getSemana(viaje.fecha),
  };

  const existing = await AsyncStorage.getItem('viajes');
  const viajes: Viaje[] = existing ? JSON.parse(existing) : [];
  viajes.unshift(viajeCompleto);
  await AsyncStorage.setItem('viajes', JSON.stringify(viajes.slice(0, 100)));
}

export async function getViajes(): Promise<Viaje[]> {
  const existing = await AsyncStorage.getItem('viajes');
  return existing ? JSON.parse(existing) : [];
}

export async function getPuntosSemanales(): Promise<{ semana: string; puntos: number }[]> {
  const viajes = await getViajes();
  const mapa = new Map<string, number>();
  viajes.forEach(v => {
    const actual = mapa.get(v.semana) || 0;
    mapa.set(v.semana, actual + v.puntosFinales);
  });
  return Array.from(mapa.entries())
    .map(([semana, puntos]) => ({ semana, puntos }))
    .sort((a, b) => b.semana.localeCompare(a.semana));
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

