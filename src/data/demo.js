// Sample data switch. Default: every list is empty and every number is zero, so the screens fill from the backend
// (see /api/ingest). Set VITE_DEMO_DATA=1 in Vercel (or a .env file) to bring back the sample data for demos.
export const DEMO = import.meta.env.VITE_DEMO_DATA === '1';
