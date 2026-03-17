import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import request from 'supertest';


export let app: INestApplication;
export let prisma: PrismaService;


let isInitialized = false;


export async function setupApp() {
 if (isInitialized) return;
 isInitialized = true;


 const moduleFixture: TestingModule = await Test.createTestingModule({
   imports: [AppModule],
 }).compile();


 app = moduleFixture.createNestApplication();
 app.use(cookieParser());
 app.useGlobalPipes(new ValidationPipe({
   whitelist: true,
   forbidNonWhitelisted: true,
   transform: true,
 }));


 await app.init();
 prisma = moduleFixture.get<PrismaService>(PrismaService);
}


export async function cleanDatabase() {
 await prisma.task.deleteMany();
 await prisma.board.deleteMany();
 await prisma.review.deleteMany();
 await prisma.movie.deleteMany();
 await prisma.user.deleteMany();
}


export async function registerUser(email: string, password: string, name: string) {
 const res = await request(app.getHttpServer())
   .post('/auth/register')
   .send({ email, password, name });


 if (res.status !== 201) {
   throw new Error(`registerUser failed [${res.status}]: ${JSON.stringify(res.body)}`);
 }
 return res;
}


export async function loginAs(email: string, password: string): Promise<string> {
 const res = await request(app.getHttpServer())
   .post('/auth/login')
   .send({ email, password });
 return res.body.accessToken;
}
