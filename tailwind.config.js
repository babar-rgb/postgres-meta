/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Project Nexus "Deep Dark" Palette
                background: '#0A0A0A',
                surface: '#111111',
                border: '#333333',
                subtle: '#888888',
                active: '#222222',
                accent: '#EDEDED', // bright white/gray for active text
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Ensure Inter is loaded or fallback to system sans
            },
        },
    },
    plugins: [],
}
