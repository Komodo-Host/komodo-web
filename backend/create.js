const express = require("express");
const router = express.Router();

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
      const { plan, name, description } = req.body;
      const userId = req.user.id; 

      // Validar el plan
      const planData = PLANS[plan.toLowerCase()];
      if (!planData) {
        return res.status(400).json({ success: false, message: "Plan no válido." });
      }

      // Buscar el pterodactyl_id en la BD que nos pasaron
      const user = db.prepare("SELECT pterodactyl_id FROM users WHERE id = ? LIMIT 1").get(userId);
      if (!user || !user.pterodactyl_id) {
        return res.status(400).json({ success: false, message: "No tienes una cuenta vinculada en el panel de juegos." });
      }

      // 1. Obtener el comando de inicio real desde el Egg de Pterodactyl
      // Consultamos el Nido 6, Egg 18 (Node.js)
      const eggData = await pteroApiRequest("GET", `/api/application/nests/6/eggs/18`);
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

      // 3. Armar payload usando el startup real del Egg
      const serverPayload = {
        name: name,
        user: user.pterodactyl_id,
        egg: 18,
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: eggStartup, // <-- Usamos el comando real del Egg
        environment: {
          "NODE_VERSION": "18", 
          "USER_UPLOAD": "0", 
          "AUTO_UPDATE": "0", 
          "MAIN_FILE": "index.js" 
        },
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

      return res.status(201).json({
        success: true,
        message: "¡Servidor creado exitosamente!",
        server: { id: pteroResponse.attributes.id, name: pteroResponse.attributes.name }
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
