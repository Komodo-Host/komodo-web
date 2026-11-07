const API_URL = window.location.origin;

// Definimos los planes aquí también para poder mostrar los detalles visualmente
const PLANS_INFO = {
  salamandra: { name: "Salamandra", ram: 1, cpu: 0.5, disk: 5 },
  gecko: { name: "Gecko", ram: 2, cpu: 1, disk: 10 },
  basilisco: { name: "Basilisco", ram: 4, cpu: 2, disk: 20 },
  garrobo: { name: "Garrobo", ram: 6, cpu: 3, disk: 30 },
  cuajipal: { name: "Cuajipal", ram: 10, cpu: 5, disk: 50 },
  varano: { name: "Varano", ram: 16, cpu: 8, disk: 80 }
};

function getAuthToken() {
  return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
}

// Obtener el plan y el lenguaje desde la URL (?plan=salamandra&lang=python)
const urlParams = new URLSearchParams(window.location.search);
const planKey = urlParams.get("plan");
const langKey = urlParams.get("lang") || "nodejs"; // Por defecto nodejs si no viene

// Elementos del DOM
const summaryPlanName = document.getElementById("summaryPlanName");
const summaryFeatures = document.getElementById("summaryFeatures");
const createForm = document.getElementById("createForm");
const submitBtn = document.getElementById("submitBtn");

// Elementos de la barra superior (perfil / buzón)
const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
const accountInitial = document.getElementById("accountInitial");
const accountName = document.getElementById("accountName");
const topBarGuest = document.getElementById("topBarGuest");
const topBarAccount = document.getElementById("topBarAccount");
const logoutButton = document.getElementById("logoutButton");

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
  document.body.classList.add("is-guest");
}
function showAccountMode() {
  if (topBarGuest) topBarGuest.style.display = "none";
  if (topBarAccount) topBarAccount.style.display = "block";
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

function initializeAccount() {
  setupAccountMenu();
  const localUser = getSavedUser();
  if (localUser) {
    renderUser(localUser);
  } else {
    showGuestMode();
  }
  verifySession();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAccount);
} else {
  initializeAccount();
}

// Validar que haya un plan válido en la URL
if (!planKey || !PLANS_INFO[planKey]) {
  alert("Plan no válido o no seleccionado. Redirigiendo a la lista de planes...");
  window.location.href = "/dashboard/host";
} else {
  // Cargar los datos del plan en la vista
  const plan = PLANS_INFO[planKey];
  summaryPlanName.textContent = `Plan ${plan.name}`;
  
  // 🔴 NUEVO: Lógica para mostrar el logo y nombre del lenguaje correcto
  let langImg = "/images/nodejs.png";
  let langName = "NodeJs";
  if (langKey === "python") {
    langImg = "/images/python.png";
    langName = "Python";
  } else if (langKey === "java") {
    langImg = "/images/java.png";
    langName = "Java";
  }

  summaryFeatures.innerHTML = `
    <li class="plan-lang"><img src="${langImg}" alt="${langName}" />${langName}</li>
    <li>${plan.ram} GB Ram</li>
    <li>${plan.cpu} vCore CPU</li>
    <li>${plan.disk} GB SSD</li>
    <li>1 Copia de Seguridad</li>
    <li>Ancho de banda ilimitado*</li>
  `;
}

// Manejar el envío del formulario
createForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getAuthToken();
  if (!token) {
    alert("Tu sesión ha expirado. Inicia sesión de nuevo.");
    window.location.href = "/login";
    return;
  }

  const name = document.getElementById("serverName").value.trim();
  const description = document.getElementById("serverDescription").value.trim();

  if (name.length < 3) {
    alert("El nombre debe tener al menos 3 caracteres.");
    return;
  }

  // Deshabilitar el botón mientras se crea
  submitBtn.disabled = true;
  submitBtn.textContent = "Creando servidor...";

  try {
    const response = await fetch(`${API_URL}/api/servers/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        plan: planKey,
        name: name,
        description: description,
        language: langKey // 🔴 NUEVO: Enviamos el lenguaje al backend
      })
    });

    const data = await response.json();

    if (data.success) {
      // Si todo sale bien, lo enviamos al dashboard
      alert("¡Servidor creado exitosamente!");
      window.location.href = "/dashboard"; 
    } else {
      // Si Pterodactyl falla, mostramos el error
      alert(data.message || "Error al crear el servidor.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear Servidor";
    }
  } catch (error) {
    console.error("Error en la petición:", error);
    alert("Error de conexión con el servidor. Inténtalo de nuevo.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Crear Servidor";
  }
});