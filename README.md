# TucuGo Global Definitivo

Base inicial de TucuGo pensada para crecer desde Tucumán a cualquier ciudad del mundo.

## Qué trae

- Panel **Admin**
- Panel **Pasajero**
- Panel **Conductor**
- Modelo global para **Firestore**
- Modo **demo local** con `localStorage`
- Soporte inicial para pagos: efectivo, transferencia, tarjeta y cripto
- Estructura lista para **Firebase + GitHub Pages**

## Estructura de Firestore sugerida

- `countries`
- `cities`
- `vehicleTypes`
- `drivers`
- `users`
- `trips`

## Cómo usarlo en modo demo

```bash
npm install
npm run dev
```

Si no completas Firebase, la app funciona igual con datos demo locales.

## Cómo conectarlo a Firebase

Editar:

`src/config/appConfig.js`

Completa:

```js
export const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_AUTH_DOMAIN',
  projectId: 'TU_PROJECT_ID',
  storageBucket: 'TU_STORAGE_BUCKET',
  messagingSenderId: 'TU_MESSAGING_SENDER_ID',
  appId: 'TU_APP_ID'
};
```

Luego, desde el panel Admin, pulsa **Sembrar base** para crear colecciones iniciales.

## Despliegue en GitHub Pages

```bash
npm install
npm run build
```

Sube el contenido de `dist/` a tu repositorio o usa GitHub Actions / Pages.

## Flujo actual

1. El pasajero crea un viaje.
2. El admin puede asignar el conductor más cercano.
3. El conductor acepta, inicia y finaliza.
4. El viaje vuelve a liberar al conductor.

## Recomendación sobre cripto

Para arrancar, conviene usar **USDC o USDT** como opción principal y dejar **BTC** como complemento.

## Qué te conviene hacer después

- Autenticación real con Firebase Auth
- Mapas con Mapbox o Google Maps
- Ubicación en tiempo real
- Pasarela de cobro cripto y pagos tradicionales
- Reglas de seguridad de Firestore
