const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Task Manager API is running',
    endpoints: {
      tasks: '/tasks',
      stats: '/tasks/stats',
    },
  });
});

app.use('/tasks', taskRoutes);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;
