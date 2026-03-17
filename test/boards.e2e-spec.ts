import request from 'supertest';
import { Role } from 'src/auth/enums/role.enum';
import { app, prisma, setupApp, cleanDatabase, registerUser, loginAs } from './setup';

describe('BoardsController (e2e)', () => {
  let userToken: string;
  let adminToken: string;
  let userId: number;
  let adminId: number;
  let createdBoardId: number;
  let taskId: number;

  const userEmail = 'boarduser@test.com';
  const adminEmail = 'boardadmin@test.com';
  const password = 'password123';

  // beforeAll: register → set ADMIN → login → save tokens
  beforeAll(async () => {
    await setupApp();
    await cleanDatabase();

    // 1. Зарегистрировать двух пользователей через POST /auth/register
    await registerUser(userEmail, password, 'Board User');
    userId = (await prisma.user.findUnique({ where: { email: userEmail } }))!.id;

    await registerUser(adminEmail, password, 'Board Admin');
    adminId = (await prisma.user.findUnique({ where: { email: adminEmail } }))!.id;

    // 2. Повысить одного до ADMIN напрямую через PrismaService
    await prisma.user.update({ where: { email: adminEmail }, data: { role: Role.ADMIN } });

    // 3. Залогиниться за обоих и сохранить токены
    userToken = await loginAs(userEmail, password);
    adminToken = await loginAs(adminEmail, password);
  });

  // afterAll: очистить тестовые данные из БД
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  // ─── Критерий 1: Миграция выполнена — в БД есть колонка role у таблицы users ───
  describe('Миграция', () => {
    it('в БД у пользователя есть колонка role', async () => {
      // Arrange
      const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
      const user = await prisma.user.findUnique({ where: { email: userEmail } });

      // Assert
      expect(admin).toBeDefined();
      expect(admin!.role).toBe(Role.ADMIN);
      expect(user).toBeDefined();
      expect(user!.role).toBe(Role.USER);
    });
  });

  // ─── Критерий 2: POST /auth/login и POST /auth/register работают БЕЗ токена (200/201) ───
  describe('POST /auth/register и POST /auth/login', () => {
    it('register и login доступны без токена (201 / 200)', async () => {
      // Arrange
      const uniqueEmail = 'notoken@test.com';

      // Act — register без токена
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail, password, name: 'No Token' });

      // Assert
      expect(regRes.status).toBe(201);

      // Act — login без токена
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail, password });

      // Assert
      expect(loginRes.status).toBe(200);

      // Cleanup
      await prisma.user.delete({ where: { email: uniqueEmail } });
    });
  });

  // ─── Критерий 3: GET /boards без токена → 401 Unauthorized ───
  describe('GET /boards — без токена', () => {
    it('должен вернуть 401 Unauthorized', async () => {
      // Arrange — запрос без заголовка Authorization

      // Act
      const res = await request(app.getHttpServer()).get('/boards');

      // Assert
      expect(res.status).toBe(401);
    });
  });

  // ─── Критерий 4: GET /boards с токеном USER → 200 OK ───
  describe('GET /boards — с токеном USER', () => {
    it('должен вернуть 200 OK', async () => {
      // Arrange — токен обычного пользователя

      // Act
      const res = await request(app.getHttpServer())
        .get('/boards')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── Критерий 5: POST /boards с токеном USER → 403 Forbidden ───
  describe('POST /boards — USER', () => {
    it('обычный USER должен получить 403 Forbidden', async () => {
      // Arrange
      const boardData = { title: 'User Board' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${userToken}`)
        .send(boardData);

      // Assert
      expect(res.status).toBe(403);
    });
  });

  // ─── Критерий 6: POST /boards с токеном ADMIN → 201 Created ───
  describe('POST /boards — ADMIN', () => {
    it('ADMIN должен создать доску и вернуть 201 Created', async () => {
      // Arrange
      const boardData = { title: 'Тестовая доска' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(boardData);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Тестовая доска');
      expect(res.body.id).toBeDefined();

      createdBoardId = res.body.id; // сохраняем для следующих тестов
    });
  });

  // ─── GET /boards/:id ───
  describe('GET /boards/:id', () => {
    it('авторизованный пользователь получает доску по ID → 200', async () => {
      // Arrange — используем createdBoardId из предыдущего теста

      // Act
      const res = await request(app.getHttpServer())
        .get(`/boards/${createdBoardId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdBoardId);
      expect(res.body.title).toBe('Тестовая доска');
    });
  });

  // ─── PATCH /boards/:id ───
  describe('PATCH /boards/:id', () => {
    it('USER должен получить 403 Forbidden', async () => {
      // Arrange
      const updateData = { title: 'Обновлённая доска' };

      // Act
      const res = await request(app.getHttpServer())
        .patch(`/boards/${createdBoardId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Assert
      expect(res.status).toBe(403);
    });

    it('ADMIN может обновить доску → 200 OK', async () => {
      // Arrange
      const updateData = { title: 'Обновлённая доска' };

      // Act
      const res = await request(app.getHttpServer())
        .patch(`/boards/${createdBoardId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Обновлённая доска');
    });
  });

  // ─── Критерий 7: POST /tasks НЕ принимает userId в теле — берёт из токена автоматически ───
  describe('POST /tasks', () => {
    it('userId берётся из токена автоматически, а не из тела запроса', async () => {
      // Arrange — отправляем задачу без userId в теле
      const taskData = { title: 'Задача из токена', boardId: createdBoardId };

      // Act
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send(taskData);

      // Assert — задача создана, userId взят из токена автоматически
      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(userId);

      taskId = res.body.id; // сохраняем для следующих тестов
    });
  });

  // ─── Критерий 8: PATCH /tasks/:id своей задачи → 200 OK ───
  describe('PATCH /tasks/:id', () => {
    it('владелец может обновить свою задачу → 200 OK', async () => {
      // Arrange
      const updateData = { title: 'Обновлённая задача', boardId: createdBoardId };

      // Act
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Обновлённая задача');
    });

    // ─── Критерий 9: PATCH /tasks/:id чужой задачи (не ADMIN) → 403 Forbidden ───
    it('не-владелец (не ADMIN) получает 403 Forbidden', async () => {
      // Arrange — создаём задачу от admin
      const adminTaskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Task', boardId: createdBoardId });
      const adminTaskId = adminTaskRes.body.id;

      // Act — user пытается обновить задачу admin
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${adminTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacked', boardId: createdBoardId });

      // Assert
      expect(res.status).toBe(403);
    });
  });

  // ─── Критерий 10: DELETE /tasks/:id чужой задачи от имени ADMIN → 200 OK ───
  describe('DELETE /tasks/:id', () => {
    it('ADMIN может удалить чужую задачу → 200 OK', async () => {
      // Arrange — taskId принадлежит user

      // Act — admin удаляет задачу user
      const res = await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(res.status).toBe(200);

      const deleted = await prisma.task.findUnique({ where: { id: taskId } });
      expect(deleted).toBeNull();
    });
  });

  // ─── DELETE /boards/:id ───
  describe('DELETE /boards/:id', () => {
    it('USER должен получить 403 Forbidden', async () => {
      // Arrange — создаём доску для удаления
      const boardRes = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Доска для удаления' });
      const boardToDeleteId = boardRes.body.id;

      // Act — user пытается удалить
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardToDeleteId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(403);
    });

    it('ADMIN может удалить доску → 200 OK', async () => {
      // Arrange
      const boardRes = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Доска для удаления ADMIN' });
      const boardToDeleteId = boardRes.body.id;

      // Act
      const res = await request(app.getHttpServer())
        .delete(`/boards/${boardToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Assert
      expect(res.status).toBe(200);

      const deleted = await prisma.board.findUnique({ where: { id: boardToDeleteId } });
      expect(deleted).toBeNull();
    });
  });

  // ─── Бонус: GET /users/profile (аналог /users/me) ───
  describe('GET /users/profile', () => {
    it('без токена → 401', async () => {
      // Arrange — запрос без Authorization

      // Act
      const res = await request(app.getHttpServer()).get('/users/profile');

      // Assert
      expect(res.status).toBe(401);
    });

    it('с токеном USER → 200 и в ответе есть id', async () => {
      // Arrange — токен обычного пользователя

      // Act
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
    });

    it('поле password отсутствует в ответе', async () => {
      // Arrange — токен обычного пользователя

      // Act
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('password');
    });

    it('в ответе есть массив tasks пользователя', async () => {
      // Arrange — создаём доску и задачу для user
      const board = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Profile Board' });

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Profile Task', boardId: board.body.id });

      // Act
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tasks');
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
