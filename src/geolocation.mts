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

const MOCKED = true;

const mockResponse = (ip: string) => ({
  "ip": ip,
  "country_code2": "PE",
  "country_code3": "PER",
  "country_name": "Peru",
  "state_prov": "Lima",
  "district": "",
  "city": "Lima",
  "zipcode": "15048",
  "latitude": "-12.10925",
  "longitude": "-77.01641"
});

export async function ipLookupLocation(ip: string) {
  if (MOCKED) return mockResponse(ip);

  const data = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=00289eef0e2048bfafa1467f633764bb&ip=${ip}&fields=geo`);
  const lookup = (await data.json()) as IPLookup;

  return lookup;
}
