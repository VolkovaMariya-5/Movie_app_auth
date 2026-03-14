import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Authorized } from './decorators/authorized.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан, возвращает accessToken' })
  @ApiResponse({ status: 400, description: 'Email уже занят или невалидные данные' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    return this.authService.register(dto, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация по email и паролю' })
  @ApiResponse({ status: 200, description: 'Возвращает accessToken, устанавливает refreshToken в cookie' })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: any,
  ) {
    return this.authService.login(dto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access token через refresh token из cookie' })
  @ApiResponse({ status: 200, description: 'Новый accessToken' })
  @ApiResponse({ status: 401, description: 'Refresh token не найден или невалиден' })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    return this.authService.refresh(refreshToken, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы (удаление refresh token cookie)' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  logout(@Res({ passthrough: true }) res: any) {
    return this.authService.logout(res);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить данные текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Возвращает id пользователя' })
  @ApiResponse({ status: 401, description: 'Токен отсутствует или невалиден' })
  async me(@Authorized('id') id: number) {
    return { id };
  }
}
