<template>
  <div class="page">
    <div class="card">
      <h1>Crear Cuenta</h1>
      <p>Registra una nueva cuenta para acceder al sistema</p>

      <form @submit.prevent="crearCuenta">
        <div class="field">
          <label>Nombre de cuenta</label>
          <input v-model.trim="nombreCuenta" type="text" required />
        </div>

        <div class="field">
          <label>Correo electrónico</label>
          <input v-model.trim="correo" type="email" required />
        </div>

        <div class="field">
          <label>Contraseña</label>
          <input v-model="contraseña" type="password" required minlength="6" />
        </div>

        <button class="btn" type="submit" :disabled="loading">
          <span v-if="loading">Creando...</span>
          <span v-else>Crear cuenta</span>
        </button>

        <p v-if="message" :class="['message', ok ? 'ok' : 'error']">{{ message }}</p>

        <router-link to="/login" class="link">¿Ya tienes cuenta? Inicia sesión</router-link>
      </form>
    </div>
  </div>
</template>

<script>
import api from "@/services/api.js";

export default {
  name: "createaccountview",
  data() {
    return {
      nombreCuenta: "",
      correo: "",
      contraseña: "",
      loading: false,
      message: "",
      ok: false
    };
  },
  methods: {
    async crearCuenta() {
      this.loading = true;
      this.message = "";
      this.ok = false;

      try {
        const res = await api.post("/cuentas", {
          nombreCuenta: this.nombreCuenta,
          correo: this.correo,
          contraseña: this.contraseña
        });

        if (res.data.ok) {
          this.ok = true;
          this.message = "Cuenta creada correctamente.";
          // Redirigir a crear usuario y pasar el id de la cuenta
          this.$router.push({ name: "createuser", params: { accountId: res.data.data._id } });
        } else {
          this.message = res.data.message || "Error al crear cuenta.";
        }
      } catch (err) {
        this.message = err.response?.data?.message || "Error al conectar con el servidor.";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f8fa;
  padding: 20px;
}
.card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 400px;
}
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}
label {
  font-weight: 600;
  margin-bottom: 6px;
}
input {
  padding: 10px;
  border: 1px solid #ccd6e0;
  border-radius: 8px;
}
.btn {
  width: 100%;
  background: linear-gradient(90deg, #00ffa3, #00b4ff);
  color: #021014;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}
.message {
  margin-top: 12px;
  text-align: center;
}
.ok {
  color: green;
}
.error {
  color: red;
}
.link {
  display: block;
  text-align: center;
  margin-top: 16px;
  color: #00b4ff;
  text-decoration: none;
}
</style>
