<template>
  <div class="page">
    <div class="wrapper">
      <div class="card">
        <h1>Editar Perfil</h1>
        <p>Actualiza tu información personal</p>

        <form @submit.prevent="actualizarUsuario">
          <div class="field">
            <label for="first_name">Nombre</label>
            <input id="first_name" v-model.trim="form.first_name" type="text" required />
          </div>

          <div class="field">
            <label for="last_name">Apellido</label>
            <input id="last_name" v-model.trim="form.last_name" type="text" required />
          </div>

          <div class="field">
            <label for="height_cm">Altura (cm)</label>
            <input id="height_cm" v-model.number="form.height_cm" type="number" min="30" max="300" required />
          </div>

          <div class="field">
            <label for="weight_kg">Peso (kg)</label>
            <input id="weight_kg" v-model.number="form.weight_kg" type="number" min="1" max="500" required />
          </div>

          <div class="field">
            <label for="country">País</label>
            <input id="country" v-model.trim="form.country" type="text" required />
          </div>

          <div class="field">
            <label for="correo">Correo electrónico</label>
            <input id="correo" v-model.trim="form.correo" type="email" required />
          </div>

          <div class="field">
            <label for="contraseña">Contraseña</label>
            <input id="contraseña" v-model="form.contraseña" type="password" placeholder="Nueva contraseña (opcional)" />
          </div>

          <button class="btn" type="submit" :disabled="loading">
            <span v-if="loading">Guardando...</span>
            <span v-else>Guardar cambios</span>
          </button>

          <p v-if="message" :class="['message', ok ? 'ok' : 'error']">{{ message }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import api from "@/services/api.js";

export default {
  name: "EditUserView",
  // acepta userId por prop; si no, usa route.params
  props: ["userId"],
  data() {
    return {
      form: {
        // idAccount agregado para actualizar correo/contraseña
        idAccount: "",
        first_name: "",
        last_name: "",
        height_cm: "",
        weight_kg: "",
        country: "",
        correo: "",
        contraseña: ""
      },
      loading: false,
      message: "",
      ok: false
    };
  },
  async mounted() {
    const uid = this.userId || this.$route.params.userId;
    if (!uid) {
      this.message = "No se encontró userId.";
      return;
    }

    try {
      const res = await api.get(`/usuarios/${uid}`);
      if (res.data && res.data.ok) {
        const u = res.data.data;
        // Rellenar form
        this.form.idAccount = u.idAccount?._id || u.idAccount || "";
        this.form.first_name = u.first_name || "";
        this.form.last_name = u.last_name || "";
        this.form.height_cm = u.height_cm || "";
        this.form.weight_kg = u.weight_kg || "";
        this.form.country = u.country || "";
        this.form.correo = u.idAccount?.correo || "";
      } else {
        this.message = "No se pudo cargar el usuario.";
      }
    } catch (err) {
      this.message = "Error al cargar datos del usuario.";
      console.error(err);
    }
  },
  methods: {
    async actualizarUsuario() {
      this.message = "";
      this.ok = false;

      // Validaciones locales
      if (!this.form.first_name || !this.form.last_name) {
        this.message = "Nombre y apellido son obligatorios.";
        return;
      }

      if (!this.userId && !this.$route.params.userId) {
        this.message = "Falta userId para actualizar.";
        return;
      }

      this.loading = true;
      try {
        const uid = this.userId || this.$route.params.userId;

        const payload = {
          first_name: this.form.first_name.trim(),
          last_name: this.form.last_name.trim(),
          height_cm: Number(this.form.height_cm),
          weight_kg: Number(this.form.weight_kg),
          country: this.form.country.trim()
        };

        const res = await api.put(`/usuarios/${uid}`, payload);

        if (res.data && res.data.ok) {
          // Si el usuario quiere cambiar correo/contraseña actualizamos la cuenta asociada
          const accountId = this.form.idAccount;
          if (accountId) {
            await this.actualizarCuenta(accountId);
          }

          this.ok = true;
          this.message = "Perfil actualizado correctamente.";
        } else {
          this.message = res.data?.message || "Error al actualizar.";
        }
      } catch (err) {
        this.message = err.response?.data?.message || "Error de conexión.";
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async actualizarCuenta(accountId) {
      try {
        if (this.form.correo) {
          await api.put(`/cuentas/${accountId}`, { correo: this.form.correo.trim() });
        }

        if (this.form.contraseña && this.form.contraseña.length >= 6) {
          await api.patch(`/cuentas/${accountId}/contraseña`, { contraseña: this.form.contraseña });
        }
      } catch (err) {
        // No bloquear la actualización del profile si falla la cuenta; mostrar aviso en consola
        console.warn("No se pudo actualizar correo/contraseña:", err.response?.data?.message || err.message);
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
.wrapper {
  max-width: 500px;
  width: 100%;
}
.card {
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}
.field label {
  font-weight: 600;
  margin-bottom: 6px;
}
input,
select {
  padding: 10px;
  border: 1px solid #ccd6e0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
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
</style>
