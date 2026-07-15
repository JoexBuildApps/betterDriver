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
  const porcentaje = (segundosEnExceso / duracionSegundos) * 100;
  if (porcentaje <= 5) return 5;
  if (porcentaje <= 15) return 4;
  if (porcentaje <= 30) return 3;
  if (porcentaje <= 50) return 2;
  return 1;
}

export function calcularScore(estrellas: number): string {
  if (estrellas === 5) return 'Lento pero seguro';
  if (estrellas === 4) return 'Esto es lo que se espera de ti';
  if (estrellas === 3) return 'En construccion';
  if (estrellas === 2) return 'Te regalaron el pase';
  return 'Deberias ir en bus';
}
