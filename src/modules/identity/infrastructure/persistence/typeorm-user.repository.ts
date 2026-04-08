import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';

const USER_RELATIONS = [
  'userRoles',
  'userRoles.role',
  'userRoles.role.permissions',
];

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: USER_RELATIONS,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: USER_RELATIONS,
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { passwordResetToken: token },
      relations: USER_RELATIONS,
    });
  }

  async findAll(skip: number, take: number): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      skip,
      take,
      relations: ['userRoles', 'userRoles.role'],
      order: { createdAt: 'DESC' },
    });
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepo.softDelete(id);
  }
}
