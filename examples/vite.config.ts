import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

const projectSrc = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
    root: __dirname,
    plugins: [react(), tailwindcss(), visualizer()],
    resolve: {
        alias: {
            '@': projectSrc,
        },
    },
});
