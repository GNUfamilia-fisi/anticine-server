import { downloadImageToCache, getTagsFromMovieTitle, isPromiseFullfield, removeDuplicates, uniqueValues } from './utils.js';
import {
  apifetch,
  BILLBOARD_ENDPOINT,
  CINEMARK_MOVIE_THUMBNAIL,
  CONFITERIAS_ENDPOINT,
  movieToEmojisIA,
  THEATRES_ENDPOINT
} from './services.js';
import terminalImage from 'terminal-image';
import { getAverageColor } from 'fast-average-color-node';

type city_name = string;
type cinema_id = string;
type corporate_film_id = string;

class APICache {
  refreshing: boolean = false;
  updateInterval = 1000 * 60 * 60 * 12; // 12 hours

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
      .map((movie): MinifiedCinemaMovieInformation => {
        const { cast, movie_versions, ...minifiedMovie } = movie;
        return minifiedMovie;
    }).filter((movie, i, arr) => arr.findIndex(m => m.corporate_film_id === movie.corporate_film_id) === i);
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
      // First resolve the billboards to get all the movies, but removing the duplicates
      const billboards = billboardPromises.filter(isPromiseFullfield).map(p => p.value);
      const all_movies = removeDuplicates(
        billboards.map(billboard => billboard.map(day => day.movies)).flat(2),
        'corporate_film_id'
      );

      /* --- Getting emojis for each movie --- */
      const emojis_promises = all_movies
        .map(movie => new Promise<[corporate_film_id, string | undefined]>((resolve, _) => {
            movieToEmojisIA({ title: movie.title, description: movie.synopsis })
              .then(emojis => resolve([movie.corporate_film_id, emojis]));
          })
        );

      const resolved_emojis = await Promise.allSettled(emojis_promises)
        .then(promises => promises.filter(isPromiseFullfield).map(p => p.value));

      // Record: { [corporate_film_id] -> emojis }
      const emojis_for_movies = Object.fromEntries(resolved_emojis);

      type ThumbnailInformation = {
        average_color: RGBColor,
        raw_image: string,
      }
      /* Creating an ANSI thumbnail art for each movie */
      const thumbnail_images_promises = all_movies
        .map(movie => new Promise<[corporate_film_id, ThumbnailInformation]>(async (resolve, _) => {
          const poster_url = CINEMARK_MOVIE_THUMBNAIL(movie.corporate_film_id);
          const image_path = await downloadImageToCache(poster_url, movie.corporate_film_id);
          console.log(`image downloaded into ${image_path}`);
          const ANSI_art = await terminalImage.file(image_path, { width: 45, height: 30 });
          console.log(`ascii art generated succesfully:\n${ANSI_art}`)
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

      // Record: [corporate_film_id] -> ThumbnailInformation
      const ansi_thumbnails_for_movies = Object.fromEntries(resolved_thumbnail_images);

      // populate the billboards_to_resolve object
      cinemas.forEach((cinema, i) => {
        const billboard = billboards[i];
        // Extract just the necesarry information
        billboards_to_resolve[cinema.cinema_id] = billboard.map((billboardItem): BillboardDayForCinema => ({
          date: billboardItem.date,
          movies: billboardItem.movies.map((movie): CinemaMovieInformation => ({
            corporate_film_id: movie.corporate_film_id,
            title: movie.title,
            // Extract all the versions from the movie_versions property
            version_tags: uniqueValues(
              movie.movie_versions.map(v => getTagsFromMovieTitle(v.title).version_tags).flat()
            ).join(' '),
            synopsis: movie.synopsis.replaceAll(/\s{2,}|\t|\r|\s+$/mg, ''), // replace weird characters
            emojis: emojis_for_movies[movie.corporate_film_id] || '❓❓❓❓❓',
            trailer_url: movie.trailer_url,
            thumbnail_url: CINEMARK_MOVIE_THUMBNAIL(movie.corporate_film_id),
            duration: Number(movie.runtime),
            rating: movie.rating,
            cast: movie.cast.map((cast): MovieCast => ({
              fullname: `${cast.FirstName.trimEnd()} ${cast.LastName}`,
              role: cast.PersonType
            })),
            average_thumbnail_color: ansi_thumbnails_for_movies[movie.corporate_film_id].average_color,
            raw_thumbnail_image: ansi_thumbnails_for_movies[movie.corporate_film_id].raw_image,
            movie_versions: movie.movie_versions.map((version): MovieVersion => {
              const movie_tags = getTagsFromMovieTitle(version.title);
              return {
                movie_version_id: version.film_HOPK,
                title: version.title,
                version_tags: movie_tags.version_tags,
                language_tags: movie_tags.language_tags,
                seats_tags: movie_tags.seats_tags,
                sessions: version.sessions.map((session): SessionForMovieVersion => ({
                  session_id: session.id,
                  day: session.day,
                  hour: session.hour,
                  seats_available: session.seats_available,
                }))
              }
            })
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
