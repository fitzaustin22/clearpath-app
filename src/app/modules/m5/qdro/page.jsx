'use client';

import { QDROClassifier } from '@/src/components/m5/QDROClassifier';
import { QDGPacketReadyCallout } from '@/src/components/m5/QDROClassifier/callouts';

export default function QDROPage() {
  return (
    <>
      <QDGPacketReadyCallout />
      <QDROClassifier />
    </>
  );
}
