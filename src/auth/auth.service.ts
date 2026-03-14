import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hash, verify } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TOKEN_TTL: string;
  private readonly JWT_REFRESH_TOKEN_TTL: string;
  private readonly COOKIE_DOMAIN: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.JWT_ACCESS_TOKEN_TTL = this.configService.getOrThrow<string>(
      'JWT_ACCESS_TOKEN_TTL',
    );
    this.JWT_REFRESH_TOKEN_TTL = this.configService.getOrThrow<string>(
      'JWT_REFRESH_TOKEN_TTL',
    );
    this.COOKIE_DOMAIN = this.configService.getOrThrow<string>('COOKIE_DOMAIN');
  }

  async register(dto: RegisterDto, res: Response) {
    const { email, name, password } = dto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException(
        'Пользователь с таким email уже существует',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: await hash(password),
      },
    });

    const { accessToken, refreshToken } = this.generateTokens(
      Number(user.id),
    );
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken };
  }

  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await verify(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const { accessToken, refreshToken } = this.generateTokens(
      Number(user.id),
    );
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken };
  }

  async refresh(refreshTokenFromCookie: string, res: Response) {
    if (!refreshTokenFromCookie) {
      throw new UnauthorizedException('Refresh token не найден');
    }

    let payload: { id: string };
    try {
      payload = this.jwtService.verify<{ id: string }>(refreshTokenFromCookie);
    } catch {
      throw new UnauthorizedException('Невалидный refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.id) },
    });
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const { accessToken, refreshToken } = this.generateTokens(
      Number(user.id),
    );
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken };
  }

  logout(res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      domain: this.COOKIE_DOMAIN,
      secure: true,
      sameSite: 'none',
    });
    return { message: 'Вы успешно вышли из системы' };
  }


  async validateUser(id: string) {
   const user = await this.prisma.user.findUnique({
     where: { id: Number(id) },
     select: { id: true, role: true },
   });
   if (!user) {
     throw new NotFoundException('Пользователь не найден');
   }
   return user;
 }


  private generateTokens(id: number) {
    const payload = { id };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TOKEN_TTL as any,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TOKEN_TTL as any,
    });

    return { accessToken, refreshToken };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    res.cookie('refreshToken', token, {
      httpOnly: true,
      expires,
      domain: this.COOKIE_DOMAIN,
      secure: true,
      sameSite: 'none',
    });
  }
}
