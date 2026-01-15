import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // bind 0.0.0.0 để nginx proxy được
        port: 5173,
        allowedHosts: ['treasure-academy.nguyenduchuynh.com'],
    },
})
