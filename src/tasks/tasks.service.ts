import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { Role } from 'src/auth/enums/role.enum';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  create(createTaskDto: CreateTaskDto, userId: number) {
    return this.prisma.task.create({
      data: { ...createTaskDto, userId },
      include: { board: true, user: true },
    });
  }

  findAll(status?: TaskStatus) {
    return this.prisma.task.findMany({
      where: status ? { status } : undefined,
      include: { board: true, user: true },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async update(id: number, updateTaskDto: CreateTaskDto, userId: number, userRole: string) {
    const task = await this.findOne(id);
    this.checkOwnership(task.userId, userId, userRole);
    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: { board: true, user: true },
    });
  }

  async remove(id: number, userId: number, userRole: string) {
    const task = await this.findOne(id);
    this.checkOwnership(task.userId, userId, userRole);
    return this.prisma.task.delete({ where: { id } });
  }

  private checkOwnership(taskUserId: number, userId: number, userRole: string) {
    if (taskUserId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Вы не являетесь владельцем этой задачи');
    }
  }
}
