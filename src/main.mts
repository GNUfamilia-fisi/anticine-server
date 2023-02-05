import fetch from 'node-fetch';
import express from 'express';
import geoip from 'geoip-lite';
import { CinemaConfiteriaRouteResponse, CinemaInformationWithCoords, CinemasRouteResponse, FetchedConsessionItemsResponse, FetchedTheatresResponse } from './types';

const app = express();
app.set('trust proxy', true);
const cinemas_data: CinemaInformationWithCoords[] = [];
const PORT = 3000;

(async function load() {
  const response = await fetch('https://api.cinemark-peru.com/api/vista/data/theatres');
  const data_theatres = (await response.json()) as FetchedTheatresResponse;
  const cinemas = data_theatres.map(c => c.cinemas).flat().map((theatre) => ({
    cinema_id: theatre.ID,
    name: theatre.Name.replace(/cinemark/i, 'Cinemark'),
    city: theatre.City,
    coords: { lat: theatre.Latitude, lon: theatre.Longitude }
  }));
  cinemas_data.push(...cinemas);
})();

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.get('/cines', (req, res) => {
  const to_return: CinemasRouteResponse = {
    cines_en_tu_ciudad: [],
    cine_mas_cercano: null,
    code: 200,
    error: null
  };
  
  if (cinemas_data.length === 0) {
    to_return.error = 'No existen cines para mostrar';
    to_return.code = 500;
    res.send(to_return);
    return;
  }

  let ubicacion_encontrada = false;
  let available_cinemas: CinemaInformationWithCoords[] = [];

  const location = geoip.lookup(req.ip);
  if (location) {
    const { ll, city } = location;
    ubicacion_encontrada = true;

    // Only the cinemas of your city
    available_cinemas = cinemas_data.filter(cinema => cinema.city === city);

    const getDistance = (cinema) => {
      let { lat, lon } = cinema.coords;
      return Math.sqrt((lat - ll[0]) ** 2 + (lon - ll[1]) ** 2);
    }
    available_cinemas = available_cinemas.sort((cinemaA, cinemaB) => {
      return getDistance(cinemaA) - getDistance(cinemaB)
    });
  }

  to_return.cines_en_tu_ciudad = available_cinemas.map(cinema => {
    const { coords, ...rest } = cinema;
    return rest;
  })
  if (ubicacion_encontrada) {
    to_return.cine_mas_cercano = to_return.cines_en_tu_ciudad[0];
  }
  
  res.send(to_return);

  console.log(`hola ${req.ip}`);
});

app.get('/cines/confiteria', async (req, res) => {
  const to_return: CinemaConfiteriaRouteResponse = {
    confiteria: [],
    code: 200,
    error: null
  };

  const { cinema_id } = req.query as { cinema_id: string };

  // Check if the cinema exists
  const existCinema = cinemas_data.some(cinema => cinema.cinema_id === cinema_id);
  if (!existCinema || !cinema_id) {
    to_return.code = 404;
    to_return.error = 'Cine no encontrado';
    res.status(404).send(to_return);
    return;
  }

  // Fetch the data
  const endpoint = `https://api.cinemark-peru.com/api/vista/ticketing/concession/items?cinema_id=${cinema_id}`;
  const response = await fetch(endpoint);
  const data = (await response.json()) as FetchedConsessionItemsResponse;
  if (data.ErrorDescription || data.ResponseCode === 4) {
    to_return.code = 404;
    to_return.error = 'Cine no encontrado';
    res.status(404).send(to_return);
    return;
  }

  to_return.confiteria = data.ConcessionItems.map(item => ({
    item_id: item.Id,
    name: item.Description,
    description: item.ExtendedDescription,
    priceInCents: item.PriceInCents
  }));

  res.send(to_return);
});
