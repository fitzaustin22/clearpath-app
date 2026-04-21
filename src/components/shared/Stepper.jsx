'use client';

import { Check } from 'lucide-react';

/**
 * Stepper — horizontal progress indicator. Completed steps are clickable;
 * active step is ring-highlighted; upcoming steps are muted.
 */
export default function Stepper({ steps = [], activeIndex = 0, completedIndices = [], onStepClick }) {
  const isCompleted = (i) => completedIndices.includes(i);
  const isActive = (i) => i === activeIndex;

  return (
    <nav role="navigation" aria-label="Progress" className="overflow-x-auto">
      <ol className="flex items-start gap-2 snap-x min-w-max">
        {steps.map((step, i) => {
          const completed = isCompleted(i);
          const active = isActive(i);
          const connectorActive =
            i < steps.length - 1 &&
            (completed || active) &&
            (isCompleted(i + 1) || isActive(i + 1));

          return (
            <li key={step.id ?? i} className="flex items-start snap-start">
              <StepCircle
                index={i}
                label={step.label}
                completed={completed}
                active={active}
                onClick={() => {
                  if (completed && onStepClick) onStepClick(i);
                }}
              />
              {i < steps.length - 1 && (
                <div
                  className={`h-px mt-4 ${connectorActive ? 'bg-[#1B2A4A]' : 'bg-gray-300'}`}
                  style={{ width: '40px' }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepCircle({ index, label, completed, active, onClick }) {
  const sharedClasses = 'w-8 h-8 rounded-full flex items-center justify-center text-sm';
  const labelClasses = `mt-1 text-xs ${completed || active ? 'text-[#1B2A4A]' : 'text-gray-500'}`;

  if (completed) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'step' : undefined}
        className="flex flex-col items-center cursor-pointer"
      >
        <span className={`${sharedClasses} bg-[#1B2A4A] text-white`}>
          <Check size={16} />
        </span>
        <span className={labelClasses}>{label}</span>
      </button>
    );
  }

  if (active) {
    return (
      <div className="flex flex-col items-center" aria-current="step">
        <span className={`${sharedClasses} bg-[#1B2A4A] text-white ring-2 ring-[#C8A96E] ring-offset-2`}>
          <span className="w-2 h-2 bg-white rounded-full" />
        </span>
        <span className={labelClasses}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <span className={`${sharedClasses} border-2 border-gray-300 bg-white text-gray-500`}>
        {index + 1}
      </span>
      <span className={labelClasses}>{label}</span>
    </div>
  );
}
