<template>
  <div class="map-container">
    <div id="map" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  const map = L.map('map', {
    center: [12.8797, 121.7740],
    zoom: 6,
    minZoom: 5,
    maxZoom: 12,
    zoomControl: true
  })

  // Load regions GeoJSON
  const regionsData = await fetch('/ph.json').then(r => r.json())

  let provinceLayer = null
  let activeLayer = null

  const baseStyle = {
    color: '#ffffff',
    weight: 2,
    fillColor: '#e5e7eb', // light gray default
    fillOpacity: 0.6
  }

  const activeStyle = {
    fillColor: '#2563eb',
    fillOpacity: 0.8
  }

  // Add regions layer
  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionPSGC = String(feature.properties.psgc).replace(/^0+/, '')

      // Click → zoom to region
      layer.on('click', async () => {
        // Reset previous active
        if (activeLayer) activeLayer.setStyle(baseStyle)
        activeLayer = layer
        layer.setStyle(activeStyle)

        // Smooth zoom
        map.flyToBounds(layer.getBounds(), { padding: [20, 20], duration: 0.7 })

        // Remove old provinces
        if (provinceLayer) map.removeLayer(provinceLayer)

        try {
          const provincesData = await fetch(
            `/geojson/regions/provdists-region-${regionPSGC}.0.001.json`
          ).then(r => r.json())

          provinceLayer = L.geoJSON(provincesData, {
            filter: (feature) => {
              if (!feature.geometry) return false
              const geomType = feature.geometry.type
              const getExtent = (coords) => {
                const lats = coords.map(([lng, lat]) => lat)
                const lngs = coords.map(([lng, lat]) => lng)
                return { latDiff: Math.max(...lats) - Math.min(...lats), lngDiff: Math.max(...lngs) - Math.min(...lngs) }
              }
              if (geomType === 'Polygon') {
                const { latDiff, lngDiff } = getExtent(feature.geometry.coordinates[0])
                if (latDiff > 3 || lngDiff > 3) return false
              }
              if (geomType === 'MultiPolygon') {
                const allCoords = feature.geometry.coordinates.flat(2)
                const { latDiff, lngDiff } = getExtent(allCoords)
                if (latDiff > 3 || lngDiff > 3) return false
              }
              return true
            },
            style: {
              color: '#1D4ED8',
              fillColor: '#60A5FA',
              fillOpacity: 0.6,
              weight: 2
            },
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
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}

.map {
  width: 100%;
  height: 100%;
  background: #ffffff;
}
</style>
