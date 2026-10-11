// ===== Ocean Soup recipes — edit the list below, then /reload =====
// Anything in this list counts as a soup ingredient (item tag #kubejs:soup_ingredients).
// Modded items work too, e.g. 'farmersdelight:tomato'. Mix and match, repeats are fine (3 carrots works).
const SOUP_INGREDIENTS = [
  // fish
  'minecraft:salmon', 'minecraft:cod', 'minecraft:tropical_fish', 'minecraft:cooked_salmon', 'minecraft:cooked_cod',
  // meat
  'minecraft:beef', 'minecraft:cooked_beef', 'minecraft:porkchop', 'minecraft:cooked_porkchop', 'minecraft:chicken', 'minecraft:cooked_chicken',
  'minecraft:mutton', 'minecraft:cooked_mutton', 'minecraft:rabbit', 'minecraft:cooked_rabbit',
  // veg
  'minecraft:carrot', 'minecraft:potato', 'minecraft:baked_potato', 'minecraft:beetroot', 'minecraft:pumpkin',
  'minecraft:brown_mushroom', 'minecraft:red_mushroom',
  // fruit
  'minecraft:apple', 'minecraft:melon_slice', 'minecraft:sweet_berries', 'minecraft:glow_berries',
  // sea stuff
  'minecraft:kelp', 'minecraft:dried_kelp', 'minecraft:sea_pickle'
]
const SOUP_MIN_INGREDIENTS = 3   // fewest ingredients for the crafting table (and the Create mixer)
const SOUP_MAX_INGREDIENTS = 8   // most (water bucket + 8 = a full 3x3 grid)

ServerEvents.tags('item', event => {
  event.add('kubejs:soup_ingredients', SOUP_INGREDIENTS)
})

ServerEvents.recipes(event => {
  // Crafting table: water bucket + 3..8 soup ingredients, any arrangement -> bucket of Ocean Soup.
  // The water bucket becomes the soup bucket, so no empty bucket is left behind in the grid.
  for (let n = SOUP_MIN_INGREDIENTS; n <= SOUP_MAX_INGREDIENTS; n++) {
    let ins = ['minecraft:water_bucket']
    for (let k = 0; k < n; k++) ins.push('#kubejs:soup_ingredients')
    event.shapeless('kubejs:ocean_soup_bucket', ins)
      .replaceIngredient('minecraft:water_bucket', 'minecraft:air')
      .id('kubejs:ocean_soup_bucket_' + n)
  }

  // Create mixer (only when Create is installed): heated basin + 1 bucket of water + soup ingredients.
  if (Platform.isLoaded('create')) {
    let BUCKET = Platform.isFabric() ? 81000 : 1000
    let ins = [{ fluid: 'minecraft:water', amount: BUCKET }]
    for (let k = 0; k < SOUP_MIN_INGREDIENTS; k++) ins.push({ tag: 'kubejs:soup_ingredients' })
    event.custom({
      type: 'create:mixing',
      heatRequirement: 'heated',
      ingredients: ins,
      results: [{ fluid: 'kubejs:ocean_soup', amount: BUCKET }]
    }).id('kubejs:ocean_soup_mixing')
  }
})
