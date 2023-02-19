import { isPromiseFullfield, removeDuplicates } from './utils.js';
import {
  apifetch,
  BILLBOARD_ENDPOINT,
  CONFITERIAS_ENDPOINT,
  movieToEmojisIA,
  THEATRES_ENDPOINT
} from './services.js';

type city_name = string;
type cinema_id = string;
type corporate_film_id = string;

class APICache {
  refreshing: boolean = false;
  updateInterval = 1000 * 60 * 70; // 1 hour and 10 minutes

  all_cinemas: Promise<CinemaInformationWithCoords[]>
  confiterias: Promise<
    Record<city_name, CinemaConfiteriaInformation[] | undefined>
  >;
  all_billboards: Promise<
    Record<cinema_id, FullBillboardDaysForCinema | undefined>
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
      .map((movie): MinifiedCinemaMovieInformation => ({
        title: movie.title,
        poster_url: movie.poster_url,
        duration: movie.duration,
        emojis: movie.emojis,
        rating: movie.rating,
        corporate_film_id: movie.corporate_film_id,
        trailer_url: movie.trailer_url,
        synopsis: movie.synopsis,
    })).filter((movie, i, arr) => arr.findIndex(m => m.corporate_film_id === movie.corporate_film_id) === i);
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
          address: theatre.Address1,
          coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
        }));
      resolve(cinemas);
    });

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
    });

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
      // First resolve the billboards
      const billboards = billboardPromises.filter(isPromiseFullfield).map(p => p.value);
      const all_movies = billboards.map(billboard => billboard.map(day => day.movies)).flat(2);

      const emojis_promises = removeDuplicates(all_movies, 'corporate_film_id')
        .map(unique_movie => new Promise<[corporate_film_id, string | undefined]>((resolve, _) => {
            movieToEmojisIA({ title: unique_movie.title, description: unique_movie.synopsis })
              .then(emojis => resolve([unique_movie.corporate_film_id, emojis]));
          })
        );
      
      const resolved_emojis = await Promise.allSettled(emojis_promises)
        .then(promises => promises.filter(isPromiseFullfield).map(p => p.value));

      const emojis_for_movies: Record<corporate_film_id, string | undefined> = Object.fromEntries(
        resolved_emojis
      );

      // populate the billboards_to_resolve object
      cinemas.forEach((cinema, i) => {
        const billboard = billboards[i];
        // Extract just the necesarry information
        billboards_to_resolve[cinema.cinema_id] = billboard.map((billboardItem): BillboardDayForCinema => ({
          date: billboardItem.date,
          movies: billboardItem.movies.map((movie): CinemaMovieInformation => ({
            corporate_film_id: movie.corporate_film_id,
            title: movie.title,
            synopsis: movie.synopsis.replaceAll(/\s{2,}|\t|\r|\s+$/mg, ''),
            emojis: emojis_for_movies[movie.corporate_film_id] || '❓❓❓❓❓',
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

      resolve(billboards_to_resolve);
    });

    console.log({
      all_cinemas: this.all_cinemas,
      confiterias: this.confiterias,
      all_billboards: this.all_billboards,
    });
    console.log('Blazingly fast cache refreshed!');
    this.refreshing = false;
  }
}

export const blazinglyFastCache = new APICache();

setInterval(
  blazinglyFastCache.refreshCache.bind(blazinglyFastCache),
  blazinglyFastCache.updateInterval
);

