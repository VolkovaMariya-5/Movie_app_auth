import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMovieDto } from './dto/query-movie.dto';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}

  create(createMovieDto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: createMovieDto,
    });
  }

  async findAll(query: QueryMovieDto) {
    const { page = 1, limit = 10, title, year, genre } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (title) {
      where.title = { contains: title, mode: 'insensitive' };
    }
    if (year) {
      where.year = year;
    }
    if (genre) {
      where.genre = genre;
    }

    const [data, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
    });
    if (!movie) throw new NotFoundException(`Movie #${id} not found`);
    return movie;
  }

  async findOneWithReviews(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        year: true,
        genre: true,
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!movie) throw new NotFoundException(`Movie #${id} not found`);
    return movie;
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    return this.prisma.movie.update({
      where: { id },
      data: updateMovieDto,
    });
  }

  remove(id: number) {
    return this.prisma.movie.delete({
      where: { id },
    });
  }
}
