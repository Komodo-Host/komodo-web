const API_URL = window.location.origin;
const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
const accountInitial = document.getElementById("accountInitial");
const accountName = document.getElementById("accountName");
const welcomeName = document.getElementById("welcomeName");
const logoutButton = document.getElementById("logoutButton");

// Elementos para la lista de servidores
const serversContainer = document.getElementById("servers-list-container");

// Elementos para la lista de API Keys
const apiKeysContainer = document.getElementById("api-keys-list-container");

document.documentElement.style.visibility = "hidden";

function getAuthToken() {
  return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
}

function getSavedUser() {
  const userData = localStorage.getItem("komodo_user") || sessionStorage.getItem("komodo_user");
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parseando usuario guardado:", error);
      return null;
    }
  }
  return null;
}

function clearAuthToken() {
  localStorage.removeItem("komodo_auth_token");
  sessionStorage.removeItem("komodo_auth_token");
  localStorage.removeItem("komodo_user");
  sessionStorage.removeItem("komodo_user");
  localStorage.removeItem("komodo_session_expires");
  sessionStorage.removeItem("komodo_session_expires");
}

function redirectToLogin() {
  if (getAuthToken()) {
    try {
      fetch(`${API_URL}/api/auth/logout`, { method: "POST", keepalive: true });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  }
  clearAuthToken();
  window.location.replace("/login");
}

function getInitial(username) {
  if (typeof username !== "string" || username.length === 0) {
    return "?";
  }
  return username.trim().charAt(0).toUpperCase();
}

function renderUser(user) {
  if (!user) {
    console.warn("⚠️ No hay usuario para renderizar");
    return;
  }
  const username = user.username || "Usuario";
  if (accountName) accountName.textContent = username;
  if (accountInitial) accountInitial.textContent = getInitial(username);
  if (welcomeName) welcomeName.textContent = username;
}

function showDashboard() {
  document.documentElement.style.visibility = "visible";
}

async function verifySession() {
  const token = getAuthToken();
  if (!token) {
    const savedUser = getSavedUser();
    if (savedUser) {
      console.log("📦 Usando usuario guardado localmente:", savedUser);
      renderUser(savedUser);
      showDashboard();
      return savedUser;
    }
    redirectToLogin();
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if (response.status === 401) {
      redirectToLogin();
      return null;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success || !data.authenticated || !data.user) {
      redirectToLogin();
      return null;
    }
    renderUser(data.user);
    showDashboard();
    return data.user;
  } catch (error) {
    console.error("Error verificando sesión:", error);
    const savedUser = getSavedUser();
    if (savedUser) {
      console.log("📦 Usando usuario guardado (fallo de red):", savedUser);
      renderUser(savedUser);
      showDashboard();
      return savedUser;
    }
    return null;
  }
}

function setupAccountMenu() {
  if (!accountButton || !accountMenu) return;
  accountButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = accountMenu.classList.contains("active");
    if (isOpen) {
      accountMenu.classList.remove("active");
      accountButton.setAttribute("aria-expanded", "false");
    } else {
      accountMenu.classList.add("active");
      accountButton.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", (event) => {
    if (!accountMenu.contains(event.target) && !accountButton.contains(event.target)) {
      accountMenu.classList.remove("active");
      accountButton.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      accountMenu.classList.remove("active");
      accountButton.setAttribute("aria-expanded", "false");
    }
  });
}

