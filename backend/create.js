const express = require("express");
const router = express.Router();
const crypto = require("crypto");

// ==================================================
// CONFIGURACIÓN DE PLANES
// ==================================================
const PLANS = {
  salamandra: { ram: 1024, cpu: 50, disk: 5120 },
  gecko: { ram: 2048, cpu: 100, disk: 10240 },
  basilisco: { ram: 4096, cpu: 200, disk: 20480 },
  garrobo: { ram: 6144, cpu: 300, disk: 30720 },
  cuajipal: { ram: 10240, cpu: 500, disk: 51200 },
  varano: { ram: 16384, cpu: 800, disk: 81920 }
};

// ==================================================
// CONFIGURACIÓN DE ENTORNOS (EGGS)
// ==================================================
const LANGUAGES = {
  nodejs: {
    eggId: 18,
    dockerImage: "ghcr.io/parkervcp/yolks:nodejs_18",
    defaultEnv: {
      "NODE_VERSION": "18", 
      "USER_UPLOAD": "0", 
      "AUTO_UPDATE": "0", 
      "MAIN_FILE": "index.js" 
    }
  },
  python: {
    eggId: 20,
    dockerImage: "ghcr.io/parkervcp/yolks:python_3.11",
    defaultEnv: {
      "USER_UPLOAD": "0",
      "AUTO_UPDATE": "0",
      "PY_FILE": "app.py",
      "PY_PACKAGES": "",
      "REQUIREMENTS_FILE": "requirements.txt"
    }
  },
  java: {
    eggId: 23,
    dockerImage: "ghcr.io/parkervcp/yolks:java_17",
    defaultEnv: {
      "JARFILE": "sneakyhub.jar"
    }
  }
};

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
// EXPORTAMOS UNA FUNCIÓN QUE RECIBE LA BD
// ==================================================
module.exports = (db) => {
  
  router.post("/create", async (req, res) => {
    try {
      const { plan, name, description, language = "nodejs" } = req.body;
      const userId = req.user.id; 

      // Validar el plan
      const planData = PLANS[plan.toLowerCase()];
      if (!planData) {
        return res.status(400).json({ success: false, message: "Plan no válido." });
      }

      // Validar el lenguaje
      const langData = LANGUAGES[language.toLowerCase()];
      if (!langData) {
        return res.status(400).json({ success: false, message: "Lenguaje no soportado." });
      }

      // Buscar el pterodactyl_id en la BD que nos pasaron
      const user = db.prepare("SELECT pterodactyl_id FROM users WHERE id = ? LIMIT 1").get(userId);
      if (!user || !user.pterodactyl_id) {
        return res.status(400).json({ success: false, message: "No tienes una cuenta vinculada en el panel de juegos." });
      }

      // 1. Obtener el comando de inicio real desde el Egg de Pterodactyl correspondiente
      const eggData = await pteroApiRequest("GET", `/api/application/nests/6/eggs/${langData.eggId}`);
      const eggStartup = eggData.attributes.startup;

      // 2. Buscar un puerto libre
      const allocationsData = await pteroApiRequest("GET", `/api/application/nodes/1/allocations`);
      const freeAllocation = allocationsData.data.find(
        (alloc) => alloc.attributes.assigned === false && alloc.attributes.ip === "127.0.0.1"
      );

      if (!freeAllocation) {
        return res.status(503).json({ success: false, message: "No hay puertos libres en el nodo en este momento." });
      }
      const allocationId = freeAllocation.attributes.id;

      // 3. Armar payload usando el startup real del Egg y las variables correctas
      const serverPayload = {
        name: name,
        user: user.pterodactyl_id,
        egg: langData.eggId,
        docker_image: langData.dockerImage,
        startup: eggStartup, 
        environment: langData.defaultEnv,
        limits: {
          memory: planData.ram,
          swap: 0,
          disk: planData.disk,
          io: 500,
          cpu: planData.cpu
        },
        feature_limits: { databases: 0, backups: 1, allocations: 1 },
        allocation: { default: allocationId },
        description: description || "Servidor creado desde Komodo Hosting",
        start_on_completion: true
      };

      // 4. Crear en Pterodactyl
      const pteroResponse = await pteroApiRequest("POST", `/api/application/servers`, serverPayload);
      const pteroServerId = pteroResponse.attributes.id;

      // 5. Generar el hash único para el panel
      const serverHash = crypto.randomBytes(3).toString("hex"); // Genera 6 caracteres aleatorios (ej. "c5a1b2")

      // 6. Guardar en nuestra base de datos (SQLite)
      // Creamos la tabla si no existe
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

      // Insertamos el registro
      db.prepare(`
        INSERT INTO user_servers (user_id, pterodactyl_server_id, server_hash)
        VALUES (?, ?, ?)
      `).run(userId, pteroServerId, serverHash);

      return res.status(201).json({
        success: true,
        message: "¡Servidor creado exitosamente!",
        server: { 
          id: pteroServerId, 
          name: pteroResponse.attributes.name,
          hash: serverHash // Devolvemos el hash al frontend
        }
      });

    } catch (error) {
      console.error("Error al crear servidor:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error al crear el servidor.",
        detail: error.message
      });
    }
  });

  return router;
};