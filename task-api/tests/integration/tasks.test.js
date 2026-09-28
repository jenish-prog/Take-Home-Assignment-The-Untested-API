const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /', () => {
    test('returns health check status and API endpoints', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.message).toBe('Task Manager API is running');
      expect(res.body.endpoints).toBeDefined();
    });
  });

  describe('GET /tasks', () => {
    test('returns empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    test('returns empty array when filtering by non-existent or unused status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('paginates tasks with page and limit parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('combines status filtering and pagination parameters', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      taskService.create({ title: 'Task 3', status: 'todo' });
      taskService.create({ title: 'Task 4', status: 'todo' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 3');
    });

    test('filters tasks by priority', async () => {
      taskService.create({ title: 'Task Low', priority: 'low' });
      taskService.create({ title: 'Task High', priority: 'high' });

      const res = await request(app).get('/tasks?priority=high');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task High');
    });

    test('filters tasks by assignee', async () => {
      const t1 = taskService.create({ title: 'Task Alice' });
      const t2 = taskService.create({ title: 'Task Bob' });
      taskService.assignTask(t1.id, 'Alice');
      taskService.assignTask(t2.id, 'Bob');

      const res = await request(app).get('/tasks?assignee=alice');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].assignee).toBe('Alice');
    });

    test('filters tasks by text search across title and description', async () => {
      taskService.create({ title: 'Fix database bug', description: 'Important backend task' });
      taskService.create({ title: 'Update documentation', description: 'Write API guide' });

      const resTitle = await request(app).get('/tasks?search=database');
      expect(resTitle.status).toBe(200);
      expect(resTitle.body.length).toBe(1);
      expect(resTitle.body[0].title).toBe('Fix database bug');

      const resDesc = await request(app).get('/tasks?search=backend');
      expect(resDesc.status).toBe(200);
      expect(resDesc.body.length).toBe(1);
      expect(resDesc.body[0].title).toBe('Fix database bug');
    });

    test('supports pagination with only page or only limit provided', async () => {
      for (let i = 1; i <= 3; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const resOnlyPage = await request(app).get('/tasks?page=1');
      expect(resOnlyPage.status).toBe(200);
      expect(resOnlyPage.body.length).toBe(3);

      const resOnlyLimit = await request(app).get('/tasks?limit=1');
      expect(resOnlyLimit.status).toBe(200);
      expect(resOnlyLimit.body.length).toBe(1);
    });
  });

  describe('GET /tasks/:id', () => {
    test('fetches a single task by ID and returns 200', async () => {
      const created = taskService.create({ title: 'Fetch Me', priority: 'high' });
      const res = await request(app).get(`/tasks/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Fetch Me');
    });

    test('returns 404 when fetching a non-existent task ID', async () => {
      const res = await request(app).get('/tasks/non-existent-uuid');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with required fields and returns 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.description).toBe('');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    test('creates a task with all fields populated', async () => {
      const dueDate = '2026-11-15T12:00:00.000Z';
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'Detailed description',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Full Task');
      expect(res.body.description).toBe('Detailed description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    test('returns 400 if title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title provided' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('returns 400 if title is empty or whitespace', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('returns 400 if status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Invalid Status Task', status: 'unknown_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns 400 if priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Invalid Priority Task', priority: 'extreme' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('returns 400 if dueDate is not a valid date', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Invalid Due Date Task', dueDate: 'invalid-iso-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });

    test('returns 400 if malformed JSON is sent', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"malformed:');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Malformed JSON payload');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task successfully', async () => {
      const created = taskService.create({ title: 'Original Task', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when update payload contains invalid fields', async () => {
      const created = taskService.create({ title: 'Valid Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'super-urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('automates completedAt timestamp when task status transitions to done', async () => {
      const created = taskService.create({ title: 'Task to finish', status: 'todo' });
      expect(created.completedAt).toBeNull();

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).toISOString()).toBe(res.body.completedAt);
    });

    test('clears completedAt when task status transitions away from done', async () => {
      const created = taskService.create({ title: 'Task to reopen', status: 'done' });
      taskService.completeTask(created.id);

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
      expect(res.body.completedAt).toBeNull();
    });

    test('returns 400 when updating task ID is stats (collision protection)', async () => {
      const res = await request(app)
        .put('/tasks/stats')
        .send({ title: 'Invalid' });

      expect(res.status).toBe(405);
    });
  });

  describe('PATCH /tasks/:id', () => {
    test('partially updates task fields', async () => {
      const created = taskService.create({ title: 'Initial Title', description: 'Initial Desc' });

      const res = await request(app)
        .patch(`/tasks/${created.id}`)
        .send({ description: 'Updated Desc only' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Initial Title');
      expect(res.body.description).toBe('Updated Desc only');
    });

    test('returns 400 on invalid PATCH field', async () => {
      const created = taskService.create({ title: 'Test' });

      const res = await request(app)
        .patch(`/tasks/${created.id}`)
        .send({ priority: 'invalid-priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('returns 404 when patching non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id')
        .send({ title: 'New' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task and returns 204', async () => {
      const created = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('returns 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('rejects DELETE on /tasks/stats with 405 Method Not Allowed', async () => {
      const res = await request(app).delete('/tasks/stats');
      expect(res.status).toBe(405);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as done and sets completedAt', async () => {
      const created = taskService.create({ title: 'Task to Complete', priority: 'high' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).toISOString()).toBe(res.body.completedAt);
    });

    test('returns 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns zero stats when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('returns correct counts including overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();


      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Task 4', status: 'todo', dueDate: futureDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 2,
      });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to a user and returns 200 with updated task', async () => {
      const created = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alex Doe' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.assignee).toBe('Alex Doe');
    });

    test('trims leading and trailing whitespace from assignee name', async () => {
      const created = taskService.create({ title: 'Task with Whitespace Assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   Jordan Lee   ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jordan Lee');
    });

    test('reassigns an already assigned task to a new user', async () => {
      const created = taskService.create({ title: 'Already Assigned Task' });
      taskService.assignTask(created.id, 'Alice');

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('returns 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-uuid/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 if assignee field is missing', async () => {
      const created = taskService.create({ title: 'Task Missing Assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required');
    });

    test('returns 400 if assignee is empty or only whitespace', async () => {
      const created = taskService.create({ title: 'Task Empty Assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee must be a non-empty string');
    });

    test('returns 400 if assignee is not a string', async () => {
      const created = taskService.create({ title: 'Task Non-String Assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee must be a non-empty string');
    });
  });

  describe('CORS & Preflight Requests', () => {
    test('includes Access-Control-Allow-Origin: * on responses', async () => {
      const res = await request(app).get('/');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });

    test('handles OPTIONS preflight request with 204 No Content', async () => {
      const res = await request(app).options('/tasks');
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });
  });
});


