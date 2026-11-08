// Sección "overview": datos de ejemplo (placeholders). Solo los botones de copiar son funcionales.
window.KomodoPanelViews = window.KomodoPanelViews || {};
window.KomodoPanelViews["overview"] = {
  _cleanups: [],

  mount(container, ctx) {
    const urlText = container.querySelector("#ovUrlText");
    if (urlText) {
      const url = `${window.location.origin}/panel/${ctx.serverHash}`;
      urlText.textContent = url;
      urlText.title = url;
    }
    const idText = container.querySelector("#ovServerIdText");
    if (idText) idText.title = idText.textContent.trim();

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        const tmp = document.createElement("textarea");
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try {
          document.execCommand("copy");
        } catch (e) {}
        tmp.remove();
      }
    }

    container.querySelectorAll(".ov-copy-btn[data-copy-from]").forEach((btn) => {
      let timer = null;
      const onClick = async () => {
        const source = container.querySelector("#" + btn.dataset.copyFrom);
        if (!source) return;
        await copyText(source.textContent.trim());
        btn.classList.add("copied");
        clearTimeout(timer);
        timer = setTimeout(() => btn.classList.remove("copied"), 1400);
      };
      btn.addEventListener("click", onClick);
      this._cleanups.push(() => {
        clearTimeout(timer);
        btn.removeEventListener("click", onClick);
      });
    });
  },

  unmount() {
    this._cleanups.forEach((fn) => fn());
    this._cleanups = [];
  }
};
