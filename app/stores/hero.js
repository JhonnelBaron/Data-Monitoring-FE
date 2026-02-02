import { defineStore } from 'pinia'

export const useHeroStore = defineStore('hero', {
  state: () => ({
    locationName: 'TVET National Overview',
    currentLevel: 'national', // national, region, province, city
    searchTarget: null,
    stats: {
      regions: 17,
      provinces: 88,
      districts: 253,
      cities: 146,
      municities: 1489,
      barangays: 41464,
      clients: 35327005
    }
  }),
  
  actions: {
    // Tawagin ito sa OpenStreet.vue click
    drillDown(name, level, newStats, coords = null) {
      this.locationName = name
      this.currentLevel = level

      if (coords) {
        this.searchTarget = coords
      }
      
      // Dummy logic: random numbers based on level
      if (newStats) {
        this.stats = { ...this.stats, ...newStats }
      } else {
        // Mock data update para gumalaw ang counters
        this.stats = {
          regions: level === 'national' ? 17 : 0,
          provinces: level === 'region' ? 5 : (level === 'national' ? 88 : 1),
          districts: Math.floor(Math.random() * 10) + 1,
          cities: Math.floor(Math.random() * 5) + 1,
          municities: Math.floor(Math.random() * 20) + 5,
          barangays: Math.floor(Math.random() * 100) + 50,
          clients: Math.floor(Math.random() * 500000) + 100000
        }
      }
    },
    
    resetToNational() {
      this.searchTarget = null
      this.drillDown('TVET National Overview', 'national', {
        regions: 17, provinces: 88, districts: 253,
        cities: 146, municities: 1489, barangays: 41464, clients: 35327005
      })
    }
  }
})