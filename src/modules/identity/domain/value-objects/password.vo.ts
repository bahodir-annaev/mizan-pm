import * as bcrypt from 'bcrypt';

export class Password {
  static async hash(plainText: string, rounds = 12): Promise<string> {
    return bcrypt.hash(plainText, rounds);
  }

  static async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  static validate(password: string): boolean {
    return password.length >= 8;
  }
}
