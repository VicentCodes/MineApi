const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors   = require('cors');

const serverRoutes   = require('./routes/server.routes');
const playersRoutes  = require('./routes/players.routes');
const rolesRoutes    = require('./routes/roles.routes');
const gameplayRoutes = require('./routes/gameplay.routes');

const app = express();

// Middlewares globales
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas API
app.use('/api/server',   serverRoutes);
app.use('/api/players',  playersRoutes);
app.use('/api/roles',    rolesRoutes);
app.use('/api/jugabilidad', gameplayRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
