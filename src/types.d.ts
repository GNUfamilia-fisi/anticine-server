
// Interface de la cual heredan todas las Responses
interface RouteResponse {
  code: number;
  error: string | null;
}

// +---------------------------------------------------+
// +---------------------+ RUTAS +---------------------+
// +------ Aquí se definen todas las interfaces -------+
// +---------------------------------------------------+
// +  Las interfaces que empiezan con Fetched son las  +
// +    traídas directamente desde la Cinemark API,    +
// +   el resto son implementaciones propias con la    +
// +  información necesaria y propiedades adcicionales +
// +---------------------------------------------------+

// -----------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/theatres
// -----------------------------------------------------

type FetchedTheatresResponse = FetchedTheatreItem[]

interface FetchedTheatreItem {
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
  address: string;
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
//               por ello solo se extraen los campos necesarios
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

// Implementations:

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

type MovieRating = (
  "APT (PG)" | // Apto para Todos
  "G"        | // General Exhibition
  "M"        | // Mature Audiences
  "M14"      | // Mayor a 14
  "M18"      | // Mayor a 18
  "PG"       | // Parental Guidance Recommended
  "R"        | // Restricted 16+ unless parent/guardn
  "R16"      | // Restricted To 16+
  "R18"      | // Restricted To 18+
  "TBC"        // To be confirmed
);

interface FetchedMovieInformation {
  corporate_film_id: string;
  film_HO_code: string; // shared with movie version
  title: string;
  trailer_url: string;
  graphic_url: string;
  runtime: string;
  rating: MovieRating;
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

/* --- Parsed from Fetched --- */

// Implements FetchedBillboardForCinemaReponse
type FullBillboardDaysForCinema = BillboardDayForCinema[];

// Implements FetchedBillboardItemForCinema
interface BillboardDayForCinema {
  date: string;
  movies: CinemaMovieInformation[];
}

// Acerca de los tags:
/*
 Los siguientes tags son usados para clasificar películas,
 y están definidas en la API de Cinemark.

 default_tags_versions: ['2D', '3D', 'XD'],
 default_tags_languages: ['SUB', 'DOB', 'CAS'],
 default_tags_seats: ['DBOX', 'PRE', 'BIS'], // 'TRAD' is used when 'PRE' is not present

 "3D": "Salas con pantalla 3D",
 "XD": "Pantalla gigante de 4 pisos de altura y sonido envolvente",
 "DBOX": "Sillas programadas para moverse con la película",
 "PRE": "Poltronas completamente reclinables y con descansa pies",
 "BIS": "Sillas más cómodas y un exquisito menú gourmet",
 "TRAD": "Sillas tradicionales"
*/

// Una película puede tener varios tags por categoría.
// Una MovieVersion solo puede tener un tag de cada categoría.
type MovieVersionTag = '2D' | '3D' | 'XD';
type MovieLanguageTag = 'SUB' | 'DOB' | 'CAS' | 'ESP'; // ESP no está documentado pero existe
type MovieSeatsTag = 'DBOX' | 'PRE' | 'BIS' | 'TRAD';

type RGBColor = { r: number, g: number, b: number };

// Implements FetchedMovieInformation
interface CinemaMovieInformation {
  corporate_film_id: string;
  title: string;
  synopsis: string;
  emojis: string | null; // added
  version_tags: string; // las tags de todas las versiones
  trailer_url: string;
  thumbnail_url: string;
  average_thumbnail_color: RGBColor;
  raw_thumbnail_image: string;
  duration: number;
  rating: MovieRating;
  cast: MovieCast[];
  movie_versions: MovieVersion[];
}

// Tomamos 'film_HOPK' como id. Si bien existe la propiedad 'id', no es
// un identificador práctico, es solo la combinación de `cinema_id` y `film_HOPK`.
// Implements FetchedMovieVersion
interface MovieVersion {
  movie_version_id: string; // film_HOPK
  title: string;
  version_tags: string;   // added
  language_tags: string; // added
  seats_tags: string;       // added
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
  'cast' | 'movie_versions' | 'raw_thumbnail_image'
>;

type MinifiedBillboardDayForCinema = {
  date: string;
  movies: MinifiedCinemaMovieInformation[];
}

// Cartelera separa por fechas
// (actualmente, esta ruta fue reemplazada por CinemaAllMoviesFromBillboardRouteResponse)
interface CinemaBillboardRouteResponse extends RouteResponse {
  days: MinifiedBillboardDayForCinema[];
}
interface CinemaAllMoviesFromBillboardRouteResponse extends RouteResponse {
  movies: MinifiedCinemaMovieInformation[];
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
  Rating: MovieRating;
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

type BillboardDayForOnlyOneMovie = {
  date: string;
  movie_versions: MovieVersion[];
}

interface FullBillboardForMovieRouteResponse extends RouteResponse {
  movie: Omit<CinemaMovieInformation, 'movie_versions'>;
  days: BillboardDayForOnlyOneMovie[];
}

// ------------------------------------------------------------------------------------------
// https://api.cinemark-peru.com/api/vista/data/billboard?cinema_id={}&(movie_version_id)?={}
// "movie_version_id" es opcional, en la api se le conoce como "film_HOPK".
// Este endpoint devuelve exactamente el mismo formato, solo que con el array "movies" de tamaño 1.
// ------------------------------------------------------------------------------------------

interface SeatForRoom {
  col_number: number,
  is_available: boolean,
  type: MovieSeatsTag
}

type RowsStringNames = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'; // max 10 rows

interface RowForRoom {
  row_name: RowsStringNames,
  row_number: number,
  seats: SeatForRoom[]
}

interface SessionRoomInformation {
  columns_number: number, // max 24 columns
  rows_number: number, // max 10 rows
  rows: RowForRoom[]
}

interface MovieSessionResponse extends RouteResponse {
  session: {
    session_id: string,
    day: string,
    hour: string
  }
  cinema: CinemaInformation,
  movie: Omit<CinemaMovieInformation, 'movie_versions'>,
  movie_version: Omit<MovieVersion, 'sessions'>,
  room: SessionRoomInformation
}
