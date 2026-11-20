# Chess API

## Submission

[submission-portfolio-01](https://gitlab.hrz.tu-chemnitz.de/mmdh-at-tu-chemnitz.de/submission-portfolio-01/-/tags/submission-portfolio-01)

## Requirements

- [Bun](https://bun.com)
- [Caddy](https://caddyserver.com)
- [xh](https://github.com/ducaale/xh) or curl for testing

## Running

### Start the Web Application Server

Open a terminal in the project root and run:

```sh
cd web-application-server
bun install
bun run dev
```

It listens on `127.0.0.1:3000` and restarts whenever a file changes.

It starts once `src/controller/api.js` and `src/server-view/serialize.js` exist, which `src/app.js` imports.

### Start the Web Server

Open a second terminal from the project root and run:

```sh
caddy run --config web-server/Caddyfile
```

Caddy serves `https://localhost:8443` with its own certificate, which your browser and your HTTP client flag as untrusted.

It forwards every request under `/api/` to the web application server.

Stop either server with `Ctrl+C`.

## Testing

Using xh:

```sh
xh get --verify=no https://localhost:8443/api/board/square square==e1
```

Using curl:

```sh
curl -k "https://localhost:8443/api/board/square?square=e1"
```