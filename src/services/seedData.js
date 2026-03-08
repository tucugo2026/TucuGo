export const seedCountries = [
  {
    id: 'AR',
    nombre: 'Argentina',
    moneda: 'ARS',
    idioma: 'es',
    codigoTelefono: '+54',
    activo: true
  },
  {
    id: 'UY',
    nombre: 'Uruguay',
    moneda: 'UYU',
    idioma: 'es',
    codigoTelefono: '+598',
    activo: true
  },
  {
    id: 'ES',
    nombre: 'España',
    moneda: 'EUR',
    idioma: 'es',
    codigoTelefono: '+34',
    activo: true
  },
  {
    id: 'US',
    nombre: 'Estados Unidos',
    moneda: 'USD',
    idioma: 'en',
    codigoTelefono: '+1',
    activo: true
  }
];

export const seedCities = [
  {
    id: 'tucuman',
    pais: 'AR',
    nombre: 'San Miguel de Tucumán',
    zonaHoraria: 'America/Argentina/Tucuman',
    tarifaBase: 1500,
    precioKm: 220,
    precioMinuto: 80,
    activa: true,
    centro: { lat: -26.8241, lng: -65.2226 }
  },
  {
    id: 'buenos_aires',
    pais: 'AR',
    nombre: 'Buenos Aires',
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    tarifaBase: 2200,
    precioKm: 340,
    precioMinuto: 120,
    activa: true,
    centro: { lat: -34.6037, lng: -58.3816 }
  },
  {
    id: 'madrid',
    pais: 'ES',
    nombre: 'Madrid',
    zonaHoraria: 'Europe/Madrid',
    tarifaBase: 3.6,
    precioKm: 1.45,
    precioMinuto: 0.42,
    activa: true,
    centro: { lat: 40.4168, lng: -3.7038 }
  },
  {
    id: 'miami',
    pais: 'US',
    nombre: 'Miami',
    zonaHoraria: 'America/New_York',
    tarifaBase: 4.5,
    precioKm: 1.9,
    precioMinuto: 0.55,
    activa: true,
    centro: { lat: 25.7617, lng: -80.1918 }
  }
];

export const seedVehicleTypes = [
  { id: 'auto', nombre: 'Auto', icono: '🚗' },
  { id: 'moto', nombre: 'Moto', icono: '🏍️' },
  { id: 'van', nombre: 'Van', icono: '🚐' }
];

export const seedDrivers = [
  {
    id: 'drv_tucu_01',
    nombre: 'Conductor prueba',
    telefono: '+54381000000',
    pais: 'AR',
    ciudad: 'tucuman',
    estado: 'disponible',
    activo: true,
    ganancias: 0,
    vehiculo: { tipo: 'auto', marca: 'Toyota', modelo: 'Etios', patente: 'AAA000' },
    ubicacion: { lat: -26.8305, lng: -65.2148 }
  },
  {
    id: 'drv_tucu_02',
    nombre: 'Juan Rojas',
    telefono: '+543814445555',
    pais: 'AR',
    ciudad: 'tucuman',
    estado: 'disponible',
    activo: true,
    ganancias: 0,
    vehiculo: { tipo: 'auto', marca: 'Chevrolet', modelo: 'Onix', patente: 'AB123CD' },
    ubicacion: { lat: -26.8174, lng: -65.2102 }
  },
  {
    id: 'drv_mad_01',
    nombre: 'Lucía Gómez',
    telefono: '+34600111222',
    pais: 'ES',
    ciudad: 'madrid',
    estado: 'disponible',
    activo: true,
    ganancias: 0,
    vehiculo: { tipo: 'auto', marca: 'Seat', modelo: 'Ibiza', patente: '4321LKH' },
    ubicacion: { lat: 40.4214, lng: -3.6991 }
  }
];

export const seedPassengers = [
  {
    id: 'usr_admin_01',
    nombre: 'Marcelo',
    email: 'tucugo2026@gmail.com',
    rol: 'admin',
    pais: 'AR',
    ciudad: 'tucuman',
    activo: true
  },
  {
    id: 'usr_pas_01',
    nombre: 'Yesica',
    email: 'yesica@example.com',
    rol: 'pasajero',
    pais: 'AR',
    ciudad: 'tucuman',
    activo: true
  }
];

export const seedTrips = [
  {
    id: 'trip_demo_01',
    pasajeroId: 'usr_pas_01',
    pasajeroNombre: 'Yesica',
    conductorId: '',
    conductorNombre: '',
    pais: 'AR',
    ciudad: 'tucuman',
    servicio: 'auto',
    moneda: 'ARS',
    estado: 'solicitado',
    pagoMetodo: 'transferencia',
    pagoEstado: 'pendiente',
    precio: 1500,
    distanciaKm: 3.6,
    duracionMin: 12,
    origen: { texto: 'Santa Rosa', lat: -26.8204, lng: -65.1996 },
    destino: { texto: 'Ingenio Leales', lat: -27.121, lng: -65.141 },
    creadoEn: new Date().toISOString()
  }
];
