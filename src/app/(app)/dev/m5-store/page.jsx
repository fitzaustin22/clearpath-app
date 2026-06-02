'use client';

import { useM5Store } from '@/src/stores/m5Store';

export default function M5StoreDevPage() {
  const homeDecision = useM5Store((s) => s.homeDecision);
  const qdroDecision = useM5Store((s) => s.qdroDecision);
  const pensionValuation = useM5Store((s) => s.pensionValuation);
  const supportEstimator = useM5Store((s) => s.supportEstimator);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white">
      <h1
        className="text-[#1B2A4A] mb-2"
        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '32px', fontWeight: 700 }}
      >
        m5Store — Slice Shape Inspector
      </h1>
      <p className="text-gray-600 mb-8">
        Initial-state shape inspector for the four M5 slices conformed at §13 step 2. Setters
        land alongside each tool implementation in §13 steps 3 / 4 / 5 / 7.
      </p>

      <SliceCard title="homeDecision (§9.3 / §9.10)" value={homeDecision} />
      <SliceCard title="qdroDecision (§8.10.1)" value={qdroDecision} />
      <SliceCard title="pensionValuation (§7.6.4)" value={pensionValuation} />
      <SliceCard title="supportEstimator (§6.5.1)" value={supportEstimator} />
    </div>
  );
}

function SliceCard({ title, value }) {
  return (
    <div className="bg-[#FAF8F2] border border-gray-200 rounded p-4 mb-4">
      <div className="font-semibold text-[#1B2A4A] mb-2">{title}</div>
      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
