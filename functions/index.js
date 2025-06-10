
const functions = require("firebase-functions");
const next = require("next");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
// La aplicación Next.js está en el directorio padre de 'functions'
const appDir = path.join(__dirname, "../");
const app = next({ dev, dir: appDir, conf: { distDir: ".next" } });
const handle = app.getRequestHandler();

exports.nextServer = functions.https.onRequest((req, res) => {
  // Asegura que la app Next.js esté lista antes de manejar la solicitud
  return app.prepare().then(() => handle(req, res));
});
