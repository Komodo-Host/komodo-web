const API_URL = window.location.origin;

function getAuthToken() {
  return localStorage.getItem("komodo_auth_token") || sessionStorage.getItem("komodo_auth_token");
}

// Obtener el modelo desde la URL (?model=llama3.1-8b)
const urlParams = new URLSearchParams(window.location.search);
const modelKey = urlParams.get("model") || "llama3.1-8b";

// Elementos del DOM
const keyNameInput = document.getElementById("keyNameInput");
const generateBtn = document.getElementById("generateBtn");

let currentUser = null;

// Verificar sesión al cargar la página
async function initPage() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Sesión inválida");
    const data = await res.json();
    currentUser = data.user;
  } catch (error) {
    console.error(error);
    window.location.href = "/login";
  }
}

// Generar nueva key
generateBtn.addEventListener("click", async () => {
  const name = keyNameInput.value.trim();
  
  if (name.length < 3) {
    alert("El nombre debe tener al menos 3 caracteres.");
    return;
  }

  if (!currentUser) {
    alert("No se pudo verificar tu usuario. Vuelve a iniciar sesión.");
    window.location.href = "/login";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generando...";

  const token = getAuthToken();
  
  try {
    const res = await fetch(`${API_URL}/api/ai/user/generate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        name: name,
        model_id: modelKey
      })
    });
    
    const data = await res.json();

    if (data.success) {
      alert("¡API Key creada exitosamente!");
      window.location.href = "/dashboard"; // Redirigir al dashboard
    } else {
      alert(data.message || "Error al generar la API Key.");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generar API Key";
    }
  } catch (error) {
    console.error(error);
    alert("Error de conexión con el servidor.");
    generateBtn.disabled = false;
    generateBtn.textContent = "Generar API Key";
  }
});

// Iniciar
initPage();