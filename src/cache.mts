import fetch from 'node-fetch';
import { CinemaConfiteriaInformation, CinemaInformationWithCoords, FetchedConsessionItemsResponse, FetchedTheatresResponse } from "./types";

export const APIcache = {
  all_cinemas: [] as CinemaInformationWithCoords[],
  confiterias: {} as Record<string, CinemaConfiteriaInformation[] | undefined>
};

export async function loadCache() {
  // load all cinemas
  const response = await fetch('https://api.cinemark-peru.com/api/vista/data/theatres');
  const data_theatres = (await response.json()) as FetchedTheatresResponse;
  const cinemas = data_theatres
    .map(c => c.cinemas).flat()
    .map((theatre): CinemaInformationWithCoords => ({
      cinema_id: theatre.ID,
      name: theatre.Name.replace(/cinemark/i, 'CiNEXT'),
      city: theatre.City,
      coords: { lat: Number(theatre.Latitude), lon: Number(theatre.Longitude) }
  }));

  APIcache.all_cinemas = cinemas;

  // load confiterias for each cinema
  for (const cinema of APIcache.all_cinemas) {
    const response = await fetch(`https://api.cinemark-peru.com/api/vista/ticketing/concession/items?cinema_id=${cinema.cinema_id}`);
    const data = (await response.json()) as FetchedConsessionItemsResponse;
    if (data.ErrorDescription || data.ResponseCode === 4) {
      APIcache.confiterias[cinema.city] = [];
      continue;
    }
    APIcache.confiterias[cinema.city] = data.ConcessionItems.map(item => ({
      item_id: item.Id,
      name: item.Description,
      description: item.ExtendedDescription,
      priceInCents: item.PriceInCents
    }));
  }

  console.log('Cache refreshed');
}

export const updateIntervalms = 1000 * 60 * 30; // 30 minutes
loadCache();

setInterval(async () => {
  console.log('Updating cache...');
  await loadCache();
}, updateIntervalms);
