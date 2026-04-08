import { Module } from '@nestjs/common';
import { SearchService } from './application/services/search.service';
import { SearchController } from './presentation/controllers/search.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
