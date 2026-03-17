import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 8, description: 'Рейтинг от 1 до 10' })
  @IsInt()
  @Min(1)
  @Max(10)
  rating: number;

  @ApiPropertyOptional({ example: 'Отличный фильм!', description: 'Комментарий' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: 1, description: 'ID фильма' })
  @IsInt()
  @IsNotEmpty()
  movieId: number;
}
