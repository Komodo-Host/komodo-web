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

// Obtener el plan desde la URL (?plan=salamandra)
const urlParams = new URLSearchParams(window.location.search);
const planKey = urlParams.get("plan");

// Elementos del DOM
const summaryPlanName = document.getElementById("summaryPlanName");
const summaryFeatures = document.getElementById("summaryFeatures");
const createForm = document.getElementById("createForm");
const submitBtn = document.getElementById("submitBtn");

// Validar que haya un plan válido en la URL
if (!planKey || !PLANS_INFO[planKey]) {
  alert("Plan no válido o no seleccionado. Redirigiendo a la lista de planes...");
  window.location.href = "/dashboard/host";
} else {
  // Cargar los datos del plan en la vista
  const plan = PLANS_INFO[planKey];
  summaryPlanName.textContent = `Plan ${plan.name}`;
  
  summaryFeatures.innerHTML = `
    <li style="font-weight: 700; color: var(--primary); margin-bottom: 8px;">NodeJs</li>
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
        description: description
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
