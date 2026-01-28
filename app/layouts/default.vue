<template>
  <div class="app-layout">
    <AppHeader class="fixed-header" />

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* Ensure the header stays on top */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9999;
  height: 60px; /* Adjust this to match your AppHeader's actual height */
}

/* Optional: Default background */
.main-content {
  background-color: #f8fafc;
  min-height: 100vh;
}
</style>