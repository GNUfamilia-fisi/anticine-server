import { downloadImageToCache, generateRandomRoomForSession, getTagsFromMovieTitle, isPromiseFullfield, logTimestamp, removeDuplicates, uniqueValues } from './utils.js';
import {
  anticineDB,
  apifetch,
  BILLBOARD_ENDPOINT,
  CINEMARK_MOVIE_THUMBNAIL,
  CONFITERIAS_ENDPOINT,
  EMOJIS_NOT_FOUND,
  movieToEmojisIA,
  THEATRES_ENDPOINT
} from './services.js';
import terminalImage from './terminal-image.js';
import { getAverageColor } from 'fast-average-color-node';

type city_name = string;
type cinema_id = string;
type corporate_film_id = string;

type RefresingIntervals = {
  cinemas_fetch_interval: number | null,
  confiterias_fetch_inverval: number | null,
  billboards_fetch_inverval: number | null,
  sleepInterval: {
    from: number,
    to: number,
    UTC_offset: number,
  } | null
};

type ThumbnailInformation = {
  average_color: RGBColor,
  raw_image: string,
}

class APICache {
  cacheConfig: RefresingIntervals

  all_cinemas: Promise<CinemaInformationWithCoords[]>
  confiterias: Promise<
    Record<city_name, CinemaConfiteriaInformation[] | undefined>
  >;
  all_billboards: Promise<
    Record<cinema_id, FullBillboardDaysForCinema | undefined>
  >;
  private all_movies_information: Map<corporate_film_id, Omit<CinemaMovieInformation, 'movie_versions'>> = new Map();
  private all_emojis_for_movies: Record<corporate_film_id, string> = {};
  private all_ANSI_thumbnails: Map<corporate_film_id, ThumbnailInformation> = new Map();

  constructor(intervals: RefresingIntervals) {
    this.cacheConfig = intervals;
  }

  async getAllCinemas() {
    const cinemas = await this.all_cinemas;
    return cinemas;
  }

  // Devuelve toda la información de un cine (actualmente no se usa)
  async getCinema(cinema_id: cinema_id) {
    const cinemas = await this.all_cinemas;
    return cinemas.find(cinema => cinema.cinema_id === cinema_id);
  }

  // Devuelve toda la confitería disponible para un cine
  async getConfiteria(cinema_id: cinema_id) {
    const confiterias = await this.confiterias;
    return confiterias[cinema_id];
  }

  // Devuelve toda la cartelera de un cine (separado por dates, con todas sus sesiones)
  async getFullBillboard(cinema_id: cinema_id): Promise<FullBillboardDaysForCinema> {
    const billboards = await this.all_billboards;
    return billboards[cinema_id];
  }

  // Devuelve todas la lista de películas de un cine (sin importar sus fechas ni sesiones)
  async getAllMoviesFromCinema(cinema_id: cinema_id) {
    const billboards = await this.getFullBillboard(cinema_id);

    return billboards?.map(billboard => billboard.movies).flat()
      .map((movie): MinifiedCinemaMovieInformation => {
        const { cast, movie_versions, raw_thumbnail_image, ...minifiedMovie } = movie;
        return minifiedMovie;
    }).filter((movie, i, arr) => arr.findIndex(m => m.corporate_film_id === movie.corporate_film_id) === i);
  }

  async fetchAllEmojisToCache(fetched_movies: FetchedMovieInformation[]) {
    type EmojiEntry = [corporate_film_id, string];
    const emojis_promises = fetched_movies.map(movie => new Promise<EmojiEntry>(async (resolve) => {
      // Check if emoji is already in the cache
      const cachedEmojis = this.all_emojis_for_movies[movie.corporate_film_id];
      if (cachedEmojis) {
        resolve([movie.corporate_film_id, cachedEmojis]);
        return;
      }
      // If not, fetch the emoji for the current movie
      try {
        const emojis = await movieToEmojisIA({ title: movie.title, description: movie.synopsis });
        resolve([movie.corporate_film_id, emojis]);
      }
      catch {
        resolve([movie.corporate_film_id, EMOJIS_NOT_FOUND]);
      }
    }));

    const resolved_emojis = await Promise.allSettled(emojis_promises)
      .then(promises => promises.filter(isPromiseFullfield).map(p => p.value));

    // Record: { [corporate_film_id] -> emojis }
    this.all_emojis_for_movies = Object.fromEntries(resolved_emojis);
  }

