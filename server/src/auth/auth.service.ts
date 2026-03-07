import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

function sanitizeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private get userModel() {
    return this.prisma.user;
  }

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email is already in use');

    const hash = await bcrypt.hash(dto.password, 10);

    const created = await this.userModel.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        role: dto.role,
        active: true,
      },
    });

    const token = await this.signToken(created);
    return { accessToken: token, user: sanitizeUser(created) };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (user.active === false)
      throw new UnauthorizedException('Account is inactive');

    const token = await this.signToken(user);
    return { accessToken: token, user: sanitizeUser(user) };
  }

  async signToken(user: any) {
    const payload = {
      sub: user.userId,
      role: user.role,
      email: user.email,
    };
    return this.jwt.signAsync(payload);
  }

  async me(userId: string) {
    const user = await this.userModel.findUnique({
      where: { userId },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return sanitizeUser(user);
  }
}
