import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ブラウザが JS や CSS を探しに行けるように、公開URLのルートを指定します
  base: '/html_utils/',
})
