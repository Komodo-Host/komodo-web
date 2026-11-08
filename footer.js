// Footer en celular: Plataforma e Información se expanden al tocar (sin animación)
(function () {
  const titles = document.querySelectorAll(".footer-col-collapsible .footer-col-title");
  if (!titles.length) return;
  const mq = window.matchMedia("(max-width: 600px)");

  function sync() {
    titles.forEach(function (title) {
      if (mq.matches) {
        const open = title.parentElement.classList.contains("open");
        title.setAttribute("role", "button");
        title.setAttribute("tabindex", "0");
        title.setAttribute("aria-expanded", open ? "true" : "false");
      } else {
        title.removeAttribute("role");
        title.removeAttribute("tabindex");
        title.removeAttribute("aria-expanded");
      }
    });
  }

  function toggle(title) {
    if (!mq.matches) return;
    const open = title.parentElement.classList.toggle("open");
    title.setAttribute("aria-expanded", open ? "true" : "false");
  }

  titles.forEach(function (title) {
    title.addEventListener("click", function () {
      toggle(title);
    });
    title.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(title);
      }
    });
  });

  if (mq.addEventListener) mq.addEventListener("change", sync);
  else if (mq.addListener) mq.addListener(sync);
  sync();
})();
