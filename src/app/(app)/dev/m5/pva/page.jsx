import { devOnly } from '@/src/lib/devOnly';
import PVADevHarness from './harness';

// The harness reads search params on the client; never prerender this route.
export const dynamic = 'force-dynamic';

export default function PVADevPage() {
  devOnly();
  return <PVADevHarness />;
}
