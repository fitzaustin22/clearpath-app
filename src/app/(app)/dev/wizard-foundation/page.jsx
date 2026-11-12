import { devOnly } from '@/src/lib/devOnly';
import WizardFoundationDevHarness from './harness';

export default function WizardFoundationDevPage() {
  devOnly();
  return <WizardFoundationDevHarness />;
}
