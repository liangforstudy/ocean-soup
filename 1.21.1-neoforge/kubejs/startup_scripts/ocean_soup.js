StartupEvents.registry('fluid', event => {
  event.create('ocean_soup')
    .displayName('Ocean Soup')
    .stillTexture('kubejs:block/ocean_soup_still')
    .flowingTexture('kubejs:block/ocean_soup_flow')
    .tint(0xFFFFFF)   // KubeJS 7 (NeoForge 1.21.1) renamed .color() to .tint()
})
