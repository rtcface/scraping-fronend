import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [tailwind(), react()],
  site: 'https://rtcface.github.io', // Reemplaza con tu dominio
  base: 'scraping-fronend', // Ajusta según tu configuración de despliegue
});