# Weinkeller – Web und Mobile (Angular + Capacitor)

- `npm start`: Dev-Server auf http://localhost:4200, `/api` wird per `proxy.conf.json` an http://localhost:5000 weitergeleitet.
- `npm run build`: Produktions-Build nach `dist/web/browser` (wird vom ASP.NET-Core-Host aus `wwwroot` ausgeliefert, relative URLs `/api/...`).
- `npm test`: Unit-Tests (Vitest).
- `npm run cap:sync`: Build und `cap sync`. Die Plattformen werden mit `npx cap add android|ios` angelegt.
  Auf Mobilgeräten gibt man beim ersten Start die Server-Adresse ein.
