
// Interface de la cual heredan todas las Responses
interface RouteResponse {
  code: number;
  error: string | null;
}

// +---------------------------------------------------+
// +---------------------+ RUTAS +---------------------+
// +---------------------------------------------------+
// +  Nota: Las interfaces traídas de la API empiezan  +
// +     con Fetched, para diferenciarlas de sus       +
// +        implementaciones o simplificaciones        +
// +---------------------------------------------------+

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
// 
//       Cada item tiene demasiados campos sin documentación, ni utilidad
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
//
// -------------------------------------------------------------------

// Fetched from API

type FetchedBillboardForCinemaReponse = FetchedBillboardItemForCinema[];

interface FetchedBillboardItemForCinema {
  date: string;
  movies: FetchedMovieInformation[];
}

interface FetchedMovieInformation {
  corporate_film_id: string;
  film_HO_code: string; // shared with movie version
  title: string;
  trailer_url: string;
  graphic_url: string;
  runtime: string;
  rating: string; // M14, APT (PG), etc
  synopsis: string;
  opening_date: string;
  cast: FetchedCast[];
  movie_versions: FetchedMovieVersion[];
}

interface FetchedMovieVersion {
  id: string;
  film_HOPK: string;
  title: string;
  film_HO_code: string; // here
  sessions: FetchedMovieSession[];
}

interface FetchedMovieSession {
  id: string;
  showtime: string;
  day: string;
  hour: string;
  seats_available: number;
}

interface FetchedCast {
  ID: string;
  FirstName: string;
  LastName: string;
  PersonType: 'Actor' | 'Director';
}

// Parsed from Fetched

// Implements FetchedBillboardForCinemaReponse
type FullBillboardDaysForCinema = BillboardDayForCinema[];

// Implements FetchedBillboardItemForCinema
interface BillboardDayForCinema {
  date: string;
  movies: CinemaMovieInformation[];
}

// Implements FetchedMovieInformation
interface CinemaMovieInformation {
  corporate_film_id: string;
  title: string;
  synopsis: string;
  trailer_url: string;
  poster_url: string;
  duration: number;
  rating: string; // M14, APT (PG), etc
  cast: MovieCast[];
  movie_versions: MovieVersion[];
}

// Tomamos 'film_HOPK' como id. Si bien existe la propiedad 'id', no es
// un identificador práctico, es solo la combinación de `cinema_id` y `film_HOPK`.
// Implements FetchedMovieVersion
interface MovieVersion {
  movie_version_id: string; // film_HOPK
  title: string;
  sessions: SessionForMovieVersion[];
}

// Implements FetchedMovieSession
interface SessionForMovieVersion {
  session_id: string;
  day: string;
  hour: string;
  seats_available: number;
}

// Implements FetchedCast
interface MovieCast {
  fullname: string;
  role: 'Actor' | 'Director';
}

// Implementations:

// GET api.url/cines/:cinema_id/cartelera

type MinifiedCinemaMovieInformation = Omit<CinemaMovieInformation,
  'cast' | 'movie_versions'
>;

type MinifiedBillboardDayForCinema = {
  date: string;
  movies: MinifiedCinemaMovieInformation[];
}

interface CinemaBillboardRouteResponse extends RouteResponse {
  days: MinifiedBillboardDayForCinema[];
}

// -----------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/movies/show?corporate_film_id={}
//
//     Notar que los objetos devueltos tienen la misma estructura que en los
// endpoints anteriores. Las diferencias están en el nombre y número propiedades
//                          (inconsistencia de la API)                          
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
  Cast: FetchedCast[];
  days: FetchedDayToFindAMovie[];
}

interface FetchedDayToFindAMovie {
  day: string;
  theatres: FechedTheatreToFindAMovie[];
}

interface FechedTheatreToFindAMovie {
  id: string;
  versions: FetchedMovieVersion[];
}

interface FetchedMovieVersion {
  title: string;
  FilmHOCode: string;
  FilmHOPK: string;
  showtimes: FechedMovieShowtime[]; // same as sessions
}

interface FechedMovieShowtime {
  SessionId: string;
  day: string;
  hour: string;
  seats_available: number;
}

// Implementations:

// api.url/movies/:corporate_film_id
// non implemented yet

// ------------------------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id={}&(movie_version_id)?={}
// "movie_version_id" es opcional, en la api se le conoce como "film_HOPK".
// Este endpoint devuelve exactamente el mismo formato, solo que con el array "movies" de tamaño 1.
// ------------------------------------------------------------------------------------------

// Same as FetchedBillboardForCinemaReponse, but for only one movie.
type FetchedBillboardForMovieOfCinemaResponse = FetchedBillboardItemForCinema[];

// Implementations:

// api.url/cines/:cinema_id/cartelera/:corporate_film_id

type BillboardForOnlyOneMovie = {
  date: string;
  movie_versions: MovieVersion[];
}

interface FullBillboardForMovieRouteResponse extends RouteResponse {
  days: BillboardForOnlyOneMovie[];
}
