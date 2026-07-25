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

## v1.1 — Bugfixes + Companions
- [ ] Fix GPS semáforo (failsafe siempre activo)
- [ ] Voces de abuela colombiana (ElevenLabs)
- [ ] Companions: abuela, monstruo, tortuga
- [ ] Background mode (GPS con Waze activo)
- [ ] Botones más responsivos

## v2 — Multi-idioma Américas
- [ ] Español neutro, inglés, portugués, francés
- [ ] Mensajes regionalizados por país
- [ ] Versión Brasil

## v3 — Mundial
- [ ] Europa y Asia
- [ ] CarPlay / Android Auto
- [ ] Ranking social con Supabase
- [ ] Mascota animada sobre velocímetro

## Notas técnicas
- Stack: React Native + Expo SDK 56
- GPS: expo-location (Fused Location)
- Acelerómetro: expo-sensors
- Storage: AsyncStorage (local, sin servidor)
- Build: EAS local
- Play Store: com.joebuildapps.betterDriver
