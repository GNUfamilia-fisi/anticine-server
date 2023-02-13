import { isPromiseFullfield } from './utils.js';
import {
  apifetch,
  BILLBOARD_ENDPOINT,
  CONFITERIAS_ENDPOINT,
  movieToEmojisIA,
  THEATRES_ENDPOINT
} from './services.js';
import {
  BillboardDayForCinema,
  CinemaConfiteriaInformation,
  CinemaInformationWithCoords,
  CinemaMovieInformation,
  FetchedBillboardForCinemaReponse,
  FetchedConsessionItemsResponse,
  FetchedTheatresResponse,
  FullBillboardDaysForCinema,
  MinifiedBillboardDayForCinema,
  MinifiedCinemaMovieInformation,
  MovieCast,
  MovieVersion,
  SessionForMovieVersion
} from './types.js';

type city_name = string;
type cinema_id = string;
type corporate_film_id = string;

class APICache {
  refreshing: boolean = false;
  updateInterval = 1000 * 60 * 60; // 1 hour

  all_cinemas: Promise<CinemaInformationWithCoords[]>
  confiterias: Promise<
    Record<city_name, Promise<CinemaConfiteriaInformation[] | undefined>>
  >;
  all_billboards: Promise<
    Record<cinema_id, Promise<FullBillboardDaysForCinema | undefined>>
  >;
  emoji_movie_cache: Promise<
    Record<corporate_film_id, Promise<string | undefined>>
  >;

