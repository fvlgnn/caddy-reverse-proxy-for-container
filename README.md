# Caddy reverse proxy for containers

Minimal example of a Caddy reverse proxy in front of a static frontend and a
configurable mock API, with all services running in containers on the same
Docker Compose network.

The example demonstrates both common path-routing behaviours:

- `/app-be/*` uses `handle_path`, so Caddy removes `/app-be` before forwarding
  the request;
- `/sub-path/*` uses `handle`, so the backend receives the complete path;
- `/app-fe/*` removes the prefix and serves the frontend;
- every other path is sent to the frontend.

## Architecture

```text
Browser ── http://localhost:8000 ── Caddy
                                      ├── /app-be/*   ──> mock API :8080
                                      ├── /sub-path/* ──> mock API :8080
                                      └── everything  ──> NGINX :8080
```

The backend uses the versioned multi-architecture image published by
[`fvlgnn/go-mock-api-server`](https://github.com/fvlgnn/go-mock-api-server):
`ghcr.io/fvlgnn/go-mock-api-server:1.0.0`. The mock definitions in
`app-be/*.json` are mounted at runtime on `/config` as a read-only volume, so
this repository no longer downloads or compiles the backend source.

## Requirements

- Docker Engine or Docker Desktop
- Docker Compose v2 or v5 (`docker compose`)

The Compose file is named `compose.yaml`: Docker documents this as the preferred
name. `compose.yml` is also supported, while `docker-compose.yaml` and
`docker-compose.yml` are retained mainly for backward compatibility.

## Start the example

```sh
docker compose pull
docker compose up --build -d --wait
```

Open <http://localhost:8000/> and select **Ottieni dati**, or test the routes
directly:

```sh
curl http://localhost:8000/app-be/v1/get/once
curl http://localhost:8000/app-be/sub-path/v1/get
curl http://localhost:8000/sub-path/v1/get
```

Expected routing:

| Public request | Request received by the service | Service |
|---|---|---|
| `/` | `/` | frontend |
| `/app-fe/` | `/` | frontend |
| `/app-be/v1/get/once` | `/v1/get/once` | mock API |
| `/app-be/sub-path/v1/get` | `/sub-path/v1/get` | mock API |
| `/sub-path/v1/get` | `/sub-path/v1/get` | mock API |

Stop and remove the containers and network with:

```sh
docker compose down
```

## `handle` and `handle_path`

Use `handle` when the upstream must receive the original request path:

```caddyfile
handle /sub-path/* {
	reverse_proxy app-be:8080
}
```

A request for `/sub-path/v1/get` is forwarded as `/sub-path/v1/get`.

Use `handle_path` when the public prefix is only a routing concern and the
upstream must not receive it:

```caddyfile
handle_path /app-be/* {
	reverse_proxy app-be:8080
}
```

A request for `/app-be/v1/get/once` is forwarded as `/v1/get/once`.

The final matcher-less `handle` in the Caddyfile is the explicit frontend
fallback. Requests to `/app-fe` and `/app-be` are redirected to their canonical
trailing-slash forms.

## CORS and frontend development

### Normal Compose usage: CORS is not needed

The bundled frontend calls the relative URL `/app-be/v1/get/once`. The page and
the API therefore share the same scheme, hostname and port through Caddy. This
is a **same-origin** request and browsers do not apply CORS restrictions.

Do not replace the relative URL with `http://localhost:8000/...`: an absolute
localhost URL breaks when another hostname, IP address, port or HTTPS is used.

### Separate development server: CORS is needed

During development, a frontend may instead run on another origin, for example
Vite on `http://localhost:5173`, while the API remains behind Caddy on
`http://localhost:8000`. Caddy allows that single origin by default:

```sh
docker compose up --build -d
```

From the development frontend, call the full proxy URL:

```js
fetch('http://localhost:8000/app-be/v1/get/once')
```

For a different development origin, set it before starting Compose:

```sh
CORS_ORIGIN=http://localhost:4200 docker compose up --build -d
```

The value must be an origin only—scheme, hostname and optional port, without a
path or trailing slash. The browser's `Origin` header must match it exactly.

CORS is implemented at Caddy, where the API is exposed, rather than at NGINX,
which only serves static files. Preflight requests are accepted for the common
HTTP methods and for `Content-Type` and `Authorization`. If your development
client sends other custom headers, add them explicitly to
`Access-Control-Allow-Headers` in `caddy/Caddyfile`.

The configuration intentionally does not use `Access-Control-Allow-Origin: *`:
allowing every website is unnecessary for this example and is unsafe once an
API gains sensitive data or credentials. Only one development origin is
enabled at a time. Same-origin requests continue to work regardless of the
configured CORS origin.

Useful checks when a browser reports a CORS failure:

```sh
curl -i \
  -H 'Origin: http://localhost:5173' \
  http://localhost:8000/app-be/v1/get/once

curl -i -X OPTIONS \
  -H 'Origin: http://localhost:5173' \
  -H 'Access-Control-Request-Method: GET' \
  http://localhost:8000/app-be/v1/get/once
```

If the response lacks `Access-Control-Allow-Origin`, compare the request origin
with `CORS_ORIGIN` and recreate the Caddy container after changing the value.

## Mock API configuration

Each JSON file in `app-be` declares a method, path and response body. For
example:

```json
{
  "request": {
    "method": "GET",
    "path": "/v1/get/once"
  },
  "response": {
    "status": 200,
    "headers": {
      "Cache-Control": "no-store"
    },
    "body": { "id": 1, "name": "Foo Bar", "location": "City" }
  }
}
```

The supported response fields are:

- `status`: optional HTTP status code, default `200`;
- `headers`: optional response headers;
- `body`: required JSON response body.

The server loads the files once at startup. After adding or changing a mock,
restart the backend:

```sh
docker compose restart app-be
```

Each method/path pair must be unique. Different methods can use the same path,
for example `GET /users` and `POST /users`.

## Run the containers manually

Compose is recommended, but the equivalent manual workflow is useful for
learning how service-name discovery works:

```sh
docker network create my-apps-network

docker run -d --name app-be \
  --network my-apps-network \
  -e CONFIG_DIR=/config \
  -e SERVER_PORT=8080 \
  -v "$(pwd)/app-be:/config:ro" \
  ghcr.io/fvlgnn/go-mock-api-server:1.0.0

docker build -t demo-app-fe ./app-fe
docker run -d --name app-fe --network my-apps-network demo-app-fe

docker build -t demo-caddy ./caddy
docker run -d --name caddy \
  --network my-apps-network \
  -e CORS_ORIGIN=http://localhost:5173 \
  -p 8000:80 \
  demo-caddy
```

Cleanup:

```sh
docker rm -f caddy app-fe app-be
docker network rm my-apps-network
```

To mount a Caddyfile during local experimentation instead of rebuilding the
image:

```sh
docker run -d --name caddy \
  --network my-apps-network \
  -e CORS_ORIGIN=http://localhost:5173 \
  -p 8000:80 \
  -v "$(pwd)/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine
```

## Production and HTTPS

The included `:80` site and `8000:80` port mapping are deliberately intended
for a local demonstration. Publishing port 443 alone does not enable HTTPS.

For a real deployment:

1. replace `:80` in the Caddyfile with a DNS name such as `example.com`;
2. publish ports `80:80`, `443:443` and `443:443/udp`;
3. point the domain's A/AAAA records at the server;
4. persist Caddy's `/data` and `/config` directories with named volumes;
5. review authentication, authorization, CORS and the recommendations in
   `SECURITY.md` before exposing the mock API.

Caddy will then obtain and renew certificates and redirect HTTP to HTTPS. The
frontend can keep using relative API URLs without environment-specific changes.

## Validation and maintenance

The GitHub Actions workflow validates the Compose model, builds and starts the
stack, then smoke-tests every documented route. It does not perform automatic
security scanning. Dependabot opens Docker image update proposals so version
changes remain explicit and reviewable. The backend deliberately uses a SemVer
tag rather than `latest`, keeping every checkout reproducible.

Useful local checks:

```sh
docker compose config --quiet
docker compose pull
docker compose build
docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
```

## License

Released under the [MIT License](LICENSE).
