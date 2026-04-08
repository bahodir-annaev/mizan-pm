import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './domain/entities/client.entity';
import { ContactPerson } from './domain/entities/contact-person.entity';
import { Project } from '../project-management/domain/entities/project.entity';
import { ClientService } from './application/services/client.service';
import { ClientController } from './presentation/controllers/client.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ContactPerson, Project]),
    forwardRef(() => IdentityModule),
  ],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
