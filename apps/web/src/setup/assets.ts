export default async function setupAssets() {
  await Promise.all([
    import('@unocss/reset/tailwind.css'),
    import('element-plus/dist/index.css'),
    import('element-plus/theme-chalk/dark/css-vars.css'),
    import('virtual:uno.css'),
    import('@/assets/scss/index.scss'),
    import('@/assets/scss/override.css'),
  ])
}
