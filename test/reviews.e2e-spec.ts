import request from 'supertest';
import { app, prisma, setupApp, cleanDatabase, registerUser } from './setup';
import { Genre } from 'src/generated/prisma/enums';


describe('Reviews E2E', () => {
 let userToken: string;
 let userId: number;
 let movieId: number;
 let reviewId: number;


 beforeAll(async () => { await setupApp(); });


 beforeEach(async () => {
   await cleanDatabase();


   await registerUser('reviewer@test.com', 'pass123', 'Reviewer');
   const login = await request(app.getHttpServer())
     .post('/auth/login')
     .send({ email: 'reviewer@test.com', password: 'pass123' });
   userToken = login.body.accessToken;


   const user = await prisma.user.findUnique({ where: { email: 'reviewer@test.com' } });
   userId = user!.id;


   const movie = await prisma.movie.create({
     data: { title: 'Review Movie', description: 'Test', year: 2021, genre: Genre.DRAMA },
   });
   movieId = movie.id;


   const review = await prisma.review.create({
     data: { rating: 8, comment: 'Хороший фильм', userId, movieId },
   });
   reviewId = review.id;
 });


 afterAll(async () => { await cleanDatabase(); }); // убрали app.close()


 describe('POST /reviews', () => {


   it('авторизованный пользователь должен создать отзыв', async () => {
     const res = await request(app.getHttpServer())
       .post('/reviews')
       .set('Authorization', `Bearer ${userToken}`)
       .send({ rating: 9, comment: 'Отлично!', movieId }); // убрали userId


     expect(res.status).toBe(201);
     expect(res.body.rating).toBe(9);
     expect(res.body.movieId).toBe(movieId);
   });


   it('должен вернуть 401 без токена', async () => {
     const res = await request(app.getHttpServer())
       .post('/reviews')
       .send({ rating: 7, movieId }); // убрали userId
     expect(res.status).toBe(401);
   });


   it('должен вернуть 400 если rating вне диапазона 1-10', async () => {
     const res = await request(app.getHttpServer())
       .post('/reviews')
       .set('Authorization', `Bearer ${userToken}`)
       .send({ rating: 11, movieId }); // убрали userId
     expect(res.status).toBe(400);
   });


 });


 describe('GET /reviews', () => {


   it('должен вернуть все отзывы', async () => {
     const res = await request(app.getHttpServer())
       .get('/reviews')
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(Array.isArray(res.body)).toBe(true);
     expect(res.body.length).toBeGreaterThanOrEqual(1);
   });


 });


 describe('GET /reviews/movie/:movieId', () => {


   it('должен вернуть отзывы конкретного фильма', async () => {
     const res = await request(app.getHttpServer())
       .get(`/reviews/movie/${movieId}`)
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(res.body.every((r: any) => r.movieId === movieId)).toBe(true);
   });


   it('должен вернуть пустой массив если у фильма нет отзывов', async () => {
     const newMovie = await prisma.movie.create({
       data: { title: 'No Reviews', description: 'x', year: 2022, genre: Genre.COMEDY },
     });


     const res = await request(app.getHttpServer())
       .get(`/reviews/movie/${newMovie.id}`)
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(res.body).toEqual([]);
   });


 });


 describe('DELETE /reviews/:id', () => {


   it('авторизованный пользователь должен удалить отзыв', async () => {
     const res = await request(app.getHttpServer())
       .delete(`/reviews/${reviewId}`)
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);


     const inDb = await prisma.review.findUnique({ where: { id: reviewId } });
     expect(inDb).toBeNull();
   });


   it('без токена должен вернуть 401', async () => {
     const res = await request(app.getHttpServer())
       .delete(`/reviews/${reviewId}`);
     expect(res.status).toBe(401);
   });


 });


});
