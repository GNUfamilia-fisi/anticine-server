import fetch, { Headers } from 'node-fetch';

/*:authority: www.cinemark-peru.com
:method: GET
:path: /posts.json?category=green-alert&tags=all&per_page=1&order_by=published_at&desc=true
:scheme: https
accept: *\/*
accept-encoding: gzip, deflate, br
accept-language: en-US,en;q=0.9,es;q=0.8
cookie: _gid=GA1.2.1654558725.1675482711; _cinemark-la_session=eyJzZXNzaW9uX2lkIjoiNzBiZDc3YzFjMWFlNzJmYjNkNGRkZmJmNzZhNTY4NDAiLCJfY3NyZl90b2tlbiI6IkJsd1VneFh1RmdDOXNrdFBlRUhnK3EyOVRBaVpTTlQrSlBzb2ljbWlDOGM9In0%3D--59840d1adf401bbe6eb5cc5a07ea6ddcd9ca0e05; _gcl_au=1.1.1751685644.1675558059; _clck=k556qf|1|f8x|0; _gat_UA-125280698-1=1; _clsk=1wvq1p7|1675733502038|25|1|j.clarity.ms/collect; _ga_NCVH5X9JM1=GS1.1.1675731854.10.1.1675733509.52.0.0; _ga=GA1.1.1413784692.1675482711
referer: https://www.cinemark-peru.com/
sec-ch-ua: "Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Linux"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
x-requested-with: XMLHttpRequest
*/

const headers = {
  "accept": "*/*",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9,es;q=0.8",
  "cookie": "_gid=GA1.2.1654558725.1675482711; _cinemark-la_session=eyJzZXNzaW9uX2lkIjoiNzBiZDc3YzFjMWFlNzJmYjNkNGRkZmJmNzZhNTY4NDAiLCJfY3NyZl90b2tlbiI6IkJsd1VneFh1RmdDOXNrdFBlRUhnK3EyOVRBaVpTTlQrSlBzb2ljbWlDOGM9In0%3D--59840d1adf401bbe6eb5cc5a07ea6ddcd9ca0e05; _gcl_au=1.1.1751685644.1675558059; _clck=k556qf|1|f8x|0; _gat_UA-125280698-1=1; _clsk=1wvq1p7|1675733502038|25|1|j.clarity.ms/collect; _ga_NCVH5X9JM1=GS1.1.1675731854.10.1.1675733509.52.0.0; _ga=GA1.1.1413784692.1675482711",
  "referer": "https://www.cinemark-peru.com/",
  "sec-ch-ua-platform": "OpenBSD",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; OpenBSD i386) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
}

export async function apifetch<T>(url: string, method: string = 'GET') {
  try {
    const response = await fetch(url, { method, headers });
    const data = (await response.json()) as T;
    return data;
  }
  catch {
    return null;
  }
}
