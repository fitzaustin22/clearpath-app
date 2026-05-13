import { Callout, Cite, LearnMore } from './_shared';

export default function StateSpecificEducational({ state = 'MD' }) {
  if (state === 'MD') {
    return (
      <Callout
        variant="cite"
        label="Maryland · AAML rationale"
        title="Why the figure uses the AAML formula"
        footer={(
          <LearnMore>
            <p style={{ margin: '0 0 10px' }}>
              Maryland has <strong>no statutory alimony formula</strong>.
              §11-106(b) commits the amount to the court's discretion across
              twelve factors (ability to pay, standard of living, contributions,
              time required to become self-supporting, and others). Practitioners
              use AAML, the <strong>Kaufman Guidelines</strong>, and the Virginia
              pendente-lite formula as informational benchmarks — courts may
              consult any, all, or none.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              AAML's 30/20 with a 40% cap tends to land between the Kaufman 28/58
              approach and Virginia's PL 26/58. We chose AAML because the Court of
              Appeals expressly named it in <Cite>Boemio</Cite> — Kaufman has not
              received comparable appellate endorsement.
            </p>
            <p style={{ margin: 0 }}>
              Post-2018 TCJA changes mean federal income-tax deductibility no
              longer applies; the figure here is an after-tax transfer for orders
              executed after Dec 31, 2018.
            </p>
          </LearnMore>
        )}
      >
        The figure above uses the American Academy of Matrimonial Lawyers (AAML)
        proposed formula: <strong>30% of payor's gross income minus 20% of
        payee's gross income</strong>, capped so that the payee's post-alimony
        combined income does not exceed 40% of the parties' combined gross. The
        Maryland Court of Appeals approved use of the AAML formula as an{' '}
        <em>informational aid</em> alongside the §11-106(b) factor analysis in{' '}
        <Cite>Boemio v. Boemio, 414 Md. 118 (2010)</Cite>. It is not a Maryland
        statute, court rule, or mandatory benchmark — Maryland law commits the
        alimony amount to the court's discretion under the §11-106(b) factors.
      </Callout>
    );
  }
  if (state === 'DC') {
    return (
      <Callout
        variant="cite"
        label="District of Columbia · AAML rationale"
        title="DC has no statutory alimony formula"
        footer={(
          <LearnMore>
            <p style={{ margin: '0 0 10px' }}>
              DC alimony tracks <Cite>D.C. Code §16-913</Cite> factors. The AAML
              formula serves as a planning reference; DC courts have not adopted
              it as binding precedent. Practitioners commonly cite both AAML and
              the older Kaufman Guidelines side by side.
            </p>
            <p style={{ margin: 0 }}>
              Post-2018 TCJA changes apply identically to DC orders — no federal
              deductibility for instruments executed after Dec 31, 2018.
            </p>
          </LearnMore>
        )}
      >
        DC alimony is committed to the court's discretion across statutory
        factors at <Cite>D.C. Code §16-913</Cite>. The AAML 30/20 formula (capped
        at 40% of combined gross) is used here as a planning aid only — it is
        not a DC statute, rule, or appellate benchmark.
      </Callout>
    );
  }
  if (state === 'NY') {
    return (
      <Callout
        variant="cite"
        label="New York · Formula A / B"
        title="DRL §236(B)(5-a) post-divorce maintenance formulas"
      >
        New York applies <strong>Formula A</strong> when there are no children of
        the marriage <em>(30% of payor income − 20% of payee income)</em> and{' '}
        <strong>Formula B</strong> when child support is also paid{' '}
        <em>(25% / 25%)</em>. The lesser of formula result and a 40%-of-combined
        cap binds. Above the income cap (currently <strong>$193,000/yr</strong>),
        the court has discretion. Duration is set by the advisory schedule in{' '}
        <Cite>DRL §236(B)(6)(f)</Cite>: 15–30% of marriage length for marriages
        up to 15 years; 30–40% for 15–20 years; 35–50% above 20 years.
      </Callout>
    );
  }
  if (state === 'CA') {
    return (
      <Callout
        variant="cite"
        label="California · Santa Clara guideline"
        title="Pendente lite uses Santa Clara; post-div uses §4320 factors"
      >
        For pendente-lite (during-proceedings) orders, California courts use a
        regional <em>guideline</em> calculation — most commonly the{' '}
        <strong>Santa Clara formula</strong>: 40% of payor net income minus 50%
        of payee net income, adjusted for child support already ordered. For
        post-divorce judgments, California is a pure factor state per{' '}
        <Cite>Cal. Fam. Code §4320</Cite> — Santa Clara cannot be used; the
        figure here is a planning reference only.
      </Callout>
    );
  }
  if (state === 'VA') {
    return (
      <Callout
        variant="cite"
        label="Virginia · Pendente lite"
        title="Va. Code §16.1-278.17:1 pendente-lite formula"
      >
        Virginia is unusual: it has a <strong>statutory pendente-lite formula</strong>{' '}
        (28% payor gross − 58% payee gross when children; 27/50 without) capped at
        $120,000/yr payor income — but <em>no</em> statutory post-divorce formula.
        Post-divorce orders are pure factor analysis under{' '}
        <Cite>Va. Code §20-107.1</Cite>.
      </Callout>
    );
  }
  return null;
}
