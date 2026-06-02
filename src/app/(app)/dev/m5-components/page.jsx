'use client';

import { useState } from 'react';
import ToolSkeleton from '@/src/components/shared/ToolSkeleton';
import ToolErrorBoundary from '@/src/components/shared/ToolErrorBoundary';
import ConfirmModal from '@/src/components/shared/ConfirmModal';
import ResultsSummaryCard from '@/src/components/shared/ResultsSummaryCard';
import BigNumber from '@/src/components/shared/BigNumber';
import Tooltip from '@/src/components/shared/Tooltip';
import StaleGuidelineBanner from '@/src/components/shared/StaleGuidelineBanner';
import Breadcrumbs from '@/src/components/shared/Breadcrumbs';
import Stepper from '@/src/components/shared/Stepper';
import { useToast } from '@/src/hooks/useToast';

function Section({ title, children }) {
  return (
    <section className="mb-12 pb-8 border-b border-gray-200">
      <h2
        className="text-[#1B2A4A] mb-4"
        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '28px', fontWeight: 700 }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function ExplodingComponent() {
  throw new Error('Intentional test error');
}

function ExplodingTrigger() {
  const [boom, setBoom] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setBoom(true)}
        className="bg-[#C0392B] text-white px-4 py-2 rounded"
      >
        Throw error inside boundary
      </button>
      {boom && <ExplodingComponent />}
    </div>
  );
}

