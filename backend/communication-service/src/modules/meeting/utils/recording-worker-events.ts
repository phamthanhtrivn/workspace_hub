import { EventEmitter } from 'events';

// Wake local workers after commit; durable polling still serves other processes.
export const recordingWorkerEvents = new EventEmitter();
