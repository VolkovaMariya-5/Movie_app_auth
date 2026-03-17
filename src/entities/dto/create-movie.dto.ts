import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Genre } from 'src/generated/prisma/enums';

export class CreateMovieDto {
  @ApiProperty({ example: 'Inception', description: 'Название фильма' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Movie about dreams', description: 'Описание фильма' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2010, description: 'Год выпуска' })
  @IsInt()
  @IsNotEmpty()
  year: number;

  @ApiProperty({ enum: Genre, example: Genre.SCI_FI, description: 'Жанр фильма' })
  @IsEnum(Genre)
  @IsNotEmpty()
  genre: Genre;
}
