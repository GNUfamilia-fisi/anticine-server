
// "Type guard" para filtrar los resultados de Promise.allSettled
export function isPromiseFullfield<T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> {
  return promise.status === 'fulfilled';
}

export function removeDuplicates<T>(arr: T[], prop_name: keyof T): T[]  {
  return arr.filter(
    (item, i, self) => self.findIndex(other => other[prop_name] === item[prop_name]) === i
  );
}
