# APIVue

Developer progress intelligence for tracking public profiles, activity, metrics, and historical trends across connected platforms.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev -- --host 0.0.0.0 --port 5000
```

The Vite frontend is available at `http://localhost:5000`. Copy `.env.example`
to `.env` and add the Supabase values before using authentication or persisted
profiles. The public landing page remains available without those values.

### Checks

```sh
npm run build
npm run typecheck:server
npm run lint
```

The repository also includes a Replit workflow named `Start application` that
uses the same port-5000 command for Preview.
