<template>
  <div class="dashboard-page">
    <header class="header">
      <div class="header-left">
        <h1 class="title">Perfil del usuario</h1>
        <p class="subtitle">Vista individual · Edita tus datos y revisa progreso</p>
      </div>

      <div class="header-right">
        <button class="btn-outline" @click="fetchUsuario" title="Recargar">🔄</button>
        <router-link to="/" class="btn-link">Cerrar sesión</router-link>
      </div>
    </header>

    <main class="main">
      <section v-if="cargando" class="loading">Cargando usuario...</section>

      <section v-else-if="!usuario._id" class="empty">
        <p>No se encontró el usuario. Asegúrate de abrir el dashboard con <code>/dashboard/:userId</code> o guarda el userId en localStorage como <code>userId</code>.</p>
      </section>

      <section v-else class="profile-grid">
        <!-- Card perfil -->
        <div class="card profile-card">
          <div class="profile-head">
            <div class="avatar">{{ avatarInitials }}</div>
            <div>
              <h2>{{ usuario.first_name }} {{ usuario.last_name }}</h2>
              <p class="muted">Documento: {{ usuario.national_id }}</p>
              <p class="muted">País: {{ usuario.country }}</p>
            </div>
          </div>

          <div class="profile-body">
            <div class="stats">
              <div class="stat">
                <div class="stat-title">Altura</div>
                <div class="stat-value">{{ usuario.height_cm }} cm</div>
              </div>
              <div class="stat">
                <div class="stat-title">Peso</div>
                <div class="stat-value">{{ usuario.weight_kg }} kg</div>
              </div>
              <div class="stat">
                <div class="stat-title">Cuenta</div>
                <div class="stat-value">{{ usuario.idAccount?.nombreCuenta || '—' }}</div>
              </div>
            </div>

            <div class="actions">
              <button class="btn" @click="abrirEditor">Editar perfil</button>
            </div>
          </div>
        </div>

        <!-- Card progreso (ejemplo) -->
        <div class="card progress-card">
          <h3>Progreso</h3>
          <p class="muted">Resumen de sesiones y lecturas</p>

          <div class="progress-metrics">
            <div class="metric">
              <div class="metric-title">Última inclinación</div>
              <div class="metric-value">{{ lastReading?.tilt_deg ?? '—' }}°</div>
            </div>
            <div class="metric">
              <div class="metric-title">Velocidad</div>
              <div class="metric-value">{{ lastReading?.velocity_m_s ?? '—' }} m/s</div>
            </div>
            <div class="metric">
              <div class="metric-title">Lecturas</div>
              <div class="metric-value">{{ readingsCount }}</div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal editar perfil -->
    <transition name="fade">
      <div v-if="mostrarEditor" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal">
          <header class="modal-header">
            <h3>Editar perfil</h3>
            <button class="close" @click="cerrarModal">✕</button>
          </header>

          <form @submit.prevent="actualizarUsuario" class="modal-form">
            <div class="field-row">
              <label>Nombre</label>
              <input v-model.trim="form.first_name" required />
            </div>

            <div class="field-row">
              <label>Apellido</label>
              <input v-model.trim="form.last_name" required />
            </div>

            <div class="field-row">
              <label>Documento (national_id)</label>
              <input v-model.number="form.national_id" type="number" required />
            </div>

            <div class="field-row">
              <label>Altura (cm)</label>
              <input v-model.number="form.height_cm" type="number" min="30" max="300" required />
            </div>

            <div class="field-row">
              <label>Peso (kg)</label>
              <input v-model.number="form.weight_kg" type="number" min="1" max="500" required />
            </div>

            <div class="field-row">
              <label>País</label>
              <input v-model.trim="form.country" required />
            </div>

            <div class="divider" />

            <div class="field-row">
              <label>Correo de la cuenta</label>
              <input v-model.trim="form.correo" type="email" />
            </div>

            <div class="field-row">
              <label>Nueva contraseña</label>
              <input v-model="form.contraseña" type="password" placeholder="Dejar vacío si no quieres cambiar" />
            </div>

            <div class="modal-actions">
              <button class="btn" type="submit" :disabled="loading">
                <span v-if="loading">Guardando...</span>
                <span v-else>Guardar</span>
              </button>
              <button type="button" class="btn-ghost" @click="cerrarModal">Cancelar</button>
            </div>

            <p v-if="message" :class="['message', ok ? 'ok' : 'error']">{{ message }}</p>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import api from "@/services/api.js";

