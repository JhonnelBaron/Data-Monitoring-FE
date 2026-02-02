<template>
  <div class="map-container">
    <div id="map" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue'

const mapInstance = shallowRef(null)
const provinceLayer = shallowRef(null)
const muniCityLayer = shallowRef(null)
const bgyLayer = shallowRef(null)
const activeLayer = shallowRef(null)      // Region
const activeProvince = shallowRef(null)   // Province
const activeMuni = shallowRef(null)       // Municipality

const phBounds = [[4.5, 116.8], [21.4, 110.0]]
let resizeHandler = null

onMounted(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.5,
    minZoom: 5,
    maxZoom: 15
  })

  mapInstance.value = map
  const regionsData = await fetch('/geojson/country/country.json').then(r => r.json())

  const baseStyle = { color: '#ffffff', weight: 1, fillColor: '#e5e7eb', fillOpacity: 1 }
  const hoverStyle = { fillColor: '#60a5fa', fillOpacity: 1 }
  const activeStyle = { fillColor: '#60a5fa', fillOpacity: 1, weight: 2, color: '#1e3a8a' }

  const adjustMapLayout = () => {
    const width = window.innerWidth
    const paddingLeft = width > 1024 ? 450 : 0
    map.fitBounds(phBounds, { paddingTopLeft: [paddingLeft, 0], paddingBottomRight: [0, 0] })
  }

  adjustMapLayout()
  resizeHandler = () => { if (!activeLayer.value) adjustMapLayout() }
  window.addEventListener('resize', resizeHandler)

  const resetView = () => {
    activeProvince.value = null
    activeMuni.value = null
    if (activeLayer.value) { activeLayer.value.setStyle(baseStyle); activeLayer.value = null }
    if (provinceLayer.value) { map.removeLayer(provinceLayer.value); provinceLayer.value = null }
    if (muniCityLayer.value) { map.removeLayer(muniCityLayer.value); muniCityLayer.value = null }
    if (bgyLayer.value) { map.removeLayer(bgyLayer.value); bgyLayer.value = null }
    adjustMapLayout()
  }

  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionName = feature.properties.name || feature.properties.adm1_en
      const regionPSGC = String(feature.properties.psgc || feature.properties.adm1_psgc).replace(/^0+/, '')

      layer.on('mouseover', () => {
        if (layer !== activeLayer.value) {
          layer.setStyle(hoverStyle).bringToFront()
          layer.bindTooltip(regionName, { sticky: true, className: 'region-tooltip' }).openTooltip()
        }
      })

      layer.on('mouseout', () => { if (layer !== activeLayer.value) layer.setStyle(baseStyle); layer.closeTooltip() })

      layer.on('click', async (e) => {
        L.DomEvent.stopPropagation(e)
        if (activeLayer.value) activeLayer.value.setStyle(baseStyle)
        
        // Reset hierarchy
        if (provinceLayer.value) map.removeLayer(provinceLayer.value)
        if (muniCityLayer.value) map.removeLayer(muniCityLayer.value)
        if (bgyLayer.value) map.removeLayer(bgyLayer.value)
        activeProvince.value = null; activeMuni.value = null

        activeLayer.value = layer
        layer.setStyle(activeStyle)

        const sidebarSpace = window.innerWidth > 1024 ? 450 : 20
        map.flyToBounds(layer.getBounds(), { paddingTopLeft: [sidebarSpace, 20], duration: 0.7 })

        try {
          const provData = await fetch(`/geojson/regions/provdists-region-${regionPSGC}.0.001.json`).then(r => r.json())
          provinceLayer.value = L.geoJSON(provData, {
            style: { color: '#333', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.1 },
            onEachFeature: (pFeature, pLayer) => {
              const pName = pFeature.properties.name || pFeature.properties.adm2_en
              const pPSGC = String(pFeature.properties.adm2_psgc || pFeature.properties.psgc).replace(/^0+/, '')
              pLayer.bindTooltip(pName, { sticky: true })

              pLayer.on('mouseover', (pe) => {
                if (pLayer !== activeProvince.value) {
                  L.DomEvent.stopPropagation(pe)
                  pLayer.setStyle({ fillOpacity: 0.4, weight: 2 }).bringToFront()
                }
              })
              pLayer.on('mouseout', () => pLayer.setStyle({ fillOpacity: 0.1, weight: 1.5 }))

              pLayer.on('click', async (pe) => {
                L.DomEvent.stopPropagation(pe)
                activeProvince.value = pLayer
                if (muniCityLayer.value) map.removeLayer(muniCityLayer.value)
                activeMuni.value = null

                map.flyToBounds(pLayer.getBounds(), { paddingTopLeft: [sidebarSpace, 20], duration: 0.7 })

                const mData = await fetch(`/geojson/province/municities-provdist-${pPSGC}.0.001.json`).then(r => r.json())
                muniCityLayer.value = L.geoJSON(mData, {
                  style: { color: '#1e3a8a', weight: 1, fillColor: '#1e40af', fillOpacity: 0.1 },
                  onEachFeature: (mFeature, mLayer) => {
                    const mName = mFeature.properties.adm3_en || mFeature.properties.name
                    const mPSGC = String(mFeature.properties.adm3_psgc).replace(/^0+/, '')
                    mLayer.bindTooltip(mName, { sticky: true })

                    mLayer.on('mouseover', () => { if (mLayer !== activeMuni.value) mLayer.setStyle({ fillOpacity: 0.4, weight: 2 }) })
                    mLayer.on('mouseout', () => mLayer.setStyle({ fillOpacity: 0.1, weight: 1 }))

                    mLayer.on('click', async (me) => {
                      L.DomEvent.stopPropagation(me)
                      activeMuni.value = mLayer
                      if (bgyLayer.value) map.removeLayer(bgyLayer.value)
                      map.flyToBounds(mLayer.getBounds(), { paddingTopLeft: [sidebarSpace, 20], duration: 0.7 })

                      const bData = await fetch(`/geojson/municities/bgysubmuns-municity-${mPSGC}.0.001.json`).then(r => r.json())
                      bgyLayer.value = L.geoJSON(bData, {
                        style: { color: '#065f46', weight: 0.8, fillColor: '#10b981', fillOpacity: 0.2 },
                        onEachFeature: (bFeat, bLayer) => bLayer.bindTooltip(bFeat.properties.adm4_en, { sticky: true })
                      }).addTo(map)
                    })
                  }
                }).addTo(map)
              })
            }
          }).addTo(map)
        } catch (err) { console.error(err) }
      })
    }
  }).addTo(map)

  map.on('click', resetView)
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