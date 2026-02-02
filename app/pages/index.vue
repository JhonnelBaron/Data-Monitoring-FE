<template>
  <div class="home-page">
    <LandingHeroSection ref="heroSectionRef" /> 

    <FloatingSearch :mapRef="heroSectionRef?.mapRef" /> 
  </div>
</template>

<script setup>
import { ref } from 'vue'
const heroSectionRef = ref(null)
</script>