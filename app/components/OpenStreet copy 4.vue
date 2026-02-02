<template>
  <div class="map-container">
    <div id="map-osm" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue'
import { useHeroStore } from '@/stores/hero'

const heroStore = useHeroStore()

// --- 1. SHARED STATE (Top-level para ma-access ng lahat ng functions) ---
const mapInstance = shallowRef(null)
const provinceLayer = shallowRef(null)
const muniCityLayer = shallowRef(null)
const bgyLayer = shallowRef(null)
const activeLayer = shallowRef(null)
const activeProvince = shallowRef(null)
const activeMuni = shallowRef(null)

const phBounds = [
  [4.5, 116.8],
  [21.4, 110.0]
]

// Base style para sa regions (invisible but clickable)
const baseStyle = {
  color: 'transparent',
  weight: 1.5,
  fillOpacity: 0,
}

let resizeHandler = null

// --- 2. MAP LOGIC FUNCTIONS (Inilabas sa onMounted para ma-expose) ---

const adjustMapLayout = () => {
  if (!mapInstance.value) return
  const width = window.innerWidth
  const paddingLeft = width > 1024 ? 450 : 0
  mapInstance.value.fitBounds(phBounds, {
    paddingTopLeft: [paddingLeft, 20],
    paddingBottomRight: [20, 20]
  })
}

const resetView = () => {
  heroStore.resetToNational()
  activeProvince.value = null
  activeMuni.value = null

  if (activeLayer.value) {
    activeLayer.value.setStyle(baseStyle)
    activeLayer.value = null
  }

  // Gamitin ang mapInstance.value sa pag-remove ng layers
  if (mapInstance.value) {
    if (provinceLayer.value) {
      mapInstance.value.removeLayer(provinceLayer.value)
      provinceLayer.value = null
    }
    if (muniCityLayer.value) {
      mapInstance.value.removeLayer(muniCityLayer.value)
      muniCityLayer.value = null
    }
    if (bgyLayer.value) {
      mapInstance.value.removeLayer(bgyLayer.value)
      bgyLayer.value = null
    }
    adjustMapLayout()
  }
}

// --- 3. EXPOSE (Dapat nasa top-level) ---
defineExpose({
  resetView
})

// --- 4. LIFECYCLE HOOKS ---

