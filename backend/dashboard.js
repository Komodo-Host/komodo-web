const express = require("express");
const router = express.Router();

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
// EXPORTAMOS LA FUNCIÓN QUE RECIBE LA BD
// ==================================================
module.exports = (db) => {
  
  router.get("/list", async (req, res) => {
    try {
      const userId = req.user.id;

      // 1. Buscar el pterodactyl_id del usuario en la base de datos
      const user = db.prepare("SELECT pterodactyl_id FROM users WHERE id = ? LIMIT 1").get(userId);
      if (!user || !user.pterodactyl_id) {
        return res.status(400).json({ success: false, message: "No tienes una cuenta vinculada en el panel." });
      }

      // 2. Pedirle a Pterodactyl TODOS los servidores del panel
      const pteroAllServers = await pteroApiRequest("GET", `/api/application/servers`);
      
      // 3. Filtrar en nuestro backend solo los que pertenecen a este usuario
      const rawServers = (pteroAllServers.data || []).filter(
        (server) => server.attributes.user === user.pterodactyl_id
      );

      // 4. Formatear los datos para nuestro frontend
      const formattedServers = rawServers.map(server => {
        const attrs = server.attributes;
        
        // Pterodactyl guarda el estado como null (apagado), "running" (encendido) o "installing"
        let status = "offline";
        if (attrs.status === "running") status = "online";
        else if (attrs.status === "installing") status = "installing";

        return {
          id: attrs.id,
          name: attrs.name,
          description: attrs.description || "Sin descripción",
          status: status,
          ram: attrs.limits.memory, // En MB
          cpu: attrs.limits.cpu,    // En porcentaje (100 = 1 core)
          disk: attrs.limits.disk,  // En MB
          language: "NodeJs"        // Por ahora todos son NodeJs según nuestro create.js
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

  return router;
};
