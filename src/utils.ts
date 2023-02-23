import downloadImg from 'image-downloader';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// "Type guard" para filtrar los resultados de Promise.allSettled
export function isPromiseFullfield<T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> {
  return promise.status === 'fulfilled';
}

export function removeDuplicates<T>(arr: T[], prop_name: keyof T): T[] {
  return arr.filter(
    (item, i, self) => self.findIndex(other => other[prop_name] === item[prop_name]) === i
  );
}

export function uniqueValues<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function randomInt(min: number, max: number) {
  if (min >= max) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomProbability(probability: number) {
  return Math.random() < probability;
}

export function randomChoose<T>(arr: T[]) {
  return arr[randomInt(0, arr.length - 1)];
}

/* Movie title tags */

const version_tags = ['2D', '3D', 'XD'] as MovieVersionTag[];
const language_tags = ['SUB', 'DOB', 'CAS', 'ESP'] as MovieLanguageTag[];
const seats_tags = ['DBOX', 'PRE', 'BIS', 'TRAD'] as MovieSeatsTag[];

interface MovieTags {
  version_tags: string;
  language_tags: string;
  seats_tags: string;
}

/**
 * Extrae las tags del título de la película
 * @param title título de la película
 * @example
 * const tags = getTagsFromMovieTitle("Gato con botas (SUB 3D XD DBOX)");
 * // console.log({ tags })
 * {
 *    tags: {
 *      version_tags: "3D XD",
 *      language_tags: "SUB",
 *      seats_tags: "DBOX"
 *    }
 * }
 */
export function getTagsFromMovieTitle(title: string): MovieTags {
  // Valores por defecto
  const foundTags: MovieTags = {
    version_tags: "2D",
    language_tags: "DOB",
    seats_tags: "TRAD"
  };

  const match = title.match(/\(([^)]+)\)/)
  if (match === null) {
    return foundTags;
  }
  const matchedTags = match[1]?.split(' ').map(tag => tag.trim());

  const versions_found = matchedTags.filter(tag => version_tags.includes(tag as MovieVersionTag));
  if (versions_found.length > 0) {
    foundTags.version_tags = versions_found.join(' ');
  }

  const language_found = matchedTags.filter(tag => language_tags.includes(tag as MovieLanguageTag));
  if (language_found) {
    foundTags.language_tags = language_found.join(' ');
  }

  const seats_found = matchedTags.filter(tag => seats_tags.includes(tag as MovieSeatsTag));
  if (seats_found.length > 0) {
    foundTags.seats_tags = seats_found.join(' ');
  }

  return foundTags;
}

/* Download image from url */

const CACHE_DIR = path.join(process.cwd(), 'cache');

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR);

export async function downloadImageToCache(url: string, filename: string) {
  const destination = `${path.join(CACHE_DIR, filename)}.jpg`;
  if (existsSync(destination)) {
    return destination;
  }

  // TODO: handle downloading error
  return (await downloadImg.image({ url: url, dest: CACHE_DIR })).filename;
}
