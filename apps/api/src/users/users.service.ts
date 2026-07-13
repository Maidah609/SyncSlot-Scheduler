import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@syncslot/database";
import { UpdateMeDto } from "./dto/update-me.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return this.toMeResponse(user);
  }

  async updateCurrentUser(userId: string, input: UpdateMeDto) {
    if (input.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException("Username is already in use.");
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.welcome !== undefined ? { welcome: input.welcome } : {}),
      },
    });

    return this.toMeResponse(user);
  }

  async isUsernameAvailable(username: string, excludeUserId?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return {
      available: !existingUser || existingUser.id === excludeUserId,
    };
  }

  async completeOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (!user.name.trim() || !user.username.trim() || !user.timezone.trim()) {
      throw new BadRequestException("name, username, and timezone must be set before completing onboarding.");
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
      },
    });

    return {
      ok: true,
      user: this.toMeResponse(updatedUser),
    };
  }

  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        name: true,
        title: true,
        welcome: true,
        timezone: true,
        emailVerifiedAt: true,
        onboardingCompletedAt: true,
      },
    });

    if (!user || !user.emailVerifiedAt || !user.onboardingCompletedAt) {
      throw new NotFoundException("Public profile not found.");
    }

    return {
      username: user.username,
      name: user.name,
      title: user.title,
      welcome: user.welcome,
      timezone: user.timezone,
    };
  }

  requireAuthenticatedUser(user: { id: string } | undefined) {
    if (!user) {
      throw new UnauthorizedException("Session is not valid.");
    }

    return user;
  }

  private toMeResponse(user: {
    id: string;
    email: string;
    name: string;
    username: string;
    title: string;
    welcome: string;
    timezone: string;
    emailVerifiedAt: Date | null;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      title: user.title,
      welcome: user.welcome,
      timezone: user.timezone,
      emailVerifiedAt: user.emailVerifiedAt,
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
