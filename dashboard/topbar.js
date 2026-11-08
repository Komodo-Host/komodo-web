// Encabezado: menú de aplicaciones (icono de cuadrícula) + servidores del usuario
(function () {
  const appsButton = document.getElementById("appsButton");
  const appsMenu = document.getElementById("appsMenu");
  const accountButton = document.getElementById("accountButton");
  const accountMenu = document.getElementById("accountMenu");
  if (!appsButton || !appsMenu) return;

  const API = window.location.origin;

  function getToken() {
    try {
      return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
    } catch (error) {
      return null;
    }
  }

  // ---------- Listas dinámicas (servidores / API keys) ----------
  function createList(container, config) {
    if (!container) return { load: function () {} };

    function addRow(tag, className, text) {
      const el = document.createElement(tag);
      el.className = className;
      el.textContent = text;
      container.appendChild(el);
      return el;
    }
    function renderEmpty() {
      container.innerHTML = "";
      addRow("span", "apps-sub-empty", "Vacío");
    }
    function renderLoading() {
      container.innerHTML = "";
      addRow("span", "apps-sub-empty", config.loadingText);
    }
    function renderItems(items) {
      container.innerHTML = "";
      items.forEach(function (item) {
        const name = item.name || config.fallbackName;
        const href = config.href(item);
        if (href) {
          const link = addRow("a", "apps-sub-item " + config.itemClass, name);
          link.href = href;
        } else {
          addRow("span", "apps-sub-empty", name);
        }
      });
    }

    let loadedOnce = false;
    let loading = false;

    async function load() {
      if (loading) return;
      const token = getToken();
      if (!token) {
        renderEmpty();
        return;
      }
      loading = true;
      if (!loadedOnce) renderLoading();
      try {
        const res = await fetch(API + config.endpoint, {
          headers: { Authorization: "Bearer " + token }
        });
        if (!res.ok) throw new Error("Error en la petición");
        const data = await res.json();
        const items = data && data.success ? data[config.key] : null;
        if (Array.isArray(items) && items.length > 0) renderItems(items);
        else renderEmpty();
        loadedOnce = true;
      } catch (error) {
        console.error("Error cargando lista del menú:", error);
        if (!loadedOnce) renderEmpty();
      } finally {
        loading = false;
      }
    }
    return { load: load };
  }

  const serversList = createList(document.getElementById("appsHostServers"), {
    endpoint: "/api/dashboard/list",
    key: "servers",
    loadingText: "Cargando Servidor",
    fallbackName: "Servidor",
    itemClass: "",
    href: function (item) {
      return item.hash ? "/panel/" + encodeURIComponent(item.hash) : null;
    }
  });

  const aiKeysList = createList(document.getElementById("appsAiKeys"), {
    endpoint: "/api/ai/user/my-keys",
    key: "keys",
    loadingText: "Cargando API",
    fallbackName: "API Key",
    itemClass: "apps-sub-item-ai",
    href: function () {
      return "/dashboard";
    }
  });

  function loadAll() {
    serversList.load();
    aiKeysList.load();
  }

  // ---------- Abrir / cerrar ----------
  function closeApps() {
    appsMenu.classList.remove("active");
    appsButton.setAttribute("aria-expanded", "false");
  }

  appsButton.addEventListener("click", function (event) {
    event.stopPropagation();
    if (accountMenu) accountMenu.classList.remove("active");
    if (accountButton) accountButton.setAttribute("aria-expanded", "false");
    const open = appsMenu.classList.toggle("active");
    appsButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) loadAll(); // refresco silencioso
  });

  document.addEventListener("click", function (event) {
    if (!appsMenu.contains(event.target) && !appsButton.contains(event.target)) closeApps();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeApps();
  });

  // Al abrir el menú de cuenta se cierra el de aplicaciones
  if (accountButton) accountButton.addEventListener("click", closeApps, true);

  // Precarga para que al abrir ya estén los datos
  loadAll();
})();
