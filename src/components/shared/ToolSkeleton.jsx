'use client';

/**
 * ToolSkeleton — animated placeholder shown during store hydration.
 * Matches the approximate layout shape of each M5 tool so there's no layout
 * shift when the real content renders.
 */
export default function ToolSkeleton({ tool }) {
  const block = 'bg-gray-200 rounded animate-pulse';

  return (
    <div className="min-h-[600px] bg-[#FAF8F2] p-6 rounded-lg">
      {/* Header — common to all */}
      <div className={`${block} h-8 w-2/3 mb-2`} />
      <div className={`${block} h-4 w-1/2 mb-6`} />

      {tool === 'home-decision' && <HomeDecisionShape block={block} />}
      {tool === 'qdro' && <QDROShape block={block} />}
      {tool === 'support' && <SupportShape block={block} />}
    </div>
  );
}

function HomeDecisionShape({ block }) {
  return (
    <>
      <div className="mb-6">
        {Array.from({ length: 5 }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-3 gap-3 mb-3">
            <div className={`${block} h-10`} />
            <div className={`${block} h-10`} />
            <div className={`${block} h-10`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${block} h-8 w-28 rounded-full`} />
        ))}
      </div>
      <div className={`${block} h-48`} />
    </>
  );
}

function QDROShape({ block }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${block} h-24`} />
        ))}
      </div>
      <div className={`${block} h-64`} />
    </>
  );
}

function SupportShape({ block }) {
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`${block} h-8 w-8 rounded-full`} />
            <div className={`${block} h-3 w-16`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className={`${block} h-10`} />
        <div className={`${block} h-10`} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`${block} h-10`} />
        <div className={`${block} h-10`} />
      </div>
      <div className={`${block} h-48`} />
    </>
  );
}
