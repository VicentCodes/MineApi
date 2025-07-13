// index.js
const { syncActiveWorld } = require("./src/config/config");
const http = require("http");
const app = require("./src/app");

const PORT = process.env.PORT || 19130;

// Sync active world once and start server
const currentWorld = syncActiveWorld();

http.createServer(app).listen(PORT, () => {
  console.log(
    `API listening on port ${PORT}, active world synced: ${currentWorld}`
  );
});
