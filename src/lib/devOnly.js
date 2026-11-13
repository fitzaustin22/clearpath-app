import { notFound } from 'next/navigation';

// QA harness routes under src/app/(app)/dev must never render outside `next dev`.
// Call this first in each dev page's server component. Anything other than
// NODE_ENV=development (production, preview, test) gets a 404.
export function devOnly() {
  if (process.env.NODE_ENV !== 'development') notFound();
}
