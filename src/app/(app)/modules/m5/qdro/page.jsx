'use client';

import { QDROClassifier, QDROLandingIntro } from '@/src/components/m5/QDROClassifier';
import {
  QDGPacketReadyCallout,
  QDGBlueprintSavedCallout,
  QDROCompletionCallout,
} from '@/src/components/m5/QDROClassifier/callouts';

export default function QDROPage() {
  return (
    <>
      <QDROLandingIntro />
      <QDROClassifier />
      <QDGPacketReadyCallout />
      <QDGBlueprintSavedCallout />
      <QDROCompletionCallout />
    </>
  );
}
