/**
 * WizardSection — an always-visible named subsection inside a WizardCard.
 *
 * Token-driven per memory #23. The title row is an 11px uppercase tracked
 * label in T.INK followed by a T.LINE hairline that flexes to the right
 * edge; the root carries 18px vertical padding and a T.LINE top border
 * that separates adjacent sections (suppressed for the first one).
 * Always-visible only — the spec's "More options" disclosure is deferred
 * (Q-11). Spec: Wizard-Design-Spec.md §Sections.
 *
 * @param {object} props
 * @param {string} props.title uppercase section heading text
 * @param {React.ReactNode} props.children section body content
 * @param {boolean} [props.first] when true, suppresses the top divider border
 * @param {string} [props.as] semantic element for the root (default "section")
 * @param {string} [props.data-testid] root test id (default "wizard-section")
 * @returns {JSX.Element}
 */

import { T } from '@/src/lib/brand/tokens';

export default function WizardSection({
  title,
  children,
  first,
  as: Tag = 'section',
  'data-testid': testId = 'wizard-section',
}) {
  const rootStyle = {
    paddingTop: '18px',
    paddingBottom: '18px',
    borderTop: first ? undefined : `1px solid ${T.LINE}`,
  };

  return (
    <Tag style={rootStyle} data-testid={testId}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.9px',
            color: T.INK,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
        <span
          aria-hidden="true"
          data-testid="wizard-section-rule"
          style={{ flexGrow: 1, height: '1px', backgroundColor: T.LINE }}
        />
      </div>
      <div data-testid="wizard-section-body">{children}</div>
    </Tag>
  );
}
