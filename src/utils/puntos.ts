export interface ResumenViaje {
  puntosBase: number;
  penalizaciones: number;
  minutosEnExceso: number;
  bonus: number;
  total: number;
  infracciones: number;
  segundosEnExceso: number;
}

export function calcularResumen(
  duracionSegundos: number,
  infracciones: number,
  segundosEnExceso: number
): ResumenViaje {
  const minutosTotales = Math.floor(duracionSegundos / 60);
  const minutosEnExceso = Math.floor(segundosEnExceso / 60);
  const puntosBase = Math.max(0, minutosTotales - minutosEnExceso);
  const penalizaciones = infracciones * 3;
  
  let bonus = 0;
  if (infracciones === 0) bonus += 20;
  else if (segundosEnExceso < 30) bonus += 10;

  const total = Math.max(0, puntosBase - penalizaciones + bonus);

  return {
    puntosBase,
    penalizaciones,
    minutosEnExceso,
    bonus,
    total,
    infracciones,
    segundosEnExceso,
  };
}

// Tabla de estrellas basada en segundos de exceso POR MINUTO de viaje (no % del viaje total).
// El % del viaje total diluye demasiado los segundos de exceso en viajes largos (29s en un
// viaje de 30min es solo 1.6%, cayendo siempre en el rango de 4-5 estrellas sin importar qué
// tan seguido se repita). Segundos/minuto no depende de la duración del viaje.
//
// Además se ajusta según el promedio personal de los últimos 10 viajes: si este viaje estuvo
// claramente mejor que tu promedio reciente, sube una estrella; si estuvo claramente peor, baja
// una. Esto hace que la escala responda a tu propio patrón de conducción, no solo a un número fijo.
export function calcularEstrellas(
  duracionSegundos: number,
  segundosEnExceso: number,
  promedioSegundosExceso10?: number | null
): number {
  if (duracionSegundos === 0) return 3;
  if (segundosEnExceso === 0) return 5;

  const minutos = duracionSegundos / 60;
  const segsPorMinuto = segundosEnExceso / minutos;

  let estrellas: number;
  if (segsPorMinuto <= 0.3) estrellas = 4;
  else if (segsPorMinuto <= 1) estrellas = 3;
  else if (segsPorMinuto <= 2.5) estrellas = 2;
  else estrellas = 1;

  if (promedioSegundosExceso10 && promedioSegundosExceso10 > 0) {
    if (segundosEnExceso < promedioSegundosExceso10 * 0.7) estrellas = Math.min(5, estrellas + 1);
    else if (segundosEnExceso > promedioSegundosExceso10 * 1.3) estrellas = Math.max(1, estrellas - 1);
  }

  return estrellas;
}

export function calcularScore(estrellas: number): string {
  if (estrellas === 5) return 'Así se hace. Cero infracciones.';
  if (estrellas === 4) return 'Casi perfecto. Pocos momentos fuera del límite.';
  if (estrellas === 3) return 'En construcción. Vas por buen camino.';
  if (estrellas === 2) return 'Te regalaron el pase.';
  return 'Deberías ir en bus.';
}
