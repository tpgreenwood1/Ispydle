import { rateLimited, withErrors } from "./_lib/http.js";
import { incrementCounter } from "./_lib/queries.js";

// Counts Share taps and nothing else (share-spec §4).
export const POST = withErrors(async (req) => {
  const limited = rateLimited(req);
  if (limited) return limited;
  await incrementCounter("share_clicked");
  return new Response(null, { status: 204 });
});
