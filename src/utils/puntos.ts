// Sistema de puntos por minuto
// +1 pt por minuto dentro del limite
// -10 pts por infraccion
// -1 pt por minuto en exceso sostenido
// +20 bonus si 0 infracciones al terminar
// +10 bonus si menos de 30 seg en exceso total

export interface ResumenViaje {
  puntosBase: number;        // minutos bien manejados
  penalizaciones: number;    // infracciones × 10
  minutosEnExceso: number;   // minutos sobre el limite
  bonus: number;             // bonus al terminar
  total: number;             // puntos finales
  infracciones: number;      // numero de infracciones
  segundosEnExceso: number;  // segundos totales en exceso
}

export function calcularResumen(
  duracionSegundos: number,
  infracciones: number,
  segundosEnExceso: number
): ResumenViaje {
  const minutosTotales = Math.floor(duracionSegundos / 60);
  const minutosEnExceso = Math.floor(segundosEnExceso / 60);
  const puntosBase = Math.max(0, minutosTotales - minutosEnExceso);
  const penalizaciones = infracciones * 10;
  
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

export function calcularEstrellas(total: number, duracionSegundos: number): number {
  const minutos = Math.max(1, Math.floor(duracionSegundos / 60));
  const ratio = total / minutos; // puntos por minuto
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

export function calcularScore(estrellas: number): string {
  if (estrellas === 5) return 'Lento pero seguro';
  if (estrellas === 4) return 'Esto es lo que se espera de ti';
  if (estrellas === 3) return 'En construccion';
  if (estrellas === 2) return 'Te regalaron el pase';
  return 'Deberias ir en bus';
}
