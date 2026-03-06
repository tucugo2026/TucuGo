# TucuGo

Proyecto base de una app tipo Uber enfocada en Tucumán.

## Estructura

- `apps/pasajero_flutter`: app móvil para pasajeros
- `apps/conductor_flutter`: app móvil para conductores
- `apps/admin_web`: panel administrador web
- `backend/functions`: lógica backend con Firebase Functions
- `firebase`: reglas de seguridad y configuración base
- `docs`: documentación técnica

## Estado

Este ZIP contiene una **base inicial funcional de arranque**. No es el producto final completo, pero sí un punto sólido para empezar a desarrollar:

- autenticación preparada a nivel estructura
- modelos iniciales
- panel admin base
- formularios y pantallas iniciales
- reglas Firebase iniciales

## Tecnologías elegidas

- Flutter
- React + Vite
- Firebase Auth
- Firestore
- Firebase Storage
- Firebase Functions

## Próximos pasos

1. Crear proyecto Firebase real
2. Completar credenciales Firebase en cada app
3. Crear colecciones de Firestore
4. Levantar admin web
5. Probar alta de conductores
6. Integrar aprobación de choferes
7. Luego integrar viajes, mapas, chat y pagos

## Requisitos

### Admin web
- Node.js 20+

### Apps Flutter
- Flutter 3.24+

## Arranque rápido

### Admin web
```bash
cd apps/admin_web
npm install
npm run dev
```

### Functions
```bash
cd backend/functions
npm install
npm run build
```

### Flutter pasajero
```bash
cd apps/pasajero_flutter
flutter pub get
flutter run
```

### Flutter conductor
```bash
cd apps/conductor_flutter
flutter pub get
flutter run
```

## Importante

Todavía faltan:
- mapa en vivo
- chat del viaje
- pagos con Mercado Pago
- asignación automática de conductor
- notificaciones push reales

Pero ya queda montada una base ordenada para avanzar.
