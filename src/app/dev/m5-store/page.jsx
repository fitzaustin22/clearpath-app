'use client';

import { useM5Store } from '@/src/stores/m5Store';

export default function M5StoreDevPage() {
  const a1 = useM5Store((s) => s.homeDecision.inputs.A1);
  const activeTab = useM5Store((s) => s.homeDecision.activeTab);
  const i1 = useM5Store((s) => s.supportEstimator.inputs.I1);
  const spousalResults = useM5Store((s) => s.supportEstimator.spousalResults);
  const selectedState = useM5Store((s) => s.supportEstimator.selectedState);

  const updateHomeDecisionInput = useM5Store((s) => s.updateHomeDecisionInput);
  const setHomeDecisionActiveTab = useM5Store((s) => s.setHomeDecisionActiveTab);
  const resetHomeDecision = useM5Store((s) => s.resetHomeDecision);
  const updateSupportInput = useM5Store((s) => s.updateSupportInput);
  const setSupportSpousalResults = useM5Store((s) => s.setSupportSpousalResults);
  const updateSupportState = useM5Store((s) => s.updateSupportState);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white">
      <h1
        className="text-[#1B2A4A] mb-2"
        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '32px', fontWeight: 700 }}
      >
        m5Store — Dev Smoke Test
      </h1>
      <p className="text-gray-600 mb-8">
        Run each numbered test below. After test 4, reload the page — activeTab should persist as
        &quot;trueCost&quot;.
      </p>

      <div className="bg-[#FAF8F2] border border-gray-200 rounded p-4 mb-6">
        <div className="grid grid-cols-2 gap-2 text-sm text-[#1B2A4A]">
          <div className="font-semibold">homeDecision.inputs.A1:</div>
          <div>{String(a1)}</div>
          <div className="font-semibold">homeDecision.activeTab:</div>
          <div>{String(activeTab)}</div>
          <div className="font-semibold">supportEstimator.inputs.I1:</div>
          <div>{String(i1)}</div>
          <div className="font-semibold">supportEstimator.spousalResults:</div>
          <div>{JSON.stringify(spousalResults)}</div>
          <div className="font-semibold">supportEstimator.selectedState:</div>
          <div>{String(selectedState)}</div>
        </div>
      </div>

      <div className="space-y-3">
        <Row
          label="1. updateHomeDecisionInput('A1', 500000)"
          expected="A1 becomes 500000"
          onClick={() => updateHomeDecisionInput('A1', 500000)}
        />
        <Row
          label="2. resetHomeDecision()"
          expected="A1 returns to null"
          onClick={() => resetHomeDecision()}
        />
        <Row
          label="3a. updateSupportInput('I1', 5000)"
          expected="I1 becomes 5000"
          onClick={() => updateSupportInput('I1', 5000)}
        />
        <Row
          label="3b. setSupportSpousalResults({ amount: 800 })"
          expected="spousalResults becomes { amount: 800 }"
          onClick={() => setSupportSpousalResults({ amount: 800 })}
        />
        <Row
          label="3c. updateSupportInput('I1', 6000)  ← cascade test"
          expected="I1 becomes 6000 AND spousalResults returns to null"
          onClick={() => updateSupportInput('I1', 6000)}
        />
        <Row
          label="4. setHomeDecisionActiveTab('trueCost') then reload"
          expected="activeTab persists across reload"
          onClick={() => setHomeDecisionActiveTab('trueCost')}
        />
        <Row
          label="5. updateSupportState('ny')"
          expected="selectedState becomes ny, other inputs preserved"
          onClick={() => updateSupportState('ny')}
        />
      </div>
    </div>
  );
}

function Row({ label, expected, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 border border-gray-200 rounded">
      <div className="flex-1">
        <div className="font-mono text-sm text-[#1B2A4A]">{label}</div>
        <div className="text-xs text-gray-500">Expected: {expected}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="bg-[#1B2A4A] text-white px-3 py-2 rounded text-sm"
      >
        Run
      </button>
    </div>
  );
}
