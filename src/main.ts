import express from 'express';
import { blazinglyFastCache } from './cache.js';
import { AllCinemasRouteResponse,
  CinemaConfiteriaRouteResponse,
  CinemaInformation,
  CinemaInformationWithCoords,
  NearCinemasRouteResponse,
  FullBillboardForMovieRouteResponse,
  BillboardForOnlyOneMovie,
  CinemaAllMoviesFromBillboardRouteResponse,
} from './types.js';
import { ipLookupLocation } from './services.js';

const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.get('/', (req, res) => {
  console.log(req.ip)
  res.send({
    status: "Anticine status: OK 👍",
    code: 200,
    error: null
  });
});

app.get('/cines/cercanos', async (req, res) => {
  const to_return: NearCinemasRouteResponse = {
    city: null,
    cinemas: [],
    nearest_id: null,
    code: 200,
    error: null
  };

  const all_cinemas = await blazinglyFastCache.getAllCinemas();
  let available_cinemas: CinemaInformationWithCoords[] = [];

  const location = await ipLookupLocation(req.ip);
  if (!location) {
    to_return.error = 'No se pudo determinar la ubicación';
    to_return.code = 500;
    res.status(500).send(to_return);
    return;
  }

  const { state_prov: city, latitude, longitude } = location;
  const user_lat = Number(latitude);
  const user_lon = Number(longitude);

  // Only the cinemas of your city
  available_cinemas = all_cinemas.filter(cinema => cinema.city === city);
  to_return.city = city;

  if (available_cinemas.length === 0) {
    to_return.error = 'No hay cines disponibles en tu ciudad';
    to_return.code = 404;
    res.status(404).send(to_return);
    return;
  }

  const getDistance = (cinema: CinemaInformationWithCoords) => {
    let { lat: cine_lat, lon: cine_lon } = cinema.coords;
    return Math.sqrt((cine_lat - user_lat) ** 2 + (cine_lon - user_lon) ** 2);
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

  const all_cinemas = await blazinglyFastCache.getAllCinemas();
  to_return.cinemas = all_cinemas.map((cinema): CinemaInformation => {
    const { coords, ...rest } = cinema;
    return rest;
  });
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
  const cachedConfiterias = await blazinglyFastCache.getConfiteria(cinema_id);
  if (!cachedConfiterias) {
    to_return.code = 404;
    to_return.error = 'Cine no encontrado';
    res.status(404).send(to_return);
    return;
  }
  to_return.confiteria = cachedConfiterias;
  res.send(to_return);
});

app.get('/cines/:cinema_id/cartelera', async (req, res) => {
  const to_return: CinemaAllMoviesFromBillboardRouteResponse = {
    movies: [],
    code: 200,
    error: null
  };
  const { cinema_id } = req.params;
  const billboard = await blazinglyFastCache.getAllMoviesFromCinema(cinema_id);

  if (!billboard) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la cartelera';
    res.send(to_return);
    return;
  }
  to_return.movies = billboard;
  res.send(to_return);
});

app.get('/cines/:cinema_id/cartelera/:corporate_film_id', async (req, res) => {
  const to_return: FullBillboardForMovieRouteResponse = {
    movie: null,
    days: [],
    code: 200,
    error: null
  };
  const { cinema_id, corporate_film_id } = req.params;
  const full_billboard = await blazinglyFastCache.getFullBillboard(cinema_id);

  if (!full_billboard) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar el cine';
    res.send(to_return);
    return;
  }

  const foundBillboards: BillboardForOnlyOneMovie[] = [];

  full_billboard.forEach((billboard_day) => {
    const found = billboard_day.movies.find(movie => movie.corporate_film_id === corporate_film_id);
    if (found) {
      const { movie_versions, ...restOfMovie } = found;
      to_return.movie = restOfMovie;

      if (!found) return;
      foundBillboards.push({
        date: billboard_day.date,
        movie_versions: found.movie_versions
      });
    }
  });

  to_return.days = foundBillboards;

  if (to_return.days.length === 0) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la cartelera';
    res.send(to_return);
    return;
  }

  res.send(to_return);
});

// Last route
app.use((req, res) => {
  const { method, url } = req;
  res.status(404).send({
    read_the_docs: 'https://github.com/GNUfamilia-fisi/anticine-server#endpoints',
    code: 404,
    error: `No podemos encontrar la ruta ${method} ${url}`
  });
});
