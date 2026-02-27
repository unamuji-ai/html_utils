// ↓ この 1行目、2行目が必須です！
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // リポジトリ名に合わせてパスを指定
  base: '/html_utils/', 
})