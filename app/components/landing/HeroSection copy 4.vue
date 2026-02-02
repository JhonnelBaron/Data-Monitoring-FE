<template>
  <section class="hero-wrapper">
    <div class="map-container">
      <ClientOnly>
        <OpenStreet ref="mapRef"/>
      </ClientOnly>
    </div>

    <div class="ui-overlay">
      <div class="content-box">
        <Transition name="fade">
          <button 
            v-if="heroStore.currentLevel !== 'national'"
            @click="handleBack"
            class="back-btn"
          >
            <span class="arrow">←</span> Back to National View
          </button>
        </Transition>

        <h1 class="main-title">{{ heroStore.locationName }}</h1>
        
        <div class="subtitle-group">
          <div class="live-status">
            <span class="pulse"></span>
            <span class="status-text">Live System</span>
          </div>
          <div class="subtitle-wrapper">
            <p class="subtitle">ROMO Interactive Map Data</p>
            <span class="timestamp">Real-time Analysis • Jan 2026</span>
          </div>
        </div>

        <div class="stats-grid">
          <div v-for="item in displayStats" :key="item.label" 
               :class="['stat-item', { 'wide-card': item.wide }]">
            
            <div class="card-content">
              <span class="stat-label">{{ item.label }}</span>
              <span class="stat-number">
                {{ Math.round(item.value).toLocaleString() }}
              </span>
            </div>
            
            <div class="glass-reflection"></div>
            <div v-if="item.wide" class="shimmer-effect"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useTransition, TransitionPresets } from '@vueuse/core'
import { ref, onMounted, computed, watch } from 'vue'

const heroStore = useHeroStore()
const mapRef = ref(null)
const sourceStats = ref({
  regions: 0, provinces: 0, districts: 0, 
  cities: 0, municities: 0, barangays: 0, clients: 0
})

const createCounter = (key) => useTransition(() => sourceStats.value[key], {
  duration: 1800,
  transition: TransitionPresets.easeOutExpo,
})

const handleBack = () => {
  // 1. I-reset ang data sa store
  heroStore.resetToNational()
  
  // 2. I-reset ang zoom at layers ng mapa
  if (mapRef.value) {
    mapRef.value.resetView()
  }
}

const animStats = {
  regions: createCounter('regions'),
  provinces: createCounter('provinces'),
  districts: createCounter('districts'),
  cities: createCounter('cities'),
  municities: createCounter('municities'),
  barangays: createCounter('barangays'),
  clients: createCounter('clients')
}

const displayStats = computed(() => {
  const allStats = [
    { label: 'Regions', value: animStats.regions.value, level: ['national'] },
    { label: 'Provinces', value: animStats.provinces.value, level: ['national', 'region'] },
    { label: 'Districts', value: animStats.districts.value, level: ['national', 'region', 'province'] },
    { label: 'Cities', value: animStats.cities.value, level: ['national', 'region', 'province'] },
    { label: 'Municipalities', value: animStats.municities.value, level: ['national', 'region', 'province'] },
    { label: 'Barangays', value: animStats.barangays.value, level: ['national', 'region', 'province', 'city'] },
    { label: 'Potential Clients', value: animStats.clients.value, wide: true, level: ['national', 'region', 'province', 'city'] },
  ]
  return allStats.filter(item => item.level.includes(heroStore.currentLevel))
})

watch(() => heroStore.stats, (newVal) => {
  sourceStats.value = { ...newVal }
}, { deep: true })

onMounted(() => {
  setTimeout(() => {
    sourceStats.value = { ...heroStore.stats }
  }, 100)
})
</script>

<style scoped>
/* --- CORE WRAPPER --- */
.hero-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 60px); 
  margin-top: 60px;
  background: #f8fafc;
  overflow: hidden;
  display: flex;
}

.map-container {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.ui-overlay {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: flex;
  align-items: center; /* Centered vertically for all screens */
  background: linear-gradient(
    to right, 
    rgba(255, 255, 255, 1) 0%, 
    rgba(255, 255, 255, 0.9) 35%, 
    rgba(255, 255, 255, 0) 75%
  );
}

.content-box {
  pointer-events: auto;
  padding: 2vh 5vw;
  width: 100%;
  max-width: 720px; /* Mas malapad gaya ng Image 2 */
  max-height: 95vh; /* Iwas overflow */
  overflow-y: auto;
  scrollbar-width: none;
}
.content-box::-webkit-scrollbar { display: none; }

/* --- TYPOGRAPHY (IMAGE 2 STYLE) --- */
.main-title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(2.2rem, 7vh, 4.2rem); /* Dynamic based on height */
  font-weight: 950;
  color: #0033a0;
  line-height: 0.95;
  letter-spacing: -0.06em;
  text-transform: uppercase;
  margin: 0 0 1.5vh 0;
}

.subtitle-group {
  display: flex;
  gap: 15px;
  margin-bottom: 3vh;
  align-items: center;
}

.live-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fee2e2;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #fecaca;
}

.status-text {
  font-size: 0.65rem;
  font-weight: 800;
  color: #ef4444;
  text-transform: uppercase;
}

.subtitle {
  font-size: clamp(0.9rem, 1.5vh, 1.1rem);
  font-weight: 700;
  color: #475569;
  margin: 0;
}

.timestamp {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* --- STATS GRID (PREMIUM GLASSMOPHISM) --- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  position: relative;
  background: rgba(255, 255, 255, 0.85); /* Clean image 2 look */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: clamp(12px, 2.2vh, 22px);
  border-radius: 24px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transition: all 0.4s ease;
  overflow: hidden;
}

.stat-item:hover {
  transform: translateY(-5px);
  background: white;
  border-color: #0033a0;
}

.stat-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}

.stat-number {
  font-size: clamp(1.3rem, 3vh, 1.8rem);
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
}

/* --- THE BIG CARD (POTENTIAL CLIENTS) --- */
.wide-card {
  grid-column: span 3;
  background: linear-gradient(135deg, #0033a0 0%, #001a50 100%);
  border: none;
}

.wide-card .stat-label { color: rgba(255, 255, 255, 0.6); }
.wide-card .stat-number { 
  color: white; 
  font-size: clamp(2.2rem, 6vh, 3.2rem);
  text-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* --- BACK BUTTON LOGIC --- */
.back-btn {
  background: rgba(0, 51, 160, 0.1); /* Subtle blue tint */
  backdrop-filter: blur(10px);
  color: #0033a0;
  border: 1px solid rgba(0, 51, 160, 0.2);
  padding: 8px 16px;
  border-radius: 100px; /* Pill shape */
  font-weight: 700;
  font-size: 0.65rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 2vh;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #0033a0;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 51, 160, 0.2);
}

/* --- ANIMATIONS --- */
.shimmer-effect {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: shimmer 4s infinite;
}
@keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }

.pulse {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse-ring 1.5s infinite;
}
@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

/* --- MOBILE RESPONSIVE --- */
@media (max-width: 768px) {
  .ui-overlay { background: white; align-items: flex-start; padding-top: 42vh; }
  .map-container { height: 40vh; position: fixed; }
  .content-box { max-height: none; padding-bottom: 50px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .wide-card { grid-column: span 2; }
}

/* --- SHORT SCREEN (LAPTOP) FIX --- */
@media (max-height: 700px) {
  .main-title { margin-bottom: 1vh; }
  .subtitle-group { margin-bottom: 2vh; }
  .stat-item { padding: 10px 18px; }
}
</style>