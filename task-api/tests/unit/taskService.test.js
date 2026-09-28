const taskService = require('../../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with required fields and defaults', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });

    test('creates a task with custom fields provided', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Details here',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-01T10:00:00.000Z',
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Details here');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-01T10:00:00.000Z');
    });
  });

  describe('getAll', () => {
    test('returns empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('returns a copy of array so external mutations do not affect internal state', () => {
      taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();
      tasks.pop();
      expect(taskService.getAll().length).toBe(1);
    });
  });

  describe('findById', () => {
    test('finds task by existing id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    test('returns undefined for non-existent id', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('filters tasks matching specific status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 1');

      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks.length).toBe(1);
      expect(inProgressTasks[0].title).toBe('Task 2');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Task 3');
    });

    test('returns empty array when no tasks match status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const result = taskService.getByStatus('done');
      expect(result).toEqual([]);
    });

    test('should match status exactly rather than substring', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      // If status matching uses .includes('do'), 'do' will match both 'todo' and 'done'
      // A query for 'do' should not return tasks when no status is literally 'do'
      const doTasks = taskService.getByStatus('do');
      expect(doTasks).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('returns the first page of items when page=1', () => {
      const result = taskService.getPaginated(1, 2);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    test('returns the second page of items when page=2', () => {
      const result = taskService.getPaginated(2, 2);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Task 3');
      expect(result[1].title).toBe('Task 4');
    });

    test('returns empty array when page is beyond available items', () => {
      const result = taskService.getPaginated(10, 2);
      expect(result).toEqual([]);
    });

    test('uses defaults when page and limit are omitted', () => {
      const result = taskService.getPaginated();
      expect(result.length).toBe(5);
      expect(result[0].title).toBe('Task 1');
    });

    test('paginates filtered tasks when status is provided', () => {
      taskService._reset();
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Todo 3', status: 'todo' });

      const page1 = taskService.getPaginated(1, 2, 'todo');
      expect(page1.length).toBe(2);
      expect(page1[0].title).toBe('Todo 1');
      expect(page1[1].title).toBe('Todo 2');

      const page2 = taskService.getPaginated(2, 2, 'todo');
      expect(page2.length).toBe(1);
      expect(page2[0].title).toBe('Todo 3');
    });

    test('falls back to safe defaults when invalid or non-positive page/limit are passed', () => {
      const result = taskService.getPaginated('invalid', -5);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Task 1');

      const resultDefaultLimit = taskService.getPaginated(1, 'not-a-number');
      expect(resultDefaultLimit.length).toBe(5);
    });
  });

  describe('getStats', () => {
    test('returns zero counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('correctly tallies task counts and overdue tasks', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      // Todo overdue
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      // In progress overdue
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: pastDate });
      // Done with past due date (should NOT be overdue because completed)
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });
      // Todo not overdue (future date)
      taskService.create({ title: 'Task 4', status: 'todo', dueDate: futureDate });
      // Todo without due date
      taskService.create({ title: 'Task 5', status: 'todo', dueDate: null });
      // Non-standard status ignored in defined status counts
      taskService.create({ title: 'Task 6', status: 'custom_status' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    test('updates specified fields on existing task', () => {
      const created = taskService.create({ title: 'Original Title', priority: 'low' });
      const updated = taskService.update(created.id, { title: 'Updated Title', priority: 'high' });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe(''); // unchanged
      expect(updated.id).toBe(created.id); // id preserved
    });

    test('does not allow updating immutable fields (id, createdAt, completedAt)', () => {
      const created = taskService.create({ title: 'Task with ID' });
      const originalId = created.id;
      const originalCreatedAt = created.createdAt;

      const updated = taskService.update(created.id, {
        id: 'new-malicious-id',
        createdAt: '1970-01-01T00:00:00.000Z',
        completedAt: '2000-01-01T00:00:00.000Z',
        title: 'Safe Update',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.completedAt).toBeNull();
      expect(updated.title).toBe('Safe Update');
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('deletes existing task and returns true', () => {
      const created = taskService.create({ title: 'To Delete' });
      const success = taskService.remove(created.id);
      expect(success).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
      expect(taskService.getAll().length).toBe(0);
    });

    test('returns false when deleting non-existent task', () => {
      const success = taskService.remove('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as done and sets completedAt timestamp', () => {
      const created = taskService.create({ title: 'Complete Me', status: 'todo' });
      const completed = taskService.completeTask(created.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
    });

    test('preserves existing task priority when completing task', () => {
      const created = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(created.id);

      expect(completed.priority).toBe('high');
    });

    test('returns null when completing non-existent task', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns a user to an unassigned task', () => {
      const created = taskService.create({ title: 'Task to Assign' });
      expect(created.assignee).toBeNull();

      const assigned = taskService.assignTask(created.id, 'Alice');
      expect(assigned).toBeDefined();
      expect(assigned.id).toBe(created.id);
      expect(assigned.assignee).toBe('Alice');

      const found = taskService.findById(created.id);
      expect(found.assignee).toBe('Alice');
    });

    test('reassigns a task if already assigned', () => {
      const created = taskService.create({ title: 'Task with Assignee' });
      taskService.assignTask(created.id, 'Alice');

      const reassigned = taskService.assignTask(created.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');
    });

    test('returns null when assigning non-existent task', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });
});

