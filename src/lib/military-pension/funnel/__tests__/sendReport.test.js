// Orchestration for the report-capture flow. Dependencies are injected so the
// guarantees the handoff requires are unit-tested without a live DB/Resend:
//  - valid/invalid email handling
//  - lead write (consent) happens, but the send is NOT blocked on it
//  - PDF is generated from getCalc(toolInputs) with the right shape
//  - suppression is checked BEFORE sending (unsubscribe honored)
//  - the report is sent regardless of whether the lead row is new
//  - nothing beyond the lead row is persisted (no toolInputs/PDF writes)
import { describe, it, expect, vi } from 'vitest';
import { handleReportRequest } from '../sendReport';

const TOOL_INPUTS = Object.freeze({ system: 'unsure', high3Pay: '5500', awardPct: '50' });

function makeDeps(over = {}) {
  return {
    upsertLead: vi.fn(async () => {}),
    isSuppressed: vi.fn(async () => false),
    getCalc: vi.fn((inp) => ({ grossMonthly: 2475, _from: inp })),
    generatePdf: vi.fn(async () => Buffer.from('%PDF-1.7')),
    sendReportEmail: vi.fn(async () => {}),
    ...over,
  };
}

describe('handleReportRequest — report-capture orchestration', () => {
  it('rejects an invalid email without writing or sending', async () => {
    const deps = makeDeps();
    const r = await handleReportRequest({ email: 'not-an-email', toolInputs: TOOL_INPUTS }, deps);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(deps.upsertLead).not.toHaveBeenCalled();
    expect(deps.sendReportEmail).not.toHaveBeenCalled();
  });

  it('valid email: writes the lead (normalized), builds the PDF from getCalc(toolInputs), sends', async () => {
    const deps = makeDeps();
    const r = await handleReportRequest({ email: 'User@Example.com', toolInputs: TOOL_INPUTS }, deps);
    expect(r.ok).toBe(true);
    expect(deps.upsertLead).toHaveBeenCalledWith('user@example.com');
    expect(deps.getCalc).toHaveBeenCalledWith(TOOL_INPUTS);
    const calcVal = deps.getCalc.mock.results[0].value;
    expect(deps.generatePdf).toHaveBeenCalledWith({ inp: TOOL_INPUTS, calc: calcVal });
    expect(deps.sendReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com', pdfBuffer: expect.any(Buffer) }),
    );
  });

  it('suppressed email: checks suppression and does NOT send', async () => {
    const deps = makeDeps({ isSuppressed: vi.fn(async () => true) });
    const r = await handleReportRequest({ email: 'user@example.com', toolInputs: TOOL_INPUTS }, deps);
    expect(r.ok).toBe(true);
    expect(r.suppressed).toBe(true);
    expect(deps.isSuppressed).toHaveBeenCalledWith('user@example.com');
    expect(deps.sendReportEmail).not.toHaveBeenCalled();
    expect(deps.generatePdf).not.toHaveBeenCalled();
  });

  it('sends regardless of whether the lead row is new (repeat submitter still gets the report)', async () => {
    const deps = makeDeps();
    await handleReportRequest({ email: 'user@example.com', toolInputs: TOOL_INPUTS }, deps);
    await handleReportRequest({ email: 'user@example.com', toolInputs: TOOL_INPUTS }, deps);
    expect(deps.sendReportEmail).toHaveBeenCalledTimes(2);
  });

  it('still sends if the lead write fails (best-effort consent; the user asked for the report)', async () => {
    const deps = makeDeps({ upsertLead: vi.fn(async () => { throw new Error('db down'); }) });
    const r = await handleReportRequest({ email: 'user@example.com', toolInputs: TOOL_INPUTS }, deps);
    expect(r.ok).toBe(true);
    expect(deps.sendReportEmail).toHaveBeenCalled();
  });
});
