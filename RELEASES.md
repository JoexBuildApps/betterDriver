# betterDriver — Release Notes

## v1.2.5 — Consistencia visual + sesgo de seguridad en velocidad

### Nuevas funciones
- Sesgo de seguridad de +2 km/h en la velocidad mostrada: el GPS suele leer levemente por debajo de la velocidad real, y en un velocímetro es más seguro mostrar de más que de menos. Se aplica tanto a la velocidad en vivo como al top speed (nunca al forzar 0 en semáforo).
- Badge de "límite de zona" con animación de pulso cada vez que cambia (con ±5, o al iniciar un viaje) — confirmación visual clara de que se actualizó.

### UI
- Contador de infracciones ahora usa el mismo estilo (título uppercase pequeño + número grande) que "puntos", en vez de una línea de texto combinada más chica.
- Unificado el texto "límite" (landscape) y "límite de zona" (portrait) en un solo componente `LimiteBadge`, mismo texto en ambos layouts.

## v1.2.4 — Detección de trancón + Modo libre parejo con modo viaje

### Nuevas funciones
- El viaje ya no se cierra solo si quedas parado 3+ minutos en un trancón largo. La app ahora cuenta los ciclos de parar-arrancar-parar durante el viaje; si detecta 3 o más ciclos en los últimos 25 minutos (patrón típico de tráfico pesado), extiende el timeout de cierre automático a 15 minutos en vez de 3. Si es un stop aislado (llegaste a destino, por ejemplo), el timeout normal de 3 minutos se mantiene sin cambios.
- Modo libre ahora tiene los mismos botones −5/+5 de ajuste de límite que modo viaje.
- Contador de infracciones ("N infracc.") visible debajo de "puntos" en el header, tanto en portrait como landscape.

### Bugfixes
- `iniciarRoaming` nunca llamaba a `resetearViaje()` — si hacías un viaje y luego entrabas a Modo libre, arrastraba las infracciones y el top speed de la sesión anterior. Ya corregido.

## v1.2.3 — Fix zigzag de velocidad en crucero constante

### Bugfixes
- Velocímetro: el temporizador de bajada no tenía meta — solo se detenía al llegar a 0 o si una lectura GPS lo interrumpía. En velocidad constante (ej. 44 km/h con crucero activado) esto causaba que bajara sin parar entre lecturas GPS (~1seg) y tuviera que "rescatarse" de vuelta cada vez, generando zigzag visible (44, 45, 43, 42, 41...).
- Refactor: nuevo ref `objetivoVelocidad` que se actualiza en cada lectura GPS con el valor más reciente (0 si está detenido confirmado, o la velocidad real filtrada en caso contrario). Los temporizadores de subida/bajada ahora leen este objetivo en cada tick propio y se detienen exactamente ahí, en vez de siempre correr hacia 0 o quedar peleando consigo mismos en velocidad estable.
- El comportamiento del failsafe en semáforos no cambia (mismo umbral de ruido, misma verificación por posición/ventana larga, mismo paso de bajada rápida de 5km/h/seg) — solo cambia que ahora converge y se queda en el valor correcto en vez de sobrepasarlo.

## v1.2.2 — Fixes GPS ventana larga + UI botón Iniciar viaje

### Bugfixes
- UI: botón "Iniciar viaje" se quedaba sin texto visible al compartir fila con "Modo libre" — `paddingHorizontal` de 40 a 12, quitado `overflow: hidden`, agregado `alignItems`/`justifyContent: center`. El padding excesivo forzaba el texto a envolver en 2 líneas y `overflow: hidden` lo recortaba, dejándolo invisible.
- GPS: nueva verificación de ventana larga (4s) además de la de tick-a-tick — compara la posición actual contra un ancla de hace 4 segundos para filtrar rachas de ruido GPS que por sí solas ya superan los 5m de `distanceInterval` y detonan una lectura que aparenta movimiento real (caso reportado: velocidad se quedó pegada en 17 km/h en un semáforo pese al fix anterior)
- GPS: confirmado que −5/+5 y "Terminar viaje" responden bien en carretera tras el fix de remount de v1.2.0

## v1.2.1 — Jump fixes 🦘

Versión saltada en su momento al numerar el commit de v1.2.2 — no tuvo build ni cambios propios. Se documenta acá solo para que el historial de versiones no tenga un hueco sin explicación.

