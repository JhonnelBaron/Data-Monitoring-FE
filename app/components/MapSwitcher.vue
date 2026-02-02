<template>
  <div class="map-switcher-wrapper">
    <div class="switcher-ui">
      <button 
        v-for="map in mapStyles" 
        :key="map.id"
        :class="['switch-btn', { active: currentMap === map.id }]"
        @click="currentMap = map.id"
      >
        <span class="icon">{{ map.icon }}</span>
        <span class="label">{{ map.name }}</span>
      </button>
    </div>

    <div class="map-render-zone">
      <transition name="fade" mode="out-in">
        <keep-alive>
          <component :is="activeMapComponent" :key="currentMap" />
        </keep-alive>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
// IMPORTANT: Make sure these paths match your folder structure
import MapView from './MapView.vue'
import OpenStreet from './OpenStreet.vue'
import MapLibre from './MapLibre.vue'

// Default map selection
const currentMap = ref('clean')

// Map configuration
const mapStyles = [
  { id: 'clean', name: 'Clean', icon: '⚪', component: MapView },
  { id: 'osm', name: 'Streets', icon: '🗺️', component: OpenStreet },
  { id: 'libre', name: 'Vector', icon: '🚀', component: MapLibre }
]

// Logic to tell the <component> which one to show
const activeMapComponent = computed(() => {
  const map = mapStyles.find(m => m.id === currentMap.value)
  return map ? map.component : null
})
</script>

<style scoped>
.map-switcher-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-render-zone {
  width: 100%;
  height: 100%;
}

.switcher-ui {
  position: absolute;
  top: 80px;
  right: 20px;
  z-index: 1000; /* Extremely high to stay above Leaflet layers */
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  font-weight: 600;
  color: #475569;
  transition: all 0.2s;
}

.switch-btn.active {
  background: #0033a0;
  color: white;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .switcher-ui {
    top: auto;
    bottom: 20px;
    right: 50%;
    transform: translateX(50%);
    flex-direction: row;
  }
  .label { display: none; }
}
</style>