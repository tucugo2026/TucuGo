export const countries = [
  { code: 'AR', name: 'Argentina', currency: 'ARS', language: 'es', phoneCode: '+54', active: true },
  { code: 'ES', name: 'España', currency: 'EUR', language: 'es', phoneCode: '+34', active: true },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', language: 'en', phoneCode: '+1', active: true }
];

export const cities = [
  {
    id: 'tucuman',
    country: 'AR',
    name: 'San Miguel de Tucumán',
    timezone: 'America/Argentina/Tucuman',
    currency: 'ARS',
    center: { lat: -26.8241, lng: -65.2226 },
    baseFare: 1500,
    priceKm: 220,
    priceMinute: 80
  },
  {
    id: 'buenos-aires',
    country: 'AR',
    name: 'Buenos Aires',
    timezone: 'America/Argentina/Buenos_Aires',
    currency: 'ARS',
    center: { lat: -34.6037, lng: -58.3816 },
    baseFare: 2200,
    priceKm: 300,
    priceMinute: 120
  },
  {
    id: 'madrid',
    country: 'ES',
    name: 'Madrid',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    center: { lat: 40.4168, lng: -3.7038 },
    baseFare: 3.4,
    priceKm: 1.25,
    priceMinute: 0.45
  },
  {
    id: 'miami',
    country: 'US',
    name: 'Miami',
    timezone: 'America/New_York',
    currency: 'USD',
    center: { lat: 25.7617, lng: -80.1918 },
    baseFare: 4.2,
    priceKm: 1.8,
    priceMinute: 0.6
  }
];

export const drivers = [
  {
    id: 'drv-001',
    name: 'Conductor prueba',
    phone: '+54381000000',
    city: 'tucuman',
    country: 'AR',
    status: 'disponible',
    vehicleType: 'Auto',
    vehicle: 'Toyota Etios',
    plate: 'ABC123',
    lat: -26.8205,
    lng: -65.2210,
    acceptsCrypto: true,
    activeTripId: ''
  },
  {
    id: 'drv-002',
    name: 'Andrea Gómez',
    phone: '+54381000001',
    city: 'tucuman',
    country: 'AR',
    status: 'disponible',
    vehicleType: 'Moto',
    vehicle: 'Honda Wave',
    plate: 'A012BCD',
    lat: -26.8302,
    lng: -65.2292,
    acceptsCrypto: false,
    activeTripId: ''
  },
  {
    id: 'drv-003',
    name: 'Luis Pérez',
    phone: '+34910000000',
    city: 'madrid',
    country: 'ES',
    status: 'disponible',
    vehicleType: 'Auto',
    vehicle: 'Seat Ibiza',
    plate: '1234MDR',
    lat: 40.4176,
    lng: -3.7018,
    acceptsCrypto: true,
    activeTripId: ''
  },
  {
    id: 'drv-004',
    name: 'Camila Torres',
    phone: '+13050000000',
    city: 'miami',
    country: 'US',
    status: 'offline',
    vehicleType: 'SUV',
    vehicle: 'Hyundai Tucson',
    plate: 'FLA-990',
    lat: 25.7652,
    lng: -80.1932,
    acceptsCrypto: true,
    activeTripId: ''
  }
];

export const seedTrips = [
  {
    id: 'trip-seed-001',
    passengerName: 'Yesica',
    passengerPhone: '+543814444444',
    country: 'AR',
    city: 'tucuman',
    currency: 'ARS',
    originText: 'Santa Rosa',
    originLat: -26.811,
    originLng: -65.225,
    destinationText: 'Ingenio Leales',
    destinationLat: -27.091,
    destinationLng: -65.176,
    estimatedDistanceKm: 18.4,
    estimatedDurationMin: 27,
    price: 1500,
    paymentMethod: 'Transferencia',
    status: 'solicitado',
    driverId: '',
    driverName: '',
    createdAtIso: '2026-03-07T12:00:00.000Z',
    cryptoWallet: '',
    cryptoTxId: ''
  }
];
