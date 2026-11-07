// Menú de aplicaciones (icono de cuadrícula) del encabezado
(function () {
  const appsButton = document.getElementById("appsButton");
  const appsMenu = document.getElementById("appsMenu");
  const accountButton = document.getElementById("accountButton");
  const accountMenu = document.getElementById("accountMenu");
  if (!appsButton || !appsMenu) return;

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
  });

  document.addEventListener("click", function (event) {
    if (!appsMenu.contains(event.target) && !appsButton.contains(event.target)) closeApps();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeApps();
  });

  // Al abrir el menú de cuenta se cierra el de aplicaciones
  if (accountButton) accountButton.addEventListener("click", closeApps, true);
})();
