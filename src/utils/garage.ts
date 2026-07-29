import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ServicioGarage {
  id: string;
  fecha: string; // ISO yyyy-mm-dd
  descripcion: string;
}

export interface GarageInfo {
  seguroFecha?: string; // ISO yyyy-mm-dd
  aceiteFecha?: string; // ISO yyyy-mm-dd (último cambio)
  aceiteIntervaloMeses?: number;
  km?: string; // referencial, texto libre (ej. "45.000")
  servicios: ServicioGarage[];
}

export const DIAS_AVISO = 7;

export function garageVacio(): GarageInfo {
  return { servicios: [] };
}

// yyyy-mm-dd a partir de día/mes/año sueltos, o null si están incompletos/inválidos
export function fechaISO(dia: string, mes: string, anio: string): string | null {
  const d = parseInt(dia), m = parseInt(mes), a = parseInt(anio);
  if (!d || !m || !a || d < 1 || d > 31 || m < 1 || m > 12 || a < 2000 || a > 2100) return null;
  const fecha = new Date(a, m - 1, d);
  if (fecha.getMonth() !== m - 1) return null; // ej. 31 de febrero
  return `${a.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

export function partesFecha(iso?: string): { dia: string; mes: string; anio: string } {
  if (!iso) return { dia: '', mes: '', anio: '' };
  const [a, m, d] = iso.split('-');
  return { dia: d, mes: m, anio: a };
}

export function formatearFechaCorta(iso?: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Próxima fecha de cambio de aceite = último cambio + intervalo en meses
export function proximoAceite(garage: GarageInfo): string | null {
  if (!garage.aceiteFecha || !garage.aceiteIntervaloMeses) return null;
  const [a, m, d] = garage.aceiteFecha.split('-').map(Number);
  const base = new Date(a, m - 1, d);
  base.setMonth(base.getMonth() + garage.aceiteIntervaloMeses);
  return `${base.getFullYear()}-${(base.getMonth() + 1).toString().padStart(2, '0')}-${base.getDate().toString().padStart(2, '0')}`;
}

export function diasHasta(fechaISOStr: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [a, m, d] = fechaISOStr.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  return Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
}

// Resumen de estado para la lista del garage: qué tan urgente es cada vehículo
export function estadoGarage(garage?: GarageInfo): { texto: string; nivel: 'ok' | 'pronto' | 'vencido' | 'vacio' } {
  if (!garage || (!garage.seguroFecha && !garage.aceiteFecha)) {
    return { texto: 'Sin datos', nivel: 'vacio' };
  }
  const alertas: string[] = [];
  let nivel: 'ok' | 'pronto' | 'vencido' = 'ok';

  if (garage.seguroFecha) {
    const d = diasHasta(garage.seguroFecha);
    if (d < 0) { alertas.push('Seguro vencido'); nivel = 'vencido'; }
    else if (d <= DIAS_AVISO) { alertas.push(`Seguro en ${d}d`); if (nivel !== 'vencido') nivel = 'pronto'; }
  }
  const proxAceite = proximoAceite(garage);
  if (proxAceite) {
    const d = diasHasta(proxAceite);
    if (d < 0) { alertas.push('Aceite vencido'); nivel = 'vencido'; }
    else if (d <= DIAS_AVISO) { alertas.push(`Aceite en ${d}d`); if (nivel !== 'vencido') nivel = 'pronto'; }
  }

  if (alertas.length === 0) return { texto: 'Al día', nivel: 'ok' };
  return { texto: alertas.join(' · '), nivel };
}

// --- Notificaciones locales ---

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let canalCreado = false;
async function asegurarCanalAndroid() {
  if (Platform.OS !== 'android' || canalCreado) return;
  await Notifications.setNotificationChannelAsync('garage', {
    name: 'Garage - Mantenimiento',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  canalCreado = true;
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  await asegurarCanalAndroid();
  const { status: existente } = await Notifications.getPermissionsAsync();
  let final = existente;
  if (existente !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  return final === 'granted';
}

// identifier estable por vehículo+tipo, para poder reemplazar sin duplicar al editar
function idNotificacion(vehiculoId: string, tipo: 'seguro' | 'aceite'): string {
  return `garage-${vehiculoId}-${tipo}`;
}

export async function programarAvisoGarage(
  vehiculoId: string,
  tipo: 'seguro' | 'aceite',
  fechaVencimientoISO: string | null,
  tituloVehiculo: string
) {
  const identifier = idNotificacion(vehiculoId, tipo);
  try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch (e) {}

  if (!fechaVencimientoISO) return;

  const [a, m, d] = fechaVencimientoISO.split('-').map(Number);
  const fechaAviso = new Date(a, m - 1, d);
  fechaAviso.setDate(fechaAviso.getDate() - DIAS_AVISO);
  fechaAviso.setHours(9, 0, 0, 0); // avisa 9am del día calculado

  if (fechaAviso.getTime() <= Date.now()) return; // ya pasó la ventana de aviso, no programar

  const cuerpo = tipo === 'seguro'
    ? `El seguro de tu ${tituloVehiculo} vence en ${DIAS_AVISO} días`
    : `Se acerca el cambio de aceite de tu ${tituloVehiculo} (en ${DIAS_AVISO} días)`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: '🔧 betterDriver Garage', body: cuerpo, data: { vehiculoId, tipo } },
      trigger: Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fechaAviso, channelId: 'garage' }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fechaAviso },
    });
  } catch (e) {
    // Si falla el permiso o el trigger, no bloquea el guardado de los datos del garage
  }
}

export async function reprogramarAvisosVehiculo(vehiculoId: string, tituloVehiculo: string, garage: GarageInfo) {
  const ok = await pedirPermisoNotificaciones();
  if (!ok) return;
  await programarAvisoGarage(vehiculoId, 'seguro', garage.seguroFecha || null, tituloVehiculo);
  await programarAvisoGarage(vehiculoId, 'aceite', proximoAceite(garage), tituloVehiculo);
}

// Asegura que cada vehículo guardado tenga un id estable (los vehículos viejos no lo tenían)
export async function backfillIdsVehiculos(): Promise<any[]> {
  const existing = await AsyncStorage.getItem('vehiculos');
  let lista = existing ? JSON.parse(existing) : [];
  let cambio = false;
  lista = lista.map((v: any) => {
    if (!v.id) {
      cambio = true;
      return { ...v, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    }
    return v;
  });
  if (cambio) await AsyncStorage.setItem('vehiculos', JSON.stringify(lista));
  return lista;
}
