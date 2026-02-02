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
const activeProvinceId = shallowRef(null)
const activeMuniId = shallowRef(null)

const hoverInfo = reactive({ show: false, name: '', x: 0, y: 0 })

/**
 * CUSTOM BOUNDS CONFIGURATION
 * We use [Lng, Lat] format for MapLibre.
 * Setting minLng to 110.0 pushes the map landmass to the right.
 */
const phBounds = [
  [110.0, 21.4],   // Southwest: [Lng, Lat]
  [116.8, 4.5]   // Northeast: [Lng, Lat]
]

const tooltipStyle = computed(() => ({
  left: `${hoverInfo.x}px`,
  top: `${hoverInfo.y - 40}px`
}))

onMounted(async () => {
  map.value = new maplibregl.Map({
    container: 'maplibre-canvas',
    style: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json', 
    bounds: phBounds, // Initializes map to your custom frame
    fitBoundsOptions: { padding: 0 },
    antialias: true
  })

  map.value.on('load', async () => {
    // Ensure the map respects the bounds immediately on load
    map.value.fitBounds(phBounds, { padding: 0, duration: 0 });

    const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

    // 1. DATA SOURCES
    map.value.addSource('regions', { type: 'geojson', data: regionsData, generateId: true })
    map.value.addSource('provinces', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, generateId: true })
    map.value.addSource('municities', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, generateId: true })
    map.value.addSource('barangays', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, generateId: true })

    // 2. LAYERS
    // Regions
    map.value.addLayer({
      id: 'region-fills',
      type: 'fill',
      source: 'regions',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0]
      }
    })

    // Provinces
    map.value.addLayer({
      id: 'province-fills',
      type: 'fill',
      source: 'provinces',
      paint: {
        'fill-color': '#ee3124',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.05]
      }
    })

    // Municipalities
    map.value.addLayer({
      id: 'muni-fills',
      type: 'fill',
      source: 'municities',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.1]
      }
    })

    // Barangays
    map.value.addLayer({
      id: 'bgy-fills',
      type: 'fill',
      source: 'barangays',
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.1]
      }
    })

    // 3. HOVER LOGIC
    const layers = ['region-fills', 'province-fills', 'muni-fills', 'bgy-fills']
    let hoveredId = null
    let hoveredSource = null

    map.value.on('mousemove', (e) => {
      const features = map.value.queryRenderedFeatures(e.point, { layers })
      
      if (hoveredId !== null && hoveredSource !== null) {
        map.value.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: false })
      }

      if (features.length > 0) {
        const feat = features[0]
        const source = feat.source
        const id = feat.id

        // Lock hover if layer is already "active/clicked"
        const isActive = (source === 'regions' && id === activeRegionId.value) ||
                         (source === 'provinces' && id === activeProvinceId.value) ||
                         (source === 'municities' && id === activeMuniId.value)

        if (!isActive) {
          hoveredId = id
          hoveredSource = source
          map.value.setFeatureState({ source, id }, { hover: true })
          
          hoverInfo.show = true
          hoverInfo.name = feat.properties.name || feat.properties.adm1_en || feat.properties.adm2_en || feat.properties.adm3_en || feat.properties.adm4_en
          hoverInfo.x = e.point.x
          hoverInfo.y = e.point.y
          map.value.getCanvas().style.cursor = 'pointer'
        } else {
          hoverInfo.show = false
          map.value.getCanvas().style.cursor = ''
        }
      } else {
        hoverInfo.show = false
        map.value.getCanvas().style.cursor = ''
      }
    })

    // 4. CLICK / DRILL-DOWN LOGIC
    map.value.on('click', async (e) => {
      const features = map.value.queryRenderedFeatures(e.point, { layers })
      
      if (!features.length) {
        resetMap()
        return
      }

      const feat = features[0]
      const props = feat.properties
      // SidebarSpace ensures the zoomed-in map also stays on the right
      const sidebarSpace = window.innerWidth > 1024 ? 500 : 50

      if (feat.layer.id === 'region-fills') {
        const psgc = String(props.psgc || props.adm1_psgc).replace(/^0+/, '')
        activeRegionId.value = feat.id
        activeProvinceId.value = null
        activeMuniId.value = null
        
        zoomTo(feat, sidebarSpace)
        loadData('provinces', `/geojson/regions/provdists-region-${psgc}.0.001.json`)
        clearSource('municities')
        clearSource('barangays')
      } 
      else if (feat.layer.id === 'province-fills') {
        const psgc = String(props.adm2_psgc || props.psgc).replace(/^0+/, '')
        activeProvinceId.value = feat.id
        activeMuniId.value = null

        zoomTo(feat, sidebarSpace)
        loadData('municities', `/geojson/province/municities-provdist-${psgc}.0.001.json`)
        clearSource('barangays')
      }
      else if (feat.layer.id === 'muni-fills') {
        const psgc = String(props.adm3_psgc).replace(/^0+/, '')
        activeMuniId.value = feat.id

        zoomTo(feat, sidebarSpace)
        loadData('barangays', `/geojson/municities/bgysubmuns-municity-${psgc}.0.001.json`)
      }
    })
  })
})

const zoomTo = (feature, paddingLeft) => {
  const regionBbox = bbox.default(feature)
  map.value.fitBounds(regionBbox, {
    padding: { top: 50, bottom: 50, left: paddingLeft, right: 50 },
    duration: 1000
  })
}

const loadData = async (sourceId, url) => {
  try {
    const data = await fetch(url).then(r => r.json())
    map.value.getSource(sourceId).setData(data)
  } catch (err) {
    console.error(`Error loading ${sourceId}:`, err)
    clearSource(sourceId)
  }
}

const clearSource = (sourceId) => {
  map.value.getSource(sourceId).setData({ type: 'FeatureCollection', features: [] })
}

const resetMap = () => {
  activeRegionId.value = null
  activeProvinceId.value = null
  activeMuniId.value = null
  
  clearSource('provinces')
  clearSource('municities')
  clearSource('barangays')
  
  // Return to the offset view that pushes landmass to the right
  map.value.fitBounds(phBounds, {
    padding: 0,
    essential: true,
    duration: 1000
  })
}
</script>

<style scoped>
.map-container { 
  position: relative; 
  width: 100%; 
  height: 100%; 
  overflow: hidden; 
}
.map { 
  width: 100%; 
  height: 100%; 
}
.map-controls { 
  position: absolute; 
  bottom: 20px; 
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
  color: #1e3a8a;
}
.custom-tooltip { 
  position: absolute; 
  background: rgba(15, 23, 42, 0.9); 
  color: white; 
  padding: 8px 12px; 
  border-radius: 6px; 
  font-size: 13px; 
  pointer-events: none; 
  z-index: 100; 
  transform: translateX(-50%); 
}
</style>