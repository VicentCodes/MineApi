const { syncMundoActivo } = require("./src/config/config");

syncMundoActivo();
const http = require("http");
const app = require("./src/app");
const PORT = process.env.PORT || 19130;

http.createServer(app).listen(PORT, () => {
  console.log(`API escuchando en puerto ${PORT}, mundo activo sincronizado: ${syncMundoActivo()}`);
});
