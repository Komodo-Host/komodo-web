const API_URL = window.location.origin;

function getAuthToken() {
  return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
}

function redirectToLogin() {
  window.location.replace("/login");
}

// 1. Obtener el hash desde la URL (ej. /panel/c5a1b2)
const urlParts = window.location.pathname.split("/");
// /panel/<hash>/<seccion> -> el hash es el segmento justo después de "panel"
const serverHash = urlParts[2];

// Elementos del DOM (los llenaremos después con el diseño)
const serverNameEl = document.getElementById("serverName");
const serverStatusEl = document.getElementById("serverStatus");
const errorMsgEl = document.getElementById("errorMsg");

async function loadServerData() {
  const token = getAuthToken();
  
  if (!token) {
    redirectToLogin();
    return;
  }

  if (!serverHash || serverHash === "panel") {
    window.location.replace("/dashboard");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/dashboard/server/${serverHash}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    // Si el backend dice 403 (No eres el dueño) o 401 (Sesión expirada)
    if (res.status === 401) {
      redirectToLogin();
      return;
    }
    
    if (res.status === 403) {
      alert("No tienes permiso para acceder a este servidor.");
      window.location.replace("/dashboard");
      return;
    }

    if (!res.ok) {
      throw new Error("Error al cargar el servidor.");
    }

    const data = await res.json();

    if (data.success && data.server) {
      // Servidor cargado correctamente
      console.log("✅ Servidor cargado:", data.server);
      
      // Pintamos los datos básicos (puedes cambiar los IDs después)
      if (serverNameEl) serverNameEl.textContent = data.server.name;
      if (serverStatusEl) serverStatusEl.textContent = data.server.status;
      
      // Aquí luego llamarás a funciones para cargar la consola o estadísticas
    } else {
      throw new Error(data.message || "Error desconocido.");
    }

  } catch (error) {
    console.error("Error en el panel:", error);
    if (errorMsgEl) {
      errorMsgEl.style.display = "block";
      errorMsgEl.textContent = "No se pudo cargar el servidor. Intenta de nuevo.";
    }
  }
}

// Iniciar
loadServerData();

// ==================================================
// ROUTER DE SECCIONES (sin recargas)
// /panel/<hash>/<seccion>  ->  panel/views/<seccion>.html + .js
// ==================================================
const PANEL_SECTIONS = ["overview", "console", "files", "metrics", "settings"];
const DEFAULT_SECTION = "overview";

const panelContentEl = document.getElementById("panelContent");
const crumbSectionEl = document.getElementById("crumbSection");
const panelTabEls = document.querySelectorAll("#panelTabs .panel-tab");

const viewHtmlCache = {};
let currentSection = null;
let currentViewScript = null;
let navToken = 0;

function getSectionFromUrl() {
  const section = (window.location.pathname.split("/")[3] || "").toLowerCase();
  return PANEL_SECTIONS.includes(section) ? section : null;
}

function sectionUrl(section) {
  return `/panel/${serverHash}/${section}`;
}

async function fetchViewHtml(section) {
  if (viewHtmlCache[section] !== undefined) return viewHtmlCache[section];
  try {
    const res = await fetch(`/panel/views/${section}.html`);
    viewHtmlCache[section] = res.ok ? await res.text() : "";
  } catch (error) {
    console.error("Error cargando vista:", error);
    viewHtmlCache[section] = "";
  }
  return viewHtmlCache[section];
}

function loadViewScript(section) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `/panel/views/${section}.js`;
    script.onload = () => resolve(script);
    script.onerror = () => resolve(script);
    document.body.appendChild(script);
  });
}

function unmountCurrentView() {
  const views = window.KomodoPanelViews || {};
  const view = currentSection && views[currentSection];
  if (view && typeof view.unmount === "function") {
    try {
      view.unmount();
    } catch (error) {
      console.error("Error al desmontar vista:", error);
    }
  }
  if (currentViewScript) {
    currentViewScript.remove();
    currentViewScript = null;
  }
}