  async fetchAllANSIThumbnailsToCache(all_fetched_movies: FetchedMovieInformation[]) {
    const thumbnail_images_promises = all_fetched_movies
        .map(movie => new Promise<[corporate_film_id, ThumbnailInformation]>(async (resolve, _) => {
          const poster_url = CINEMARK_MOVIE_THUMBNAIL(movie.corporate_film_id);
          const image_path = await downloadImageToCache(poster_url, movie.corporate_film_id);
          const ANSI_art = await terminalImage.file(image_path, { width: 45, height: 30 });
          const average_color = await getAverageColor(image_path);
          resolve([movie.corporate_film_id, {
            average_color: {
              r: average_color.value[0], g: average_color.value[1], b: average_color.value[2],
            },
            raw_image: ANSI_art
          }]);
        }));

    const resolved_thumbnail_images = await Promise.allSettled(thumbnail_images_promises)
      .then(promises => promises.filter(isPromiseFullfield).map(p => p.value));

    this.all_ANSI_thumbnails = new Map(resolved_thumbnail_images);
  }

  async getMovieInformation(movie_id: corporate_film_id) {
    // this movie depends on the billboards, so we need to wait for it
    await this.all_billboards;
    return this.all_movies_information.get(movie_id);
  }

  refreshAllCinemasCache() {
    logTimestamp('Fetching all the Anticine cinemas...');
    this.all_cinemas = new Promise(async (resolve, _reject) => {
      // load all cinemas
      const data_theatres = (await apifetch<FetchedTheatresResponse>(THEATRES_ENDPOINT)) || [];
      const cinemas = data_theatres
        .map(c => c.cinemas).flat()
        .map((theatre): CinemaInformationWithCoords => ({
          cinema_id: theatre.ID,
          name: theatre.Name.replace(/cinemark/i, 'Anticine'),
          city: theatre.City,
          address: theatre.Address1,
          coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
        }));
      resolve(cinemas);
      logTimestamp('Successfully refreshed all cinemas!');
    });
  }

  refreshAllConfiteriasCache() {
    logTimestamp('Fetching all the Anticine confiterias...');
    this.confiterias = new Promise(async (resolve, _reject) => {
      const confiterias_to_resolve: Record<
        cinema_id, CinemaConfiteriaInformation[] | undefined
      > = {};
      const cinemas = await this.all_cinemas;
      const confiteriasPromises = await Promise.allSettled(cinemas
        .map(cinema => apifetch<FetchedConsessionItemsResponse>(CONFITERIAS_ENDPOINT(cinema.cinema_id))
      ));
      const confiterias = confiteriasPromises.filter(isPromiseFullfield).map(p => p.value);

      // populate confiterias_to_resolve
      cinemas.forEach((cinema, i) => {
        const confiteria = confiterias[i];
        if (confiteria === null) {
          confiterias_to_resolve[cinema.cinema_id] = undefined;
          return;
        }
        confiterias_to_resolve[cinema.cinema_id] = confiteria.ConcessionItems.map(item => ({
          item_id: item.Id,
          name: item.DescriptionAlt || item.Description,
          description: item.ExtendedDescription,
          priceInCents: item.PriceInCents
        } as CinemaConfiteriaInformation));
      });
      resolve(confiterias_to_resolve);
      logTimestamp('Successfully refreshed all confiterias!')
    });
  }

