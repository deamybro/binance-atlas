import crypto from 'crypto';
import { JournalEvent, JournalEventType, AtlasMode } from '../types';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function generateId(): string {
  return 'evt_' + Math.random().toString(16).substring(2, 10);
}

/**
 * Computes deterministic SHA-256 hash for an event chained to previousHash.
 */
export function computeEventHash(
  previousHash: string,
  eventData: {
    id: string;
    type: JournalEventType;
    timestamp: number;
    title: string;
    description: string;
    data?: Record<string, unknown>;
    mode: AtlasMode;
    policyVersion?: string;
    policyHash?: string;
  }
): string {
  const payload = JSON.stringify({
    previousHash,
    id: eventData.id,
    type: eventData.type,
    timestamp: eventData.timestamp,
    title: eventData.title,
    description: eventData.description,
    data: eventData.data,
    mode: eventData.mode,
    policyVersion: eventData.policyVersion,
    policyHash: eventData.policyHash,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export interface ChainVerificationResult {
  valid: boolean;
  eventCount: number;
  error?: string;
  brokenIndex?: number;
}

export class Journal {
  // Store events in chronological append-only order
  private events: JournalEvent[] = [];
  private maxEvents: number = 2000;
  
  /**
   * Appends an event to the hash-chain.
   */
  log(
    type: JournalEventType,
    title: string,
    description: string,
    mode: AtlasMode,
    data?: Record<string, unknown>,
    policyContext?: { policyVersion?: string; policyHash?: string }
  ): JournalEvent {
    const previousHash = this.events.length > 0 
      ? this.events[this.events.length - 1].hash 
      : GENESIS_HASH;

    const id = generateId();
    const timestamp = Date.now();

    const rawEvent = {
      id,
      type,
      timestamp,
      title,
      description,
      data,
      mode,
      policyVersion: policyContext?.policyVersion,
      policyHash: policyContext?.policyHash,
    };

    const hash = computeEventHash(previousHash, rawEvent);

    const event: JournalEvent = {
      ...rawEvent,
      previousHash,
      hash,
    };

    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event;
  }
  
  /**
   * Returns recent events (newest first) for UI display.
   */
  getRecent(count: number = 50): JournalEvent[] { 
    return [...this.events].reverse().slice(0, count); 
  }
  
  getByType(type: JournalEventType): JournalEvent[] { 
    return [...this.events].reverse().filter(e => e.type === type); 
  }
  
  clear(): void { 
    this.events = []; 
  }
  
  /**
   * Returns the entire chain in chronological order.
   */
  getAll(): JournalEvent[] { 
    return [...this.events]; 
  }

  getChain(): JournalEvent[] {
    return [...this.events];
  }

  /**
   * Cryptographically verifies the integrity of the hash chain.
   */
  verify(): ChainVerificationResult {
    if (this.events.length === 0) {
      return { valid: true, eventCount: 0 };
    }

    for (let i = 0; i < this.events.length; i++) {
      const current = this.events[i];
      const expectedPrevHash = i === 0 ? GENESIS_HASH : this.events[i - 1].hash;

      if (current.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          eventCount: this.events.length,
          brokenIndex: i,
          error: `Broken link at index ${i}: previousHash mismatch. Expected ${expectedPrevHash}, got ${current.previousHash}`,
        };
      }

      const calculatedHash = computeEventHash(current.previousHash, {
        id: current.id,
        type: current.type,
        timestamp: current.timestamp,
        title: current.title,
        description: current.description,
        data: current.data,
        mode: current.mode,
        policyVersion: current.policyVersion,
        policyHash: current.policyHash,
      });

      if (calculatedHash !== current.hash) {
        return {
          valid: false,
          eventCount: this.events.length,
          brokenIndex: i,
          error: `Tampered event at index ${i}: hash mismatch. Expected ${calculatedHash}, got ${current.hash}`,
        };
      }
    }

    return { valid: true, eventCount: this.events.length };
  }

  exportChain(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

