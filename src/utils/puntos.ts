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

export function calcularEstrellas(duracionSegundos: number, segundosEnExceso: number): number {
  if (duracionSegundos === 0) return 3;
  if (segundosEnExceso === 0) return 5;
  const porcentaje = (segundosEnExceso / duracionSegundos) * 100;
  if (porcentaje <= 5) return 4;
  if (porcentaje <= 15) return 3;
  if (porcentaje <= 35) return 2;
  return 1;
}

export function calcularScore(estrellas: number): string {
  if (estrellas === 5) return 'Así se hace. Cero infracciones.';
  if (estrellas === 4) return 'Casi perfecto. Pocos momentos fuera del límite.';
  if (estrellas === 3) return 'En construcción. Vas por buen camino.';
  if (estrellas === 2) return 'Te regalaron el pase.';
  return 'Deberías ir en bus.';
}
