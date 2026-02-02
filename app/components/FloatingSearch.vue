<template>
  <div class="search-system">
    <Transition name="fade-scale">
      <div v-if="!isSearchActive" class="floating-container">
        <button class="fab-button no-circle" @click="openSearch">
          <iframe 
            src="https://lottie.host/embed/558329b6-1cb6-4323-9bec-3328c7845c36/b8PdF9GeGw.lottie"
            class="lottie-frame"
          ></iframe>
          <span class="tooltip">Search</span>
        </button>
      </div>
    </Transition>

    <Transition name="slide-down">
      <div v-if="isSearchActive" class="search-bar-standalone">
        <div class="search-modal">
          <div class="search-input-box">
            <span class="icon">🔍</span>
            <input 
              ref="searchInput"
              v-model="searchQuery"
              type="text" 
              placeholder="Search region, province, city, or director..."
              @keyup.esc="closeSearch"
              @blur="handleBlur"
              @keydown.down.prevent="moveSelection('down')"
              @keydown.up.prevent="moveSelection('up')"
              @keydown.enter.prevent="confirmSelection"
            />
            <button class="esc-tag" @click="closeSearch">CLOSE</button>
          </div>

          <div v-if="searchQuery && filteredResults.length > 0" class="results-list">
            <div 
              v-for="(result, index) in filteredResults" 
              :key="index" 
              class="result-item"
              :class="{ 'is-selected': index === selectedIndex }"
              @click="selectResult(result)"
              @mouseenter="selectedIndex = index"
            >
              <div class="result-info">
                <span class="result-name">{{ result.name }}</span>
                <span class="result-area">{{ result.area }}</span>
              </div>
              <span class="result-category">{{ result.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
const selectedIndex = ref(-1)
const isSearchActive = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const heroStore = useHeroStore()
const props = defineProps(['mapRef']) // Siguraduhin na pinapasa mo yung ref ng map

const searchData = computed(() => {
  // Kunin ang data mula sa map component + dummy directors
  const mapPlaces = props.mapRef?.allSearchablePlaces || []
  
  const directors = [
    { category: 'Regional Director', name: 'Atty. Juan Dela Cruz', area: 'Region IV-A', coords: [14.1008, 121.0794] }
  ]

  return [...mapPlaces, ...directors]
})

const filteredResults = computed(() => {
  if (!searchQuery.value) return []
  
  return props.mapRef.allSearchablePlaces.filter(place => {
    // SIGURADUHIN NA MAY NAME ANG PLACE BAGO I-FILTER
    if (!place || !place.name) return false 
    
    return place.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  })
})
// const searchData = ref([
//   { category: 'Region', name: 'NCR', area: 'Metro Manila', coords: [14.5995, 120.9842] },
//   { category: 'Region', name: 'Region IV-A', area: 'CALABARZON', coords: [14.1008, 121.0794] },
//   { category: 'City', name: 'Taguig City', area: 'NCR', coords: [14.5176, 121.0509] },
//   { category: 'Regional Director', name: 'Atty. Juan Dela Cruz', area: 'Region IV-A', coords: [14.1008, 121.0794] }
// ])

// const filteredResults = computed(() => {
//   if (!searchQuery.value) return []
//   const query = searchQuery.value.toLowerCase()
//   return searchData.value.filter(item => 
//     item.name.toLowerCase().includes(query) || 
//     item.area.toLowerCase().includes(query)
//   ).slice(0, 5)
// })

const openSearch = async () => {
  isSearchActive.value = true
  await nextTick()
  searchInput.value?.focus()
}

const closeSearch = () => {
  isSearchActive.value = false
  searchQuery.value = ''
}

// Opsyonal: Isasara ang search pag clinick sa labas
const handleBlur = (e) => {
  // Check if hindi sa result-item nag click
  setTimeout(() => {
    if (!searchQuery.value) closeSearch()
  }, 200)
}

const selectResult = (result) => {
  // logic: Kung director ang sinearch, ang "locationName" na ididisplay 
  // sa Hero ay dapat yung 'area' (e.g. Region IV-A)
  const displayName = result.category === 'Regional Director' ? result.area : result.name
  
  // I-update ang store
  heroStore.drillDown(
    displayName, 
    result.category.toLowerCase(), 
    null, 
    result.coords
  )
  
  closeSearch()
}
watch(searchQuery, () => {
  selectedIndex.value = -1
})

const moveSelection = (direction) => {
  if (filteredResults.value.length === 0) return

  if (direction === 'down') {
    selectedIndex.value = (selectedIndex.value + 1) % filteredResults.value.length
  } else if (direction === 'up') {
    selectedIndex.value = (selectedIndex.value - 1 + filteredResults.value.length) % filteredResults.value.length
  }
}

const confirmSelection = () => {
  if (selectedIndex.value >= 0 && filteredResults.value[selectedIndex.value]) {
    selectResult(filteredResults.value[selectedIndex.value])
  }
}

</script>

<style scoped>
/* --- FAB BUTTON --- */
.floating-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
}
.fab-button.no-circle {
  width: 80px; height: 80px;
  background: transparent; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.lottie-frame { width: 100%; height: 100%; border: none; pointer-events: none; }

/* --- STANDALONE SEARCH BAR (WALANG BG OVERLAY) --- */
.search-bar-standalone {
  position: fixed;
  top: 80px; /* Distansya mula sa itaas */
  left: 50%;
  transform: translateX(-50%); /* I-center horizontally */
  width: 90%;
  max-width: 600px;
  z-index: 10001; /* Mas mataas sa lahat */
  pointer-events: auto;
}

.search-input-box {
  display: flex;
  align-items: center;
  /* Glassmorphism Effect */
  background: rgba(255, 255, 255, 0.9); 
  backdrop-filter: blur(10px);
  
  padding: 14px 28px;
  border-radius: 100px; /* Perfect Pill Shape */
  
  /* Mas modernong border (sobrang nipis) */
  border: 1px solid rgba(0, 51, 160, 0.1);
  
  /* Soft, colored glow shadow */
  box-shadow: 
    0 10px 25px -5px rgba(0, 51, 160, 0.1),
    0 8px 10px -6px rgba(0, 51, 160, 0.1);
    
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-input-box:focus-within {
  transform: scale(1.02);
  background: white;
  border-color: rgba(0, 51, 160, 0.4);
  box-shadow: 0 20px 40px -10px rgba(0, 51, 160, 0.15);
}
.search-input-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1.1rem;
  font-weight: 500;
  color: #0033a0;
  letter-spacing: -0.01em; /* Modern typography spacing */
}

/* --- RESULTS LIST --- */
.results-list {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  margin-top: 12px;
  border-radius: 24px; /* Mas rounded */
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 15px 35px rgba(0, 51, 160, 0.1);
}

.result-item {
  padding: 14px 20px;
  border-radius: 16px; /* Bawat item ay rounded din */
  transition: all 0.2s ease;
  border-bottom: none; /* Alisin ang lines sa pagitan */
  margin-bottom: 2px;
}

.result-item:hover {
  background: #f0f4ff;
  transform: translateX(5px); /* Swabe na usog pakanan sa hover */
}
.result-name { display: block; font-weight: 600; color: #0033a0; font-size: 0.9rem; }
.result-area { font-size: 0.75rem; color: #64748b; }
.result-category { font-size: 0.65rem; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

.esc-tag { background: #f1f5f9; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.6rem; color: #64748b; cursor: pointer; }

/* --- TRANSITIONS --- */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translate(-50%, -20px); }

.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.3s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.5); }

.tooltip { position: absolute; right: 85px; background: #0033a0; color: white; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; opacity: 0; transition: 0.3s; pointer-events: none; }
.fab-button:hover .tooltip { opacity: 1; }


.icon {
  font-size: 1.2rem;
  filter: grayscale(1);
  transition: all 0.3s ease;
}

.search-input-box:focus-within .icon {
  filter: grayscale(0); /* Babalik ang kulay pag nag-type ka na */
  transform: rotate(-10deg);
}

/* Sa <style scoped> */
.result-item.is-selected {
  background: #0033a0; /* Gawin nating blue para halata */
  transform: translateX(10px);
}

.result-item.is-selected .result-name {
  color: white;
}

.result-item.is-selected .result-area {
  color: rgba(255, 255, 255, 0.8);
}

.result-item.is-selected .result-category {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
</style>