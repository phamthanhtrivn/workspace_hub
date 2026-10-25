import { loadServiceEnvironment } from './src/common/config/load-service-env';
import { defineConfig } from 'prisma/config';

loadServiceEnvironment();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL']!,
  },
});
