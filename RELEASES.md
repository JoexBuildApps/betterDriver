# betterDriver — Release Notes

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
