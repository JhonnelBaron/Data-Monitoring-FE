<template>
  <div class="map-container">
    <div id="map-osm" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue'

const mapInstance = shallowRef(null)
const provinceLayer = shallowRef(null)
const hoveredLayer = shallowRef(null)
const activeLayer = shallowRef(null)

const phBounds = [
  [4.5, 116.8], 
  [21.4, 127.0] 
]

let resizeHandler = null

onMounted(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const map = L.map('map-osm', {
    zoomControl: true, // Enabled for OSM navigation
    attributionControl: true,
    zoomSnap: 0.5,
    minZoom: 5,
    maxZoom: 18 // OSM supports deeper zoom than custom GeoJSON usually needs
  })

  mapInstance.value = map

  // --- ADD OPENSTREETMAP TILES ---
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

  // --- MODIFIED STYLES FOR OSM (Lower Opacity) ---
  const baseStyle = {
    color: 'transparent',     // Blue borders for better visibility on map
    weight: 1.5,
    // fillColor: '#3b82f6',
    fillOpacity: 0,     // Low opacity so we can see the OSM streets
  }

  const hoverStyle = {
    fillColor: '#60a5fa',
    fillOpacity: 0.5      // Darkens on hover
  }

  const activeStyle = {
    fillColor: 'transparent',   // Active Region Color
    fillOpacity: 0.4,
    weight: 3,
    color: '#1e3a8a'
  }

  const provinceStyle = {
    color: '#ef4444',     // Reddish lines for provinces to stand out
    weight: 1.5,
    fillOpacity: 0
  }

  const adjustMapLayout = () => {
    const width = window.innerWidth
    const paddingLeft = width > 1024 ? 450 : 0
    map.fitBounds(phBounds, {
      paddingTopLeft: [paddingLeft, 20],
      paddingBottomRight: [20, 20]
    })
  }

  adjustMapLayout()

  resizeHandler = () => {
    if (!activeLayer.value) adjustMapLayout()
  }
  window.addEventListener('resize', resizeHandler)

  const resetView = () => {
    if (activeLayer.value) {
      activeLayer.value.setStyle(baseStyle)
      activeLayer.value = null
    }
    if (provinceLayer.value) {
      map.removeLayer(provinceLayer.value)
      provinceLayer.value = null
    }
    adjustMapLayout()
  }

  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionName = feature.properties.name
      const regionPSGC = String(feature.properties.psgc).replace(/^0+/, '')

      layer.on('mouseover', () => {
        if (layer !== activeLayer.value) {
          layer.setStyle(hoverStyle)
          layer.bringToFront()
        }
        layer.bindTooltip(regionName, { sticky: true, direction: 'top', className: 'region-tooltip' }).openTooltip()
      })

      layer.on('mouseout', () => {
        if (layer !== activeLayer.value) layer.setStyle(baseStyle)
        layer.closeTooltip()
      })

      layer.on('click', async (e) => {
        L.DomEvent.stopPropagation(e)
        if (activeLayer.value) activeLayer.value.setStyle(baseStyle)
        
        activeLayer.value = layer
        layer.setStyle(activeStyle)

        const width = window.innerWidth
        const sidebarSpace = width > 1024 ? 450 : 20

        map.flyToBounds(layer.getBounds(), { 
          paddingTopLeft: [sidebarSpace, 20],
          paddingBottomRight: [20, 20],
          duration: 0.7 
        })

        if (provinceLayer.value) map.removeLayer(provinceLayer.value)

        try {
          const provincesData = await fetch(
            `/geojson/regions/provdists-region-${regionPSGC}.0.001.json`
          ).then(r => r.json())

          provinceLayer.value = L.geoJSON(provincesData, {
            style: provinceStyle,
            onEachFeature: (pFeature, pLayer) => {
              pLayer.bindTooltip(pFeature.properties.name, { sticky: true })
            }
          }).addTo(map)
        } catch (err) {
          console.error(`Province file not found`, err)
        }
      })
    }
  }).addTo(map)

  map.on('click', resetView)
})

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: calc(100vh - 70px); 
}

.map {
  width: 100%;
  height: 100%;
  background: #f8f9fa; /* Slight off-white background while tiles load */
}

:deep(.region-tooltip) {
  background: rgba(30, 41, 59, 0.9);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-weight: 600;
}
:deep(.leaflet-interactive:focus) {
  outline: none;
}
</style>