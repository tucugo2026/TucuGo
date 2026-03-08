# TucuGo Definitivo Uber

Proyecto fuente listo para seguir construyendo una app estilo Uber con:

- React + Vite
- Firebase real conectado a tu proyecto `tucugo-37d6c`
- Firestore para países, ciudades, conductores y viajes
- OpenStreetMap + Leaflet sin necesidad de clave paga para el mapa base
- geolocalización del navegador
- panel Admin
- panel Pasajero
- panel Conductor
- pagos tradicionales y cripto: Efectivo, Transferencia, Tarjeta, USDC, USDT y BTC

## Qué hace esta versión

### Admin
- siembra países, ciudades, conductores y un viaje demo
- ve viajes en tiempo real
- asigna el conductor más cercano
- cambia estados del viaje
- elimina viajes

### Pasajero
- toma ubicación actual del navegador
- estima distancia, tiempo y precio
- crea viajes reales en Firestore
- muestra mapa con origen, destino y conductores

### Conductor
- cambia su estado
- simula movimiento
- acepta viajes
- pone viaje en camino, en viaje y finalizado

## Importante

Esta es una **base sólida**, pero todavía no es una app de producción cerrada.  
Para dejarla lista comercialmente, después conviene sumar:

- Firebase Auth por roles
- reglas seguras de Firestore
- historial por usuario
- notificaciones
- integración real de pagos
- wallet / checkout cripto
- validación KYC para conductores
- mapa con rutas reales paso a paso

## Instalar

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

La carpeta lista para publicar será `dist/`.

## Reglas temporales Firestore para probar

Usa esto solo mientras pruebas:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Colecciones esperadas

- `paises`
- `ciudades`
- `conductores`
- `viajes`

## Observación sobre cripto

Como estrategia, conviene arrancar con **USDC o USDT** como prioridad y dejar **BTC** como opción secundaria.  
La estructura del proyecto ya acepta los tres.

## Siguiente paso recomendado

El siguiente salto fuerte sería:
1. login por rol
2. conductor con cuenta propia
3. pasajero con historial
4. cobro cripto real
5. comisión de la plataforma
6. deploy en GitHub Pages o Vercel


## Ahora también es PWA instalable

Esta versión agrega:

- manifest web app
- service worker automático
- caché para assets y mosaicos de OpenStreetMap
- botón para instalar la app
- iconos para Android, iPhone y escritorio
- modo standalone para que se abra como app real

### Cómo instalarla

#### En Android
1. abre la web en Chrome
2. toca el botón **Instalar app** o el menú del navegador
3. elige **Instalar**

#### En iPhone
1. abre la web en Safari
2. toca **Compartir**
3. elige **Agregar a pantalla de inicio**

#### En PC
1. abre la web en Chrome o Edge
2. toca el icono de instalar en la barra
3. confirma la instalación

### Para publicar

```bash
npm install
npm run build
```

Luego publica la carpeta `dist`.

### Recomendación
Para que la instalación se vea bien, copia tu logo en `public/logo-tucugo.png`.
Si quieres, puedes reemplazar también:
- `public/pwa-192.png`
- `public/pwa-512.png`
- `public/pwa-512-maskable.png`
- `public/apple-touch-icon.png`


## Corrección para pantalla en blanco

Esta versión deja `USE_FIRESTORE = false` por defecto para arrancar en modo demo local.
Así puedes ver la app aunque haya algún problema con:
- reglas de Firestore
- service worker viejo en caché
- datos todavía no sembrados
- errores de red en el celular

Cuando confirmes que se ve bien, si quieres usar Firebase real cambia en:

`src/config/appConfig.js`

```js
export const USE_FIRESTORE = true;
```

Y vuelve a compilar.


## Splash screen

Esta versión agrega una pantalla de bienvenida de TucuGo al abrir la app.


## Mejora visual splash

Se agrandó el logo y se agregó animación de entrada, flotado suave y fondo más vivo.


## Branding TucuGo

Esta versión usa el logo institucional dentro de la app, splash con más presencia de marca y colores azul/naranja aplicados a la interfaz.


## Login real con roles

Esta versión integra:
- Firebase Authentication con Email/Password
- registro de usuario
- inicio/cierre de sesión
- perfiles guardados en la colección `usuarios`
- roles: `admin`, `conductor`, `pasajero`
- redirección automática según el rol
- logos integrados dentro de la app

### Activa en Firebase
1. Authentication → Sign-in method → Email/Password
2. Firestore Database
3. Reglas temporales para probar

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read, write: if true;
    }
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```


## Aprobación manual y recuperación de contraseña

Se agregó:
- recuperación de contraseña por email
- aprobación manual de conductores
- panel admin para cambiar roles
- conductores pendientes quedan bloqueados hasta ser aprobados

### Recomendación de primer uso
1. Crear primero una cuenta admin
2. Ingresar con esa cuenta
3. Crear o aprobar conductores desde la pestaña `Usuarios`
