# caddy-reverse-proxy-for-container

Reverse proxy with Caddy for containerized web applications

## docker-compose

```sh
# up
docker-compose up --build -d

# down
docker-compose down
```


## docker

### Network

#### Create

```sh
docker network create my-apps-network
```

#### Delete

```sh
docker network rm my-apps-network
```


### app-be (BackEnd app)

```sh
cd app-be
docker build -t app-be .
docker run --name app-be -it -d --network my-apps-network app-be
# DEBUG # docker run --name app-be -it --rm -p 3030:3030 --network my-apps-network app-be
```


### app-fe (FrontEnd app)

```sh
cd app-fe
docker build -t app-fe .
docker run --name app-fe -it -d --network my-apps-network app-fe
# DEBUG # docker run --name app-fe -it --rm -p 8080:8080 --network my-apps-network app-fe
```

Endpoint app-be in `app-fe/script.js` (`XMLHttpRequest`) 


### caddy (Reverse Proxy)

```sh
cd caddy
docker build -t caddy .
docker run --name caddy -it -d -p 8000:80 --network my-apps-network caddy
# DEBUG # docker run --name caddy -it --rm -p 8000:80 --network my-apps-network caddy
```


## Test app-fe

- http://localhost:8000/
- http://localhost:8000/app-fe/


### Test app-be

- http://localhost:8000/app-be/v1/get/once
- http://localhost:8000/app-be/sub-path/v1/get
- http://localhost:8000/sub-path/v1/get


## Caddyfile


### Configuration without handle path

For instance, a request to the endpoint http://caddy/sub-path/v1/get will be forwarded to http://app-be/sub-path/v1/get

```
:80 {
    reverse_proxy /sub-path/* app-be:3030
}
```


### Configuration with handle path

For instance, a request to the endpoint http://caddy/sub-path/v1/get will be forwarded to http://app-be/v1/get

```
:80 {
    handle_path /sub-path/* {
        reverse_proxy app-be:3030
    }
}
```


## Tips

Run with configuration as volume

```bash
docker run -d --name caddy \
  --network my-apps-network \
  -p 80:80 \
  -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
  caddy
```


## Example

Configuration Angular FE

### Local Test

```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://localhost:8000/sub-path/v1/get',
};
```

### Production 


```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://example.com/sub-path/v1/get',
};
```

### IP addr

Private or public 

```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://192.168.1.100:8000/sub-path/v1/get',
};
```

