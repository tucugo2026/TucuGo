export async function getRainStatusByCoords(lat, lng) {
  if (lat == null || lng == null) {
    return {
      isRaining: false,
      rainMm: 0,
      precipitationMm: 0,
      precipitationProbability: 0,
      weatherCode: 0,
      source: 'open-meteo',
      message: 'Sin coordenadas'
    };
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&current=rain,precipitation,weather_code` +
    `&hourly=precipitation_probability` +
    `&forecast_days=1&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('No se pudo consultar el clima');
  }

  const data = await response.json();

  const currentRain = Number(data?.current?.rain ?? 0);
  const currentPrecipitation = Number(data?.current?.precipitation ?? 0);
  const currentTime = data?.current?.time ?? null;

  let precipitationProbability = 0;

  if (
    currentTime &&
    Array.isArray(data?.hourly?.time) &&
    Array.isArray(data?.hourly?.precipitation_probability)
  ) {
    const idx = data.hourly.time.indexOf(currentTime);
    if (idx >= 0) {
      precipitationProbability = Number(
        data.hourly.precipitation_probability[idx] ?? 0
      );
    }
  }

  const isRaining = currentRain > 0 || currentPrecipitation > 0;

  return {
    isRaining,
    rainMm: currentRain,
    precipitationMm: currentPrecipitation,
    precipitationProbability,
    weatherCode: Number(data?.current?.weather_code ?? 0),
    source: 'open-meteo',
    message: isRaining
      ? 'Lluvia detectada automáticamente'
      : 'Sin lluvia en este momento'
  };
}