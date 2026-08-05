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
  tier5: [
    "Así se maneja, sin dramas",
    "Sin multas, sin sustos, sin dramas",
    "Sin infracciones por ahora. Sigue así",
    "Hoy tu historial de conductor está limpio",
    "Hoy no eres un peligro público. Eso cuenta",
    "Modo zen activado",
    "La abuela aprobaría esta conducción",
    "Vas bien, la abuela está tranquila",
  ],
  tier4: [
    "Vas bien, unos pocos segundos no te definen",
    "Casi perfecto. Sigue así el resto del trayecto",
    "Buen ritmo, conductor",
    "El destino te espera, no tiene para dónde irse",
    "Velocidad correcta, karma en verde",
    "Llevas un rato bien. Nosotros lo notamos",
    "Tu seguro de vida no tiene que trabajar hoy",
    "Así se llega: aburrido pero vivo",
  ],
  tier3: [
    "Vas en 3 estrellas, pero si el resto del viaje va limpio, esto sube solo",
    "Aún puedes mejorar esto — entre más dure el viaje sin excesos, mejor te va",
    "Vas regular, pero un tramo largo y tranquilo lo arregla",
    "3 estrellas por ahora. El resto del trayecto decide",
    "No está mal, pero tampoco brillante. Sigamos sumando minutos limpios",
    "Vas en la mitad de la tabla — un poco más de calma y subes",
    "El marcador va regular, pero todavía hay tiempo de enderezar esto",
    "Ahorita vas en 3. Cada minuto tranquilo que sigue, suma a tu favor",
  ],
  tier2: [
    "Vas mal en este viaje. Baja el ritmo ya",
    "2 estrellas si sigues así. Todavía puedes cambiar el rumbo",
    "Esto se está poniendo feo. Enfócate en manejar tranquilo",
    "El viaje va complicado. Un tramo largo sin excesos te puede salvar",
    "Vas mal parado en el marcador. Hora de calmarse",
    "Si esto sigue así, el viaje termina mal calificado",
    "Necesitas varios minutos limpios seguidos para remontar esto",
    "El ritmo de hoy no es el mejor. Todavía hay tiempo de corregir",
  ],
  tier1: [
    "Este viaje va muy mal. En serio, baja la velocidad",
    "1 estrella si sigues así. Esto no es un buen día al volante",
    "Deberías considerar ir en bus si esto sigue así",
    "El marcador está en rojo. Necesitas parar el patrón ya",
    "Esto ya no es cuestión de segundos, es un patrón peligroso",
    "Vas muy mal. Respira y reduce",
    "El viaje de hoy no se ve bien en tu historial",
    "Es momento de manejar distinto, no de esperar que mejore solo",
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
