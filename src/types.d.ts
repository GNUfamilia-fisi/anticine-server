
// https://api.cinemark-peru.com/api/vista/data/theatres


export interface FetchedTheatre {
  city: string;
  cinemas: FetchedCinema[];
}

type TheatresApiResponse = FetchedTheatre[]

interface FetchedCinema {
  ID: string;
  Name: string;
  PhoneNumber: string;
  Address1: string;
  Address2: string;
  City: string;
  Latitude: string;
  Longitude: string;
  LoyaltyCode: string;
  Description: string;
  Slug: string;
}

interface CinemaInformation {
  cinema_id: string;
  name: string;
  city: string;
}

// extends CinemaInformation
interface CinemaInformationWithCoords extends CinemaInformation {
  coords: {
    lat: string;
    lon: string;
  }
}

interface CinemasRouteResponse {
  cines_en_tu_ciudad: CinemaInformation[]
  cine_mas_cercano: CinemaInformation | null
}