export default {
  name: "dashboardview",
  data() {
    return {
      usuario: {},
      lastReading: null,
      readingsCount: 0,
      cargando: true,
      mostrarEditor: false,
      form: {
        idAccount: "",
        first_name: "",
        last_name: "",
        national_id: null,
        height_cm: null,
        weight_kg: null,
        country: "",
        correo: "",
        contraseña: ""
      },
      loading: false,
      message: "",
      ok: false
    };
  },
  computed: {
    avatarInitials() {
      const a = (this.usuario.first_name || "").trim()[0] || "";
      const b = (this.usuario.last_name || "").trim()[0] || "";
      return (a + b).toUpperCase() || "U";
    }
  },
  async mounted() {
    // Intentar obtener userId: route param o localStorage
    const userId = this.$route.params.userId || localStorage.getItem("userId");
    if (!userId) {
      this.cargando = false;
      return;
    }
    await this.cargarUsuario(userId);
  },
  methods: {
    async fetchUsuario() {
      const userId = this.usuario._id || this.$route.params.userId || localStorage.getItem("userId");
      if (!userId) return;
      await this.cargarUsuario(userId);
    },

    async cargarUsuario(userId) {
      this.cargando = true;
      try {
        const res = await api.get(`/usuarios/${userId}`);
        if (res.data?.ok) {
          this.usuario = res.data.data;

          // llenar formulario base (incluyendo idAccount)
          this.form.idAccount = this.usuario.idAccount?._id || this.usuario.idAccount || "";
          this.form.first_name = this.usuario.first_name || "";
          this.form.last_name = this.usuario.last_name || "";
          this.form.national_id = this.usuario.national_id || null;
          this.form.height_cm = this.usuario.height_cm || null;
          this.form.weight_kg = this.usuario.weight_kg || null;
          this.form.country = this.usuario.country || "";
          this.form.correo = this.usuario.idAccount?.correo || "";

          // Cargar lecturas
          await this.cargarLecturasDeUsuario(this.usuario._id);
        } else {
          this.usuario = {};
        }
      } catch (err) {
        console.error("Error cargando usuario:", err);
        this.usuario = {};
      } finally {
        this.cargando = false;
      }
    },

    async cargarLecturasDeUsuario(userId) {
      try {
        // Buscar dispositivos del usuario
        const devicesRes = await api.get("/devices", { params: { idUser: userId } });
        const devices = devicesRes.data?.data || [];
        if (!devices.length) {
          this.lastReading = null;
          this.readingsCount = 0;
          return;
        }
        const deviceId = devices[0]._id;

        // obtener última lectura (paginación: limit=1)
        const lecturasRes = await api.get("/readings", { params: { idDevice: deviceId, page: 1, limit: 1 } });
        const lecturas = lecturasRes.data?.data || [];
        this.lastReading = lecturas[0] || null;

        // contar lecturas (usar meta.total si está disponible)
        const allLecturasRes = await api.get("/readings", { params: { idDevice: deviceId, page: 1, limit: 1 } });
        this.readingsCount = allLecturasRes.data?.meta?.total || (lecturas.length ? 1 : 0);
      } catch (err) {
        console.warn("No se pudieron cargar lecturas:", err.message || err);
        this.lastReading = null;
        this.readingsCount = 0;
      }
    },

    abrirEditor() {
      this.message = "";
      this.ok = false;
      // asegurar que form tenga idAccount
      this.form.idAccount = this.usuario.idAccount?._id || this.form.idAccount || "";
      this.mostrarEditor = true;
    },

    cerrarModal() {
      this.mostrarEditor = false;
      this.form.contraseña = "";
      this.message = "";
    },

    async actualizarUsuario() {
      if (!this.usuario._id) return;
      this.loading = true;
      this.message = "";
      this.ok = false;

      try {
        // Validaciones mínimas
        if (!this.form.first_name || !this.form.last_name) {
          this.message = "Nombre y apellido son obligatorios.";
          this.loading = false;
          return;
        }

        // Actualizar datos del usuario (Users)
        const payloadUsuario = {
          first_name: this.form.first_name.trim(),
          last_name: this.form.last_name.trim(),
          national_id: Number(this.form.national_id),
          height_cm: Number(this.form.height_cm),
          weight_kg: Number(this.form.weight_kg),
          country: this.form.country.trim()
        };

        const resUser = await api.put(`/usuarios/${this.usuario._id}`, payloadUsuario);
        if (!resUser.data?.ok) {
          this.message = resUser.data?.message || "Error al actualizar usuario.";
          this.loading = false;
          return;
        }

        // Actualizar correo y/o contraseña si aplica
        const accountId = this.form.idAccount || this.usuario.idAccount?._id;
        if (accountId && this.form.correo) {
          try {
            await api.put(`/cuentas/${accountId}`, { correo: this.form.correo.trim() });
          } catch (err) {
            console.warn("Error actualizando correo:", err.response?.data?.message || err.message);
          }
        }

        if (accountId && this.form.contraseña && this.form.contraseña.length >= 6) {
          try {
            await api.patch(`/cuentas/${accountId}/contraseña`, { contraseña: this.form.contraseña });
          } catch (err) {
            console.warn("Error actualizando contraseña:", err.response?.data?.message || err.message);
          }
        }

        // refrescar info
        await this.cargarUsuario(this.usuario._id);

        this.ok = true;
        this.message = "Perfil actualizado correctamente.";
        setTimeout(() => this.cerrarModal(), 1200);
      } catch (err) {
        this.message = err.response?.data?.message || "Error al actualizar (conexión).";
      } finally {
        this.loading = false;
      }
    },

    irAUsuarios() {
      // redirige a la vista de crear/listar usuarios si la tienes
      this.$router.push({ name: "createuser" }).catch(() => {});
    }
  }
};
</script>

