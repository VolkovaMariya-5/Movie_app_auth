import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TaskStatus {
  todo = 'todo',
  in_progress = 'in_progress',
  done = 'done',
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Design UI', description: 'Название задачи' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Create wireframes', description: 'Описание задачи' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: 'todo', description: 'Статус задачи' })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 1, description: 'ID доски' })
  @IsInt()
  @IsNotEmpty()
  boardId: number;
}
