// Vonage posts call events (started, ringing, answered, completed, failed...) here. The agent screen asks
// Vonage for the status itself, so we only write the event into the Vercel logs (handy when a call fails:
// Vercel project, Logs, search "vonage-event"). No phone numbers are logged.
// It also works as the application's Answer URL: an empty list of instructions.
export default function handler(req, res) {
  try {
    const b = req.body || {};
    console.log('vonage-event', JSON.stringify({ status: b.status, reason: b.reason, detail: b.detail, direction: b.direction, duration: b.duration, type: b.type, error: b.error, title: b.title }));
  } catch { /* logging only */ }
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send('[]');
}
