import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The source icon already has its own background and padding.
const bg = { background: '#0A0B0E' }
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: bg },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: bg },
  },
  images: ['public/icon.svg'],
})
