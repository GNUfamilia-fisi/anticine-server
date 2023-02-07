// General purpose types

interface RouteResponse {
  code: number;
  error: string | null;
}

// Routes

// -----------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/theatres
// -----------------------------------------------------

type FetchedTheatresResponse = FetchedTheatreItem[]

export interface FetchedTheatreItem {
  city: string;
  cinemas: FetchedCinema[];
}

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

// Implementations:

// GET api.url/cines/cercanos

interface CinemaInformation {
  cinema_id: string;
  name: string;
  city: string;
}
// extends CinemaInformation
interface CinemaInformationWithCoords extends CinemaInformation {
  coords: {
    lat: number;
    lon: number;
  }
}

interface NearCinemasRouteResponse extends RouteResponse {
  city: string | null;
  cinemas: CinemaInformation[]
  nearest_id: string | null
}

// GET api.url/cines/all

interface AllCinemasRouteResponse extends RouteResponse {
  cinemas: CinemaInformation[];
}

// -------------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/ticketing/concession/items?cinema_id={}
// -------------------------------------------------------------------------------

interface FetchedConsessionItemsResponse {
  ConcessionItems: FetchedConcessionItem[];
  ErrorDescription: null | string;
  ResponseCode: number;
}

interface FetchedConcessionItem {
  AlternateItems: any[];
  CanGetBarcode: boolean;
  Description: string;
  DescriptionAlt: string;
  DescriptionTranslations: any[];
  DiscountsAvailable: any[];
  ExtendedDescription: string;
  ExtendedDescriptionAlt: string;
  HOPK: string;
  HeadOfficeItemCode: string;
  Id: string;
  IsAvailableForInSeatDelivery: boolean;
  IsAvailableForPickupAtCounter: boolean;
  IsRecognitionOnly: boolean;
  IsVariablePriceItem: boolean;
  ItemClassCode: string;
  LoyaltyDiscountCode: string;
  MaximumVariablePriceInCents?: number;
  MinimumVariablePriceInCents?: number;
  ModifierGroups: any[];
  PackageChildItems: any[];
  PriceInCents: number;
  RecognitionExpiryDate?: any;
  RecognitionId: number;
  RecognitionMaxQuantity: number;
  RecognitionPointsCost: number;
  RecognitionSequenceNumber: number;
  RedeemableType: number;
  RequiresPickup: boolean;
  RestrictToLoyalty: boolean;
  ShippingMethod: string;
  SmartModifiers: any[];
  VoucherSaleType: string;
}

// Implementation:

// GET api.url/cines/:cinema_id/confiteria

interface CinemaConfiteriaInformation {
  item_id: string;
  name: string;
  description: string;
  priceInCents: number;
}

interface CinemaConfiteriaRouteResponse extends RouteResponse {
  confiteria: CinemaConfiteriaInformation[];
}

// -------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id={}
// -------------------------------------------------------------------

interface FetchedBillboardItemForCinema {
  date: string;
  movies: Movie[];
}

type FetchedBillboardForCinemaReponse = FetchedBillboardItemForCinema[];

interface Movie {
  corporate_film_id: string;
  film_HO_code: string; // shared with movie version
  title: string;
  trailer_url: string;
  graphic_url: string;
  runtime: string;
  rating: string;
  synopsis: string;
  opening_date: string;
  cast: Cast[];
  movie_versions: Movieversion[];
}

interface Movieversion {
  id: string;
  film_HOPK: string;
  title: string;
  film_HO_code: string; // here
  sessions: Session[];
}

interface Session {
  id: string;
  showtime: string;
  day: string;
  hour: string;
  seats_available: number;
}

interface Cast {
  ID: string;
  FirstName: string;
  LastName: string;
  PersonType: string;
}

// Implementations:

// GET api.url/cines/:cinema_id/billboard

interface CinemaMovieInformation {
  corporate_film_id: string; // corporate_film_id
  title: string;
  synopsis: string;
  trailer_url: string;
  poster_url: string;
  duration: number; // in minutes
  rating: string; // M14, APT (PG), etc
}

interface CinemaBillboardDayInformation {
  date: string;
  movies: CinemaMovieInformation[];
}

interface CinemaBillboardRouteResponse extends RouteResponse {
  days: CinemaBillboardDayInformation[];
}

// -----------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/movies/show?corporate_film_id={}
// -----------------------------------------------------------------------------

interface FetchedMovieByFilmIDResponse {
  Title: string;
  Rating: string;
  Synopsis: string;
  OpeningDate: string;
  RunTime: string;
  TrailerUrl: string;
  GraphicUrl: string;
  CorporateFilmId: string;
  Cast: Cast[];
  days: Day[];
}

interface Day {
  day: string;
  theatres: Theatre[];
}

interface Theatre {
  id: string;
  versions: Version[];
}

interface Version {
  title: string;
  FilmHOCode: string;
  FilmHOPK: string;
  showtimes: Showtime[];
}

interface Showtime {
  SessionId: string;
  day: string;
  hour: string;
  seats_available: number;
}

interface Cast {
  ID: string;
  FirstName: string;
  LastName: string;
  PersonType: string;
}

// Implementations:

// api.url/movies/:corporate_film_id

// ---------------------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id={}&movie_version_id={}
// ---------------------------------------------------------------------------------------

type FetchedMovieVersionDatesOfCinemaResponse = MovieVersionsOfDate[]

interface MovieVersionsOfDate {
  date: string;
  movies: Movie[]; // only one
}

interface Movie {
  title: string;
  trailer_url: string;
  graphic_url: string;
  runtime: string;
  rating: string;
  film_HO_code: string;
  corporate_film_id: string;
  synopsis: string;
  opening_date: string;
  cast: Cast[];
  movie_versions: Movieversion[];
}

interface Movieversion {
  film_HOPK: string;
  title: string;
  film_HO_code: string;
  id: string;
  sessions: Session[];
}

interface Session {
  id: string;
  showtime: string;
  day: string;
  hour: string;
  seats_available: number;
}

interface Cast {
  ID: string;
  FirstName: string;
  LastName: string;
  PersonType: string;
}

// Implementations:

// api.url/cines/:cinema_id/billboard/:corporate_film_id
