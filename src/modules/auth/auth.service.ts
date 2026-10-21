import { prisma } from '../../config/database.js';
import { hashPassword, comparePassword, generateToken } from '../../utils/crypto.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { Role } from '../../types/index.js';

export class AuthService {
  public async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
        },
      });

      // If registered as CONTESTANT, create or link a Contestant profile
      if (input.role === Role.CONTESTANT) {
        await tx.contestant.create({
          data: {
            userId: newUser.id,
            displayName: input.displayName || input.name,
            email: input.email,
          },
        });
      }

      return newUser;
    });

    const contestant = await prisma.contestant.findUnique({
      where: { email: user.email },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      contestantId: contestant?.id || null,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        contestantId: contestant?.id || null,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  public async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { contestant: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      contestantId: user.contestant?.id || null,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        contestantId: user.contestant?.id || null,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  public async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        contestant: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      contestant: user.contestant
        ? {
            id: user.contestant.id,
            displayName: user.contestant.displayName,
            email: user.contestant.email,
            createdAt: user.contestant.createdAt,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
