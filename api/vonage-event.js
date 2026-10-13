// Vonage posts call events (started, ringing, answered, completed...) here. We do not need them
// (the agent screen asks Vonage for the status itself), so we just say "got it".
// It also works as the application's Answer URL: an empty list of instructions.
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send('[]');
}
