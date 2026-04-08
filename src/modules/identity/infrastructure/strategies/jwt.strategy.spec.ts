import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as any as ConfigService;
    strategy = new JwtStrategy(configService);
  });

  describe('validate', () => {
    it('should return user object from JWT payload', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid-1',
        email: 'test@example.com',
        roles: ['member'],
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-uuid-1',
        email: 'test@example.com',
        roles: ['member'],
        orgId: null,
      });
    });

    it('should handle multiple roles', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid-1',
        email: 'admin@example.com',
        roles: ['admin', 'member'],
        orgId: 'org-1',
      };

      const result = strategy.validate(payload);

      expect(result.roles).toEqual(['admin', 'member']);
      expect(result.orgId).toBe('org-1');
    });

    it('should handle empty roles', () => {
      const payload: JwtPayload = {
        sub: 'user-uuid-1',
        email: 'test@example.com',
        roles: [],
      };

      const result = strategy.validate(payload);

      expect(result.roles).toEqual([]);
      expect(result.orgId).toBeNull();
    });
  });
});
