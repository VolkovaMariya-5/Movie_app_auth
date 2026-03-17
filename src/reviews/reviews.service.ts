import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateReviewDto, userId: number) {
    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        movieId: dto.movieId,
        userId,
      },
    });
  }

  findAll() {
    return this.prisma.review.findMany();
  }

  findByMovie(movieId: number) {
    return this.prisma.review.findMany({
      where: { movieId },
    });
  }

  remove(id: number) {
    return this.prisma.review.delete({
      where: { id },
    });
  }
}
