import fetch from 'node-fetch';
import express from 'express';
import geoip from 'geoip-lite';
import { blazinglyFastAPICache } from './cache.mjs';
import { AllCinemasRouteResponse, CinemaConfiteriaRouteResponse, CinemaInformation, CinemaInformationWithCoords, NearCinemasRouteResponse, FetchedConsessionItemsResponse, CinemaBillboardRouteResponse } from './types';

const app = express();
app.set('trust proxy', true);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.get('/cines/cercanos', async (req, res) => {
  const to_return: NearCinemasRouteResponse = {
    city: null,
    cinemas: [],
    nearest_id: null,
    code: 200,
    error: null
  };

  // if (APIcache.all_cinemas.length === 0) {
  //   to_return.error = 'Error al cargar los cines';
  //   to_return.code = 503;
  //   res.status(503).send(to_return);
  //   return;
  // }
  const all_cinemas = await blazinglyFastAPICache.getAllCinemas();
  let available_cinemas: CinemaInformationWithCoords[] = [];

  const location = geoip.lookup(req.ip);
  if (!location) {
    to_return.error = 'No se pudo determinar la ubicación';
    to_return.code = 500;
    res.status(500).send(to_return);
    return;
  }

  const { ll, city } = location;
  to_return.city = city;

  // Only the cinemas of your city
  available_cinemas = all_cinemas.filter(cinema => cinema.city === to_return.city);

  if (available_cinemas.length === 0) {
    to_return.error = 'No hay cines disponibles en tu ciudad';
    to_return.code = 404;
    res.status(404).send(to_return);
    return;
  }

  const getDistance = (cinema: CinemaInformationWithCoords) => {
    let { lat, lon } = cinema.coords;
    return Math.sqrt((lat - ll[0]) ** 2 + (lon - ll[1]) ** 2);
  }
  available_cinemas = available_cinemas.sort((cinemaA, cinemaB) => {
    return getDistance(cinemaA) - getDistance(cinemaB)
  });

  to_return.cinemas = available_cinemas.map(cinema => {
    const { coords, ...rest } = cinema;
    return rest;
  });
  to_return.nearest_id = available_cinemas[0].cinema_id;

  res.send(to_return);
  console.log(`hola ${req.ip}`, { location });
});

app.get('/cines/all', async (req, res) => {
  const to_return: AllCinemasRouteResponse = {
    cinemas: [],
    code: 200,
    error: null
  };

  // if (APIcache.all_cinemas.length === 0) {
  //   to_return.error = 'Error al cargar los cines';
  //   to_return.code = 503;
  //   res.status(503).send(to_return);
  //   return;
  // }

  const all_cinemas = await blazinglyFastAPICache.getAllCinemas();
  to_return.cinemas = all_cinemas.map((cinema): CinemaInformation => {
    const { coords, ...rest } = cinema;
    return rest;
  });
  res.send(to_return);
});
  
app.get('/cines/:cinema_id/cartelera', async (req, res) => {
  const to_return: CinemaBillboardRouteResponse = {
    days: [],
    code: 200,
    error: null
  }
  const { cinema_id } = req.params;

  // const billboard = APIcache.billboards[cinema_id];
  const billboard = await blazinglyFastAPICache.getBillboard(cinema_id);

  if (!billboard) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la cartelera';
    res.send(to_return);
    return;
  }
  to_return.days = billboard;

  res.send(to_return);
});

app.get('/cines/:cinema_id/confiteria', async (req, res) => {
  const to_return: CinemaConfiteriaRouteResponse = {
    confiteria: [],
    code: 200,
    error: null
  };
  const { cinema_id } = req.params;

  // Check if the cinema exists
  // const cinema = APIcache.all_cinemas.find(cinema => cinema.cinema_id === cinema_id);
  const exists_cinema = blazinglyFastAPICache.existsCinema(cinema_id);
  if (!exists_cinema) {
    to_return.code = 404;
    to_return.error = 'Cine no encontrado';
    res.status(404).send(to_return);
    return;
  }
  const cachedConfiterias = await blazinglyFastAPICache.getConfiteria(cinema_id)

  // const cachedConfiterias = APIcache.confiterias[cinema.city];

  if (cachedConfiterias) {
    to_return.confiteria = cachedConfiterias;
  }
  else {
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
  }

  res.send(to_return);
});
