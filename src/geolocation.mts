import fetch from "node-fetch"

interface IPLookup {
  ip: string;
  country_code2: string;
  country_code3: string;
  country_name: string;
  state_prov: string;
  district: string;
  city: string;
  zipcode: string;
  latitude: string;
  longitude: string;
}

export async function ipLookupLocation(ip: string) {
  // Fields = { status, country, }
  const data = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=00289eef0e2048bfafa1467f633764bb&ip=${ip}&fields=geo`);
  const lookup = (await data.json()) as IPLookup;

  return lookup;
}
