<template>
  <div class="page">
    <div class="wrapper">
      <div class="card">
        <h1>Registrar Usuario</h1>
        <p>Relaciona este usuario con la cuenta y completa sus datos</p>

        <form @submit.prevent="crearUsuario">
          <div class="two-cols">
            <div class="field">
              <label>Nombre</label>
              <input v-model.trim="form.first_name" type="text" required />
            </div>

            <div class="field">
              <label>Apellido</label>
              <input v-model.trim="form.last_name" type="text" required />
            </div>
          </div>

          <div class="field">
            <label>Documento (national_id)</label>
            <input v-model.number="form.national_id" type="number" required />
          </div>

          <div class="two-cols">
            <div class="field">
              <label>Altura (cm)</label>
              <input v-model.number="form.height_cm" type="number" min="30" max="300" required />
            </div>

            <div class="field">
              <label>Peso (kg)</label>
              <input v-model.number="form.weight_kg" type="number" min="1" max="500" required />
            </div>
          </div>

          <div class="field">
            <label>País</label>
            <input v-model.trim="form.country" type="text" required />
          </div>

          <div class="field">
            <label>ID de la cuenta (idAccount)</label>
            <input v-model="form.idAccount" type="text" :readonly="!!injectedAccountId" required />
            <small v-if="!injectedAccountId" class="muted">Si vienes desde crear cuenta, el campo se completará automáticamente.</small>
          </div>

          <button class="btn" type="submit" :disabled="loading">
            <span v-if="loading">Guardando...</span>
            <span v-else>Registrar usuario</span>
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
  name: "createuserview",
  props: ["accountId"],
  data() {
    return {
      form: {
        idAccount: this.accountId || this.$route.params.accountId || "",
        first_name: "",
        last_name: "",
        national_id: null,
        height_cm: null,
        weight_kg: null,
        country: ""
      },
      injectedAccountId: !!(this.accountId || this.$route.params.accountId),
      loading: false,
      message: "",
      ok: false
    };
  },
  methods: {
    async crearUsuario() {
      this.message = "";
      this.ok = false;

      // validaciones mínimas
      if (!this.form.idAccount) {
        this.message = "Falta idAccount (vuelve desde crear cuenta o ingrésalo aquí).";
        return;
      }
      if (!this.form.first_name || !this.form.last_name) {
        this.message = "Nombre y apellido son obligatorios.";
        return;
      }
      if (!this.form.national_id) {
        this.message = "Documento (national_id) es obligatorio.";
        return;
      }

      this.loading = true;
      try {
        const payload = {
          idAccount: this.form.idAccount,
          first_name: this.form.first_name.trim(),
          last_name: this.form.last_name.trim(),
          national_id: Number(this.form.national_id),
          height_cm: Number(this.form.height_cm),
          weight_kg: Number(this.form.weight_kg),
          country: this.form.country.trim()
        };

        const res = await api.post("/usuarios", payload);

        if (res?.data?.ok) {
          this.ok = true;
          this.message = "Usuario registrado correctamente.";
          // reset form (opcional)
          const createdUserId = res.data.data?._id;
          setTimeout(() => {
            // intentar redirigir al dashboard individual si existe la ruta 'dashboard'
            if (createdUserId) {
              this.$router.push({ name: "dashboard", params: { userId: createdUserId } }).catch(() => {
                this.$router.push({ name: "home" });
              });
            } else {
              this.$router.push({ name: "home" });
            }
          }, 800);
        } else {
          this.message = res?.data?.message || "Error al crear usuario.";
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
.page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f6f8fa; padding:20px }
.wrapper { max-width:640px; width:100% }
.card { background:white; padding:28px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.08) }
.two-cols { display:flex; gap:12px }
.field { display:flex; flex-direction:column; margin-bottom:12px; flex:1 }
label { font-weight:600; margin-bottom:6px }
input, select { padding:10px; border:1px solid #ccd6e0; border-radius:8px; font-size:1rem; outline:none }
.btn { width:100%; background:linear-gradient(90deg,#00ffa3,#00b4ff); color:#021014; border:none; border-radius:10px; padding:12px; font-weight:700; cursor:pointer }
.muted { color:#94a3b8; font-size:0.85rem }
.message { margin-top:12px; text-align:center }
.ok { color:green } .error { color:red }

@media (max-width:640px) { .two-cols { flex-direction:column } }
</style>
