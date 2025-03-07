export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // You can add custom gradients here if needed
      gradientColorStops: {
        // For example:
        'indigo-purple': ['#4f46e5', '#7e22ce'],
        'green-dark': ['#22c55e', '#15803d'],
      }
    },
  },
  plugins: [],
}