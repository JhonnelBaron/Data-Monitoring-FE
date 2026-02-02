<template>
  <div class="map-container">
    <div id="maplibre-canvas" class="map"></div>

    <div class="map-controls">
      <button @click="resetMap" class="control-btn">Reset View</button>
    </div>

    <div v-if="hoverInfo.show" :style="tooltipStyle" class="custom-tooltip">
      {{ hoverInfo.name }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, shallowRef, reactive, computed } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as bbox from '@turf/bbox'

const map = shallowRef(null)
const activeRegionId = shallowRef(null)
const hoverInfo = reactive({ show: false, name: '', x: 0, y: 0 })

// Philippines Center and Bounds
const PH_CENTER = [121.7740, 12.8797]
const PH_ZOOM = 5

const tooltipStyle = computed(() => ({
  left: `${hoverInfo.x}px`,
  top: `${hoverInfo.y - 40}px`
}))

onMounted(async () => {
  map.value = new maplibregl.Map({
    container: 'maplibre-canvas',
    // You can change this to 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json' for a cleaner look
    style: 'https://demotiles.maplibre.org/style.json', 
    center: PH_CENTER,
    zoom: PH_ZOOM,
    antialias: true
  })

  map.value.on('load', async () => {
    // 1. Fetch Region Data
    const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

    // 2. Add Sources
    map.value.addSource('regions', {
      type: 'geojson',
      data: regionsData,
      generateId: true // Essential for feature-state hover effects
    })

    // Placeholder source for provinces
    map.value.addSource('provinces', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })

    // 3. Add Layers
    
    // REGION FILL: Handles the primary click/hover area
    map.value.addLayer({
      id: 'region-fills',
      type: 'fill',
      source: 'regions',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 0.4,
          ['boolean', ['feature-state', 'active'], false], 0.2,
          0 // Base state is invisible to see the map
        ]
      }
    })

    // REGION BORDER: Only shows for the active region
    map.value.addLayer({
      id: 'region-borders',
      type: 'line',
      source: 'regions',
      paint: {
        'line-color': '#1e3a8a',
        'line-width': ['case', ['boolean', ['feature-state', 'active'], false], 2.5, 0]
      }
    })

    // PROVINCE BORDER: Red dashed lines
    map.value.addLayer({
      id: 'province-borders',
      type: 'line',
      source: 'provinces',
      paint: {
        'line-color': '#ef4444',
        'line-width': 1.5,
        'line-dasharray': [2, 1]
      }
    })

    // --- INTERACTION EVENTS ---

    let hoveredId = null

    map.value.on('mousemove', 'region-fills', (e) => {
      if (e.features.length > 0) {
        if (hoveredId !== null) {
          map.value.setFeatureState({ source: 'regions', id: hoveredId }, { hover: false })
        }
        hoveredId = e.features[0].id
        map.value.setFeatureState({ source: 'regions', id: hoveredId }, { hover: true })
        
        hoverInfo.show = true
        hoverInfo.name = e.features[0].properties.name
        hoverInfo.x = e.point.x
        hoverInfo.y = e.point.y
        map.value.getCanvas().style.cursor = 'pointer'
      }
    })

    map.value.on('mouseleave', 'region-fills', () => {
      if (hoveredId !== null) {
        map.value.setFeatureState({ source: 'regions', id: hoveredId }, { hover: false })
      }
      hoveredId = null
      hoverInfo.show = false
      map.value.getCanvas().style.cursor = ''
    })

    map.value.on('click', 'region-fills', async (e) => {
      const feature = e.features[0]
      const regionPSGC = String(feature.properties.psgc).replace(/^0+/, '')

      // Update active state logic
      if (activeRegionId.value !== null) {
        map.value.setFeatureState({ source: 'regions', id: activeRegionId.value }, { active: false })
      }
      activeRegionId.value = feature.id
      map.value.setFeatureState({ source: 'regions', id: activeRegionId.value }, { active: true })

      // Zoom to selected region
      const regionBbox = bbox.default(feature)
      const paddingLeft = window.innerWidth > 1024 ? 450 : 50
      map.value.fitBounds(regionBbox, {
        padding: { top: 50, bottom: 50, left: paddingLeft, right: 50 },
        duration: 1000
      })

      // Load Provinces
      loadProvinces(regionPSGC)
    })

    // Reset when clicking empty areas
    map.value.on('click', (e) => {
      const features = map.value.queryRenderedFeatures(e.point, { layers: ['region-fills'] })
      if (!features.length) {
        resetMap()
      }
    })
  })
})

const loadProvinces = async (psgc) => {
  try {
    const res = await fetch(`/geojson/regions/provdists-region-${psgc}.0.001.json`)
    if (!res.ok) throw new Error('Province file not found')
    const data = await res.json()
    
    // Update existing source instead of re-adding layer
    map.value.getSource('provinces').setData(data)
  } catch (err) {
    console.error(err)
    // Clear province data if not found
    map.value.getSource('provinces').setData({ type: 'FeatureCollection', features: [] })
  }
}

const resetMap = () => {
  if (activeRegionId.value !== null) {
    map.value.setFeatureState({ source: 'regions', id: activeRegionId.value }, { active: false })
    activeRegionId.value = null
  }
  
  // Clear provinces
  map.value.getSource('provinces').setData({ type: 'FeatureCollection', features: [] })
  
  map.value.flyTo({
    center: PH_CENTER,
    zoom: PH_ZOOM,
    essential: true
  })
}
</script>

<style scoped>
.map-container { 
  position: relative; 
  width: 100%; 
  height: calc(100vh - 70px); 
  overflow: hidden;
}

.map { 
  width: 100%; 
  height: 100%; 
}

.map-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
}

.control-btn {
  background: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #f3f4f6;
}

.custom-tooltip {
  position: absolute;
  background: rgba(15, 23, 42, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
  z-index: 10;
  transform: translateX(-50%);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>