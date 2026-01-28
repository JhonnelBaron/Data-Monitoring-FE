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
      <keep-alive>
        <component :is="activeMapComponent" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MapView from './MapView.vue'
import OpenStreet from './OpenStreet.vue'
import MapLibre from './MapLibre.vue'

const currentMap = ref('clean')

const mapStyles = [
  { id: 'clean', name: 'Clean', icon: '⚪', component: MapView },
  { id: 'osm', name: 'Streets', icon: '🗺️', component: OpenStreet },
  { id: 'libre', name: 'Vector', icon: '🚀', component: MapLibre }
]

const activeMapComponent = computed(() => {
  return mapStyles.find(m => m.id === currentMap.value)?.component
})
</script>

<style scoped>
.map-switcher-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.switcher-ui {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 50; /* Higher than map layers */
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  font-family: 'Arial', sans-serif;
  font-weight: 600;
  color: #475569;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.switch-btn:hover {
  background: #f1f5f9;
}

.switch-btn.active {
  background: #0033a0; /* TESDA Blue */
  color: white;
}

.icon {
  font-size: 1.2rem;
}

.map-render-zone {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .switcher-ui {
    top: auto;
    bottom: 20px;
    right: 50%;
    transform: translateX(50%);
    flex-direction: row;
  }
  .label { display: none; } /* Show only icons on mobile */
}
</style>