  refreshAllBillboardsCache() {
    logTimestamp('Fetching all the Anticine billboards...');
    this.all_billboards = new Promise(async (resolve, _reject) => {
      const billboards_to_resolve: Record<
        cinema_id, FullBillboardDaysForCinema | undefined
      > = {};
      const cinemas = await this.all_cinemas;

      // Fetching the billboard of each cinema (without resolving)
      const billboardPromises = await Promise.allSettled(
        cinemas.map(
          cinema => apifetch<FetchedBillboardForCinemaReponse>(BILLBOARD_ENDPOINT(cinema.cinema_id))
        )
      );
      // First resolve the billboards to get all the movies, but removing the duplicates
      const billboards = billboardPromises.filter(isPromiseFullfield).map(p => p.value);
      const all_fetched_movies = removeDuplicates(
        billboards.map(billboard => billboard.map(day => day.movies)).flat(2),
        'corporate_film_id'
      );

      /* --- Getting emojis for each movie --- */
      await this.fetchAllEmojisToCache(all_fetched_movies);

      /* --- Creating an ANSI thumbnail art for each movie --- */
      // Record: [corporate_film_id] -> ThumbnailInformation
      await this.fetchAllANSIThumbnailsToCache(all_fetched_movies);

      const all_movies_entries = all_fetched_movies.map((movie): [string, Omit<CinemaMovieInformation, 'movie_versions'>] => {
        const information: Omit<CinemaMovieInformation, 'movie_versions'> = {
          corporate_film_id: movie.corporate_film_id,
          title: movie.title,
          // Extract all the versions from the movie_versions property
          version_tags: uniqueValues(
            movie.movie_versions.map(v => getTagsFromMovieTitle(v.title).version_tags).flat()
          ).join(' '),
          synopsis: movie.synopsis.replaceAll(/\s{2,}|\t|\r|\s+$/mg, ''), // replace weird characters
          emojis: this.all_emojis_for_movies[movie.corporate_film_id] || EMOJIS_NOT_FOUND,
          trailer_url: movie.trailer_url,
          thumbnail_url: CINEMARK_MOVIE_THUMBNAIL(movie.corporate_film_id),
          duration: Number(movie.runtime),
          rating: movie.rating,
          cast: movie.cast.map((cast): MovieCast => ({
            fullname: `${cast.FirstName.trimEnd()} ${cast.LastName}`,
            role: cast.PersonType
          })),
          average_thumbnail_color: this.all_ANSI_thumbnails.get(movie.corporate_film_id).average_color,
          raw_thumbnail_image: this.all_ANSI_thumbnails.get(movie.corporate_film_id).raw_image,
        }
        return [movie.corporate_film_id, information];
      });

      this.all_movies_information = new Map<string, Omit<CinemaMovieInformation, 'movie_versions'>>(all_movies_entries);

      // populate the billboards_to_resolve object
      cinemas.forEach((cinema, i) => {
        // Extract just the necesarry information
        billboards_to_resolve[cinema.cinema_id] = billboards[i].map((billboardItem): BillboardDayForCinema => ({
          date: billboardItem.date,
          movies: billboardItem.movies.map((movie): CinemaMovieInformation => ({
            ...this.all_movies_information.get(movie.corporate_film_id),
            movie_versions: movie.movie_versions.map((version): MovieVersion => {
              const movie_tags = getTagsFromMovieTitle(version.title);
              return {
                corporate_film_id: movie.corporate_film_id,
                movie_version_id: version.film_HOPK,
                title: version.title,
                version_tags: movie_tags.version_tags,
                language_tags: movie_tags.language_tags,
                seats_tags: movie_tags.seats_tags,
                sessions: version.sessions.map((session): SessionForMovieVersion => {
                  // Generate a new sesssion randomly
                  const session_to_create: MovieSessionInformation = {
                    session: {
                      session_id: session.id,
                      day: session.day,
                      hour: session.hour,
                    },
                    movie_version: {
                      seats_tags: movie_tags.seats_tags,
                      corporate_film_id: movie.corporate_film_id,
                      movie_version_id: version.film_HOPK,
                      language_tags: movie_tags.language_tags,
                      title: version.title,
                      version_tags: movie_tags.version_tags,
                    },
                    room: generateRandomRoomForSession()
                  }
                  anticineDB.set(`sessions:${session.id}`, session_to_create);
                  return {
                    session_id: session.id,
                    day: session.day,
                    hour: session.hour,
                    seats_available: session.seats_available
                  };
                })
              }
            })
          }))
        }));
      });

      resolve(billboards_to_resolve);
      logTimestamp('Successfully refreshed all billboards!');
    });
  }

  setupInterval(callback: () => void, interval: number | null) {
    // Always execute it once
    callback();
    if (interval === null) return;

    setInterval(() => {
      if (this.cacheConfig.sleepInterval) {
        const { from, to, UTC_offset } = this.cacheConfig.sleepInterval;
        const now = new Date();
        const hour = now.getUTCHours() + UTC_offset;

        if (hour >= from && hour < to) {
          return;
        }
      }
      callback();
    }, interval);
  }

  startRefreshingCache() {
    this.setupInterval(
      () => this.refreshAllCinemasCache(),
      this.cacheConfig.cinemas_fetch_interval
    );

    this.setupInterval(
      () => this.refreshAllConfiteriasCache(),
      this.cacheConfig.confiterias_fetch_inverval
    );

    this.setupInterval(
      () => this.refreshAllBillboardsCache(),
      this.cacheConfig.billboards_fetch_inverval
    );
  }
}

export const blazinglyFastCache = new APICache({
  cinemas_fetch_interval: null, // never (los cines casi nunca se actualizan)
  confiterias_fetch_inverval: 1000 * 60 * 60 * 24, // 24 hours
  billboards_fetch_inverval:  1000 * 60 * 60 * 12, // 12 hours

  sleepInterval: {
    from: 0, // 12:00 am
    to: 8,   // 08:00 am
    UTC_offset: -5
  }
});

blazinglyFastCache.startRefreshingCache();
