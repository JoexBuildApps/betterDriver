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
- [ ] Voces de abuela colombiana (ElevenLabs)
- [ ] Companions: abuela, monstruo, tortuga
- [ ] Background mode (GPS con Waze activo)

## v2.0 — Portugués + Social familiar (Brasil)
- [ ] Portugués como segundo idioma (UI, voces, mensajes aleatorios)
- [ ] Grupo cerrado por invitación (ej. padre + hijos comparten un carro) — comparte score/infracciones/segundos en exceso agregados, nunca GPS ni ruta — requiere Supabase

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
