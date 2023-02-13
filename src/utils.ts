
// "Type guard" para filtrar los resultados de Promise.allSettled
export function isPromiseFullfield<T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> {
  return promise.status === 'fulfilled';
}