function updateNavUi(section) {
  panelTabEls.forEach((tab) => {
    const isActive = tab.dataset.section === section;
    tab.classList.toggle("active", isActive);
    if (isActive) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (crumbSectionEl) crumbSectionEl.textContent = section.charAt(0).toUpperCase() + section.slice(1);
  document.title = `${section.charAt(0).toUpperCase() + section.slice(1)} | Panel | Komodo Host`;
}

async function renderSection(section) {
  if (!panelContentEl || section === currentSection) return;
  const token = ++navToken;

  unmountCurrentView();
  currentSection = section;
  updateNavUi(section);

  const html = await fetchViewHtml(section);
  if (token !== navToken) return; // el usuario ya navegó a otra sección
  panelContentEl.innerHTML = html;

  const script = await loadViewScript(section);
  if (token !== navToken) {
    script.remove();
    return;
  }
  currentViewScript = script;

  const view = (window.KomodoPanelViews || {})[section];
  if (view && typeof view.mount === "function") {
    try {
      view.mount(panelContentEl, { serverHash, section });
    } catch (error) {
      console.error("Error al montar vista:", error);
    }
  }
}

function navigateTo(section, replace) {
  const url = sectionUrl(section);
  if (replace) history.replaceState({ section }, "", url);
  else if (window.location.pathname !== url) history.pushState({ section }, "", url);
  renderSection(section);
}

function initPanelRouter() {
  // Sin hash válido, loadServerData() ya redirige al dashboard
  if (!serverHash || serverHash === "panel") return;

  panelTabEls.forEach((tab) => {
    const section = tab.dataset.section;
    tab.setAttribute("href", sectionUrl(section));
    tab.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      navigateTo(section, false);
    });
  });

  window.addEventListener("popstate", () => {
    const section = getSectionFromUrl();
    if (section) renderSection(section);
    else navigateTo(DEFAULT_SECTION, true);
  });

  // /panel/<hash> o sección inválida -> /panel/<hash>/overview
  const initial = getSectionFromUrl();
  if (initial) {
    history.replaceState({ section: initial }, "", sectionUrl(initial));
    renderSection(initial);
  } else {
    navigateTo(DEFAULT_SECTION, true);
  }
}

initPanelRouter();

// ==================================================
// ENCABEZADO: menú de cuenta (igual que en dashboard)
// ==================================================
function getPanelSavedUser() {
  const userData = localStorage.getItem("komodo_user") || sessionStorage.getItem("komodo_user");
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (error) {
    return null;
  }
}

function renderPanelUser(user) {
  if (!user) return;
  const username = user.username || "Usuario";
  const nameEl = document.getElementById("accountName");
  const initialEl = document.getElementById("accountInitial");
  if (nameEl) nameEl.textContent = username;
  if (initialEl) initialEl.textContent = username.trim().charAt(0).toUpperCase() || "?";
}

async function loadPanelUser() {
  const saved = getPanelSavedUser();
  if (saved) renderPanelUser(saved);
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.user) renderPanelUser(data.user);
  } catch (error) {
    console.error("Error cargando usuario:", error);
  }
}

function setupPanelAccountMenu() {
  const button = document.getElementById("accountButton");
  const menu = document.getElementById("accountMenu");
  const logoutBtn = document.getElementById("logoutButton");
  const dashboardBtn = document.getElementById("settingsButton");
  if (!button || !menu) return;

  if (dashboardBtn) {
    dashboardBtn.addEventListener("click", () => {
      window.location.href = "/dashboard";
    });
  }

  const close = () => {
    menu.classList.remove("active");
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle("active");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !button.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const token = getAuthToken();
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Cerrando sesión...";
      try {
        if (token) {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          });
        }
      } catch (error) {
        console.error("Logout error:", error);
      }
      ["komodo_auth_token", "komodo_user", "komodo_session_expires"].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      window.location.replace("/login");
    });
  }
}

setupPanelAccountMenu();
loadPanelUser();