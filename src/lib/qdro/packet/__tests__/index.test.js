// Barrel surface for the §8.7 packet module (PR4-3 net-new subdirectory).

import { describe, it, expect } from 'vitest';
import * as packet from '../index.js';

describe('src/lib/qdro/packet barrel', () => {
  it('re-exports the readiness selectors, markdown builder, and PDF document', () => {
    expect(typeof packet.selectQDROPacketReady).toBe('function');
    expect(typeof packet.selectQDROPacketReadyAssetIds).toBe('function');
    expect(typeof packet.buildMarkdownPacket).toBe('function');
    expect(typeof packet.QDROHandoffPacketPDF).toBe('function');
  });
});
