import { apifetch } from './services.mjs';
import {
  CinemaBillboardDayInformation,
  CinemaConfiteriaInformation,
  CinemaInformationWithCoords,
  CinemaMovieInformation,
  FetchedBillboardForCinemaReponse,
  FetchedConsessionItemsResponse,
  FetchedTheatresResponse
} from "./types";

type city_name = string;
type cinema_id = string;

const CONFITERIAS_ENDPOINT = (id: cinema_id) => (
  `https://api.cinemark-peru.com/api/vista/ticketing/concession/items?cinema_id=${id}`
);
const BILLBOARD_ENDPOINT = (id: cinema_id) => (
  `https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id=${id}`
);
const THEATRES_ENDPOINT = 'https://api.cinemark-peru.com/api/vista/data/theatres';

class APICache {
  refreshing: boolean = false;
  updateInterval = 1000 * 60 * 30; // 10 minutes
  all_cinemas: Promise<CinemaInformationWithCoords[]>
  confiterias: Promise<
    Record<city_name, Promise<CinemaConfiteriaInformation[] | undefined>>
  >;
  billboards: Promise<
    Record<cinema_id, Promise<CinemaBillboardDayInformation[] | undefined>>
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
  async getBillboard(cinema_id: cinema_id) {
    const billboards = await this.billboards;
    const resolvedBillboard = billboards[cinema_id];
    return resolvedBillboard;
  }
  async refreshCache() {
    this.refreshing = true;
    console.log('Refresing Blazingly fast cache...');

    this.all_cinemas = new Promise(async (resolve, reject) => {
      // load all cinemas
      const data_theatres = (await apifetch<FetchedTheatresResponse>(THEATRES_ENDPOINT)) || [];
      const cinemas = data_theatres
        .map(c => c.cinemas).flat()
        .map((theatre): CinemaInformationWithCoords => ({
          cinema_id: theatre.ID,
          name: theatre.Name.replace(/cinemark/i, 'CineSEX'),
          city: theatre.City,
          coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
        }));
      resolve(cinemas);
    });

    this.confiterias = new Promise(async (resolve, reject) => {
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
              name: item.Description,
              description: item.ExtendedDescription,
              priceInCents: item.PriceInCents
            } as CinemaConfiteriaInformation));
          });
      });
      // if (consession.ErrorDescription || consession.ResponseCode === 4) void(1);
      resolve(confiterias_to_resolve);
    });

    this.billboards = new Promise(async (resolve, reject) => {
      const billboards_to_resolve: Record<
        cinema_id, Promise<CinemaBillboardDayInformation[] | undefined>
      > = {};
      const cinemas = await this.all_cinemas;
      // Fetching the billboard of each cinema (without resolving)
      
      const billboardPromises = cinemas
        .map(cinema => apifetch<FetchedBillboardForCinemaReponse>(BILLBOARD_ENDPOINT(cinema.cinema_id))
      );
      cinemas.forEach((cinema, i) => {
        billboards_to_resolve[cinema.cinema_id] = billboardPromises[i]
          .then(billboard => {
            if (billboard === null) return undefined;
            // Extract just the necesarry information
            return billboard.map(billboardItem => ({
              date: billboardItem.date,
              movies: billboardItem.movies.map((movie): CinemaMovieInformation => ({
                corporate_film_id: movie.corporate_film_id,
                title: movie.title,
                synopsis: movie.synopsis,
                trailer_url: movie.trailer_url,
                poster_url: `https://cinemarkmedia.modyocdn.com/pe/300x400/${movie.corporate_film_id}.jpg`,
                duration: Number(movie.runtime),
                rating: movie.rating,
              }))
            }) as CinemaBillboardDayInformation);
          });
      });
      resolve(billboards_to_resolve);
    });
    // load confiterias for each cinema
    console.log({ cache: this })
    console.log('Blazingly fast cache refreshed!');
    this.refreshing = false;
  }
}

export const blazinglyFastCache = new APICache();
setInterval(
  blazinglyFastCache.refreshCache,
  blazinglyFastCache.updateInterval
);

