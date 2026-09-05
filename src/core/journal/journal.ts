import { JournalEvent, JournalEventType, AtlasMode } from '../types';

function generateId(): string {
  return 'evt_' + Math.random().toString(16).substring(2, 10);
}

export class Journal {
  private events: JournalEvent[] = [];
  private maxEvents: number = 1000;
  
  log(type: JournalEventType, title: string, description: string, mode: AtlasMode, data?: Record<string, unknown>): JournalEvent {
    const event: JournalEvent = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      title,
      description,
      data,
      mode,
    };
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    return event;
  }
  
  getRecent(count: number = 50): JournalEvent[] { 
    return this.events.slice(0, count); 
  }
  
  getByType(type: JournalEventType): JournalEvent[] { 
    return this.events.filter(e => e.type === type); 
  }
  
  clear(): void { 
    this.events = []; 
  }
  
  getAll(): JournalEvent[] { 
    return [...this.events]; 
  }
}
