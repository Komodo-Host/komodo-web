const API_URL = window.location.origin;

function getAuthToken() {
  return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
}

// ==================================================
// BARRA SUPERIOR: PERFIL, BUZÓN Y SESIÓN (igual que en Host)
// ==================================================
const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
const accountInitial = document.getElementById("accountInitial");
const accountName = document.getElementById("accountName");
const topBarGuest = document.getElementById("topBarGuest");
const topBarAccount = document.getElementById("topBarAccount");
const logoutButton = document.getElementById("logoutButton");
const plansNotice = document.getElementById("plansNotice");

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

function showGuestMode() {
  clearAuthToken();
  if (topBarAccount) topBarAccount.style.display = "none";
  if (topBarGuest) topBarGuest.style.display = "flex";
  if (plansNotice) plansNotice.style.display = "flex";
  document.body.classList.add("is-guest");
}

function showAccountMode() {
  if (topBarGuest) topBarGuest.style.display = "none";
  if (topBarAccount) topBarAccount.style.display = "block";
  if (plansNotice) plansNotice.style.display = "none";
  document.body.classList.remove("is-guest");
}

function getInitial(username) {
  if (typeof username !== "string" || username.length === 0) {
    return "?";
  }
  return username.trim().charAt(0).toUpperCase();
}

function renderUser(user) {
  if (!user) return;
  const username = user.username || "Usuario";
  if (accountName) accountName.textContent = username;
  if (accountInitial) accountInitial.textContent = getInitial(username);
  showAccountMode();
}

async function verifySession() {
  const token = getAuthToken();
  if (!token) {
    const savedUser = getSavedUser();
    if (savedUser) {
      renderUser(savedUser);
      return savedUser;
    }
    showGuestMode();
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if (response.status === 401) {
      showGuestMode();
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data.success || !data.authenticated || !data.user) {
      showGuestMode();
      return null;
    }
    renderUser(data.user);
    return data.user;
  } catch (error) {
    console.error("Error verificando sesión:", error);
    const savedUser = getSavedUser();
    if (savedUser) {
      renderUser(savedUser);
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
    showGuestMode();
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
      window.location.reload();
      return;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error("Logout error:", error);
    clearAuthToken();
    window.location.reload();
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", logout);
}

async function initializeAiStudio() {
  setupAccountMenu();
  const localUser = getSavedUser();
  if (localUser) {
    renderUser(localUser);
  } else {
    showGuestMode();
  }
  await verifySession();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAiStudio);
} else {
  initializeAiStudio();
}

// Elemento del botón
const createLlamaKeyBtn = document.getElementById("createLlamaKeyBtn");

// Lógica del botón para crear la API Key
if (createLlamaKeyBtn) {
  createLlamaKeyBtn.addEventListener("click", () => {
    // Sin cuenta: mismo comportamiento que Host (aviso resaltado, sin avanzar)
    if (document.body.classList.contains("is-guest") || !getAuthToken()) {
      if (plansNotice) {
        plansNotice.style.display = "flex";
        plansNotice.scrollIntoView({ behavior: "smooth", block: "center" });
        plansNotice.classList.remove("pulse");
        void plansNotice.offsetWidth;
        plansNotice.classList.add("pulse");
      }
      return;
    }

    // Redirigimos a la página de gestión con el modelo específico en la URL
    window.location.href = `/dashboard/api-keys?model=llama3.1-8b`;
  });
}