onMounted(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const map = L.map('map-osm', {
    zoomControl: true,
    attributionControl: true,
    zoomSnap: 0.5,
    minZoom: 5,
    maxZoom: 18
  })

  mapInstance.value = map

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

  const hoverStyle = {
    fillColor: '#60a5fa',
    fillOpacity: 0.5
  }

  const activeStyle = {
    fillColor: 'transparent',
    fillOpacity: 0.4,
    weight: 3,
    color: '#1e3a8a'
  }

  adjustMapLayout()

  resizeHandler = () => {
    if (!activeLayer.value) adjustMapLayout()
  }
  window.addEventListener('resize', resizeHandler)

  // Initial Regions Layer
  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionName = feature.properties.adm1_en
      const regionPSGC = String(feature.properties.adm1_psgc).replace(/^0+/, '')

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
        
        heroStore.drillDown(regionName, 'region')

        // Clean up existing sub-layers
        if (provinceLayer.value) { map.removeLayer(provinceLayer.value); provinceLayer.value = null }
        if (muniCityLayer.value) { map.removeLayer(muniCityLayer.value); muniCityLayer.value = null }
        if (bgyLayer.value) { map.removeLayer(bgyLayer.value); bgyLayer.value = null }
        
        activeLayer.value = layer
        layer.setStyle(activeStyle)

        const width = window.innerWidth
        const pushToRightOffset = width > 1024 ? width * 0.6 : 20

        map.flyToBounds(layer.getBounds(), { 
          paddingTopLeft: [pushToRightOffset, 50],
          paddingBottomRight: [20, 20],
          duration: 1 
        })

        try {
          const provincesData = await fetch(`/geojson/regions/provdists-region-${regionPSGC}.0.001.json`).then(r => r.json())

          provinceLayer.value = L.geoJSON(provincesData, {
            style: {
              color: 'transparent',
              weight: 0,
              fillColor: '#ee3124',
              fillOpacity: 0.01
            },
            onEachFeature: (pFeature, pLayer) => {
              const provinceName = pFeature.properties.adm2_en || pFeature.properties.name
              const provincePSGC = String(pFeature.properties.adm2_psgc).replace(/^0+/, '')
              
              pLayer.bindTooltip(provinceName, { 
                sticky: true, 
                direction: 'top',
                className: 'province-tooltip'
              })

              pLayer.on('mouseover', (e) => {
                if (pLayer !== activeProvince.value) {
                  L.DomEvent.stopPropagation(e)
                  pLayer.setStyle({ fillOpacity: 0.3, weight: 2 })
                  pLayer.bringToFront()
                }
              })

              pLayer.on('mouseout', () => {
                pLayer.setStyle({ fillOpacity: 0.01, weight: 1.5 })
              })

              pLayer.on('click', async (pe) => {
                activeProvince.value = pLayer
                L.DomEvent.stopPropagation(pe)
                heroStore.drillDown(provinceName, 'province')
                
                if (muniCityLayer.value) { map.removeLayer(muniCityLayer.value); muniCityLayer.value = null }
                if (bgyLayer.value) { map.removeLayer(bgyLayer.value); bgyLayer.value = null }

                const width = window.innerWidth
                const pushToRightOffset = width > 1024 ? width * 0.6 : 20

                map.flyToBounds(pLayer.getBounds(), { 
                  paddingTopLeft: [pushToRightOffset, 50], 
                  paddingBottomRight: [20, 20],
                  duration: 1 
                })

                try {
                  const muniData = await fetch(`/geojson/province/municities-provdist-${provincePSGC}.0.001.json`).then(r => r.json())

                  muniCityLayer.value = L.geoJSON(muniData, {
                    style: {
                      color: '#1e3a8a',
                      weight: 1,
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1
                    },
                    onEachFeature: (mFeature, mLayer) => {
                      const muniName = mFeature.properties.adm3_en
                      const muniPSGC = String(mFeature.properties.adm3_psgc).replace(/^0+/, '')
                      mLayer.bindTooltip(muniName, { sticky: true })

                      mLayer.on('mouseover', () => {
                        if (mLayer !== activeMuni.value) {
                          mLayer.setStyle({ fillOpacity: 0.4, weight: 2 })
                        }
                      })
                      mLayer.on('mouseout', () => {
                        mLayer.setStyle({ fillOpacity: 0.1, weight: 1 })
                      })

                      mLayer.on('click', async (me) => {
                        activeMuni.value = mLayer
                        L.DomEvent.stopPropagation(me)
                        heroStore.drillDown(muniName, 'city')

                        if (bgyLayer.value) { map.removeLayer(bgyLayer.value); bgyLayer.value = null }

                        const width = window.innerWidth
                        const pushToRightOffset = width > 1024 ? width * 0.6 : 20

                        map.flyToBounds(mLayer.getBounds(), {
                          paddingTopLeft: [pushToRightOffset, 50],
                          paddingBottomRight: [20, 20],
                          duration: 1
                        })

                        try {
                          const bgyData = await fetch(`/geojson/municities/bgysubmuns-municity-${muniPSGC}.0.001.json`).then(r => r.json())

                          bgyLayer.value = L.geoJSON(bgyData, {
                            style: {
                              color: '#065f46',
                              weight: 0.8,
                              fillColor: '#10b981',
                              fillOpacity: 0.1
                            },
                            onEachFeature: (bFeature, bLayer) => {
                              const bgyName = bFeature.properties.adm4_en
                              bLayer.bindTooltip(bgyName, { sticky: true })

                              bLayer.on('mouseover', () => {
                                bLayer.setStyle({ fillOpacity: 0.4, weight: 1.5 })
                              })
                              bLayer.on('mouseout', () => {
                                bLayer.setStyle({ fillOpacity: 0.1, weight: 0.8 })
                              })
                              bLayer.on('click', (be) => {
                                L.DomEvent.stopPropagation(be)
                                heroStore.drillDown(bgyName, 'barangay')
                              })
                            }
                          }).addTo(map)
                          bgyLayer.value.bringToFront()
                        } catch (err) {
                          console.error(`Barangay file not found for PSGC: ${muniPSGC}`, err)
                        }
                      })
                    }
                  }).addTo(map)
                  muniCityLayer.value.bringToFront()
                } catch (err) {
                  console.error(`Municipality file not found for PSGC: ${provincePSGC}`, err)
                }
              })
            }
          }).addTo(map)
          provinceLayer.value.bringToFront()
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

:deep(.province-tooltip) {
  background: rgba(30, 41, 59, 0.9);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-weight: 600;
}

/* .hero-section-container {
  pointer-events: none;
} */

/* Ang mga buttons at text boxes lang ang dapat clickable */
/* .content-box, .back-button, .search-bar {
  pointer-events: auto;
} */
</style>