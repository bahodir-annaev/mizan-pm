import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmployeeStatus } from '../../domain/entities/employee-status.enum';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: EmployeeStatus })
  @IsEnum(EmployeeStatus)
  status: EmployeeStatus;
}
