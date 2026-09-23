import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

const projectSrc = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
    plugins: [react(), visualizer(), dts({ include: ['src'] })],
    build: {
        lib: {
            entry: {
                minevo3d: 'src/minevo3d.ts',
                ReactMinevo3D: 'src/ReactMinevo3D.tsx',
            },
            formats: ['es', 'cjs'],
            fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            external: ['react', 'react/jsx-runtime', 'three', /^three\//],
        },
    },
    resolve: {
        alias: {
            '@': projectSrc,
        },
    },
});
