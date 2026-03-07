import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email: string;

 
    @IsNotEmpty({ message: 'Пароль не может быть пустым' })    
        @IsString({ message: 'Пароль должен быть строкой' })    
        @MaxLength(100, { message: 'Пароль должен содержать максимум 100 символов' })    
        @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })

  password: string;

    @IsNotEmpty({ message: 'Имя не может быть пустым' })    
        @IsString({ message: 'Имя должно быть строкой' })
        @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })    
        @MaxLength(50, { message: 'Имя должно содержать максимум 50 символов' })    
  name: string;
}