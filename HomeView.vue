<template>
  <div class="home-page">
    <nav class="navbar">
      <h1 class="logo">Back Pro-sture</h1>
      <div class="nav-buttons">
        <router-link to="/login" class="nav-btn">Iniciar sesión</router-link>
        <router-link to="/create-account" class="cta-nav">Crear cuenta</router-link>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-content">
        <h2>Tu postura perfecta, ahora inteligente.</h2>
        <p>
          Back Pro-sture analiza y corrige tu postura con tecnología inteligente.
          Mejora tu bienestar, reduce el dolor y vive con equilibrio.
        </p>
        <router-link to="/create-account" class="cta-btn">Comenzar ahora</router-link>
      </div>
      <div class="hero-image">
        <img :src="imagenPostura" alt="Postura inteligente" />
      </div>
    </header>

    <section class="features">
      <div class="feature">
        <div class="icon">🧠</div>
        <h3>Corrección inteligente</h3>
        <p>Detecta malas posturas y te guía suavemente para corregirlas en tiempo real.</p>
      </div>
      <div class="feature">
        <div class="icon">📊</div>
        <h3>Progreso continuo</h3>
        <p>Monitorea tu evolución y observa cómo mejora tu postura cada semana.</p>
      </div>
      <div class="feature">
        <div class="icon">💬</div>
        <h3>Conectividad total</h3>
        <p>Sincroniza tus datos entre el dispositivo y la app sin complicaciones.</p>
      </div>
    </section>

    <footer class="footer">
      <p>© 2025 Pro-sture — Tecnología para tu bienestar.</p>
    </footer>
  </div>
</template>

<script>
import imagen from '@/assets/imagen_postura.png'

export default {
  name: 'HomeView',
  data() {
    return {
      imagenPostura: imagen
    }
  }
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: "SF Pro Display", Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #0f172a;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4f8 100%);
  overflow-x: hidden;
}

/* Barra superior */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 40px;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(90deg, #00ffa3, #00b4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-buttons { display:flex; gap:16px; align-items:center }
.nav-btn { text-decoration:none; font-weight:600; color:#0f172a; font-size:.95rem }
.cta-nav {
  background: linear-gradient(90deg,#00ffa3,#00b4ff);
  color:#021014; font-weight:700; border-radius:14px; padding:8px 18px; text-decoration:none;
  box-shadow: 0 4px 16px rgba(0,180,255,0.2);
}

/* Hero */
.hero { display:flex; align-items:center; justify-content:center; padding:80px 10%; gap:60px; flex-wrap:wrap }
.hero-content { max-width:480px }
.hero-content h2 { font-size:2.4rem; margin-bottom:18px; color:#0f172a }
.hero-content p { color:#475569; margin-bottom:24px; font-size:1.1rem; }
.cta-btn {
  background: linear-gradient(90deg,#00ffa3,#00b4ff); color:#021014; padding:14px 28px; border-radius:16px;
  font-weight:700; text-decoration:none; box-shadow:0 8px 22px rgba(0,180,255,0.2);
}
.hero-image img { width:360px; max-width:100%; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.08)); animation: float 4s infinite; }

/* features */
.features { display:flex; gap:40px; justify-content:center; flex-wrap:wrap; padding:60px 10%; background:white; border-radius:40px 40px 0 0; margin-top:auto; box-shadow: 0 -10px 30px rgba(0,0,0,0.05) }
.feature { padding:24px 22px; border-radius:20px; text-align:center; max-width:280px; background:linear-gradient(180deg,#fff,#f7faff); border:1px solid rgba(0,0,0,0.05) }
.icon { font-size:2rem; margin-bottom:10px }

/* footer */
.footer { text-align:center; padding:30px; color:#64748b; font-size:.9rem }

@keyframes float { 0%{transform:translateY(-8px)}50%{transform:translateY(10px)}100%{transform:translateY(-8px)} }

@media (max-width:768px) {
  .hero { flex-direction:column-reverse; text-align:center }
  .hero-content { text-align:center }
  .navbar { padding:18px 22px }
  .features { gap:22px; padding:50px 6% }
}
</style>
