const API_URL = window.location.origin;
const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
const accountInitial = document.getElementById("accountInitial");
const accountName = document.getElementById("accountName");
const welcomeName = document.getElementById("welcomeName");
const logoutButton = document.getElementById("logoutButton");

// Elementos para la lista de servidores
const serversContainer = document.getElementById("servers-list-container");

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

// ==================================================
// FUNCIÓN PARA CARGAR Y DIBUJAR LOS SERVIDORES
// ==================================================
async function loadServers() {
  if (!serversContainer) return; // Seguridad por si el elemento no existe

  const token = getAuthToken();
  if (!token) {
    serversContainer.innerHTML = `<span class="service-panel-empty">Inicia sesión para ver tus servidores.</span>`;
    return;
  }

  // Ponemos el mensaje de "Cargando..." mientras esperamos
  serversContainer.innerHTML = `<span class="service-panel-empty">Cargando servidores...</span>`;

  try {
    const res = await fetch(`${API_URL}/api/dashboard/list`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Error en la petición al servidor");
    
    const data = await res.json();

    // Limpiamos el contenedor antes de dibujar
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
        if (server.language === "Python") langImg = "/images/python.png";
        if (server.language === "Java") langImg = "/images/java.png";

        const card = document.createElement("div");
        card.className = "server-card";
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
      // Si no hay servidores, mostramos "Vacío"
      serversContainer.innerHTML = `<span class="service-panel-empty" id="noServersMsg">Vacío</span>`;
    }
  } catch (error) {
    console.error("Error cargando servidores:", error);
    // Si hay un error (red, backend, etc), mostramos un mensaje claro
    serversContainer.innerHTML = `<span class="service-panel-empty" style="color: #cb3429;">Error al cargar servidores.</span>`;
  }
}

async function initializeDashboard() {
  setupAccountMenu();
  await verifySession();
  await loadServers();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDashboard);
} else {
  initializeDashboard();
}
