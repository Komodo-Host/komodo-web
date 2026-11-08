const express = require("express");
const router = express.Router();
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ==================================================
// CONFIGURACIÓN
// ==================================================
const ADMIN_PASSWORD = "eumomota505";
const PROVIDER_URL = "https://api.groq.com/openai/v1/chat/completions"; 

// ==================================================
// BASE DE DATOS SEPARADA (ia_database/ia.db)
// ==================================================
const iaDbDir = path.join(__dirname, "ia_database");
if (!fs.existsSync(iaDbDir)) {
  fs.mkdirSync(iaDbDir, { recursive: true });
}
const dbPath = path.join(iaDbDir, "ia.db");
const iaDb = new Database(dbPath);
iaDb.pragma("journal_mode = WAL");

// Tabla para las API Keys de tus usuarios
iaDb.prepare(`
  CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Mi API Key',
    api_key TEXT NOT NULL UNIQUE,
    model_id TEXT NOT NULL DEFAULT 'llama3.1-8b', 
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Si la tabla ya existía de antes, agregamos la columna model_id
const columns = iaDb.prepare(`PRAGMA table_info(user_api_keys)`).all();
if (!columns.some(c => c.name === "model_id")) {
  iaDb.prepare(`ALTER TABLE user_api_keys ADD COLUMN model_id TEXT NOT NULL DEFAULT 'llama3.1-8b'`).run();
}

// Tabla para las 3 API Keys del proveedor
iaDb.prepare(`
  CREATE TABLE IF NOT EXISTS provider_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_name TEXT NOT NULL UNIQUE,
    api_key TEXT,
    remaining_requests INTEGER DEFAULT 0,
    remaining_tokens INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Tabla para saber cuál es la opción activa actualmente
iaDb.prepare(`
  CREATE TABLE IF NOT EXISTS system_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_slot TEXT DEFAULT 'opcion_1',
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();
iaDb.prepare(`INSERT OR IGNORE INTO system_status (id, current_slot) VALUES (1, 'opcion_1')`).run();

// Inicializamos los TRES slots si no existen
iaDb.prepare(`INSERT OR IGNORE INTO provider_keys (slot_name) VALUES ('opcion_1')`).run();
iaDb.prepare(`INSERT OR IGNORE INTO provider_keys (slot_name) VALUES ('opcion_2')`).run();
iaDb.prepare(`INSERT OR IGNORE INTO provider_keys (slot_name) VALUES ('opcion_3')`).run();

// ==================================================
// MIDDLEWARE DE SEGURIDAD PARA EL ADMIN
// ==================================================
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "No autorizado." });
  }
  next();
}

// ==================================================
// RUTAS PÚBLICAS
// ==================================================
router.get("/status", (req, res) => {
  try {
    const status = iaDb.prepare("SELECT current_slot, last_update FROM system_status WHERE id = 1").get();
    const hasProviderKey = iaDb.prepare("SELECT id FROM provider_keys WHERE api_key IS NOT NULL AND api_key != '' LIMIT 1").get();
    
    const isActive = !!hasProviderKey;

    return res.json({
      success: true,
      status: isActive ? "online" : "offline",
      current_server: status.current_slot === "opcion_1" ? "Servidor 1" : (status.current_slot === "opcion_2" ? "Servidor 2" : "Servidor 3"),
      last_update: status.last_update
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al obtener estado." });
  }
});

// ==================================================
// RUTAS DEL PANEL DE ADMIN
// ==================================================
router.get("/admin/status", requireAdmin, (req, res) => {
  try {
    const keys = iaDb.prepare("SELECT slot_name, api_key, remaining_requests, remaining_tokens, last_updated FROM provider_keys").all();
    return res.json({ success: true, keys });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al obtener estado." });
  }
});

router.post("/admin/keys", requireAdmin, (req, res) => {
  try {
    const { opcion_1, opcion_2, opcion_3 } = req.body;
    if (opcion_1) iaDb.prepare("UPDATE provider_keys SET api_key = ? WHERE slot_name = 'opcion_1'").run(opcion_1);
    if (opcion_2) iaDb.prepare("UPDATE provider_keys SET api_key = ? WHERE slot_name = 'opcion_2'").run(opcion_2);
    if (opcion_3) iaDb.prepare("UPDATE provider_keys SET api_key = ? WHERE slot_name = 'opcion_3'").run(opcion_3);
    return res.json({ success: true, message: "API Keys actualizadas correctamente." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al actualizar las keys." });
  }
});

// ==================================================
// MIDDLEWARE DE SESIÓN PARA RUTAS DE USUARIO
// ==================================================
function requireSession(req, res, next) {
  if (typeof authenticateMiddleware !== "function") {
    return res.status(500).json({ success: false, message: "Autenticación no disponible." });
  }
  return authenticateMiddleware(req, res, next);
}

// ==================================================
// RUTAS PARA LOS USUARIOS
// ==================================================
router.get("/user/my-key", requireSession, (req, res) => {
  try {
    const userId = req.user.id; 
    const modelId = req.query.model_id || "llama3.1-8b";

    const key = iaDb.prepare("SELECT id, name, api_key, model_id, created_at FROM user_api_keys WHERE user_id = ? AND is_active = 1 AND model_id = ?").get(userId, modelId);
    return res.json({ success: true, key: key || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error interno." });
  }
});

router.get("/user/my-keys", requireSession, (req, res) => {
  try {
    const keys = iaDb.prepare(
      "SELECT id, name, api_key, model_id, created_at FROM user_api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC, id DESC"
    ).all(req.user.id);
    return res.json({ success: true, keys });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error interno." });
  }
});

router.post("/user/generate-key", requireSession, (req, res) => {
  try {
    const { name, model_id = "llama3.1-8b" } = req.body;
    const user_id = req.user.id; 

    let existingKey = iaDb.prepare("SELECT api_key FROM user_api_keys WHERE user_id = ? AND is_active = 1 AND model_id = ?").get(user_id, model_id);
    if (existingKey) {
      return res.status(400).json({ success: false, message: "Ya tienes una API Key activa para este modelo. Elimínala para crear otra." });
    }

    const newKey = `komodo_sk_${crypto.randomBytes(24).toString("hex")}`;
    iaDb.prepare("INSERT INTO user_api_keys (user_id, name, api_key, model_id) VALUES (?, ?, ?, ?)").run(user_id, name || "Mi API Key", newKey, model_id);

    return res.json({ success: true, api_key: newKey, message: "API Key generada correctamente." });
  } catch (error) {
    console.error("Error generando key:", error);
    return res.status(500).json({ success: false, message: "Error interno." });
  }
});

router.delete("/user/delete-key", requireSession, (req, res) => {
  try {
    const userId = req.user.id; 
    const modelId = req.query.model_id || "llama3.1-8b";

    iaDb.prepare("DELETE FROM user_api_keys WHERE user_id = ? AND is_active = 1 AND model_id = ?").run(userId, modelId);
    return res.json({ success: true, message: "API Key eliminada correctamente." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error interno." });
  }
});

// ==================================================
// PROXY (LA MÁSCARA DE LA IA)
// ==================================================
router.post("/v1/chat/completions", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Falta la API Key." });
    }
    const userApiKey = authHeader.slice(7);
    
    const keyRecord = iaDb.prepare("SELECT user_id, model_id FROM user_api_keys WHERE api_key = ? AND is_active = 1").get(userApiKey);
    if (!keyRecord) {
      return res.status(401).json({ error: "API Key inválida o inactiva." });
    }

    const modelMap = {
      "llama3.1-8b": "openai/gpt-oss-20b"
    };
    const realModel = modelMap[keyRecord.model_id] || "openai/gpt-oss-20b";

    // Traemos todas las keys (1, 2 y 3)
    const providerKeys = iaDb.prepare("SELECT slot_name, api_key FROM provider_keys ORDER BY slot_name ASC").all();
    const validKeys = providerKeys.filter(pk => pk.api_key);
    
    if (validKeys.length === 0) {
      return res.status(503).json({ error: "El servicio de IA no está configurado por el administrador." });
    }

    const { messages, temperature, max_tokens, top_p, stop, stream = false } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "El campo 'messages' es obligatorio y debe ser un array." });
    }

    let finalMessages = messages;
    if (!messages.some(m => m.role === "system")) {
      finalMessages = [
        { role: "system", content: "Eres un asistente de IA te llamas: Meta AI - Llama" },
        ...messages
      ];
    }

    const requestBody = {
      model: realModel,
      messages: finalMessages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 1024,
      top_p: top_p || 1,
      stop: stop || null,
      stream: stream
    };

    const makeRequest = async (key) => {
      return await fetch(PROVIDER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
    };

    // 🔴 LÓGICA DE ROTACIÓN CÍCLICA
    // Obtenemos el último slot usado para empezar desde ahí si es posible
    const statusRecord = iaDb.prepare("SELECT current_slot FROM system_status WHERE id = 1").get();
    let startIndex = validKeys.findIndex(k => k.slot_name === statusRecord.current_slot);
    if (startIndex === -1) startIndex = 0; // Si el slot guardado ya no existe, empezamos en el primero

    let response = null;
    let slotUsed = null;
    let activeApiKey = null;

    // Intentamos con cada key válida, empezando desde el índice calculado
    for (let i = 0; i < validKeys.length; i++) {
      const pk = validKeys[(startIndex + i) % validKeys.length];
      
      activeApiKey = pk.api_key;
      slotUsed = pk.slot_name;
      response = await makeRequest(activeApiKey);

      // Si la respuesta es exitosa (200), rompemos el ciclo
      if (response.status !== 429 && response.status !== 401) {
        break;
      }
      
      console.log(`[IA] ${pk.slot_name} falló (Status ${response.status}). Rotando al siguiente...`);
    }

    // Si después de recorrer todas las keys, la respuesta sigue siendo error, devolvemos ese error
    if (!response) {
      return res.status(503).json({ error: "Todas las llaves de IA fallaron." });
    }

    // Actualizamos la base de datos con el slot que funcionó
    iaDb.prepare("UPDATE system_status SET current_slot = ?, last_update = CURRENT_TIMESTAMP WHERE id = 1").run(slotUsed);

    const remainingRequests = response.headers.get("x-ratelimit-remaining-requests");
    const remainingTokens = response.headers.get("x-ratelimit-remaining-tokens");
    
    if (remainingRequests !== null || remainingTokens !== null) {
      iaDb.prepare(`
        UPDATE provider_keys 
        SET remaining_requests = ?, remaining_tokens = ?, last_updated = CURRENT_TIMESTAMP 
        WHERE slot_name = ?
      `).run(
        remainingRequests ? parseInt(remainingRequests) : 0, 
        remainingTokens ? parseInt(remainingTokens) : 0, 
        slotUsed
      );
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }
      return res.end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Error en proxy de IA:", error);
    return res.status(500).json({ error: "Error interno del servidor de IA." });
  }
});

let authenticateMiddleware = null;

module.exports = (authenticate) => {
  if (typeof authenticate === "function") authenticateMiddleware = authenticate;
  return router;
};