async function logout() {
  const token = getAuthToken();
  if (!token) {
    redirectToLogin();
    return;
  }
  if (logoutButton) {
    logoutButton.disabled = true;
    logoutButton.textContent = "Cerrando sesión...";
  }
  try {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if (response.status === 401 || response.ok) {
      clearAuthToken();
      window.location.replace("/login");
      return;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error("Logout error:", error);
    clearAuthToken();
    window.location.replace("/login");
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", logout);
}

const createServerButton = document.getElementById("createServerButton");
if (createServerButton) {
  createServerButton.addEventListener("click", () => {
    window.location.href = "/dashboard/host";
  });
}

const createApiKeyButton = document.getElementById("createApiKeyButton");
if (createApiKeyButton) {
  createApiKeyButton.addEventListener("click", () => {
    window.location.href = "/dashboard/ai-studio/";
  });
}

// ==================================================
// FUNCIÓN PARA CARGAR Y DIBUJAR LOS SERVIDORES
// ==================================================
async function loadServers() {
  if (!serversContainer) return;

  const token = getAuthToken();
  if (!token) {
    serversContainer.innerHTML = `<span class="service-panel-empty">Inicia sesión para ver tus servidores.</span>`;
    return;
  }

  serversContainer.innerHTML = `<span class="service-panel-empty">Cargando servidores...</span>`;

  try {
    const res = await fetch(`${API_URL}/api/dashboard/list`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Error en la petición al servidor");
    
    const data = await res.json();
    serversContainer.innerHTML = "";

    if (data.success && data.servers && data.servers.length > 0) {
      
      data.servers.forEach(server => {
        const ramText = server.ram >= 1024 ? `${(server.ram / 1024).toFixed(0)} GB` : `${server.ram} MB`;
        const diskText = server.disk >= 1024 ? `${(server.disk / 1024).toFixed(0)} GB` : `${server.disk} MB`;
        const cpuText = server.cpu === 0 ? "Ilimitado" : `${server.cpu / 100} vCore`;
        
        let statusClass = "status-offline";
        let statusText = "Offline";
        if (server.status === "online") { statusClass = "status-online"; statusText = "Online"; }
        if (server.status === "installing") { statusClass = "status-installing"; statusText = "Instalando"; }

        let langImg = "/images/nodejs.png";
        const langLower = (server.language || "").toLowerCase();
        if (langLower === "python") langImg = "/images/python.png";
        if (langLower === "java") langImg = "/images/java.png";

        const card = document.createElement("div");
        card.className = "server-card";
        
        // 🔴 NUEVO: Hacemos que la tarjeta sea clicable y tenga cursor pointer
        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
          if (server.hash) {
            window.location.href = `/panel/${server.hash}`;
          }
        });

        card.innerHTML = `
          <div class="server-card-left">
            <div class="server-card-image">
              <img src="${langImg}" alt="${server.language}" />
            </div>
            <span class="server-card-language">${server.language}</span>
          </div>
          
          <div class="server-card-right">
            <div class="server-card-top">
              <h3 class="server-card-title">${server.name}</h3>
              <span class="server-badge ${statusClass}">
                <span class="badge-dot"></span> ${statusText}
              </span>
            </div>
            
            <div class="server-card-info">
              <span>Node 1</span>
              <span class="server-info-sep"></span>
              <span>${ramText} RAM</span>
              <span class="server-info-sep"></span>
              <span>${cpuText}</span>
              <span class="server-info-sep"></span>
              <span>${diskText} SSD</span>
            </div>
          </div>
        `;
        serversContainer.appendChild(card);
      });
    } else {
      serversContainer.innerHTML = `<span class="service-panel-empty" id="noServersMsg">Vacío</span>`;
    }
  } catch (error) {
    console.error("Error cargando servidores:", error);
    serversContainer.innerHTML = `<span class="service-panel-empty" style="color: #cb3429;">Error al cargar servidores.</span>`;
  }
}

// ==================================================
// FUNCIONES PARA CARGAR Y DIBUJAR LAS API KEYS
// ==================================================
const MODEL_LABELS = {
  "llama3.1-8b": "Meta AI - Llama"
};

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API falló, usando alternativa:", error);
  }
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  document.body.removeChild(temp);
  return ok;
}

