import * as dotenv from 'dotenv';
import { join } from 'node:path';

export function loadServiceEnvironment(directory = process.cwd()): void {
  dotenv.config({ path: join(directory, '.env') });
  if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: join(directory, '.env.local'), override: true });
  }
}
