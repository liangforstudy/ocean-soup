// Dissolve effect for ocean_soup_spread.js, made with the Soup Texture Bench.
// Lives in kubejs/server_scripts/ - edit here or in the bench, then /reload.
// KubeJS 7: server scripts can't write to 'global', so this is a shared variable instead.
var SOUP_FX = {
  particles: [
    { id: 'minecraft:dust 0.69 0.486 0.259 1.2', count: 20, spread: 0.4, speed: 0.02 },
    { id: 'minecraft:dust 0.478 0.322 0.161 0.8', count: 10, spread: 0.35, speed: 0.02 },
    { id: 'minecraft:item minecraft:carrot', count: 4, spread: 0.3, speed: 0.05 },
    { id: 'minecraft:bubble_pop', count: 8, spread: 0.4, speed: 0.02 },
  ],
  sound: 'minecraft:block.bubble_column.upwards_inside',
  volume: 1,
  pitch: 0.8
}