<style scoped>
.dashboard-page {
  padding: 28px;
  font-family: "SF Pro Display", Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0f172a;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4f8 100%);
  min-height: 100vh;
  box-sizing: border-box;
}
.header { display:flex; justify-content:space-between; align-items:center; gap:18px; margin-bottom:20px; }
.title { margin:0; font-size:1.6rem; font-weight:800; }
.subtitle { margin:0; color:#475569; font-size:0.95rem; }
.header-right { display:flex; gap:12px; align-items:center; }
.btn-link { text-decoration:none; color:#00b4ff; font-weight:600; }
.btn-outline { background:transparent; border:1px solid rgba(0,0,0,0.06); padding:8px 12px; border-radius:10px; cursor:pointer; }
.main { display:block; }
.profile-grid { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start; }
.card { background:white; border-radius:18px; padding:20px; box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
.profile-card { flex:1 1 420px; max-width:680px; }
.profile-head { display:flex; gap:16px; align-items:center; margin-bottom:12px; }
.avatar { width:72px; height:72px; border-radius:18px; display:flex; align-items:center; justify-content:center; background: linear-gradient(90deg,#00ffa3,#00b4ff); color:#021014; font-weight:800; font-size:1.25rem; }
.muted { color:#64748b; font-size:0.95rem; margin:2px 0; }
.stats { display:flex; gap:10px; margin:14px 0; flex-wrap:wrap; }
.stat { background: linear-gradient(180deg,#ffffff,#f7faff); padding:12px; border-radius:12px; min-width:110px; border:1px solid rgba(0,0,0,0.04) }
.stat-title { font-size:0.85rem; color:#64748b }
.stat-value { font-weight:800; font-size:1.05rem; margin-top:6px }
.actions { display:flex; gap:10px; margin-top:8px; }
.btn { background: linear-gradient(90deg,#00ffa3,#00b4ff); color:#021014; padding:10px 14px; border-radius:12px; border:none; cursor:pointer; font-weight:700 }
.btn-ghost { background:transparent; border:1px solid rgba(0,0,0,0.06); padding:10px 14px; border-radius:12px; cursor:pointer }
.progress-card { width:320px; }
.progress-metrics { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.metric { display:flex; justify-content:space-between; align-items:center; }
.metric-title { color:#64748b }
.metric-value { font-weight:800 }
.modal-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.35); display:flex; align-items:center; justify-content:center; z-index:1200; }
.modal { width:92%; max-width:560px; background:#fff; border-radius:14px; padding:18px; box-shadow:0 20px 50px rgba(2,6,23,0.25); }
.modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.close { background:transparent; border:none; font-size:1.1rem; cursor:pointer; }
.modal-form { display:flex; flex-direction:column; gap:10px; }
.field-row { display:flex; flex-direction:column; gap:6px; }
.field-row input { padding:10px; border-radius:8px; border:1px solid #e6eef7; outline:none; }
.divider { height:1px; background:#f1f5f9; margin:8px 0; border-radius:2px; }
.modal-actions { display:flex; gap:10px; margin-top:8px; justify-content:flex-end; }
.message { margin-top:8px; font-weight:600 }
.ok { color:#0f5132 }
.error { color:#991b1b }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 880px) { .profile-grid { flex-direction:column; } .progress-card { width:100%; } }
</style>
