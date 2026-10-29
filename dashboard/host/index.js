const API_URL = window.location.origin;
const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
const accountInitial = document.getElementById("accountInitial");
const accountName = document.getElementById("accountName");
const topBarGuest = document.getElementById("topBarGuest");
const topBarAccount = document.getElementById("topBarAccount");
const plansNotice = document.getElementById("plansNotice");
const plansBackButton = document.getElementById("plansBackButton");
const logoutButton = document.getElementById("logoutButton");
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
function showGuestMode() {
  clearAuthToken();
  if (topBarAccount) topBarAccount.style.display = "none";
  if (topBarGuest) topBarGuest.style.display = "flex";
  if (plansNotice) plansNotice.style.display = "flex";
  if (plansBackButton) {
    plansBackButton.setAttribute("href", "/");
    plansBackButton.textContent = "← Volver al inicio";
  }
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
  if (!user) {
    console.warn("⚠️ No hay usuario para renderizar");
    return;
  }
  const username = user.username || "Usuario";
  if (accountName) {
    accountName.textContent = username;
  }
  if (accountInitial) {
    accountInitial.textContent = getInitial(username);
  }
  showAccountMode();
}
function showDashboard() {}
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
  if (!accountButton || !accountMenu) {
    return;
  }
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

// ==================================================
// MODIFICADO: Lógica de botones de compra
// ==================================================
function setupBuyButtons() {
  document.querySelectorAll(".plan-buy-button").forEach((button) => {
    button.addEventListener("click", () => {
      // Si estamos en modo invitado, mostramos la alerta de inicio de sesión
      if (document.body.classList.contains("is-guest")) {
        if (plansNotice) {
          plansNotice.scrollIntoView({ behavior: "smooth", block: "center" });
          plansNotice.classList.remove("pulse");
          void plansNotice.offsetWidth;
          plansNotice.classList.add("pulse");
        }
        return;
      }

      // Si está logueado, obtenemos el plan desde el atributo data-plan
      const plan = button.getAttribute("data-plan");
      if (plan) {
        // Redirigimos a la página de creación pasando el plan por la URL
        window.location.href = `/dashboard/create?plan=${plan}`;
      }
    });
  });
}

async function initializePlans() {
  setupAccountMenu();
  setupBuyButtons();
  const localUser = getSavedUser();
  if (localUser) {
    renderUser(localUser);
  } else {
    showGuestMode();
  }
  await verifySession();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePlans);
} else {
  initializePlans();
}
