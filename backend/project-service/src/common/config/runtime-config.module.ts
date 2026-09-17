import { Global, Module } from '@nestjs/common';
import { RuntimeConfigService } from './runtime-config.service';
import { AccessTokenVerifier } from '../guards/access-token-verifier';

@Global()
@Module({
  providers: [RuntimeConfigService, AccessTokenVerifier],
  exports: [RuntimeConfigService, AccessTokenVerifier],
})
export class RuntimeConfigModule {}
