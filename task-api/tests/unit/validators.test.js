const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid minimal task payload', () => {
      const error = validateCreateTask({ title: 'Buy groceries' });
      expect(error).toBeNull();
    });

    test('returns null for valid full task payload', () => {
      const error = validateCreateTask({
        title: 'Complete assignment',
        description: 'Finish all parts',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-01T00:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    test('returns error if body is not an object or is null/array', () => {
      expect(validateCreateTask(null)).toBe('request body must be an object');
      expect(validateCreateTask(undefined)).toBe('request body must be an object');
      expect(validateCreateTask('string')).toBe('request body must be an object');
      expect(validateCreateTask([1, 2])).toBe('request body must be an object');
    });

    test('returns error if title is missing', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
    });

    test('returns error if title is not a string', () => {
      expect(validateCreateTask({ title: 12345 })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: null })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: true })).toBe('title is required and must be a non-empty string');
    });

    test('returns error if title is empty string or only whitespace', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    test('returns error if status is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Test', status: 'archived' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateCreateTask({ title: 'Test', status: '' })).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error if priority is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Test', priority: 'urgent' })).toBe('priority must be one of: low, medium, high');
      expect(validateCreateTask({ title: 'Test', priority: '' })).toBe('priority must be one of: low, medium, high');
    });

    test('returns error if dueDate is not a valid date string', () => {
      expect(validateCreateTask({ title: 'Test', dueDate: 'not-a-date' })).toBe('dueDate must be a valid ISO date string');
      expect(validateCreateTask({ title: 'Test', dueDate: '' })).toBe('dueDate must be a valid ISO date string');
      expect(validateCreateTask({ title: 'Test', dueDate: 12345 })).toBe('dueDate must be a valid ISO date string');
    });

    test('allows dueDate to be null', () => {
      expect(validateCreateTask({ title: 'Test', dueDate: null })).toBeNull();
    });

    test('allows valid status options (todo, in_progress, done)', () => {
      expect(validateCreateTask({ title: 'Task 1', status: 'todo' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 2', status: 'in_progress' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 3', status: 'done' })).toBeNull();
    });

    test('allows valid priority options (low, medium, high)', () => {
      expect(validateCreateTask({ title: 'Task 1', priority: 'low' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 2', priority: 'medium' })).toBeNull();
      expect(validateCreateTask({ title: 'Task 3', priority: 'high' })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for empty update body', () => {
      const error = validateUpdateTask({});
      expect(error).toBeNull();
    });

    test('returns error if body is not an object or is null/array', () => {
      expect(validateUpdateTask(null)).toBe('request body must be an object');
      expect(validateUpdateTask('string')).toBe('request body must be an object');
      expect(validateUpdateTask([])).toBe('request body must be an object');
    });

    test('returns null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-12-31T23:59:59.000Z' })).toBeNull();
    });

    test('returns error if title is provided but invalid', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 100 })).toBe('title must be a non-empty string');
    });

    test('returns error if status is provided but invalid', () => {
      expect(validateUpdateTask({ status: 'finished' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateUpdateTask({ status: '' })).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error if priority is provided but invalid', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toBe('priority must be one of: low, medium, high');
      expect(validateUpdateTask({ priority: '' })).toBe('priority must be one of: low, medium, high');
    });

    test('returns error if dueDate is provided but invalid', () => {
      expect(validateUpdateTask({ dueDate: 'invalid-date' })).toBe('dueDate must be a valid ISO date string');
      expect(validateUpdateTask({ dueDate: '' })).toBe('dueDate must be a valid ISO date string');
      expect(validateUpdateTask({ dueDate: 99999 })).toBe('dueDate must be a valid ISO date string');
    });

    test('allows dueDate to be set to null', () => {
      expect(validateUpdateTask({ dueDate: null })).toBeNull();
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee string', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
      expect(validateAssignTask({ assignee: 'Bob Smith' })).toBeNull();
    });

    test('returns error if body is not an object or is null/array', () => {
      expect(validateAssignTask(null)).toBe('request body must be an object');
      expect(validateAssignTask(undefined)).toBe('request body must be an object');
      expect(validateAssignTask('Alice')).toBe('request body must be an object');
      expect(validateAssignTask(['Alice'])).toBe('request body must be an object');
    });

    test('returns error if assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required');
    });

    test('returns error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: {} })).toBe('assignee must be a non-empty string');
    });

    test('returns error if assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee must be a non-empty string');
    });
  });
});

