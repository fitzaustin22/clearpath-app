import { devOnly } from '@/src/lib/devOnly';
import M5StoreDevHarness from './harness';

export default function M5StoreDevPage() {
  devOnly();
  return <M5StoreDevHarness />;
}