async function loadApiKeys() {
  if (!apiKeysContainer) return;

  const token = getAuthToken();
  if (!token) {
    apiKeysContainer.innerHTML = `<span class="service-panel-empty">Inicia sesión para ver tus API.</span>`;
    return;
  }

  apiKeysContainer.innerHTML = `<span class="service-panel-empty">Cargando API Keys...</span>`;

  try {
    const res = await fetch(`${API_URL}/api/ai/user/my-keys`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error en la petición al servidor");

    const data = await res.json();
    apiKeysContainer.innerHTML = "";

    if (data.success && data.keys && data.keys.length > 0) {
      data.keys.forEach((keyItem) => {
        const modelLabel = MODEL_LABELS[keyItem.model_id] || keyItem.model_id;

        const card = document.createElement("div");
        card.className = "apikey-card";
        card.innerHTML = `
          <div class="apikey-card-image">
            <img src="/images/meta.png" alt="Meta" onerror="this.style.visibility='hidden'" />
          </div>

          <div class="apikey-card-content">
            <div class="apikey-card-top">
              <h3 class="apikey-card-title">${escapeHtml(keyItem.name)}</h3>
            </div>

            <div class="apikey-card-meta">
              <span class="apikey-slot">Free 1/1</span>
              <span class="apikey-meta-sep">|</span>
              <span class="apikey-model">${escapeHtml(modelLabel)}</span>
              <span class="apikey-meta-sep">|</span>
              <span class="apikey-plan">Sin memoria incluida*</span>
            </div>
          </div>

          <div class="apikey-card-right">
            <div class="apikey-card-key-row">
              <span class="apikey-key-value">${escapeHtml(keyItem.api_key)}</span>
            </div>

            <div class="apikey-card-actions">
              <button type="button" class="apikey-btn apikey-btn-copy">Copiar API Key</button>
              <button type="button" class="apikey-btn apikey-btn-delete">Eliminar</button>
            </div>
          </div>
        `;

        const copyBtn = card.querySelector(".apikey-btn-copy");
        const deleteBtn = card.querySelector(".apikey-btn-delete");

        copyBtn.addEventListener("click", async () => {
          const ok = await copyTextToClipboard(keyItem.api_key);
          copyBtn.textContent = ok ? "¡Copiada!" : "No se pudo copiar";
          setTimeout(() => { copyBtn.textContent = "Copiar API Key"; }, 1600);
        });

        deleteBtn.addEventListener("click", () => deleteApiKey(keyItem, deleteBtn));

        apiKeysContainer.appendChild(card);
      });
    } else {
      apiKeysContainer.innerHTML = `<span class="service-panel-empty">Vacío</span>`;
    }
  } catch (error) {
    console.error("Error cargando API Keys:", error);
    apiKeysContainer.innerHTML = `<span class="service-panel-empty" style="color: #cb3429;">Error al cargar API Keys.</span>`;
  }
}

async function deleteApiKey(keyItem, button) {
  if (!confirm(`¿Eliminar la API Key "${keyItem.name}"? Esta acción no se puede deshacer.`)) return;

  const user = getSavedUser() || (await verifySession());
  const token = getAuthToken();
  if (!user || !user.id) {
    alert("No se pudo verificar tu usuario. Vuelve a iniciar sesión.");
    return;
  }

  button.disabled = true;
  button.textContent = "Eliminando...";

  try {
    const res = await fetch(
      `${API_URL}/api/ai/user/delete-key?user_id=${encodeURIComponent(user.id)}&model_id=${encodeURIComponent(keyItem.model_id)}`,
      {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      }
    );
    const data = await res.json();
    if (data.success) {
      await loadApiKeys();
    } else {
      alert(data.message || "No se pudo eliminar la API Key.");
      button.disabled = false;
      button.textContent = "Eliminar";
    }
  } catch (error) {
    console.error("Error eliminando API Key:", error);
    alert("Error de conexión con el servidor.");
    button.disabled = false;
    button.textContent = "Eliminar";
  }
}

async function initializeDashboard() {
  setupAccountMenu();
  await verifySession();
  await Promise.all([loadServers(), loadApiKeys()]);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDashboard);
} else {
  initializeDashboard();
}