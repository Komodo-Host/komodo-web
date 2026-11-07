const express = require("express");
const router = express.Router();
const crypto = require("crypto"); // Para generar hashes si faltan

// ==================================================
// HELPER PARA PTERODACTYL
// ==================================================
const PTERO_URL = "https://panel.komodo-host.site";
const PTERO_API_KEY = "ptla_Q4OHAYfKIWvkHvECQdacMjTclBVXjofrc63Q86Oxzmm";

async function pteroApiRequest(method, endpoint, body) {
  const response = await fetch(`${PTERO_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${PTERO_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try {
    data = await response.json();
  } catch (e) {}
  if (!response.ok) {
    const detail = data?.errors?.[0]?.detail || `Pterodactyl HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

// ==================================================
// MAPEO DE EGGS A LENGUAJES
// ==================================================
const EGG_LANGUAGES = {
  18: "NodeJs",
  20: "Python",
  23: "Java"
};

// ==================================================
// EXPORTAMOS LA FUNCIÓN QUE RECIBE LA BD
// ==================================================
module.exports = (db) => {
  
  // Aseguramos que la tabla user_servers exista al iniciar
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pterodactyl_server_id INTEGER NOT NULL,
      server_hash TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // RUTA 1: LISTAR SERVIDORES (Para el Dashboard)
  router.get("/list", async (req, res) => {
    try {
      const userId = req.user.id;

      const user = db.prepare("SELECT pterodactyl_id FROM users WHERE id = ? LIMIT 1").get(userId);
      if (!user || !user.pterodactyl_id) {
        return res.status(400).json({ success: false, message: "No tienes una cuenta vinculada en el panel." });
      }

      const pteroAllServers = await pteroApiRequest("GET", `/api/application/servers`);
      
      const rawServers = (pteroAllServers.data || []).filter(
        (server) => server.attributes.user === user.pterodactyl_id
      );

      const formattedServers = rawServers.map(server => {
        const attrs = server.attributes;
        
        let status = "offline";
        if (attrs.status === "running") status = "online";
        else if (attrs.status === "installing") status = "installing";

        let detectedLanguage = EGG_LANGUAGES[attrs.egg] || "Desconocido";

        // Buscar el hash en nuestra base de datos
        let serverRecord = db.prepare("SELECT server_hash FROM user_servers WHERE pterodactyl_server_id = ? AND user_id = ?").get(attrs.id, userId);
        
        // Si el servidor no tiene hash (fue creado antes), generamos uno y lo guardamos
        if (!serverRecord) {
          const newHash = crypto.randomBytes(3).toString("hex");
          db.prepare("INSERT INTO user_servers (user_id, pterodactyl_server_id, server_hash) VALUES (?, ?, ?)").run(userId, attrs.id, newHash);
          serverRecord = { server_hash: newHash };
        }

        return {
          id: attrs.id,
          hash: serverRecord.server_hash, // <-- Enviamos el hash al frontend
          name: attrs.name,
          description: attrs.description || "Sin descripción",
          status: status,
          ram: attrs.limits.memory,
          cpu: attrs.limits.cpu,
          disk: attrs.limits.disk,
          language: detectedLanguage
        };
      });

      return res.status(200).json({
        success: true,
        servers: formattedServers
      });

    } catch (error) {
      console.error("Error al listar servidores:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error al obtener la lista de servidores.",
        detail: error.message
      });
    }
  });

  // RUTA 2: OBTENER DATOS DE UN SERVIDOR POR HASH (Para el Panel)
  router.get("/server/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      const userId = req.user.id;

      // 1. Buscar en nuestra BD si el hash existe y pertenece a este usuario
      const serverRecord = db.prepare("SELECT pterodactyl_server_id FROM user_servers WHERE server_hash = ? AND user_id = ?").get(hash, userId);
      
      if (!serverRecord) {
        return res.status(403).json({ success: false, message: "No tienes permiso para acceder a este servidor o no existe." });
      }

      // 2. Si es dueño, pedir los datos reales a Pterodactyl
      const pteroServer = await pteroApiRequest("GET", `/api/application/servers/${serverRecord.pterodactyl_server_id}`);
      const attrs = pteroServer.attributes;

      let status = "offline";
      if (attrs.status === "running") status = "online";
      else if (attrs.status === "installing") status = "installing";

      let detectedLanguage = EGG_LANGUAGES[attrs.egg] || "Desconocido";

      return res.status(200).json({
        success: true,
        server: {
          id: attrs.id,
          name: attrs.name,
          description: attrs.description || "Sin descripción",
          status: status,
          ram: attrs.limits.memory,
          cpu: attrs.limits.cpu,
          disk: attrs.limits.disk,
          language: detectedLanguage
        }
      });

    } catch (error) {
      console.error("Error al obtener servidor por hash:", error.message);
      return res.status(500).json({ success: false, message: "Error al obtener los datos del servidor.", detail: error.message });
    }
  });

  return router;
};