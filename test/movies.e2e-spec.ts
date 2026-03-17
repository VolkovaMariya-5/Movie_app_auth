import request from 'supertest';
import { app, prisma, setupApp, cleanDatabase, loginAs, registerUser } from './setup';
import { Role } from 'src/auth/enums/role.enum';
import { Genre } from 'src/generated/prisma/enums';


describe('Movies E2E', () => {
 let userToken: string;
 let adminToken: string;
 let movieId: number;


 beforeAll(async () => {
   await setupApp();
 });


 beforeEach(async () => {
   await cleanDatabase();


   await registerUser('user@test.com', 'pass123', 'Regular User');
   userToken = await loginAs('user@test.com', 'pass123');


   await registerUser('admin@test.com', 'pass123', 'Admin User');
   await prisma.user.update({
     where: { email: 'admin@test.com' },
     data: { role: Role.ADMIN },
   });
   adminToken = await loginAs('admin@test.com', 'pass123');


   const movie = await prisma.movie.create({
     data: { title: 'Test Movie', description: 'Test Desc', year: 2020, genre: Genre.ACTION },
   });
   movieId = movie.id;
 });


 afterAll(async () => {
   await cleanDatabase();
   // НЕ закрываем — users.e2e-spec.ts закрывает последним
 });


 describe('GET /movies', () => {


   it('должен вернуть список фильмов для авторизованного пользователя', async () => {
     const res = await request(app.getHttpServer())
       .get('/movies')
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(Array.isArray(res.body.data)).toBe(true);        // ← .data
     expect(res.body.data.length).toBeGreaterThanOrEqual(1); // ← .data
     expect(res.body.meta).toBeDefined();
   });


   it('должен вернуть 401 без токена', async () => {
     const res = await request(app.getHttpServer()).get('/movies');
     expect(res.status).toBe(401);
   });


   it('должен фильтровать по году', async () => {
     await prisma.movie.create({
       data: { title: 'Old Movie', description: 'Old', year: 1999, genre: Genre.DRAMA },
     });


     const res = await request(app.getHttpServer())
       .get('/movies?year=2020')
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(res.body.data.every((m: any) => m.year === 2020)).toBe(true); // ← .data
   });


   it('должен искать по названию (без учёта регистра)', async () => {
     const res = await request(app.getHttpServer())
       .get('/movies?title=test')
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(res.body.data.length).toBeGreaterThanOrEqual(1);              // ← .data
     expect(res.body.data[0].title.toLowerCase()).toContain('test');      // ← .data
   });


 });


 describe('GET /movies/:id', () => {


   it('должен вернуть фильм по ID', async () => {
     const res = await request(app.getHttpServer())
       .get(`/movies/${movieId}`)
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(200);
     expect(res.body.title).toBe('Test Movie');
     expect(res.body.id).toBe(movieId);
   });


   it('должен вернуть 404 для несуществующего ID', async () => {  // ← 404 вместо null
     const res = await request(app.getHttpServer())
       .get('/movies/999999')
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(404);
   });


 });


 describe('POST /movies', () => {


   it('ADMIN должен создать фильм', async () => {
     const res = await request(app.getHttpServer())
       .post('/movies')
       .set('Authorization', `Bearer ${adminToken}`)
       .send({ title: 'New Film', description: 'A great film', year: 2024, genre: Genre.SCI_FI });


     expect(res.status).toBe(201);
     expect(res.body.title).toBe('New Film');
     expect(res.body.id).toBeDefined();


     const inDb = await prisma.movie.findUnique({ where: { id: res.body.id } });
     expect(inDb).not.toBeNull();
   });


   it('обычный USER должен получить 403', async () => {
     const res = await request(app.getHttpServer())
       .post('/movies')
       .set('Authorization', `Bearer ${userToken}`)
       .send({ title: 'Hack', description: 'x', year: 2020, genre: Genre.ACTION });


     expect(res.status).toBe(403);
   });


   it('без токена должен получить 401', async () => {
     const res = await request(app.getHttpServer())
       .post('/movies')
       .send({ title: 'Anon', description: 'x', year: 2020, genre: Genre.ACTION });


     expect(res.status).toBe(401);
   });


   it('ADMIN должен получить 400 при невалидных данных', async () => {
     const res = await request(app.getHttpServer())
       .post('/movies')
       .set('Authorization', `Bearer ${adminToken}`)
       .send({ title: 'Missing Fields' });


     expect(res.status).toBe(400);
   });


 });


 describe('DELETE /movies/:id', () => {


   it('ADMIN должен удалить фильм', async () => {
     const res = await request(app.getHttpServer())
       .delete(`/movies/${movieId}`)
       .set('Authorization', `Bearer ${adminToken}`);


     expect(res.status).toBe(200);


     const inDb = await prisma.movie.findUnique({ where: { id: movieId } });
     expect(inDb).toBeNull();
   });


   it('обычный USER должен получить 403', async () => {
     const res = await request(app.getHttpServer())
       .delete(`/movies/${movieId}`)
       .set('Authorization', `Bearer ${userToken}`);


     expect(res.status).toBe(403);
   });


 });


});
