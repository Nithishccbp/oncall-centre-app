# GET /today
Returns the Today dashboard for the logged-in agent. Set `VITE_API_BASE` and the app calls `GET {VITE_API_BASE}/today` with `Authorization: Bearer <og_token>`.
The response shape is the `B2BData` type in `src/data/b2b.ts` (in, out, kpis, plan, now, peak, make[], inc[], rec[], csat[], habit, spark, hours[], hourNow).
