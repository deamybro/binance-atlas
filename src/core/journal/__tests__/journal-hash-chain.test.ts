import { describe, it, expect } from 'vitest';
import { Journal, GENESIS_HASH } from '../journal';

describe('Hash-Linked Journal (Capital Memory)', () => {
  it('links the first event to GENESIS_HASH', () => {
    const journal = new Journal();
    const evt = journal.log('OBSERVATION', 'First Observation', 'Initial boot', 'OPPORTUNITY');

    expect(evt.previousHash).toBe(GENESIS_HASH);
    expect(evt.hash).toHaveLength(64);
    expect(evt.hash).not.toBe(GENESIS_HASH);
  });

  it('chains subsequent events to the previous hash', () => {
    const journal = new Journal();
    const e1 = journal.log('OBSERVATION', 'Event 1', 'Detail 1', 'OPPORTUNITY');
    const e2 = journal.log('PROPOSAL_CREATED', 'Event 2', 'Detail 2', 'OPPORTUNITY');
    const e3 = journal.log('EXECUTION', 'Event 3', 'Detail 3', 'OPPORTUNITY');

    expect(e2.previousHash).toBe(e1.hash);
    expect(e3.previousHash).toBe(e2.hash);

    const verification = journal.verify();
    expect(verification.valid).toBe(true);
    expect(verification.eventCount).toBe(3);
  });

  it('records policy version and policy hash for audit traceability', () => {
    const journal = new Journal();
    const evt = journal.log(
      'REFEREE_DECISION', 
      'Decision Made', 
      'Allowed trade', 
      'OPPORTUNITY', 
      { decision: 'ALLOW' },
      { policyVersion: 'v1.0', policyHash: 'abcd1234ef5678' }
    );

    expect(evt.policyVersion).toBe('v1.0');
    expect(evt.policyHash).toBe('abcd1234ef5678');
    expect(journal.verify().valid).toBe(true);
  });

  it('detects tampering when an event title or data is altered', () => {
    const journal = new Journal();
    journal.log('OBSERVATION', 'Legit Event 1', 'Good', 'OPPORTUNITY');
    journal.log('PROPOSAL_CREATED', 'Legit Event 2', 'Good', 'OPPORTUNITY');
    journal.log('EXECUTION', 'Legit Event 3', 'Good', 'OPPORTUNITY');

    const chain = journal.getAll();
    expect(journal.verify().valid).toBe(true);

    // Tamper with event 1
    (chain[1] as any).description = 'Malicious alteration!';

    const verification = journal.verify();
    expect(verification.valid).toBe(false);
    expect(verification.brokenIndex).toBe(1);
    expect(verification.error).toContain('Tampered event at index 1');
  });

  it('detects tampering when an event is deleted from the chain', () => {
    const journal = new Journal();
    journal.log('OBSERVATION', 'Event 1', 'Good', 'OPPORTUNITY');
    journal.log('OBSERVATION', 'Event 2', 'Good', 'OPPORTUNITY');
    journal.log('OBSERVATION', 'Event 3', 'Good', 'OPPORTUNITY');

    // Remove middle event directly from internal chain
    (journal as any).events.splice(1, 1);

    const verification = journal.verify();
    expect(verification.valid).toBe(false);
    expect(verification.brokenIndex).toBe(1);
    expect(verification.error).toContain('Broken link at index 1: previousHash mismatch');
  });

  it('exports chain in JSON format', () => {
    const journal = new Journal();
    journal.log('OBSERVATION', 'Genesis Event', 'Boot', 'OPPORTUNITY');

    const exported = journal.exportChain();
    const parsed = JSON.parse(exported);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('Genesis Event');
  });
});
