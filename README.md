# CiNEXT `server`

Server for the CiNEXT emulator program.

<img src="https://raw.githubusercontent.com/GNUfamilia-fisi/CiNEXT/main/media/CiNEXT%20logo.png"/>

## Endpoints

### GET `/`

Responde con el estado de la API (o nunca responde).

```json
{
    "status": "OK",
    "code": 200,
    "error": null
}
```

### GET `/cines/cercanos`

Devuelve la lista de los cines disponibles en la ciudad del usuario.

<details>
  <summary>Detalles</summary>

Si existe, lista de `cinemas` estará ordenada por cercanía al usuario.
El primer cine siempre será el más cercano.

Para determinar la ciudad y las coordenadas aproximadas del usuario, se hace
uso de la librería [geoip-lite](https://www.npmjs.com/package/geoip-lite).

Respuesta exitosa:

```jsonc
{
    "city": "Lima",
    "cinemas": [
        {
            "cinema_id": "2705",
            "name": "Cinemark Gamarra",
            "city": "Lima"
        },
        // ...
    ],
    "nearest_id": "2705",
    "code": 200,
    "error": null
}
```

Cuando no hay cines disponibles en la ciudad del usuario, devuelve:

```json
{
    "city": "<nombre_de_la_ciudad_muy_muy_lejana>",
    "cinemas": [],
    "nearest_id": null,
    "code": 404,
    "error": "No hay cines disponibles en tu ciudad"
}
```

Cuando no se puede determinar la ubicación del usuario, devuelve:

```json
{
    "city": null,
    "cinemas": [],
    "nearest_id": null,
    "code": 500,
    "error": "No se pudo determinar la ubicación"
}
```

En caso de errores internos, devuelve:

```json
{
    "city": null,
    "cinemas": [],
    "nearest_id": null,
    "code": 503,
    "error": "Error al cargar los cines"
}
```

En cualquiera de estos casos, se recomienda usar el endpoint `/cines` para
obtener la lista completa de cines disponibles.

</details>

### GET `/cines/{cinema_id}/confiteria`

Devuelve los productos en la confitería de un cine.

<details>
    <summary>Detalles</summary>

Respuesta exitosa:

```json
{
    "confiteria": [
        {
            "item_id": "528",
            "name": "*COMBO TRIO CMK SAL",
            "description": "3 Canchitas medianas saladas + 3 Gaseosas medianas",
            "priceInCents": 7100
        },
        {
            "item_id": "529",
            "name": "*COMBO DUO CMK SAL",
            "description": "2 Canchitas grandes saladas + 2 Gaseosas grandes",
            "priceInCents": 5600
        },
    ],
    "code": 200,
    "error": null
}
```

Si el `cinema_id` proporcionado no pertenece a ningún cine, devuelve:

```json
{
    "confiteria": [],
    "code": 404,
    "error": "Cine no encontrado"
}
```

</details>

---

## Sobre la API

HTTP API desarrollada con [Express](https://expressjs.com/) para
[CiNEXT](https://github.com/GNUfamilia-fisi/CiNEXT).
