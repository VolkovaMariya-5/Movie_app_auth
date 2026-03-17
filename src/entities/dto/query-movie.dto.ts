import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Genre } from 'src/generated/prisma/enums';

export class QueryMovieDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Количество на странице' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Inception', description: 'Поиск по названию' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 2020, description: 'Фильтр по году' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ enum: Genre, description: 'Фильтр по жанру' })
  @IsEnum(Genre)
  @IsOptional()
  genre?: Genre;
}