export default function M5ComponentsDevPage() {
  const { show } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [chkChecked, setChkChecked] = useState(false);

  const [stepIdx, setStepIdx] = useState(2);
  const completed = [0, 1];
  const steps = [
    { id: 'income', label: 'Income' },
    { id: 'kids', label: 'Kids' },
    { id: 'addons', label: 'Add-ons' },
    { id: 'results', label: 'Results' },
    { id: 'next', label: 'Next Steps' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white">
      <h1
        className="text-[#1B2A4A] mb-2"
        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '36px', fontWeight: 700 }}
      >
        M5 Shared Components — Dev Preview
      </h1>
      <p className="text-gray-600 mb-8">Manual visual inspection target for the M5 unblocker bundle.</p>

      <Section title="Breadcrumbs">
        <Breadcrumbs
          segments={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'M5: Value What Matters', href: '/modules/m5' },
            { label: 'Home Decision Analyzer', href: null },
          ]}
        />
      </Section>

      <Section title="Stepper">
        <Stepper
          steps={steps}
          activeIndex={stepIdx}
          completedIndices={completed}
          onStepClick={(i) => setStepIdx(i)}
        />
        <p className="text-xs text-gray-500 mt-3">
          Active index: {stepIdx}. Click completed steps (Income, Kids) to jump back.
        </p>
      </Section>

      <Section title="StaleGuidelineBanner">
        <StaleGuidelineBanner months={14} state="Virginia" />
      </Section>

      <Section title="BigNumber">
        <div className="grid grid-cols-2 gap-6">
          <BigNumber value="$4,276/mo" label="Est. Spousal Support" color="gold" size="large" />
          <BigNumber value="$892,500" label="Fair Buyout (PV)" color="navy" size="medium" />
          <BigNumber value="-$1,340/mo" label="Monthly Shortfall" color="red" size="medium" />
          <BigNumber value="+$620/mo" label="Monthly Surplus" color="green" size="medium" />
        </div>
      </Section>

      <Section title="ResultsSummaryCard">
        <ResultsSummaryCard
          heading="Estimated Monthly Spousal Support"
          bigNumber="$4,276/mo"
          bigNumberSubtext="Kaufman formula, Virginia guidelines"
          bigNumberColor="gold"
          narrative="This is an educational estimate based on Virginia's pendente lite guidelines. Actual awards vary by court, attorney argument, and case-specific factors. Discuss with your attorney or CDFA."
          stats={[
            { label: 'Duration', value: '6–8 yrs' },
            { label: 'Total (PV)', value: '$312,400' },
            { label: 'Tax treatment', value: 'Post-2019 (non-deductible)' },
          ]}
          ctas={[
            { label: 'Save to Blueprint', onClick: () => alert('save'), variant: 'primary' },
            { label: 'Compare formulas', onClick: () => alert('compare'), variant: 'secondary' },
            { label: 'Ask Theo', onClick: () => alert('theo'), variant: 'tertiary' },
          ]}
        />
      </Section>

      <Section title="Tooltip">
        <p className="text-[#1B2A4A]">
          A key affordability metric is{' '}
          <Tooltip term="DTI">DTI</Tooltip>
          , calculated as monthly debt payments divided by gross monthly income. See also{' '}
          <Tooltip term="PITI">PITI</Tooltip> and{' '}
          <Tooltip term="front-end DTI">front-end DTI</Tooltip>.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          (All tooltip terms are currently stubbed as null — you should see the underlined words with NO popover, and a console.warn for each. That&apos;s expected behavior until Step 13 content population.)
        </p>
      </Section>

      <Section title="Toast (click to fire)">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              show({ message: 'Saved to Blueprint', variant: 'success', duration: 4000 })
            }
            className="bg-[#2D8A4E] text-white px-4 py-2 rounded"
          >
            Fire success
          </button>
          <button
            type="button"
            onClick={() =>
              show({
                message: 'Could not save — try again',
                variant: 'error',
                duration: 5000,
                actionLabel: 'Retry',
                onAction: () => alert('retry pressed'),
              })
            }
            className="bg-[#C0392B] text-white px-4 py-2 rounded"
          >
            Fire error with action
          </button>
          <button
            type="button"
            onClick={() => show({ message: 'Heads up — guidelines updated', variant: 'info', duration: 4000 })}
            className="bg-[#1B2A4A] text-white px-4 py-2 rounded"
          >
            Fire info
          </button>
          <button
            type="button"
            onClick={() => {
              show({ message: 'Toast 1', variant: 'info', duration: 10000 });
              show({ message: 'Toast 2', variant: 'success', duration: 10000 });
              show({ message: 'Toast 3', variant: 'error', duration: 10000 });
              show({ message: 'Toast 4 (should drop oldest)', variant: 'info', duration: 10000 });
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Test 3-toast cap
          </button>
        </div>
      </Section>

      <Section title="ConfirmModal">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="bg-[#1B2A4A] text-white px-4 py-2 rounded"
          >
            Open primary modal
          </button>
          <button
            type="button"
            onClick={() => setDangerModalOpen(true)}
            className="bg-[#C0392B] text-white px-4 py-2 rounded"
          >
            Open danger modal
          </button>
        </div>
        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Save this scenario?"
          body={'This will save the current inputs as a named scenario.\n\nYou can reload or compare it later.'}
          confirmLabel="Save"
          cancelLabel="Cancel"
          confirmVariant="primary"
          onConfirm={() => {
            setModalOpen(false);
            show({ message: 'Saved.', variant: 'success' });
          }}
        />
        <ConfirmModal
          isOpen={dangerModalOpen}
          onClose={() => setDangerModalOpen(false)}
          title="Reset this tool?"
          body="All inputs and results for the Home Decision Analyzer will be cleared. This cannot be undone."
          checkboxLabel="Also clear this tool's data from my Blueprint"
          checkboxChecked={chkChecked}
          onCheckboxChange={setChkChecked}
          confirmLabel="Reset"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => {
            setDangerModalOpen(false);
            show({
              message: chkChecked ? 'Reset (incl. Blueprint).' : 'Reset.',
              variant: 'info',
            });
          }}
        />
      </Section>

      <Section title="ToolErrorBoundary">
        <ToolErrorBoundary
          toolName="Demo Tool"
          onReset={() => {
            show({ message: 'Tool reset callback fired.', variant: 'info' });
          }}
        >
          <ExplodingTrigger />
        </ToolErrorBoundary>
      </Section>

      <Section title="ToolSkeleton — home-decision">
        <ToolSkeleton tool="home-decision" />
      </Section>

      <Section title="ToolSkeleton — qdro">
        <ToolSkeleton tool="qdro" />
      </Section>

      <Section title="ToolSkeleton — support">
        <ToolSkeleton tool="support" />
      </Section>
    </div>
  );
}