## v1.2.0 — GPS + UX

### Bugfixes
- GPS: nueva verificación por posición (lat/lon) — calcula velocidad real a partir del desplazamiento entre lecturas y la usa para descartar el campo `speed` del GPS cuando reporta ruido (6, 7, 13 km/h) estando físicamente detenido en semáforo. El campo `speed` sufre multipath cerca de edificios; la posición no.
- GPS: historial de suavizado cambiado de promedio de 2 lecturas a mediana de 4 — más robusto contra picos aislados de ruido
- GPS: intervalo de bajada de velocidad reducido de 300ms a 200ms en ambos casos (ruido y bajada normal) — baja 5 km/h por segundo en vez de ~3.3
- Fix bug de remount: `BotonesViaje` se invocaba como `<BotonesViaje />` (componente JSX) en vez de como función, lo que causaba que React desmontara y remontara el subárbol varias veces por segundo durante la conducción — esto hacía que "Terminar viaje" necesitara 4-5 taps para registrar, y también afectaba a −5/+5
- Fix origen/destino: ahora prioriza nombre de calle (`r.street`) sobre localidad/distrito

### UI
- Botones "Modo libre" e "Iniciar viaje" ahora visualmente parejos (mismo relleno y sombra — antes Modo libre se veía más liviano por ser solo contorno)
- Ícono de Modo libre cambiado de 🎙 (micrófono) a 🧭 (brújula)
- Botones −5/+5 de ajuste de límite reactivados durante el viaje

---

## v1.1.1 — Bugfixes GPS + UI

### Bugfixes
- GPS: failsafe siempre activo — velocidad siempre tiende a 0
- Fix overflow de estrellas/score en la tarjeta de viaje en "Mis viajes" (fecha + score largo se salían de la pantalla en dispositivos angostos)
- Fix origenBarrio/destinoBarrio/tipoVehiculo no se guardaban en AsyncStorage — guardarViaje() recibía estos campos pero no los asignaba al objeto persistido

---

## v1.1.0 — Bugfixes GPS + UI (pendiente compilar AAB)

### Bugfixes
- GPS: failsafe siempre activo — velocidad siempre tiende a 0 (-1km/h cada 300ms)
- GPS: failsafe con margen +3 para evitar cancelación prematura en trancón
- GPS: historial reducido a 2 lecturas para respuesta más rápida
- GPS: Location.Accuracy.High (Google Fused Location) en vez de BestForNavigation
- UI: timerSubida de 80ms a 150ms — botones más responsivos
- UI: hitSlop en botones críticos (terminar viaje, ajuste límite)
- UI: fix color texto tipo vehículo en onboarding (negro sobre azul)

### Nuevas funciones
- Límites de velocidad ajustados: 48, 58, 68, 78 km/h (margen -2)
- Botones −5/+5 para ajustar límite durante el viaje
- Último viaje visible en modal de inicio
- Tiers de estrellas corregidos:
  - ⭐⭐⭐⭐⭐ 0 segundos en exceso — "Así se hace. Cero infracciones."
  - ⭐⭐⭐⭐ 1-5% del viaje — "Casi perfecto. Pocos momentos fuera del límite."
  - ⭐⭐⭐ 5-15% — "En construcción. Vas por buen camino."
  - ⭐⭐ 15-35% — "Te regalaron el pase."
  - ⭐ +35% — "Deberías ir en bus."

---

## v1.0.0 — Lanzamiento inicial (Jul 24, 2026)

### Funciones
- Velocímetro GPS en tiempo real con gauge SVG
- Modo viaje — registra distancia, velocidad, puntos e infracciones
- Modo libre — alertas de voz sin guardar registros
- Calificación 1-5 estrellas por viaje
- Historial de viajes con estadísticas detalladas
- Mi historial — resumen semanal y todo el tiempo
- Selector de límite: Manual, 48, 58, 68, 78 km/h
- Múltiples vehículos con tipo (Automóvil, SUV, Moto, Van, Camión)
- Alertas de voz cuando excedes el límite
- Soporte landscape y portrait
- Export/import de datos como backup
- Diagnóstico GPS y acelerómetro en Mi perfil
- Sin anuncios · Sin suscripciones · Datos locales
