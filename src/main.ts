import express from 'express';
import { readFileSync } from 'node:fs'
import { blazinglyFastCache } from './cache.js';
import { anticineDB, ipLookupLocation } from './services.js';
import { logTimestamp, mapNumberToChar, randomChoose, randomInt, randomProbability } from './utils.js';

const app = express();
app.use(express.json());
app.set('trust proxy', true);

const PORT = process.env.PORT || 6969;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

app.use((req, _res, next) => {
  logTimestamp(`Request: ${req.ip} -> ${req.url}`);
  next();
});

app.get('/', (req, res) => {
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

app.post('/register', async (req, res) => {
  const to_return: RegistrationResponse = {
    code: 200,
    error: null,
    user: null
  }
  const user = req.body as RegistrationResponse['user'];
  const id = `users:${user.email}`;

  try {
    const found = await anticineDB.get(id);
    if (found.status === 'ok') {
      to_return.code = 409;
      to_return.error = 'Ya existe un usuario con ese correo';
      res.status(to_return.code).send(to_return);
      return;
    }
    await anticineDB.set(id, user);
  }
  catch (_) {
    to_return.code = 500;
    to_return.error = 'No se pudo registrar el usuario';
    res.status(to_return.code).send(to_return);
    return;
  }

  user.id = id;
  to_return.user = user;

  res.send(to_return);
});

app.post('/login', async (req, res) => {
  const to_return: LoginResponse = {
    code: 200,
    error: null,
    user: null
  }
  const { email, password } = req.body as LoginResponse['user'];

  if (!email || !password) {
    to_return.code = 400;
    to_return.error = 'Registro incompleto';
    res.status(to_return.code).send(to_return);
    return;
  }

  const id = `users:${email}`;

  try {
    const found = await anticineDB.get(id);
    if (found.status === 'ok') {
      const user = found.data as LoginResponse['user'];
      if (user.password === password) {
        to_return.user = user;
        to_return.user.id = id;
        res.send(to_return);
        return;
      }
    }
    to_return.code = 404;
    to_return.error = 'No se encontró el usuario';
    res.status(to_return.code).send(to_return);
    return;
  }
  catch (_) {
    to_return.code = 500;
    to_return.error = 'No se pudo iniciar sesión';
    res.status(to_return.code).send(to_return);
    return;
  }
});

app.get('/sessions/:session_id', async (req, res) => {
  const to_return: MovieSessionResponse = {
    session: null,
    movie_version: null,
    room: null,
    code: 200,
    error: null,
  }
  const session_id = req.params.session_id;

  const response = await anticineDB.get(`sessions:${session_id}`);

  if (response.status !== 'ok') {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la sesión';
    res.send(to_return);
    return;
  }

  const session_information = response.data as MovieSessionInformation;

  to_return.session = session_information.session;
  to_return.movie_version = session_information.movie_version;
  to_return.room = session_information.room;

  res.send(to_return);
});

app.post('/sessions/:session_id/reserve', async (req, res) => {
  const to_return = {
    code: 200,
    error: null
  }
  const session_id = req.params.session_id;
  // Is not necessary to store the session_id in the body so is already included in the URI
  const { email, seats: user_seats, is_guest } = req.body as TicketPurchaseBody;

  console.log({ email, user_seats, is_guest });

  let _user: UserInformation = null;

  if (!is_guest) {
    const user_response = await anticineDB.get(`users:${email}`);

    if (user_response.status !== 'ok') {
      to_return.code = 404;
      to_return.error = 'El usuario no se encuentra registrado';
      res.send(to_return);
      return;
    }
    _user = user_response.data as UserInformation;
  }

  const session_response = await anticineDB.get(`sessions:${session_id}`);

  if (session_response.status !== 'ok') {
    to_return.code = 404;
    to_return.error = 'No se pudo encontrar la sesión';
    res.send(to_return);
    return;
  }

  // Here we should verify the payment method, but no

  // Now, verify the seats availability
  const session_information = session_response.data as MovieSessionInformation;

  // console.log({ seats_before: session_information.room.rows[0].seats });

  const already_bought: string[] = [];

  // Mark the corresponding seats as occupied
  session_information.room.rows = session_information.room.rows.map(row => {
    row.seats = row.seats.map(seat => {
      user_seats.forEach(user_seat => {
        if (row.row_number === user_seat.row_number && seat.col_number === user_seat.col_number) {
          if (seat.is_ocupied) {
            const name = `${mapNumberToChar(row.row_number)}${seat.col_number}`;
            already_bought.push(name);
          }
          seat.is_ocupied = true;
        }
      });
      return seat;
    });
    return row;
  });

  // console.log({ seats_after: session_information.room.rows[0].seats });

  if (already_bought.length > 0) {
    to_return.code = 410; // Gone
    to_return.error = 'los asientos: ' + already_bought.join(', ') + ' han sido comprados';
    res.send(to_return);
    return;
  }

  // Save the session information
  await anticineDB.set(`sessions:${session_id}`, session_information);

  // Create the ticket
  // TODO: Create a ticket id, etc
  // Save the ticket

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
