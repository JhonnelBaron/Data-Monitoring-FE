<template>
  <div class="map-container">
    <div id="map" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue'

const mapInstance = shallowRef(null)
const provinceLayer = shallowRef(null)
const hoveredLayer = shallowRef(null)
const activeLayer = shallowRef(null)

// 1. BOUNDS: Ang "kahon" na sakop ang buong Pilipinas
const phBounds = [
  [4.5, 116.8], // South West corners
  [21.4, 127.0] // North East corners
]

// Variable para sa resize listener
let resizeHandler = null

onMounted(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  // 2. MAP INIT: Tinanggal ko ang fixed center/zoom.
  // Hahayaan nating ang 'adjustMapLayout' ang mag-set nito.
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.5, // Importante para pwede ang .5 zoom levels
    minZoom: 5,
    maxZoom: 12
  })

  mapInstance.value = map

  const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

  // --- STYLES (Galing sa request mo) ---
  const baseStyle = {
    color: '#ffffff',
    weight: 1,
    fillColor: '#e5e7eb',
    fillOpacity: 1,
    transition: 'fill 0.3s'
  }

  const hoverStyle = {
    fillColor: '#60a5fa',
    fillOpacity: 1
  }

  const activeStyle = {
    fillColor: '#60a5fa',   // Active Region Color
    fillOpacity: 1,         // Solid fill
    weight: 2
  }

  const provinceStyle = {
    color: '#333333',       // Dark Lines
    weight: 2,
    fillColor: '#60a5fa',   // (Ignored dahil 0 opacity)
    fillOpacity: 1          // TRANSPARENT: Para lumitaw ang kulay ng Region sa ilalim
  }

  // --- 3. RESPONSIVE LAYOUT FUNCTION ---
  const adjustMapLayout = () => {
    const width = window.innerWidth
    
    // ADJUST MO ITO: Gaano kalapad ang sidebar/cards sa kaliwa?
    // Halimbawa: 450px ang space na iiwan sa kaliwa kung Desktop
    const paddingLeft = width > 1024 ? 450 : 0
    
    // "fitBounds" ang bahalang mag-zoom at mag-center sa Pilipinas
    // habang umiiwas sa paddingLeft
    map.fitBounds(phBounds, {
      paddingTopLeft: [paddingLeft, 0], // [x, y] -> Space sa Kaliwa
      paddingBottomRight: [0, 0]
    })
  }

  // Tawagin agad para sa initial load
  adjustMapLayout()

  // Listener: Pag niresize ang browser, aayusin ulit ang pwesto
  resizeHandler = () => {
    // Aayusin lang ang view kung walang naka-select na region
    if (!activeLayer.value) {
      adjustMapLayout()
    }
  }
  window.addEventListener('resize', resizeHandler)


  // --- RESET VIEW (Updated) ---
  const resetView = () => {
    if (activeLayer.value) {
      activeLayer.value.setStyle(baseStyle)
      activeLayer.value = null
    }
    if (provinceLayer.value) {
      map.removeLayer(provinceLayer.value)
      provinceLayer.value = null
    }
    
    // Ibalik sa responsive view instead na fixed coordinates
    adjustMapLayout()
  }

  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionName = feature.properties.name
      const regionPSGC = String(feature.properties.psgc).replace(/^0+/, '')

      // Hover
      layer.on('mouseover', () => {
        if (hoveredLayer.value && hoveredLayer.value !== activeLayer.value) {
          hoveredLayer.value.setStyle(baseStyle)
        }
        if (layer !== activeLayer.value) {
          layer.setStyle(hoverStyle)
          layer.bringToFront()
        }
        hoveredLayer.value = layer
        layer.bindTooltip(regionName, { sticky: true, direction: 'center', className: 'region-tooltip' }).openTooltip()
      })

      // Mouseout
      layer.on('mouseout', () => {
        if (layer !== activeLayer.value) layer.setStyle(baseStyle)
        layer.closeTooltip()
        hoveredLayer.value = null
      })

      // Click
      layer.on('click', async (e) => {
        L.DomEvent.stopPropagation(e)

        if (activeLayer.value) activeLayer.value.setStyle(baseStyle)
        
        // Apply Active Style (Solid Blue Background)
        activeLayer.value = layer
        layer.setStyle(activeStyle)
        layer.bringToFront() 

        // ZOOM LOGIC (Updated padding)
        // Pag nag-zoom sa region, iiwas din tayo sa sidebar kung Desktop
        const width = window.innerWidth
        // Dapat match ito sa laki ng sidebar mo (e.g., 450)
        const sidebarSpace = width > 1024 ? 450 : 20

        map.flyToBounds(layer.getBounds(), { 
          paddingTopLeft: [sidebarSpace, 20], // Iwas sa kaliwa
          paddingBottomRight: [20, 20],
          duration: 0.7 
        })

        if (provinceLayer.value) map.removeLayer(provinceLayer.value)

        try {
          const provincesData = await fetch(
            `/geojson/regions/provdists-region-${regionPSGC}.0.001.json`
          ).then(r => r.json())

          // Add Provinces (Transparent Fill)
          provinceLayer.value = L.geoJSON(provincesData, {
            filter: (feature) => {
              if (!feature.geometry) return false
              // ... (filter logic here if needed) ...
              return true
            },
            
            style: provinceStyle,

            onEachFeature: (pFeature, pLayer) => {
              pLayer.bindTooltip(pFeature.properties.name, { sticky: true })
            }
          }).addTo(map)

        } catch (err) {
          console.error(`Province file not found for PSGC ${regionPSGC}`, err)
        }
      })
    }
  }).addTo(map)

  map.on('click', resetView)
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  /* Minus 70px para sa navbar height para di mag scrollbar */
  height: calc(100vh - 70px); 
}

.map {
  width: 100%;
  height: 100%;
  background: #ffffff;
}

:deep(.region-tooltip) {
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  pointer-events: none;
  transition: opacity 0.2s;
}

:deep(.leaflet-interactive:focus) {
  outline: none;
}
</style>