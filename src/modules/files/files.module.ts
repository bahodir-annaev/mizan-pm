import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { File } from './domain/entities/file.entity';
import { FileService } from './application/services/file.service';
import { FileController } from './presentation/controllers/file.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.register({
      dest: './uploads',
    }),
    IdentityModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FilesModule {}
