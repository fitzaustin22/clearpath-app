import { devOnly } from '@/src/lib/devOnly';
import M5ComponentsDevHarness from './harness';

export default function M5ComponentsDevPage() {
  devOnly();
  return <M5ComponentsDevHarness />;
}
