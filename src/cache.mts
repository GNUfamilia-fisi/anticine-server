import fetch from 'node-fetch';
import { CinemaBillboardDayInformation, CinemaConfiteriaInformation, CinemaInformationWithCoords, CinemaMovieInformation, FetchedBillboardForCinema, FetchedConsessionItemsResponse, FetchedTheatresResponse } from "./types";

type city_name = string;
type cinema_id = string;

export const APIcache = {
  all_cinemas: [] as CinemaInformationWithCoords[],
  confiterias: {} as Record<city_name, CinemaConfiteriaInformation[] | undefined>,
  billboards: {} as Record<cinema_id, CinemaBillboardDayInformation[] | undefined | null>
};

export async function loadCache() {
  console.log('Refresing cache...');
  // load all cinemas
  const response = await fetch('https://api.cinemark-peru.com/api/vista/data/theatres');
  const data_theatres = (await response.json()) as FetchedTheatresResponse;
  const cinemas = data_theatres
    .map(c => c.cinemas).flat()
    .map((theatre): CinemaInformationWithCoords => ({
      cinema_id: theatre.ID,
      name: theatre.Name.replace(/cinemark/i, 'CineSEX'),
      city: theatre.City,
      coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
  }));

  APIcache.all_cinemas = cinemas;

  // load confiterias for each cinema
  for (const cinema of APIcache.all_cinemas) {
    const consessionRresponse = await fetch(`https://api.cinemark-peru.com/api/vista/ticketing/concession/items?cinema_id=${cinema.cinema_id}`);
    const consessionData = (await consessionRresponse.json()) as FetchedConsessionItemsResponse;
    if (consessionData.ErrorDescription || consessionData.ResponseCode === 4) {
      APIcache.confiterias[cinema.city] = [];
    }
    else {
      APIcache.confiterias[cinema.city] = consessionData.ConcessionItems.map(item => ({
        item_id: item.Id,
        name: item.Description,
        description: item.ExtendedDescription,
        priceInCents: item.PriceInCents
      }));
    }
 
    const billboardResponse = await fetch(`https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id=${cinema.cinema_id}`);
    const billboardData = (await billboardResponse.json()) as FetchedBillboardForCinema;
    if (billboardData.length === 0) {
      APIcache.billboards[cinema.cinema_id] = null
    }
    else {
      APIcache.billboards[cinema.cinema_id] = billboardData.map(billboard => ({
        date: billboard.date,
        movies: billboard.movies.map((movie): CinemaMovieInformation => ({
          corporate_film_id: movie.corporate_film_id,
          title: movie.title,
          synopsis: movie.synopsis,
          rating: movie.rating,
          trailer_url: movie.trailer_url
        }))
      }));
    }
  }

  console.log({APIcache})
  console.log('Cache refreshed');
}

export const updateIntervalms = 1000 * 60 * 30; // 30 minutes
loadCache();

setInterval(async () => {
  console.log('Updating cache...');
  await loadCache();
}, updateIntervalms);
