import express from 'express';
import { readFileSync } from 'node:fs'
import { blazinglyFastCache } from './cache.js';
import { ipLookupLocation } from './services.js';
import { randomChoose, randomInt, randomProbability } from './utils.js';

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

app.get('/ansi', (req, res) => {
  const ansi = readFileSync('./ansi.txt', { encoding: 'utf-8' });
  res.send({
    image: ansi
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

  // Get the full billboard for the cinema
  const full_billboard = await blazinglyFastCache.getFullBillboard(cinema_id);

  if (!full_billboard) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar el cine';
    res.send(to_return);
    return;
  }

  // Find all the days that have the movie
  full_billboard.forEach(billboard_day => {
    // Find the movie
    const found = billboard_day.movies.find(movie => movie.corporate_film_id === corporate_film_id);
    if (!found) return;

    // Get the movie and its versions separately (by design)
    const { movie_versions, ...restOfMovie } = found;
    to_return.movie = restOfMovie;

    // Store the date and the versions for the movie
    to_return.days.push({
      date: billboard_day.date,
      movie_versions: found.movie_versions
    });
  });

  if (!to_return.movie) {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la película';
    res.send(to_return);
    return;
  }

  res.send(to_return);
});

app.get('/session/:session_id', async (req, res) => {
  const session_id = req.params.session_id;
  const to_return: MovieSessionResponse = {} as MovieSessionResponse;

  // generate random information for the session
  to_return.session_id = session_id;
  to_return.day = "2023-02-22";
  to_return.hour = "19:40:00";
  to_return.cinema = await blazinglyFastCache.getCinema('742');
  to_return.movie_version = {
    movie_version_id: "HO00005118",
    title: "ANT MAN AND THE WASP QUATUMANIA (SUB 3D XD DBOX)",
    version_tags: "3D XD",
    language_tags: "SUB",
    seats_tags: "DBOX"
  };
  const rowNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as RowsStringNames[];
  const seatsTypes = ['DBOX', 'PRE', 'BIS', 'TRAD'] as MovieSeatsTag[];
  const randomRowsLength = randomInt(8, 10);
  const randomSeatsLength = randomInt(21, 24); // columns
  to_return.room = {
    columns_number: randomSeatsLength,
    rows_number: randomRowsLength,
    rows: Array.from({ length: randomRowsLength }, (_, i) => ({
      row_name: rowNames[i],
      row_number: i,
      seats: Array.from({ length: randomSeatsLength }, (_, j) => ({
        col_number: j,
        is_available: randomProbability(0.8),
        type: randomChoose(seatsTypes)
      })).filter(() => randomProbability(0.9))
    }))
  };

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
