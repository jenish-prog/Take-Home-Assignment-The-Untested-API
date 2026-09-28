const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

const getByStatus = (status) => tasks.filter((t) => t.status === status);

const queryTasks = ({ status, priority, assignee, search, page, limit } = {}) => {
  let list = tasks;

  if (status) {
    list = list.filter((t) => t.status === status);
  }
  if (priority) {
    list = list.filter((t) => t.priority === priority);
  }
  if (assignee) {
    list = list.filter((t) => t.assignee && t.assignee.toLowerCase() === assignee.toLowerCase());
  }
  if (search) {
    const term = search.toLowerCase();
    list = list.filter((t) =>
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term))
    );
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    return list.slice(offset, offset + limitNum);
  }

  return list;
};

const getPaginated = (page = 1, limit = 10, status) => {
  return queryTasks({ page, limit, status });
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    assignee,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const { id: _, createdAt: __, ...allowedFields } = fields;
  const current = tasks[index];

  let completedAt = current.completedAt;
  if (allowedFields.status !== undefined) {
    if (allowedFields.status === 'done' && current.status !== 'done') {
      completedAt = allowedFields.completedAt || new Date().toISOString();
    } else if (allowedFields.status !== 'done' && !allowedFields.completedAt) {
      completedAt = null;
    }
  }

  const updated = {
    ...current,
    ...allowedFields,
    completedAt: allowedFields.completedAt !== undefined ? allowedFields.completedAt : completedAt,
  };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = {
    ...tasks[index],
    assignee,
  };
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  queryTasks,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};


