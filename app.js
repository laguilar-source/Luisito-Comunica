const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusMessage = document.getElementById('status-message');
const weatherCard = document.getElementById('weather-card');
const quickChips = document.querySelectorAll('.chip');

// Mapeo de códigos WMO de Open-Meteo a descripciones, emojis y frases estilo Luisito Comunica
function getWeatherInfo(code, temp) {
  let desc = 'Clima agradable';
  let emoji = '🌤️';
  let quote = '¡Ahora sí viene lo chido! Clima perfecto para salir a grabar.';

  if (code === 0) {
    desc = 'Cielo despejado';
    emoji = '☀️';
    quote = temp >= 30
      ? '¡Qué calorón, amigos! Está como para derretirse, hidrátense bien.'
      : '¡Ahora sí viene lo chido! Solazo increíble para salir a explorar.';
  } else if ([1, 2, 3].includes(code)) {
    desc = code === 1 ? 'Mayormente despejado' : code === 2 ? 'Parcialmente nublado' : 'Nublado';
    emoji = code === 3 ? '☁️' : '⛅';
    quote = 'Ni mucho sol ni mucha lluvia... ¡un clima bastante sabroso para caminar!';
  } else if ([45, 48].includes(code)) {
    desc = 'Niebla / Neblina';
    emoji = '🌫️';
    quote = '¡Vaya dato perturbador! No se ve absolutamente nada con esta neblina.';
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    desc = 'Llovizna ligera';
    emoji = '🌦️';
    quote = 'Está cayendo chipi-chipi... nada que detenga la aventura del Rey Palomo.';
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    desc = 'Lluvia';
    emoji = '🌧️';
    quote = '¡Saca el paraguas, crack! Hoy toca buscar un buen lugar para comer bajo techo.';
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    desc = 'Nieve';
    emoji = '❄️';
    quote = '¡Qué locura, está nevando! Abríguense bien porque el frío está potente.';
  } else if ([95, 96, 99].includes(code)) {
    desc = 'Tormenta eléctrica';
    emoji = '⛈️';
    quote = '¡Cuidado con los rayos! Hoy mejor nos quedamos editando videos en casa.';
  }

  if (temp <= 8 && ![71, 73, 75, 77, 85, 86].includes(code)) {
    quote = '¡Qué frío tan brutal! Hoy sí amerita ponerse tres chamarras encima.';
  }

  return { desc, emoji, quote };
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.remove('hidden', 'error');
  if (isError) statusMessage.classList.add('error');
}

function hideStatus() {
  statusMessage.classList.add('hidden');
}

async function fetchWeatherByCity(cityName) {
  const trimmed = cityName.trim();
  if (!trimmed) return;

  showStatus(`Buscando coordenadas de "${trimmed}"...`);
  weatherCard.classList.add('hidden');

  try {
    // 1. Geocodificación gratuita con Open-Meteo (HTTPS, sin API key, compatible con GitHub Pages)
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=es&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Error al conectar con el servicio de ubicación.');
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showStatus(`¡Vaya dato perturbador! No encontramos "${trimmed}". Intenta con otra ciudad.`, true);
      return;
    }

    const place = geoData.results[0];
    const { latitude, longitude, name, country, admin1 } = place;

    showStatus(`Consultando el pronóstico en ${name}...`);

    // 2. Pronóstico actual y diario (5 días) con Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error('Error al obtener el clima.');
    const weatherData = await weatherRes.json();

    renderWeather(place, weatherData);
    hideStatus();
  } catch (err) {
    console.error(err);
    showStatus('Ocurrió un error al consultar el clima. Revisa tu conexión e intenta de nuevo.', true);
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;
  const temp = Math.round(current.temperature_2m);
  const info = getWeatherInfo(current.weather_code, temp);

  const locationLabel = [place.name, place.admin1, place.country]
    .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
    .slice(0, 2)
    .join(', ');

  document.getElementById('location-name').textContent = locationLabel;

  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  document.getElementById('weather-emoji').textContent = info.emoji;
  document.getElementById('temperature').textContent = `${temp}°C`;
  document.getElementById('weather-desc').textContent = info.desc;
  document.getElementById('feels-like').textContent = `Sensación térmica: ${Math.round(current.apparent_temperature)}°C`;
  document.getElementById('luisito-quote').textContent = `"${info.quote}"`;

  document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById('min-max').textContent = `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°`;

  // Renderizar pronóstico de 5 días
  const forecastList = document.getElementById('forecast-list');
  forecastList.innerHTML = '';

  daily.time.forEach((dateStr, index) => {
    const dayDate = new Date(`${dateStr}T12:00:00`);
    const dayName = index === 0
      ? 'Hoy'
      : dayDate.toLocaleDateString('es-ES', { weekday: 'short' });

    const maxT = Math.round(daily.temperature_2m_max[index]);
    const minT = Math.round(daily.temperature_2m_min[index]);
    const dayInfo = getWeatherInfo(daily.weather_code[index], maxT);

    const card = document.createElement('div');
    card.className = 'forecast-day';
    card.innerHTML = `
      <span class="forecast-day-name">${dayName}</span>
      <span class="forecast-icon">${dayInfo.emoji}</span>
      <span class="forecast-temps">${maxT}° <span>/ ${minT}°</span></span>
    `;
    forecastList.appendChild(card);
  });

  weatherCard.classList.remove('hidden');
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  fetchWeatherByCity(cityInput.value);
});

quickChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const city = chip.getAttribute('data-city');
    cityInput.value = city;
    fetchWeatherByCity(city);
  });
});

// Cargar ciudad por defecto al abrir la página
window.addEventListener('DOMContentLoaded', () => {
  fetchWeatherByCity('Ciudad de México');
});
