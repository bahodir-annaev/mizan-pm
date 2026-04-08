import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByResetToken(token: string): Promise<User | null>;
  findAll(skip: number, take: number): Promise<[User[], number]>;
  save(user: User): Promise<User>;
  softDelete(id: string): Promise<void>;
}
