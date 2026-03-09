export function formatMoney(value, currency = "ARS") {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  } catch {
    return `$${Number(value || 0).toFixed(2)}`;
  }
}

export function calculateBaseTripPrice({
  baseFare = 0,
  priceKm = 0,
  priceMinute = 0,
  distanceKm = 0,
  durationMin = 0,
  minimumFare = 0
}) {
  const raw =
    Number(baseFare || 0) +
    Number(priceKm || 0) * Number(distanceKm || 0) +
    Number(priceMinute || 0) * Number(durationMin || 0);

  return Math.max(raw, Number(minimumFare || 0));
}

export function getServiceMultiplier(serviceType = "auto") {
  const normalized = String(serviceType || "auto").toLowerCase();

  if (normalized === "moto") return 0.85;
  if (normalized === "confort") return 1.25;
  if (normalized === "flete") return 1.6;

  return 1;
}

export function getSundaySurchargeRate(date = new Date()) {
  const d = new Date(date);
  return d.getDay() === 0 ? 0.1 : 0;
}

export function getRainSurchargeRate(isRaining = false) {
  return isRaining ? 0.15 : 0;
}

export function getDemandSurchargeRate(activeTripsCount = 0, availableDriversCount = 0) {
  const trips = Number(activeTripsCount || 0);
  const drivers = Number(availableDriversCount || 0);

  if (drivers <= 0 && trips > 0) return 0.3;
  if (drivers <= 0) return 0;

  const ratio = trips / drivers;

  if (ratio >= 2) return 0.25;
  if (ratio >= 1.2) return 0.15;
  if (ratio >= 0.8) return 0.08;

  return 0;
}

export function calculateCommission(price) {
  const finalPrice = Number(price || 0);
  const commissionRate = 0.1;

  const comisionApp = Number((finalPrice * commissionRate).toFixed(2));
  const gananciaConductor = Number((finalPrice - comisionApp).toFixed(2));

  return {
    comisionApp,
    gananciaConductor
  };
}

export function calculateDynamicPrice({
  baseFare = 0,
  priceKm = 0,
  priceMinute = 0,
  distanceKm = 0,
  durationMin = 0,
  minimumFare = 0,
  serviceType = "auto",
  isRaining = false,
  tripDate = new Date(),
  activeTripsCount = 0,
  availableDriversCount = 0
}) {
  const precioBase = calculateBaseTripPrice({
    baseFare,
    priceKm,
    priceMinute,
    distanceKm,
    durationMin,
    minimumFare
  });

  const multiplicadorServicio = getServiceMultiplier(serviceType);
  const precioServicio = Number((precioBase * multiplicadorServicio).toFixed(2));

  const tasaDomingo = getSundaySurchargeRate(tripDate);
  const tasaLluvia = getRainSurchargeRate(isRaining);
  const tasaDemanda = getDemandSurchargeRate(activeTripsCount, availableDriversCount);

  const recargoDomingo = Number((precioServicio * tasaDomingo).toFixed(2));
  const recargoLluvia = Number((precioServicio * tasaLluvia).toFixed(2));
  const recargoDemanda = Number((precioServicio * tasaDemanda).toFixed(2));

  const price = Number(
    (precioServicio + recargoDomingo + recargoLluvia + recargoDemanda).toFixed(2)
  );

  const { comisionApp, gananciaConductor } = calculateCommission(price);

  return {
    precioBase: Number(precioBase.toFixed(2)),
    multiplicadorServicio,
    precioServicio,
    recargoDomingo,
    recargoLluvia,
    recargoDemanda,
    tasaDomingo,
    tasaLluvia,
    tasaDemanda,
    price,
    comisionApp,
    gananciaConductor
  };
}