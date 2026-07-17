export const MENSAJES = {
  exceso: [
    "Vas muy rápido, la próxima toma un taxi",
    "¿A dónde vas tan rápido? ¿Al hospital? Porque así vas a llegar",
    "El límite es sugerencia para todos, menos para ti al parecer",
    "Tu seguro de vida te manda saludos",
    "Los semáforos en rojo también aplican para ti, por si no lo sabías",
    "Velocidad detectada. Dignidad, cuestionada",
    "¿Sabías que las multas también van rápido? Más que tú",
    "El velocímetro no miente. Tú sí",
    "Manejando así vas a llegar primero... a la multa de tránsito",
    "Tranquilo, la calle no se va a mover",
    "¿Estás huyendo de algo o simplemente eres así?",
    "GPS dice: reduce la velocidad. Tú dices: no. GPS insiste",
    "Conductor detectado en modo videojuego",
    "Reducir velocidad no te hace menos nada",
    "Las cámaras de fotomulta también van a 0 km/h. Espérate",
    "Si llegas 3 minutos tarde, el problema no es la velocidad",
    "Velocidad de videojuego, consecuencias de la vida real",
    "Bonito carro para manejarlo así",
    "El carro de adelante respeta los límites. Tú podrías aprender",
    "Vas tan rápido que el viento está asustado",
  ],
  aleatorio: [
    "Vas bien, la abuela está tranquila",
    "Así se maneja, sin dramas",
    "El destino te espera, no tiene para dónde irse",
    "Velocidad correcta, karma en verde",
    "Sin multas, sin sustos, sin dramas",
    "La carretera es de todos, no solo tuya",
    "Hoy no eres un peligro público. Eso cuenta",
    "Modo zen activado",
    "Tu seguro de vida no tiene que trabajar hoy",
    "Así se llega: aburrido pero vivo",
    "La prisa es enemiga del buen conductor",
    "Cada semáforo en rojo es una oportunidad de respirar",
    "Llevas un rato bien. Nosotros lo notamos",
    "Sin infracciones por ahora. Sigue así",
    "Buen ritmo, conductor",
    "Hoy tu historial de conductor está limpio",
    "La abuela aprobaría esta conducción",
    "Velocidad normal, corazón tranquilo",
    "Así se cuida el carro y la vida",
    "Conductor responsable detectado. Evento poco frecuente",
  ],
  brusco: [
    "Eso fue brusco, suave que no hay apuro",
    "La abuela sintió eso",
    "Suave con el carro, que no es tuyo solo",
    "Conducción suave, llegada segura",
    "Eso no fue necesario",
    "El carro no es un videojuego",
    "Tranquilo, respira",
    "Así no, conductor",
    "Suave, que los pasajeros también cuentan",
    "betterDriver lo notó. Tú también lo sabes",
  ],
};

const indices: Partial<Record<keyof typeof MENSAJES, number[]>> = {};

export function mensajeAleatorio(categoria: keyof typeof MENSAJES): string {
  const lista = MENSAJES[categoria];
  if (!indices[categoria] || indices[categoria]!.length === 0) {
    const arr = lista.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    indices[categoria] = arr;
  }
  return lista[indices[categoria]!.pop()!];
}
