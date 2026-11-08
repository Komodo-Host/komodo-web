const API_URL = window.location.origin;
const ADMIN_PASSWORD = "eumomota505"; // En el frontend solo se usa para la cabecera de la petición

// Elementos de Login
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutAdminBtn = document.getElementById("logoutAdminBtn");

// Elementos de Estado Global
const globalStatusText = document.getElementById("globalStatusText");
const globalServerText = document.getElementById("globalServerText");

// Elementos de Datos (Servidor 1)
const status1 = document.getElementById("status-1");
const rpd1 = document.getElementById("rpd-1");
const tpm1 = document.getElementById("tpm-1");
const update1 = document.getElementById("update-1");
const keyInput1 = document.getElementById("key-input-1");

// Elementos de Datos (Servidor 2)
const status2 = document.getElementById("status-2");
const rpd2 = document.getElementById("rpd-2");
const tpm2 = document.getElementById("tpm-2");
const update2 = document.getElementById("update-2");
const keyInput2 = document.getElementById("key-input-2");

// Elementos de Datos (Servidor 3)
const status3 = document.getElementById("status-3");
const rpd3 = document.getElementById("rpd-3");
const tpm3 = document.getElementById("tpm-3");
const update3 = document.getElementById("update-3");
const keyInput3 = document.getElementById("key-input-3");

const saveKeysBtn = document.getElementById("saveKeysBtn");

// Función para hacer peticiones con la contraseña
async function adminFetch(url, options = {}) {
  options.headers = {
    ...options.headers,
    "Authorization": `Bearer ${ADMIN_PASSWORD}`,
    "Content-Type": "application/json"
  };
  return fetch(url, options);
}

// Lógica de Login
loginBtn.addEventListener("click", async () => {
  const pass = adminPasswordInput.value;
  if (pass !== ADMIN_PASSWORD) {
    loginError.style.display = "block";
    return;
  }
  
  // Validar contra el backend haciendo una petición de prueba
  try {
    const res = await adminFetch(`${API_URL}/api/ai/admin/status`);
    if (res.ok) {
      loginError.style.display = "none";
      loginScreen.style.display = "none";
      adminPanel.style.display = "block";
      loadAdminData(); // Cargar los datos al entrar
    } else {
      loginError.textContent = "Error de autorización con el servidor.";
      loginError.style.display = "block";
    }
  } catch (error) {
    console.error(error);
    loginError.textContent = "Error de conexión.";
    loginError.style.display = "block";
  }
});

adminPasswordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

logoutAdminBtn.addEventListener("click", () => {
  adminPasswordInput.value = "";
  adminPanel.style.display = "none";
  loginScreen.style.display = "flex";
});

// Cargar Datos (Estado Global + Tarjetas)
async function loadAdminData() {
  try {
    // 1. Cargar Estado Global (Ruta Pública)
    const publicRes = await fetch(`${API_URL}/api/ai/status`);
    const publicData = await publicRes.json();
    
    if (publicData.success) {
      globalStatusText.textContent = publicData.status === "online" ? "Online" : "Offline";
      globalStatusText.style.color = publicData.status === "online" ? "#059669" : "#cb3429";
      globalServerText.textContent = publicData.current_server || "Desconocido";
    }

    // 2. Cargar Límites y Keys (Ruta Admin)
    const res = await adminFetch(`${API_URL}/api/ai/admin/status`);
    const data = await res.json();

    if (data.success) {
      const slot1 = data.keys.find(k => k.slot_name === "opcion_1");
      const slot2 = data.keys.find(k => k.slot_name === "opcion_2");
      const slot3 = data.keys.find(k => k.slot_name === "opcion_3");

      updateCard(slot1, status1, rpd1, tpm1, update1, keyInput1);
      updateCard(slot2, status2, rpd2, tpm2, update2, keyInput2);
      updateCard(slot3, status3, rpd3, tpm3, update3, keyInput3);
    }
  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

function updateCard(slot, statusEl, rpdEl, tpmEl, updateEl, inputEl) {
  if (!slot) return;

  if (slot.api_key) {
    statusEl.textContent = "Configurado";
    statusEl.className = "status-badge active";
    inputEl.value = slot.api_key; // Mostramos la key actual
  } else {
    statusEl.textContent = "Vacío";
    statusEl.className = "status-badge inactive";
    inputEl.value = "";
  }

  rpdEl.textContent = slot.remaining_requests || "0";
  tpmEl.textContent = slot.remaining_tokens || "0";
  updateEl.textContent = slot.last_updated || "Nunca";
}

// Guardar Keys (1, 2 y 3)
saveKeysBtn.addEventListener("click", async () => {
  saveKeysBtn.disabled = true;
  saveKeysBtn.textContent = "Guardando...";

  const opcion_1 = keyInput1.value.trim();
  const opcion_2 = keyInput2.value.trim();
  const opcion_3 = keyInput3.value.trim();

  try {
    const res = await adminFetch(`${API_URL}/api/ai/admin/keys`, {
      method: "POST",
      body: JSON.stringify({ opcion_1, opcion_2, opcion_3 })
    });
    const data = await res.json();

    if (data.success) {
      alert("API Keys guardadas correctamente.");
      loadAdminData(); // Recargar datos
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    alert("Error de conexión al guardar.");
  } finally {
    saveKeysBtn.disabled = false;
    saveKeysBtn.textContent = "Guardar Nuevas Keys";
  }
});
