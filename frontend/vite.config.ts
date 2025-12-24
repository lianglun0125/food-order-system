import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // 改回標準的套件

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 將 xlsx 單獨打包，因為它體積較大
          'vendor-xlsx': ['xlsx'],
          // 將 react 相關核心套件打包在一起
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 將圖示庫單獨打包
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
})