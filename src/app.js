// src/app.js

const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");

const serverRoutes = require("./routes/server.routes");
const playersRoutes = require("./routes/players.routes");
const rolesRoutes = require("./routes/roles.routes");
const gameplayRoutes = require("./routes/gameplay.routes");

const PlayerTracker = require("./services/playerTracker");
const { getMinecraftPath } = require("./config/config");

const app = express();

// ——————————————————————————————————————————————
// Middlewares globales
// ——————————————————————————————————————————————
app.use(helmet());
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ——————————————————————————————————————————————
// Instanciamos el tracker de jugadores
// ——————————————————————————————————————————————
const logFile = path.join(getMinecraftPath(), "logs", "latest.log");
const tracker = new PlayerTracker(logFile);

// Endpoint snapshot: lista actual de jugadores
app.get("/api/server/list-players", (req, res) => {
  res.json({ players: tracker.snapshot() });
});

// Endpoint SSE: stream en tiempo real de cambios en la lista
app.get("/api/server/list-players/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const onUpdate = (players) => {
    res.write(`Players: ${JSON.stringify(players)}\n\n`);
  };

  tracker.on("update", onUpdate);

  req.on("close", () => {
    tracker.off("update", onUpdate);
  });
});

// ——————————————————————————————————————————————
// Rutas de la API
// ——————————————————————————————————————————————
app.use("/api/server", serverRoutes);
app.use("/api/players", playersRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/jugabilidad", gameplayRoutes);

// ——————————————————————————————————————————————
// Manejo de errores
// ——————————————————————————————————————————————
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