  constructor() {
    this.refreshCache();
  }
  async getAllCinemas() {
    const cinemas = await this.all_cinemas;
    return cinemas;
  }
  async getCinema(cinema_id: cinema_id) {
    const cinemas = await this.all_cinemas;
    return cinemas.find(cinema => cinema.cinema_id === cinema_id);
  }
  async getConfiteria(city: city_name) {
    const confiterias = await this.confiterias;
    const resolvedConfiteria = await confiterias[city];
    return resolvedConfiteria;
  }
  async getFullBillboard(cinema_id: cinema_id) {
    const billboards = await this.all_billboards;
    const resolvedBillboard = await billboards[cinema_id];
    return resolvedBillboard;
  }
  async getAllMoviesFromBillboard(cinema_id: cinema_id) {
    const billboards = await this.getFullBillboard(cinema_id);
    return billboards?.map(billboard => billboard.movies)
    .flat().map((movie): MinifiedCinemaMovieInformation => ({
      title: movie.title,
      poster_url: movie.poster_url,
      duration: movie.duration,
      rating: movie.rating,
      corporate_film_id: movie.corporate_film_id,
      trailer_url: movie.trailer_url,
      synopsis: movie.synopsis,
    })).filter((movie, i, arr) => arr.findIndex(m => m.corporate_film_id === movie.corporate_film_id) === i);
  }
  // Currently unused
  async getMinifiedBillboard(cinema_id: cinema_id) {
    const billboards = await this.getFullBillboard(cinema_id);
    return billboards?.map((billboard): MinifiedBillboardDayForCinema => ({
      date: billboard.date,
      movies: billboard.movies.map(movie => {
        const { cast, movie_versions, ...minified_movie } = movie;
        return minified_movie;
      })
    }));
  }
  async refreshCache() {
    this.refreshing = true;
    console.log('Refresing Blazingly fast cache...');

    this.all_cinemas = new Promise(async (resolve, _reject) => {
      // load all cinemas
      const data_theatres = (await apifetch<FetchedTheatresResponse>(THEATRES_ENDPOINT)) || [];
      const cinemas = data_theatres
        .map(c => c.cinemas).flat()
        .map((theatre): CinemaInformationWithCoords => ({
          cinema_id: theatre.ID,
          name: theatre.Name.replace(/cinemark/i, 'Anticine'),
          city: theatre.City,
          coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
        }));
      resolve(cinemas);
    });

    this.confiterias = new Promise(async (resolve, _reject) => {
      const confiterias_to_resolve: Record<
        string, Promise<CinemaConfiteriaInformation[] | undefined>
      > = {};
      const cinemas = await this.all_cinemas;
      const confiteriasPromises = cinemas
        .map(cinema => apifetch<FetchedConsessionItemsResponse>(CONFITERIAS_ENDPOINT(cinema.cinema_id))
      );
      cinemas.forEach((cinema, i) => {
        confiterias_to_resolve[cinema.cinema_id] = confiteriasPromises[i]
          .then(confiteria => {
            if (confiteria === null) return undefined;
            return confiteria.ConcessionItems.map(item => ({
              item_id: item.Id,
              name: item.DescriptionAlt || item.Description,
              description: item.ExtendedDescription,
              priceInCents: item.PriceInCents
            } as CinemaConfiteriaInformation));
          });
      });
      resolve(confiterias_to_resolve);
    });

    this.all_billboards = new Promise(async (resolve, _reject) => {
      const billboards_to_resolve: Record<
        cinema_id, Promise<FullBillboardDaysForCinema | undefined>
      > = {};
      const cinemas = await this.all_cinemas;

      // Fetching the billboard of each cinema (without resolving)
      const billboardPromises = cinemas.map(
          cinema => apifetch<FetchedBillboardForCinemaReponse>(BILLBOARD_ENDPOINT(cinema.cinema_id))
      );

      cinemas.forEach((cinema, i) => {
        billboards_to_resolve[cinema.cinema_id] = billboardPromises[i]
          .then(billboard => {
            if (billboard === null) return undefined;
            // Extract just the necesarry information
            return billboard.map((billboardItem): BillboardDayForCinema => ({
              date: billboardItem.date,
              movies: billboardItem.movies.map((movie): CinemaMovieInformation => ({
                corporate_film_id: movie.corporate_film_id,
                title: movie.title,
                synopsis: movie.synopsis.replaceAll(/\s{2,}|\t|\r|\s+$/mg, ''),
                trailer_url: movie.trailer_url,
                poster_url: `https://cinemarkmedia.modyocdn.com/pe/300x400/${movie.corporate_film_id}.jpg`,
                duration: Number(movie.runtime),
                rating: movie.rating,
                cast: movie.cast.map((cast): MovieCast => ({
                  fullname: `${cast.FirstName.trimEnd()} ${cast.LastName}`,
                  role: cast.PersonType
                })),
                movie_versions: movie.movie_versions.map((version): MovieVersion => ({
                  movie_version_id: version.film_HOPK,
                  title: version.title,
                  sessions: version.sessions.map((session): SessionForMovieVersion => ({
                    session_id: session.id,
                    day: session.day,
                    hour: session.hour,
                    seats_available: session.seats_available,
                  }))
                }))
              }))
            }));
          });
      });
      resolve(billboards_to_resolve);
    });

    this.emoji_movie_cache = new Promise(async (resolve, _reject) => {
      const fetched_billboards = await this.all_billboards;
      const billboards_promises = Object.values(fetched_billboards);
      const billboards = (
        await Promise.allSettled(billboards_promises)
      ).filter(isPromiseFullfield).map(promise => promise.value);

      const emojis_to_resolve: Record<
        corporate_film_id, Promise<string | undefined>
      > = {};

      billboards
        .forEach(billboard => billboard
          .map(billboard_day => billboard_day.movies)
          .flat()
          .forEach(movie => {
            if (emojis_to_resolve[movie.corporate_film_id]) return;
            emojis_to_resolve[movie.corporate_film_id] = movieToEmojisIA({
              title: movie.title,
              description: movie.synopsis,
            });
          })
      );
      resolve(emojis_to_resolve);
    });

    console.log({
      all_cinemas: this.all_cinemas,
      confiterias: this.confiterias,
      all_billboards: this.all_billboards,
      emoji_movie_cache: this.emoji_movie_cache
    });
    console.log('Blazingly fast cache refreshed!');
    this.refreshing = false;
  }
}

export const blazinglyFastCache = new APICache();

setInterval(
  blazinglyFastCache.refreshCache,
  blazinglyFastCache.updateInterval
);

