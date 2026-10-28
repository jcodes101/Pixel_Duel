# Pixel Duel deployment

## Recommendation

Use one Render web service for both the static game and the Socket.IO server. The existing Express process serves `public/` and Socket.IO on the same origin, so this keeps `/socket.io` and `/assets/...` same-origin and avoids a separate CORS or proxy configuration. The project already reads the platform `PORT`, binds to `0.0.0.0`, and exposes `/healthz`.

The checked-in `render.yaml` is a deployment blueprint only. It does not create a service or deploy the application, and it sets automatic deploys to off. After publishing the repository to a Git provider and approving a Render service, connect that repository as a **Web Service**, use the blueprint settings, and trigger a manual deploy when ready.

1. Select the repository and `main` branch in Render.
2. Use `render.yaml` (or enter its values in the dashboard): build `npm ci`, start `npm start`, health check `/healthz`.
3. Keep the service at one instance. The authoritative room state is in memory; horizontal scaling would require a shared Socket.IO adapter and shared room state.
4. For dependable public matches, select a paid always-on instance. The free instance is useful for previews and hobby play, but Render may spin it down after 15 minutes without incoming HTTP or WebSocket messages; waking it can take about a minute. Free instances can also restart, which ends live rooms. [Render free service limits](https://render.com/docs/free), [Render WebSocket behavior](https://render.com/docs/websocket).
5. No secrets or environment variables are required for the current game. Do not add a database for the current in-memory rooms.

Render supports inbound WebSocket connections and HTTP health checks. `render.yaml` disables automatic deployments, so connecting the repository does not publish a commit until an operator triggers a deploy. [WebSockets on Render](https://render.com/docs/websocket), [Render health checks](https://render.com/docs/health-checks), [Blueprint configuration](https://render.com/docs/blueprint-spec).

## Hosting options

| Option | Fit for Pixel Duel | Setup and limitations |
| --- | --- | --- |
| **A. One Render web service** | **Recommended** | Serves the existing frontend and persistent Socket.IO server from one Node process and one origin. Configure one instance because rooms live in memory. Free is suitable for demos; use an always-on paid plan for public matches. |
| **B. Netlify frontend + separate Socket.IO service** | Works, but adds setup | Requires a separately hosted persistent backend, a public socket URL, and cross-origin configuration or a proxy. Netlify Functions have bounded invocation lifetimes (60 seconds synchronous and up to 15 minutes for background functions), so they are not a replacement for this always-on room server. [Netlify function limits](https://docs.netlify.com/build/functions/configuration/). |
| **C. Another platform** | No simpler fit identified | The game already has a conventional Node web server and Socket.IO endpoint. Choosing another provider would still require persistent WebSocket support and a process for the room state, without reducing the required architecture work. |

## Operational notes

- A room is lost if the service restarts; clients are told the match was interrupted and must create or join another room. The client deliberately does not restore a match from a room code or player index.
- Do not scale this service above one instance until room state and Socket.IO broadcasts use shared infrastructure.
- Static paths are absolute from the site root (`/assets/...` and `/js/...`), which works when Express serves the app at `/`.
- `GET /healthz` returns `200` and `{"status":"ok"}` for platform health probes.
