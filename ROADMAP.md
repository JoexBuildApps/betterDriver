# betterDriver Roadmap

## v1.0 — Lanzamiento ✅
- Velocímetro GPS en tiempo real
- Modo viaje con historial completo
- Modo libre sin registros
- Alertas de voz sarcásticas
- Calificación 1-5 estrellas por viaje
- Soporte landscape y portrait
- Export/import de datos
- Sin anuncios · Sin suscripciones

## v1.1.1 — Bugfixes ✅
- [x] Fix GPS semáforo (primera versión del failsafe)
- [x] Fix overflow de estrellas/score en tarjeta de viaje
- [x] Fix origenBarrio/destinoBarrio/tipoVehiculo no se guardaban en AsyncStorage

## v1.2 — GPS + UX ✅
- [x] GPS semáforo: velocidad derivada de posición (lat/lon) como verificación tick-a-tick
- [x] GPS semáforo: verificación adicional de ventana larga (4s) para rachas de ruido que disparan el distanceInterval
- [x] GPS: mediana de 4 lecturas en vez de promedio de 2
- [x] GPS: intervalos de bajada de velocidad de 300ms a 200ms (baja 5 km/h por segundo)
- [x] Origen/destino usa nombre de calle en vez de localidad/distrito
- [x] Botones Modo Libre / Iniciar viaje visualmente parejos + ícono cambiado de micrófono a brújula
- [x] Fix botón "Iniciar viaje" sin texto visible (padding excesivo + overflow hidden lo recortaba)
- [x] Fix de bug de remount que hacía que "Terminar viaje" necesitara 4-5 taps
- [x] Botones −5/+5 de ajuste de límite reactivados y confirmados en carretera
- [x] Fix zigzag de velocidad en crucero constante (temporizador de bajada sin meta) — nuevo state machine con objetivo dinámico
- [x] Botones −5/+5 en Modo libre + contador de infracciones visible en HeaderStats (portrait y landscape) + fix de reset faltante al iniciar Modo libre
- [x] Detección de trancón: timeout de cierre automático extendido a 15 min si se detectan 3+ ciclos de parar-arrancar en 25 min
- [x] Sesgo de seguridad +2 km/h en velocidad mostrada (GPS suele leer por debajo de la real)
- [x] Contador de infracciones con mismo estilo que puntos + badge de límite con pulso animado + unificado texto "límite de zona" en portrait y landscape
- [x] Eliminada duplicación del número de límite (círculo grande arriba + texto "límite: 53" abajo) — el círculo solo se ve antes de arrancar; con viaje activo o Modo libre, se mueve al centro de los botones −5/+5
- [x] Mensajes de voz contextuales: frases que afirman "sin infracciones" separadas en categoría `aleatorio_limpio`, solo se sortean con 0 infracciones en el viaje
- [ ] Voces de abuela colombiana (ElevenLabs)
- [ ] Companions: abuela, monstruo, tortuga
- [ ] Background mode (GPS con Waze activo)

## v1.3 — Modo Garage ✅
- [x] Sección Garage en Perfil: lista de vehículos con pill de estado (al día / próximo a vencer / vencido)
- [x] Ficha por vehículo: seguro (fecha), cambio de aceite (fecha + intervalo en meses, próxima fecha calculada), km referencial, servicios libres (fecha + descripción)
- [x] Notificaciones locales 7 días antes de vencimiento (seguro y aceite), sin duplicar al editar
- [x] 12 chips de servicios comunes para no escribir a mano cada vez
- [x] Licencia de conducción en Perfil, con el mismo mecanismo de aviso 7 días antes
- [x] Punto rojo de alerta en el ícono de "Mi perfil" cuando algo está por vencer o vencido
- [x] Nueva tabla de estrellas: segundos de exceso por minuto de viaje (en vez de % del viaje total) + ajuste según promedio personal de los últimos 10 viajes
- [x] Ocultado "puntos" del header en pantalla (portrait/landscape, viaje/modo libre) — el cálculo sigue corriendo internamente
- [x] Intersecciones reales en origen/destino (ej. "Cl 53 con Cr 24") aprovechando el grid colombiano (Calle cruza con Carrera, Diagonal con Transversal) — búsqueda en 4 direcciones cardinales, sin depender del heading del GPS
- [x] Abreviaturas de vías: Carrera → Cr, Calle → Cl, Diagonal → Dig, Transversal → Tv
- [x] Mensajes de voz por tier proyectado: 5 pools (1 a 5 estrellas, 8 frases c/u) según tramos típicos de Bogotá (20/40/60/70 min) + promedio de los últimos 10 viajes, reemplazando aleatorio/aleatorio_limpio

## v2.0 — Portugués + Social familiar (Brasil)
- [ ] Portugués como segundo idioma (UI, voces, mensajes aleatorios)
- [ ] Grupo cerrado por invitación (ej. padre + hijos comparten un carro) — comparte score/infracciones/segundos en exceso agregados, nunca GPS ni ruta — requiere Supabase
- [ ] Voces de abuela colombiana vía ElevenLabs (movida de v1.2, aún por evaluar)

## v3.0 — Mundial
- [ ] Inglés, francés y otros idiomas
- [ ] Europa y Asia
- [ ] CarPlay / Android Auto
- [ ] Mascota animada sobre velocímetro

## Notas técnicas
- Stack: React Native + Expo SDK 56
- GPS: expo-location (Fused Location)
- Acelerómetro: expo-sensors (descartado como failsafe de velocidad — ruido de 0.90 a 1.1g en reposo en el dispositivo de prueba)
- Storage: AsyncStorage (local, sin servidor) — cambia con v2.0 (Supabase para el grupo social)
- Build: EAS local
- Play Store: com.joebuildapps.betterDriver
- Versionado: x.x = mismo modelo de datos/arquitectura (todo local, sin backend); x.0 = salto arquitectónico (introduce backend, nuevo mercado, etc.)
