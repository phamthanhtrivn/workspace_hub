import { Global, Module } from '@nestjs/common';
import { ResourceAccessService } from './resource-access.service';

@Global()
@Module({
  providers: [ResourceAccessService],
  exports: [ResourceAccessService],
})
export class IntegrationsModule {}
