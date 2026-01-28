<template>
  <section class="hero-wrapper">
    
    <div class="map-container">
      <ClientOnly>
         <OpenStreet />
      </ClientOnly>
    </div>

    <div class="text-container">
      <div class="content-box">
        <h1>TVET National Overview</h1>
        <p class="subtitle">Interactive Data Map</p>
      </div>
    </div>

  </section>
</template>

<style scoped>
/* --- LAYOUT FIX --- */
.hero-wrapper {
  position: relative;
  width: 100%;
  /* Matches screen height minus header (60px) */
  height: calc(100vh - 60px); 
  /* Push the whole section down so it starts AFTER the fixed header */
  margin-top: 60px; 
  overflow: hidden;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.text-container {
  position: relative;
  z-index: 10; /* Sits on top of map */
  width: 100%; /* Left half of screen */
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center; /* Center text vertically */
  pointer-events: none; /* Let clicks pass through to map */
}

/* --- THE GRADIENT APPLY --- */
.text-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* TESDA Blue-tinted white gradient */
  background: linear-gradient(
    to right, 
    rgba(255, 255, 255, 1) 0%,         /* Solid sa kaliwa */
    rgba(240, 244, 255, 0.9) 25%,      /* Very light blue tint sa text area */
    rgba(240, 244, 255, 0.6) 45%,      /* Start fading */
    rgba(255, 255, 255, 0) 75%         /* Fully transparent para sa mapa */
  );
  z-index: -1; /* Nasa likod ng text, nasa harap ng map */
}

/* --- TYPOGRAPHY RESTORATION (This was missing!) --- */
.content-box {
  pointer-events: auto;
  padding-left: 50px;
  /* Kinontrol ang lapad para hindi lumampas sa gradient sweet spot */
  max-width: 650px;
}

h1 {
  font-family: 'Arial', sans-serif;
  font-size: 3.5rem;
  color: #0033a0; /* TESDA Blue */
  font-weight: 800;
  margin: 0 0 10px 0;
  line-height: 1.1;
  text-shadow: 1px 1px 0px #ffffff; /* Adds outline to make it pop over map */
}

.subtitle {
  font-family: 'Arial', sans-serif;
  font-size: 1.5rem;
  color: #475569; /* Dark Gray */
  font-weight: 500;
  background: transparent; /* Slight background for readability */
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
}
/* Mobile Fix */
@media (max-width: 768px) {
  .text-container::before {
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.5) 100%
    );
  }
  .content-box {
    padding-left: 20px;
    padding-right: 20px;
    text-align: center;
  }
}
</style>