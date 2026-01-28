<template>
  <div class="map-container">
    <div id="map-osm" class="map"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue'

const mapInstance = shallowRef(null)
const provinceLayer = shallowRef(null)
const muniCityLayer = shallowRef(null)
const bgyLayer = shallowRef(null) // NEW: For Barangay level
const hoveredLayer = shallowRef(null)
const activeLayer = shallowRef(null) // This is for Region
const activeProvince = shallowRef(null) // NEW
const activeMuni = shallowRef(null) // NEW


const phBounds = [
  [4.5, 116.8], 
  [21.4, 110.0] 
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
    // activeLayer.value = null;
    activeProvince.value = null;
    activeMuni.value = null;

    if (activeLayer.value) {
      activeLayer.value.setStyle(baseStyle)
      activeLayer.value = null
    }
    if (provinceLayer.value) {
      map.removeLayer(provinceLayer.value)
      provinceLayer.value = null
    }
    if (muniCityLayer.value) {
      map.removeLayer(muniCityLayer.value)
      muniCityLayer.value = null
    }
    if (bgyLayer.value) {
    map.removeLayer(bgyLayer.value);
    bgyLayer.value = null;
  }
    adjustMapLayout()
  }

  L.geoJSON(regionsData, {
    style: baseStyle,
    onEachFeature: (feature, layer) => {
      const regionName = feature.properties.adm1_en;
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
        
        if (provinceLayer.value) {
          map.removeLayer(provinceLayer.value);
          provinceLayer.value = null;
        }
        if (muniCityLayer.value) {
          map.removeLayer(muniCityLayer.value);
          muniCityLayer.value = null;
        }
        if (bgyLayer.value) {
          map.removeLayer(bgyLayer.value);
          bgyLayer.value = null;
        }
        
        activeLayer.value = layer
        layer.setStyle(activeStyle)

        const width = window.innerWidth
        const pushToRightOffset = width > 1024 ? width * 0.6 : 20;

        map.flyToBounds(layer.getBounds(), { 
          paddingTopLeft: [pushToRightOffset, 50],
          paddingBottomRight: [20, 20],
          duration: 1 
        })

        if (provinceLayer.value) map.removeLayer(provinceLayer.value)

        // ... inside your layer.on('click', ...) logic
        try {
          const provincesData = await fetch(
            `/geojson/regions/provdists-region-${regionPSGC}.0.001.json`
          ).then(r => r.json())

          provinceLayer.value = L.geoJSON(provincesData, {
            style: {
              // color: '#ef4444',
              // weight: 1.5,
              // fillColor: '#ee3124',
              // fillOpacity: 0.01 // CRITICAL: Makes the area "hittable" by the mouse
              color: 'transparent',  // 1. INVISIBLE BORDERS: Ine-erase nito yung guhit
              weight: 0,             // 2. NO WIDTH: Tinatanggal yung kapal ng border
              fillColor: '#ee3124',  // TESDA Red (used for hover)
              fillOpacity: 0.01
            },
            onEachFeature: (pFeature, pLayer) => {
              const provinceName = pFeature.properties.adm2_en || pFeature.properties.name;
              const provincePSGC = String(pFeature.properties.adm2_psgc).replace(/^0+/, ''); // Para sa file name
              pLayer.bindTooltip(provinceName, { 
                sticky: true, 
                direction: 'top',
                className: 'province-tooltip'
              });
                // Hover Effect
              pLayer.on('mouseover', (e) => {
                if (pLayer !== activeProvince.value) { // Block hover if Province is active
                    L.DomEvent.stopPropagation(e);
                    pLayer.setStyle({ fillOpacity: 0.3, weight: 2 });
                    pLayer.bringToFront();
                  }
              });

              pLayer.on('mouseout', () => {
                pLayer.setStyle({
                  fillOpacity: 0.01,
                  weight: 1.5
                });
              });
              // --- NEW: CLICK PROVINCE TO LOAD MUNICIPALITIES ---
                pLayer.on('click', async (pe) => {
                  activeProvince.value = pLayer;
                  L.DomEvent.stopPropagation(pe); // Wag trigger ang region click
                  
                  if (muniCityLayer.value) {
                    map.removeLayer(muniCityLayer.value);
                    muniCityLayer.value = null;
                  }
                  if (bgyLayer.value) {
                    map.removeLayer(bgyLayer.value);
                    bgyLayer.value = null;
                  }

                  // Zoom sa province
                  const width = window.innerWidth;
                  // Compute sidebar space (matching your region click logic)
                  const pushToRightOffset = width > 1024 ? width * 0.6 : 20;


                  // FIXED: Added paddingTopLeft to offset the sidebar
                  map.flyToBounds(pLayer.getBounds(), { 
                    paddingTopLeft: [pushToRightOffset, 50], 
                    paddingBottomRight: [20, 20],
                    duration: 1 
                  });

                  try {
                    const muniData = await fetch(
                      `/geojson/province/municities-provdist-${provincePSGC}.0.001.json`
                    ).then(r => r.json());

                    // Burahin ang lumang province layer para hindi magulo (Optional)
                    // O kaya ay gumawa ng bagong muniCityLayer ref sa taas
                    if (muniCityLayer.value) map.removeLayer(muniCityLayer.value);

                    muniCityLayer.value = L.geoJSON(muniData, {
                      style: {
                        color: '#1e3a8a', // Blue lines for municipalities
                        weight: 1,
                        fillColor: '#3b82f6',
                        fillOpacity: 0.1
                      },
                      onEachFeature: (mFeature, mLayer) => {
                        // Ginamit ang adm3_en base sa sample data mo
                        const muniName = mFeature.properties.adm3_en;
                        const muniPSGC = String(mFeature.properties.adm3_psgc).replace(/^0+/, ''); // For Barangay file lookup
                        mLayer.bindTooltip(muniName, { sticky: true });

                        mLayer.on('mouseover', () => {
                          if (mLayer !== activeMuni.value) { // Block hover if Muni is active
                            mLayer.setStyle({ fillOpacity: 0.4, weight: 2 });
                          }
                        });
                        mLayer.on('mouseout', () => {
                          mLayer.setStyle({ fillOpacity: 0.1, weight: 1 });
                        });

                        // --- NEW: CLICK MUNICIPALITY TO LOAD BARANGAYS ---
                        mLayer.on('click', async (me) => {
                          activeMuni.value = mLayer;
                          L.DomEvent.stopPropagation(me);
                            if (muniCityLayer.value) {
                              map.removeLayer(muniCityLayer.value);
                              muniCityLayer.value = null;
                            }
                            if (bgyLayer.value) {
                              map.removeLayer(bgyLayer.value);
                              bgyLayer.value = null;
                            }
                          const width = window.innerWidth;
                          const pushToRightOffset = width > 1024 ? width * 0.6 : 20;

                          // Zoom into the Municipality
                          map.flyToBounds(mLayer.getBounds(), {
                            paddingTopLeft: [pushToRightOffset, 50],
                            paddingBottomRight: [20, 20],
                            duration: 1
                          });

                          // Cleanup old Barangay layer if switching munis
                          if (bgyLayer.value) map.removeLayer(bgyLayer.value);

                          try {
                            const bgyData = await fetch(
                              `/geojson/municities/bgysubmuns-municity-${muniPSGC}.0.001.json`
                            ).then(r => r.json());

                            bgyLayer.value = L.geoJSON(bgyData, {
                              style: {
                                color: '#065f46', // Emerald/Green for Barangays
                                weight: 0.8,
                                fillColor: '#10b981',
                                fillOpacity: 0.1
                              },
                              onEachFeature: (bFeature, bLayer) => {
                                // Using adm4_en as per your sample data
                                const bgyName = bFeature.properties.adm4_en;
                                bLayer.bindTooltip(bgyName, { sticky: true });

                                bLayer.on('mouseover', () => {
                                  bLayer.setStyle({ fillOpacity: 0.4, weight: 1.5 });
                                });
                                bLayer.on('mouseout', () => {
                                  bLayer.setStyle({ fillOpacity: 0.1, weight: 0.8 });
                                });
                              }
                            }).addTo(map);

                            bgyLayer.value.bringToFront();

                          } catch (err) {
                            console.error(`Barangay file not found for PSGC: ${muniPSGC}`, err);
                          }
                        });
                      }
                    })
                    .addTo(map);

                    muniCityLayer.value.bringToFront();

                  } catch (err) {
                    console.error(`Municipality file not found for PSGC: ${provincePSGC}`, err);
                  }
                });
            }
          }).addTo(map);

          // CRITICAL: Ensure provinces are above the regions
          provinceLayer.value.bringToFront();

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
</style>