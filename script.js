const words = [
  { text: "Hosting 24/7", color: "#486FD8" },
  { text: "Web Development", color: "#434045" },
  { text: "Números Virtuales", color: "#c73330" },
  { text: "Bots de Telegram", color: "#24A1DE" },
  { text: "API de IA", color: "#29ec22" },
  { text: "VPS Cloud", color: "#5865F2" },
  { text: "Bots de WhatsApp", color: "#25D366" }
];
const element = document.getElementById("animatedText");
let wordIndex = 0;
let charIndex = 0;
let deleting = false;
const typingSpeed = 85;
const deletingSpeed = 45;
const pauseTime = 1700;
function animateText() {
  const current = words[wordIndex];
  element.style.color = current.color;
  if (!deleting) {
    element.textContent = current.text.substring(0, charIndex + 1);
    charIndex++;
    if (charIndex === current.text.length) {
      deleting = true;
      setTimeout(animateText, pauseTime);
      return;
    }
    setTimeout(animateText, typingSpeed);
  } else {
    element.textContent = current.text.substring(0, charIndex - 1);
    charIndex--;
    if (charIndex === 0) {
      deleting = false;
      wordIndex++;
      if (wordIndex >= words.length) {
        wordIndex = 0;
      }
    }
    setTimeout(animateText, deletingSpeed);
  }
}
animateText();
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";
  document.body.appendChild(overlay);
  function toggleMenu() {
    menuToggle.classList.toggle("active");
    mobileMenu.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.style.overflow = mobileMenu.classList.contains("active") ? "hidden" : "";
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleMenu();
    });
    const links = mobileMenu.querySelectorAll("a");
    links.forEach((link) => {
      link.addEventListener("click", function () {
        if (mobileMenu.classList.contains("active")) {
          toggleMenu();
        }
      });
    });
    overlay.addEventListener("click", function () {
      if (mobileMenu.classList.contains("active")) {
        toggleMenu();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("active")) {
        toggleMenu();
      }
    });
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const heroImageElement = document.getElementById("heroMainImage");
  if (window.innerWidth <= 768) return;
  const images = ["images/hero.png", "images/hero2.png", "images/hero3.png"];
  let currentIndex = 0;
  setInterval(() => {
    heroImageElement.classList.add("fade-out");
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % images.length;
      heroImageElement.src = images[currentIndex];
      heroImageElement.classList.remove("fade-out");
    }, 500);
  }, 5000);
});
document.addEventListener("DOMContentLoaded", function () {
  function isMobile() {
    return window.innerWidth <= 768;
  }
  if (!isMobile()) return;
  const serviceCards = document.querySelectorAll(".service-card");
  serviceCards.forEach((card) => {
    const image = card.querySelector(".service-image");
    const wrapper = card.querySelector(".service-content-wrapper");
    const name = card.querySelector(".service-name");
    if (!image || !wrapper || !name) return;
    card.innerHTML = "";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.width = "100%";
    card.style.maxWidth = "100%";
    const imageClone = image.cloneNode(true);
    imageClone.style.width = "100%";
    imageClone.style.height = "200px";
    imageClone.style.display = "block";
    imageClone.style.objectFit = "cover";
    imageClone.style.order = "0";
    card.appendChild(imageClone);
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "service-toggle-btn";
    if (card.classList.contains("phone-card") || name.classList.contains("phone-title")) {
      toggleBtn.classList.add("phone-btn");
    } else if (card.classList.contains("ai-card") || name.classList.contains("ai-title")) {
      toggleBtn.classList.add("ai-btn");
    }
    toggleBtn.innerHTML = `
            ${name.textContent}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
    toggleBtn.style.order = "1";
    toggleBtn.style.width = "100%";
    toggleBtn.style.border = "none";
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.color = "#ffffff";
    toggleBtn.style.fontSize = "16px";
    toggleBtn.style.fontWeight = "700";
    toggleBtn.style.padding = "16px 20px";
    toggleBtn.style.display = "flex";
    toggleBtn.style.alignItems = "center";
    toggleBtn.style.justifyContent = "space-between";
    toggleBtn.style.borderRadius = "0";
    card.appendChild(toggleBtn);
    const collapsible = document.createElement("div");
    collapsible.className = "service-collapsible-content";
    collapsible.style.order = "2";
    collapsible.style.width = "100%";
    collapsible.style.maxHeight = "0";
    collapsible.style.overflow = "hidden";
    collapsible.style.transition = "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    collapsible.style.background = "#ffffff";
    const wrapperClone = wrapper.cloneNode(true);
    collapsible.appendChild(wrapperClone);
    card.appendChild(collapsible);
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      serviceCards.forEach((otherCard) => {
        if (otherCard !== card) {
          const otherContent = otherCard.querySelector(".service-collapsible-content");
          const otherBtn = otherCard.querySelector(".service-toggle-btn");
          if (otherContent && otherContent.style.maxHeight !== "0px") {
            otherContent.style.maxHeight = "0px";
            if (otherBtn) otherBtn.classList.remove("open");
          }
        }
      });
      const isOpen = collapsible.style.maxHeight !== "0px";
      collapsible.style.maxHeight = isOpen ? "0px" : "800px";
      toggleBtn.classList.toggle("open");
    });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const API_URL = window.location.origin;
  const topBarGuest = document.getElementById("topBarGuest");
  const topBarAccount = document.getElementById("topBarAccount");
  const accountButton = document.getElementById("accountButton");
  const accountMenu = document.getElementById("accountMenu");
  const accountInitial = document.getElementById("accountInitial");
  const accountName = document.getElementById("accountName");
  const logoutButton = document.getElementById("logoutButton");
  if (!topBarGuest || !topBarAccount) return;
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
  function getInitial(username) {
    if (typeof username !== "string" || username.length === 0) {
      return "?";
    }
    return username.trim().charAt(0).toUpperCase();
  }
  function showAccountUI(user) {
    if (!user) return;
    const username = user.username || "Usuario";
    if (accountName) accountName.textContent = username;
    if (accountInitial) accountInitial.textContent = getInitial(username);
    topBarGuest.style.display = "none";
    topBarAccount.style.display = "block";
  }
  function showGuestUI() {
    topBarAccount.style.display = "none";
    topBarGuest.style.display = "flex";
  }
  async function verifySession() {
    const token = getAuthToken();
    const savedUser = getSavedUser();
    if (savedUser) {
      showAccountUI(savedUser);
    }
    if (!token) {
      if (!savedUser) showGuestUI();
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      if (response.status === 401) {
        clearAuthToken();
        showGuestUI();
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.success || !data.authenticated || !data.user) {
        clearAuthToken();
        showGuestUI();
        return;
      }
      showAccountUI(data.user);
    } catch (error) {
      console.error("Error verificando sesión:", error);
      if (!savedUser) showGuestUI();
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
    if (logoutButton) {
      logoutButton.disabled = true;
      logoutButton.textContent = "Cerrando sesión...";
    }
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthToken();
      showGuestUI();
      if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.textContent = "Cerrar sesión";
      }
      if (accountMenu && accountButton) {
        accountMenu.classList.remove("active");
        accountButton.setAttribute("aria-expanded", "false");
      }
    }
  }
  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
  setupAccountMenu();
  verifySession();
});
