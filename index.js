const { syncMundoActivo } = require("./src/config/config");
const http = require("http");
const app = require("./src/app");

const PORT = process.env.PORT || 19130;

// Llamas una sola vez, guardas en `mundo` y luego lo muestras
const mundo = syncMundoActivo();

http.createServer(app).listen(PORT, () => {
  console.log(
    `API escuchando en puerto ${PORT}, mundo activo sincronizado: ${mundo}`
  );
});
