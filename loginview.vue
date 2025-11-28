<template>
  <div class="login-page">
    <div class="glass-card">
      <h1 class="logo">Pro-sture</h1>
      <p class="subtitle">Bienvenido de nuevo 👋</p>

      <form @submit.prevent="loginUsuario" class="login-form">
        <div class="input-group">
          <label for="correo">Correo electrónico</label>
          <input
            id="correo"
            type="email"
            v-model="form.correo"
            placeholder="usuario@correo.com"
            required
          />
        </div>

        <div class="input-group">
          <label for="contraseña">Contraseña</label>
          <input
            id="contraseña"
            type="password"
            v-model="form.contraseña"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn" :disabled="loading">
          <span v-if="loading">Iniciando sesión...</span>
          <span v-else>Entrar</span>
        </button>

        <transition name="fade">
          <p v-if="error" class="error-msg">{{ error }}</p>
        </transition>
      </form>

      <div class="bottom-links">
        <router-link to="/create-account" class="link">
          Crear una cuenta nueva
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import api, { setAuthToken } from "@/services/api.js";

export default {
  name: "LoginView",
  data() {
    return {
      form: { correo: "", contraseña: "" },
      error: "",
      loading: false
    };
  },
  methods: {
    async loginUsuario() {
      this.loading = true;
      this.error = "";
      try {
        const res = await api.post("/login", this.form); // baseURL ya incluye /api
        if (res.data?.ok) {
          const token = res.data.token;
          // guardar y configurar headers
          localStorage.setItem("token", token);
          setAuthToken(token);

          // guardar cuenta
          localStorage.setItem("cuenta", JSON.stringify(res.data.cuenta));

          const userId = res.data.userId;
          if (userId) {
            // redirigir al dashboard individual
            localStorage.setItem("userId", userId);
            this.$router.push({ name: "dashboard", params: { userId } });
          } else {
            // si no hay perfil, llevar a crear usuario con accountId
            this.$router.push({ name: "createuser", params: { accountId: res.data.cuenta.id } });
          }
        } else {
          this.error = res.data?.message || "Error desconocido";
        }
      } catch (err) {
        this.error = err.response?.data?.message || "Error al conectar con el servidor";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
/* Fondo general */
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #d9faff 0%, #e6f7ff 50%, #f8fbff 100%);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* Tarjeta de vidrio */
.glass-card {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border-radius: 24px;
  padding: 48px 36px;
  width: 90%;
  max-width: 420px;
  text-align: center;
  color: #0f172a;
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 36px rgba(0, 180, 255, 0.25);
}

/* Logo */
.logo {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 4px;
  background: linear-gradient(90deg, #00ffa3, #00b4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Subtítulo */
.subtitle {
  color: #334155;
  margin-bottom: 32px;
  font-size: 1rem;
}

/* Formulario */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  text-align: left;
}

.input-group label {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9rem;
  margin-bottom: 6px;
  display: block;
}

.input-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid rgba(203, 213, 225, 0.7);
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: all 0.25s ease;
  background-color: rgba(255, 255, 255, 0.8);
}

.input-group input:focus {
  border-color: #00b4ff;
  box-shadow: 0 0 0 3px rgba(0, 180, 255, 0.15);
}

/* Botón principal */
.btn {
  width: 100%;
  background: linear-gradient(90deg, #00ffa3, #00b4ff);
  color: #021014;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 6px 20px rgba(0, 180, 255, 0.25);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0, 180, 255, 0.35);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Error */
.error-msg {
  color: #ef4444;
  margin-top: 10px;
  font-weight: 500;
  text-align: center;
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Enlaces */
.bottom-links {
  margin-top: 28px;
}

.link {
  color: #00b4ff;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.25s ease;
}

.link:hover {
  opacity: 0.7;
}

/* Animación de fade para errores */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Responsivo */
@media (max-width: 500px) {
  .glass-card {
    padding: 36px 26px;
    border-radius: 20px;
  }
}
</style>
