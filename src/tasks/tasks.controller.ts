import { Controller, Get, Post, Body, Param, Delete, Patch, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { Authorized } from 'src/auth/decorators/authorized.decorator';

@ApiBearerAuth()
@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Authorized('id') userId: number,
  ) {
    return this.tasksService.create(createTaskDto, userId);
  }

  @Get()
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false, description: 'Фильтр по статусу задачи' })
  findAll(@Query('status') status?: TaskStatus) {
    return this.tasksService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: CreateTaskDto,
    @Authorized('id') userId: number,
    @Authorized('role') userRole: string,
  ) {
    return this.tasksService.update(id, updateTaskDto, userId, userRole);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Authorized('id') userId: number,
    @Authorized('role') userRole: string,
  ) {
    return this.tasksService.remove(id, userId, userRole);
  }
}
