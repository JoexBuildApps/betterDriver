import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPIRY_DAYS = 30;

// Redondea coordenadas a ~100 metros
function redondear(coord: number): number {
  return Math.round(coord * 1000) / 1000;
}

function clave(lat: number, lon: number): string {
  return `limite_${redondear(lat)}_${redondear(lon)}`;
}

// Tipo de vía → límite Colombia por defecto
function limitePorTipoVia(tags: any): number {
  const highway = tags?.highway;
  if (!highway) return 20;
  if (['motorway', 'trunk'].includes(highway)) return 80;
  if (['primary', 'primary_link'].includes(highway)) return 50;
  if (['secondary', 'secondary_link'].includes(highway)) return 40;
  if (['tertiary', 'tertiary_link'].includes(highway)) return 30;
  return 20;
}

export async function getLimite(lat: number, lon: number): Promise<number> {
  const key = clave(lat, lon);

  // 1. Buscar en caché
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { limite, timestamp } = JSON.parse(cached);
      const dias = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      if (dias < EXPIRY_DAYS) return limite;
    }
  } catch (e) {}

  // 2. Consultar OSM
  try {
    const query = `[out:json];way(around:30,${lat},${lon})[highway];out tags;`;
    const res = await fetch('https://overpass.kumi.systems/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    const elements = data.elements;

    if (elements.length > 0) {
      const tags = elements[0].tags;
      let limite = 20;
      if (tags?.maxspeed) {
        const valor = parseInt(tags.maxspeed);
        if (!isNaN(valor)) limite = valor;
      } else {
        limite = limitePorTipoVia(tags);
      }
      await AsyncStorage.setItem(key, JSON.stringify({ limite, timestamp: Date.now() }));
      return limite;
    }
  } catch (e) {}

  return 20;
}