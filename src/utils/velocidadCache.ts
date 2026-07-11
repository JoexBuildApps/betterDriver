import { Platform } from 'react-native';

const cache = new Map<string, { limite: number; timestamp: number }>();
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

function clave(lat: number, lon: number): string {
  return `${Math.round(lat * 1000) / 1000}_${Math.round(lon * 1000) / 1000}`;
}

let dbInicializada = false;
let indexCreado = false;

async function inicializarDB() {
  if (dbInicializada) return;

  const SQLite = await import('expo-sqlite');
  const FileSystem = await import('expo-file-system');
  const { Asset } = await import('expo-asset');

  const dirPath = FileSystem.documentDirectory + 'SQLite/';
  const dbPath = dirPath + 'colombia_final.db';

  const dirInfo = await FileSystem.getInfoAsync(dirPath);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }

  const dbInfo = await FileSystem.getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    const asset = Asset.fromModule(require('../../assets/data/colombia_vias.db'));
    await asset.downloadAsync();
    await FileSystem.copyAsync({ from: asset.localUri!, to: dbPath });
  }

  dbInicializada = true;
}

async function getLimiteNativo(lat: number, lon: number): Promise<number> {
  const SQLite = await import('expo-sqlite');
  await inicializarDB();

  const db = await SQLite.openDatabaseAsync('colombia_final.db');

  if (!indexCreado) {
    try {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_vias_lat ON vias (lat_min, lat_max);
        CREATE INDEX IF NOT EXISTS idx_vias_lon ON vias (lon_min, lon_max);
        CREATE INDEX IF NOT EXISTS idx_bog_lat ON vias_bogota (lat_min, lat_max);
        CREATE INDEX IF NOT EXISTS idx_bog_lon ON vias_bogota (lon_min, lon_max);
      `);
    } catch (e) {}
    indexCreado = true;
  }

  const margen = 0.0003;

  // 1. Buscar en Bogota oficial primero
  const bogota = await db.getFirstAsync<{ limite: number }>(
    `SELECT limite FROM vias_bogota
     WHERE lat_min <= ? AND lat_max >= ?
     AND lon_min <= ? AND lon_max >= ?
     LIMIT 1`,
    [lat + margen, lat - margen, lon + margen, lon - margen]
  );

  if (bogota) return bogota.limite;

  // 2. Buscar en OSM con jerarquia
  const osm = await db.getFirstAsync<{ highway: string; limite: number }>(
    `SELECT highway, limite FROM vias
     WHERE lat_min <= ? AND lat_max >= ?
     AND lon_min <= ? AND lon_max >= ?
     ORDER BY CASE highway
       WHEN 'motorway' THEN 1
       WHEN 'trunk' THEN 2
       WHEN 'trunk_link' THEN 3
       WHEN 'primary' THEN 4
       WHEN 'primary_link' THEN 5
       WHEN 'secondary' THEN 6
       WHEN 'secondary_link' THEN 7
       WHEN 'tertiary' THEN 8
       WHEN 'tertiary_link' THEN 9
       WHEN 'residential' THEN 10
       ELSE 11
     END ASC
     LIMIT 1`,
    [lat + margen, lat - margen, lon + margen, lon - margen]
  );

  if (osm) return osm.limite;

  return 20;
}

export async function getLimite(lat: number, lon: number): Promise<number> {
  const key = clave(lat, lon);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.limite;
  }

  let limite = 20;

  if (Platform.OS !== 'web') {
    try {
      limite = await getLimiteNativo(lat, lon);
    } catch (e) {
      console.log('Error DB:', e);
      limite = 20;
    }
  }

  cache.set(key, { limite, timestamp: Date.now() });
  return limite;
}
