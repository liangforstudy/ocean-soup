// Ocean Soup: dilution + spread
// KubeJS 7 already has a built-in 'BlockPos', so ours gets its own name
const SoupBlockPos = Java.loadClass('net.minecraft.core.BlockPos')

// Settings from ocean_soup_fx.js (null if that file is missing)
function soupFxFile() { try { if (typeof SOUP_FX !== 'undefined' && SOUP_FX) return SOUP_FX } catch (err) {} return null }

let SOUP = 'kubejs:ocean_soup'
const DIM = 'minecraft:overworld'
const PER_TICK = 400          // blocks converted per tick once soup wins
const SEED_RADIUS = 6
const DEBUG = false           // prints soup checks to chat; set false when it works
// ---- Dissolve effect ----
// Normally set by ocean_soup_fx.js (saved from the Soup Texture Bench "Dissolve FX" tab).
// These are only used if that file is missing.
const FX_DEFAULT = {
  particles: [
    { id: 'minecraft:dust 0.69 0.486 0.259 1.2', count: 20, spread: 0.4, speed: 0.02 },
    { id: 'minecraft:dust 0.478 0.322 0.161 0.8', count: 10, spread: 0.35, speed: 0.02 },
    { id: 'minecraft:item minecraft:carrot', count: 4, spread: 0.3, speed: 0.05 },
    { id: 'minecraft:bubble_pop', count: 8, spread: 0.4, speed: 0.02 },
  ],
  sound: 'minecraft:block.bubble_column.upwards_inside', volume: 1, pitch: 0.8
}

// ---- Underwater screen overlay (the brown film when your head is in soup) ----
// Opacity comes from ocean_soup_fx.js (bench "Dissolve FX" tab) when present: 0 = invisible, 255 = solid.
const OVERLAY_DEFAULT = { alpha: 100 }
let overlayShown = {}       // player uuid -> last state sent
let overlayBroken = false
let overlayOverride = -1   // set by /oceansoup overlay, saved with the world; -1 = use ocean_soup_fx.js / default

// KubeJS Painter takes opacity from the colour itself (#AARRGGBB)
function soupOverlayColor(a) { let h = Math.max(0, Math.min(255, Math.round(a))).toString(16).toUpperCase(); return '#' + (h.length < 2 ? '0' + h : h) + 'FFFFFF' }

function soupOverlay(pl, show) {
  let cfg = (soupFxFile() && soupFxFile().overlay) ? soupFxFile().overlay : OVERLAY_DEFAULT
  if (overlayOverride >= 0) cfg = { alpha: overlayOverride }
  if (typeof pl.paint != 'function') return   // KubeJS 7 removed Painter: no brown film, the thick fog still shows
  pl.paint({ soup_overlay: {
    type: 'rectangle', x: 0, y: 0, w: '$screenW', h: '$screenH', alignX: 'left', alignY: 'top',
    texture: 'kubejs:textures/misc/soup_overlay.png', color: soupOverlayColor(cfg.alpha), alpha: cfg.alpha, draw: 'ingame', visible: show
  } })
}

// ---- Drinking the soup (sneak + right-click with a soup bucket, like milk) ----
// Defaults below; /oceansoup food ... changes them per world.
const FOOD_DEFAULT = {
  hunger: 8,          // hunger points restored (20 = full bar; a steak is 8)
  saturation: 0.6,    // saturation modifier, like vanilla food (0.6 = "normal", 1.2 = "good")
  effects: [ { id: 'minecraft:water_breathing', seconds: 30, amplifier: 0 } ]
}
let foodOverride = null

function foodCfg() { return foodOverride || FOOD_DEFAULT }

const ACHIEVE_AT = 5000       // converted blocks before the advancement fires

// Dilution tuning
const BLOCKS_PER_BUCKET = 200 // lakes/ponds: 1 bucket of soup per 200 water blocks
const MEASURE_CAP = 20000     // stop measuring a water body past this size...
const OCEAN_BUCKETS = 256     // ...and treat it as an ocean needing this many buckets

let queue = []
let queued = {}
let parked = {}
let pools = {}                // bodyKey -> { soup, need }
let converted = 0
let loadedState = false
let rqueue = []               // revert: soup positions waiting to turn back into water
let rqueued = {}
let rparked = {}
let granted = false           // advancement already handed out (revoke clears it)

let key = (x, y, z) => x + ',' + y + ',' + z
const chunkKey = (x, z) => (x >> 4) + ',' + (z >> 4)
const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]

function isLoaded(level, x, y, z) { return level.isLoaded(new SoupBlockPos(x, y, z)) }

function isWaterSource(level, x, y, z) {
  let b = level.getBlock(x, y, z)
  return b.id == 'minecraft:water' && String(b.properties.level) == '0'
}

function enqueue(x, y, z) {
  let k = key(x, y, z)
  if (queued[k]) return
  queued[k] = true
  queue.push([x, y, z])
}

// Flood-fill the connected water to find its size and a stable id.
function measureBody(level, sx, sy, sz) {
  let seen = {}
  let stack = [[sx, sy, sz]]
  seen[key(sx, sy, sz)] = true
  let count = 0
  let min = [sx, sy, sz]
  while (stack.length > 0) {
    let p = stack.pop()
    count++
    if (count > MEASURE_CAP) return { key: 'ocean', size: -1 }
    if (p[0] < min[0] || (p[0] == min[0] && (p[1] < min[1] || (p[1] == min[1] && p[2] < min[2])))) min = p
    for (let i = 0; i < 6; i++) {
      let x = p[0] + DIRS[i][0], y = p[1] + DIRS[i][1], z = p[2] + DIRS[i][2]
      let k = key(x, y, z)
      if (seen[k]) continue
      seen[k] = true
      if (!isLoaded(level, x, y, z)) return { key: 'ocean', size: -1 } // runs off the map = ocean
      if (isWaterSource(level, x, y, z)) stack.push([x, y, z])
    }
  }
  return { key: 'body@' + key(min[0], min[1], min[2]), size: count }
}

// Walk back through connected soup to find the source block(s) feeding a flow.
function traceSources(level, sx, sy, sz) {
  let seen = {}, stack = [[sx, sy, sz]], sources = [], flows = []
  seen[key(sx, sy, sz)] = true
  while (stack.length > 0 && flows.length < 300) {
    let c = stack.pop()
    let cb = level.getBlock(c[0], c[1], c[2])
    if (cb.id != SOUP) continue
    if (String(cb.properties.level) == '0') { sources.push(c); continue }
    flows.push(c)
    for (let i = 0; i < 6; i++) {
      let nx = c[0] + DIRS[i][0], ny = c[1] + DIRS[i][1], nz = c[2] + DIRS[i][2]
      let nk = key(nx, ny, nz)
      if (seen[nk]) continue
      seen[nk] = true
      stack.push([nx, ny, nz])
    }
  }
  return { sources: sources, flows: flows }
}

function isWater(level, x, y, z) { return level.getBlock(x, y, z).id == 'minecraft:water' }

function fx(server, x, y, z) {
  let cfg = soupFxFile() || FX_DEFAULT
  cfg.particles.forEach(p => server.runCommandSilent(`particle ${p.id} ${x + 0.5} ${y + 0.8} ${z + 0.5} ${p.spread} ${p.spread * 0.75} ${p.spread} ${p.speed} ${p.count} force`))
  if (cfg.sound) server.runCommandSilent(`playsound ${cfg.sound} block @a ${x} ${y} ${z} ${cfg.volume} ${cfg.pitch}`)
}

// Soup source at (x,y,z) touching water at (wx,wy,wz)
function feed(server, level, player, x, y, z, wx, wy, wz, dissolveTo) {
  let body = measureBody(level, wx, wy, wz)
  let need = body.size < 0 ? OCEAN_BUCKETS : Math.max(1, Math.ceil(body.size / BLOCKS_PER_BUCKET))
  let pool = pools[body.key] || (pools[body.key] = { soup: 0, need: need })
  pool.need = need

  if (pool.soup < pool.need) {
    pool.soup++
    level.getBlock(x, y, z).set('minecraft:air')   // scooped out, like picking it up with a bucket; the flow drains on its own
    fx(server, x, y, z)
  }

  let name = body.key == 'ocean' ? 'Ocean' : 'Lake'
  if (pool.soup >= pool.need) {
    player.setStatusMessage(Text.gold(name + ' is now SOUP!'))
    enqueue(wx, wy, wz)
  } else {
    player.setStatusMessage(Text.aqua(name + ': ' + pool.soup + ' / ' + pool.need + ' buckets of soup (scooped up)'))
  }
}

// Minecraft can't save one text value longer than 65535 characters, so long lists are split into parts.
const SAVE_PART = 60000
function putBig(d, k, str) {
  let n = Math.ceil(str.length / SAVE_PART)
  d.putInt(k + '#parts', n)
  for (let i = 0; i < n; i++) d.putString(k + '#' + i, str.substring(i * SAVE_PART, (i + 1) * SAVE_PART))
  try { if (d.contains(k)) d.remove(k) } catch (err) { d.putString(k, '') }   // clear the old single-value format
}
function getBig(d, k, fallback) {
  try {
    let str = ''
    if (d.contains(k + '#parts')) { let n = d.getInt(k + '#parts'); for (let i = 0; i < n; i++) str += d.getString(k + '#' + i) }
    else if (d.contains(k)) str = String(d.getString(k))
    if (!str) return fallback
    return JSON.parse(str)
  } catch (err) {
    console.warn('Ocean Soup: saved ' + k + ' was damaged and has been reset (' + err + ')')
    return fallback
  }
}

function loadState(server) {
  let d = server.persistentData
  parked = getBig(d, 'soupParked', {})
  pools = getBig(d, 'soupPools', {})
  getBig(d, 'soupQueue', []).forEach(e => enqueue(e[0], e[1], e[2]))
  converted = d.getInt('soupConverted')
  rparked = getBig(d, 'soupRParked', {})
  getBig(d, 'soupRQueue', []).forEach(e => renqueue(e[0], e[1], e[2]))
  granted = d.getBoolean('soupGranted')
  overlayOverride = d.contains('soupOverlayAlpha') ? d.getInt('soupOverlayAlpha') : -1
  foodOverride = getBig(d, 'soupFood', null)
  loadedState = true
}

function saveState(server) {
  let d = server.persistentData
  putBig(d, 'soupParked', JSON.stringify(parked))
  putBig(d, 'soupPools', JSON.stringify(pools))
  putBig(d, 'soupQueue', JSON.stringify(queue))
  d.putInt('soupConverted', converted)
  putBig(d, 'soupRParked', JSON.stringify(rparked))
  putBig(d, 'soupRQueue', JSON.stringify(rqueue))
  d.putBoolean('soupGranted', granted)
  d.putInt('soupOverlayAlpha', overlayOverride)
  putBig(d, 'soupFood', JSON.stringify(foodOverride))
}

function renqueue(x, y, z) {
  let k = key(x, y, z)
  if (rqueued[k]) return
  rqueued[k] = true
  rqueue.push([x, y, z])
}

ServerEvents.tick(event => {
  let server = event.server
  let level = server.getLevel(DIM)
  if (!level) return
  if (!loadedState) loadState(server)
  let t = server.tickCount

  // 0. Soup screen overlay for players whose eyes are in soup
  if (!overlayBroken && t % 2 == 0) {
    try {
      server.players.forEach(pl => {
        let eye = pl.level.getBlock(Math.floor(pl.x), Math.floor(pl.getEyeY()), Math.floor(pl.z))
        let inSoup = eye.id == SOUP
        let id = String(pl.uuid)
        if (overlayShown[id] !== inSoup) { soupOverlay(pl, inSoup); overlayShown[id] = inSoup }
      })
    } catch (err) { overlayBroken = true; console.error('Ocean Soup overlay disabled: ' + err) }
  }

  // 1. Soup touching water near players: dissolve it, or start the takeover
  if (t % 10 == 0 && rqueue.length == 0) {   // paused while a revert is running nearby
    server.players.forEach(pl => {
      if (String(pl.level.dimension).indexOf(DIM) < 0) return   // works whether it's 'minecraft:overworld' or ResourceKey[... / minecraft:overworld]
      let px = Math.floor(pl.x), py = Math.floor(pl.y), pz = Math.floor(pl.z)
      for (let x = px - SEED_RADIUS; x <= px + SEED_RADIUS; x++)
        for (let y = py - SEED_RADIUS; y <= py + SEED_RADIUS; y++)
          for (let z = pz - SEED_RADIUS; z <= pz + SEED_RADIUS; z++) {
            let b = level.getBlock(x, y, z)
            if (b.id != SOUP) continue
            if (rparked[chunkKey(x, z)]) continue   // waiting to be reverted, don't scoop it
            if (DEBUG && t % 40 == 0) pl.tell('[soup debug] soup at ' + x + ' ' + y + ' ' + z + ' level=' + b.properties.level)
            let isSource = String(b.properties.level) == '0'
            for (let i = 0; i < 6; i++) {
              let wx = x + DIRS[i][0], wy = y + DIRS[i][1], wz = z + DIRS[i][2]
              if (queued[key(wx, wy, wz)]) break
              if (isSource) {
                if (isWaterSource(level, wx, wy, wz)) { feed(server, level, pl, x, y, z, wx, wy, wz); break }
              } else if (isWater(level, wx, wy, wz)) {
                // Flowing soup reached water: dissolve the source(s) feeding it, wipe the flow
                let tr = traceSources(level, x, y, z)
                // only the source(s) are removed; the flowing soup drains away naturally
                tr.sources.forEach(sp => feed(server, level, pl, sp[0], sp[1], sp[2], wx, wy, wz))
                break
              }
            }
          }
    })
  }

  // 2. Wake parked positions whose chunks are loaded now
  if (t % 40 == 0) {
    Object.keys(parked).forEach(ck => {
      let f = parked[ck][0]
      if (isLoaded(level, f[0], f[1], f[2])) {
        parked[ck].forEach(pp => enqueue(pp[0], pp[1], pp[2]))
        delete parked[ck]
      }
    })
  }

  // 3. Spread
  let budget = PER_TICK
  while (budget-- > 0 && queue.length > 0) {
    let q = queue.shift()
    let x = q[0], y = q[1], z = q[2]
    delete queued[key(x, y, z)]
    if (!isLoaded(level, x, y, z)) {
      let ck = chunkKey(x, z)
      if (!parked[ck]) parked[ck] = []
      parked[ck].push([x, y, z])
      continue
    }
    if (!isWaterSource(level, x, y, z)) continue
    level.getBlock(x, y, z).set(SOUP)
    converted++
    DIRS.forEach(d => enqueue(x + d[0], y + d[1], z + d[2]))
  }

  // 3b. Revert: soup sources back to water, flowing soup to air
  if (t % 40 == 20) {
    Object.keys(rparked).forEach(ck => {
      let f = rparked[ck][0]
      if (isLoaded(level, f[0], f[1], f[2])) { rparked[ck].forEach(p => renqueue(p[0], p[1], p[2])); delete rparked[ck] }
    })
  }
  let rbudget = PER_TICK
  while (rbudget-- > 0 && rqueue.length > 0) {
    let q = rqueue.shift()
    let x = q[0], y = q[1], z = q[2]
    delete rqueued[key(x, y, z)]
    if (!isLoaded(level, x, y, z)) {
      let ck = chunkKey(x, z)
      if (!rparked[ck]) rparked[ck] = []
      rparked[ck].push([x, y, z])
      continue
    }
    let b = level.getBlock(x, y, z)
    if (b.id != SOUP) continue
    let wasSource = String(b.properties.level) == '0'
    b.set(wasSource ? 'minecraft:water' : 'minecraft:air')
    if (wasSource && converted > 0) converted--
    DIRS.forEach(d => renqueue(x + d[0], y + d[1], z + d[2]))
  }

  // 4. Achievement (once; /oceansoup revoke lets it be earned again)
  if (!granted && converted >= ACHIEVE_AT && t % 100 == 0) {
    server.runCommandSilent('advancement grant @a only ocean_soup:ocean_is_a_soup')
    granted = true
  }

  // 5. Save
  if (t % 200 == 0) saveState(server)
})

// ---- Drink: right-click air (like milk). Aiming at a block within reach pours the soup instead. ----
const DRINK_REACH = 4.5       // blocks: past this you drink instead of pouring
const DRINK_TOO_CLOSE = 0.9   // blocks: a block this close to your eyes (face in a wall) also drinks
let drinkDebug = 0

function soupAim(pl) { // returns { miss, distance } or null when ray tracing isn't available
  let r = null
  try { r = pl.rayTrace(DRINK_REACH, false) } catch (err) { try { r = pl.rayTrace(DRINK_REACH) } catch (err2) { return null } }
  if (!r) return { miss: true, distance: 99 }
  let type = String(r.type || ''), blk = r.block
  if (type.indexOf('block') < 0 || !blk) return { miss: true, distance: 99 }
  let d = 99
  try { d = Number(r.distance) } catch (err) {}
  if (!(d >= 0)) try { d = Math.sqrt(Math.pow(blk.x + 0.5 - pl.x, 2) + Math.pow(blk.y + 0.5 - pl.getEyeY(), 2) + Math.pow(blk.z + 0.5 - pl.z, 2)) } catch (err) { d = 99 }
  return { miss: false, distance: d }
}

ItemEvents.rightClicked(event => {
  if (String(event.item.id) != 'kubejs:ocean_soup_bucket') return
  let pl = event.player, server = event.server
  let aim = soupAim(pl)
  let sneaking = false
  try { sneaking = pl.isShiftKeyDown() } catch (err) { try { sneaking = pl.isCrouching() } catch (err2) {} }
  if (drinkDebug < 5) { drinkDebug++; console.info('Ocean Soup drink check: aim=' + JSON.stringify(aim) + ' sneaking=' + sneaking) }
  let drink = sneaking || (aim && (aim.miss || aim.distance < DRINK_TOO_CLOSE))
  if (!drink) return                            // aiming at a block in reach: the bucket pours soup as usual
  event.cancel()
  if (!loadedState) loadState(server)
  let f = foodCfg(), name = pl.username
  let fed = false
  try { pl.foodData.eat(f.hunger, f.saturation); fed = true } catch (err) {}
  if (!fed) try { pl.addFood(f.hunger, f.saturation); fed = true } catch (err) {}
  if (!fed) console.warn('Ocean Soup: could not add food for ' + name)
  ;(f.effects || []).forEach(e => server.runCommandSilent(`effect give ${name} ${e.id} ${e.seconds} ${e.amplifier} false`))
  server.runCommandSilent(`playsound minecraft:entity.generic.drink player @a ${pl.x} ${pl.y} ${pl.z} 1 0.9`)
  server.runCommandSilent(`playsound minecraft:entity.player.burp player @a ${pl.x} ${pl.y} ${pl.z} 0.6 1`)
  if (!pl.isCreative()) { event.item.count = event.item.count - 1; pl.give('minecraft:bucket') }
})

// ---- Create basin: right-click with a soup ingredient drops 1 in (sneak = the whole stack) ----
if (Platform.isLoaded('create')) {
  BlockEvents.rightClicked('create:basin', event => {
    let item = event.item
    if (!item || item.empty) return
    let ok = false
    try { ok = item.hasTag('kubejs:soup_ingredients') } catch (err) {}
    if (!ok) return
    if (String(event.hand).indexOf('MAIN') < 0) return
    let pl = event.player, b = event.block, sneaking = false
    try { sneaking = pl.isShiftKeyDown() } catch (err) {}
    let n = sneaking ? item.count : 1
    event.cancel()
    event.server.runCommandSilent(`summon item ${b.x + 0.5} ${b.y + 0.6} ${b.z + 0.5} {Item:{id:"${item.id}",count:${n}},PickupDelay:40,Motion:[0.0,0.0,0.0]}`)
    event.server.runCommandSilent(`playsound minecraft:entity.item.pickup block @a ${b.x} ${b.y} ${b.z} 0.4 0.8`)
    if (!pl.isCreative()) item.count = item.count - n
  })
}

// ---- Commands (op only): /oceansoup fill | revert | revoke | overlay | food | status | stop | reset ----
ServerEvents.commandRegistry(event => {
  let Commands = event.commands
  let FloatArg = Java.loadClass('com.mojang.brigadier.arguments.FloatArgumentType')
  let StrArg = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
  let IntArg = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')
  let fileAlpha = () => (soupFxFile() && soupFxFile().overlay) ? soupFxFile().overlay.alpha : OVERLAY_DEFAULT.alpha
  let say = (ctx, msg) => { ctx.source.sendSystemMessage(Text.gold('[Ocean Soup] ').append(Text.white(msg))); return 1 }

  event.register(Commands.literal('oceansoup').requires(src => src.hasPermission(2))
    // Turn the nearest water body (within 8 blocks of you) into soup right now
    .then(Commands.literal('fill').executes(ctx => {
      let pl = ctx.source.playerOrException, level = pl.level, server = ctx.source.server
      if (!loadedState) loadState(server)
      let px = Math.floor(pl.x), py = Math.floor(pl.y), pz = Math.floor(pl.z)
      let best = null, bestD = 1e9
      for (let x = px - 8; x <= px + 8; x++) for (let y = py - 8; y <= py + 8; y++) for (let z = pz - 8; z <= pz + 8; z++) {
        if (!isWaterSource(level, x, y, z)) continue
        let d = (x-px)*(x-px) + (y-py)*(y-py) + (z-pz)*(z-pz); if (d < bestD) { bestD = d; best = [x, y, z] }
      }
      if (!best) return say(ctx, 'No water source within 8 blocks. Stand next to the water.')
      let body = measureBody(level, best[0], best[1], best[2])
      let need = body.size < 0 ? OCEAN_BUCKETS : Math.max(1, Math.ceil(body.size / BLOCKS_PER_BUCKET))
      pools[body.key] = { soup: need, need: need }
      enqueue(best[0], best[1], best[2])
      fx(server, best[0], best[1], best[2])
      saveState(server)
      return say(ctx, (body.key == 'ocean' ? 'Ocean' : 'Lake (' + body.size + ' blocks)') + ' marked full (' + need + '/' + need + '). Spreading now at ' + PER_TICK + ' blocks/tick.')
    }))
    // Turn the soup you're standing next to (and everything connected) back into water
    .then(Commands.literal('revert').executes(ctx => {
      let pl = ctx.source.playerOrException, level = pl.level, server = ctx.source.server
      if (!loadedState) loadState(server)
      let px = Math.floor(pl.x), py = Math.floor(pl.y), pz = Math.floor(pl.z)
      let best = null, bestD = 1e9
      for (let x = px - 8; x <= px + 8; x++) for (let y = py - 8; y <= py + 8; y++) for (let z = pz - 8; z <= pz + 8; z++) {
        if (level.getBlock(x, y, z).id != SOUP) continue
        let d = (x-px)*(x-px) + (y-py)*(y-py) + (z-pz)*(z-pz); if (d < bestD) { bestD = d; best = [x, y, z] }
      }
      if (!best) return say(ctx, 'No soup within 8 blocks. Stand next to the soup you want gone.')
      queue = []; queued = {}; parked = {}; pools = {}   // stop the forward spread and forget poured amounts
      renqueue(best[0], best[1], best[2])
      saveState(server)
      return say(ctx, 'Reverting to water at ' + PER_TICK + ' blocks/tick. Soup in unloaded chunks turns back when you visit. Soup counts were cleared.')
    }))
    // Take the advancement away so it can be earned again
    .then(Commands.literal('revoke').executes(ctx => {
      if (!loadedState) loadState(ctx.source.server)
      ctx.source.server.runCommandSilent('advancement revoke @a only ocean_soup:ocean_is_a_soup')
      // also a full reset: a spread still running would otherwise re-earn it within seconds
      queue = []; queued = {}; parked = {}; pools = {}; rqueue = []; rqueued = {}; rparked = {}
      granted = false; converted = 0; saveState(ctx.source.server)
      return say(ctx, 'THE OCEAN IS A SOUP revoked for everyone, spreading stopped and soup counts reset. Turn ' + ACHIEVE_AT + ' blocks into soup to earn it again.')
    }))
    // Underwater overlay opacity: show, set 0-255, or go back to the ocean_soup_fx.js value
    .then(Commands.literal('overlay')
      .executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        return say(ctx, 'Overlay opacity is ' + (overlayOverride >= 0 ? overlayOverride + ' (set by command)' : fileAlpha() + ' (from ocean_soup_fx.js)') + '. Use /oceansoup overlay <0-255> or /oceansoup overlay reset.')
      })
      .then(Commands.literal('reset').executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        overlayOverride = -1; overlayShown = {}; saveState(ctx.source.server)
        return say(ctx, 'Overlay opacity back to ' + fileAlpha() + ' from ocean_soup_fx.js.')
      }))
      .then(Commands.argument('alpha', IntArg.integer(0, 255)).executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        overlayOverride = IntArg.getInteger(ctx, 'alpha'); overlayShown = {}; saveState(ctx.source.server)
        return say(ctx, 'Overlay opacity set to ' + overlayOverride + ' (0 = invisible, 255 = solid). Saved with this world.')
      })))
    // Drinking nutrition: show / set hunger / saturation / effects / reset
    .then(Commands.literal('food')
      .executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        let f = foodCfg()
        say(ctx, 'Drinking a bucket gives ' + f.hunger + ' hunger, saturation ' + f.saturation + (foodOverride ? ' (set by command)' : ' (default)') + '.')
        if (!f.effects.length) return say(ctx, 'No effects.')
        f.effects.forEach((e, i) => say(ctx, '#' + (i + 1) + ' ' + e.id + ' for ' + e.seconds + 's, level ' + (e.amplifier + 1)))
        return 1
      })
      .then(Commands.literal('hunger').then(Commands.argument('points', IntArg.integer(0, 20)).executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        foodOverride = JSON.parse(JSON.stringify(foodCfg())); foodOverride.hunger = IntArg.getInteger(ctx, 'points'); saveState(ctx.source.server)
        return say(ctx, 'Soup now restores ' + foodOverride.hunger + ' hunger.')
      })))
      .then(Commands.literal('saturation').then(Commands.argument('modifier', FloatArg.floatArg(0, 5)).executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        foodOverride = JSON.parse(JSON.stringify(foodCfg())); foodOverride.saturation = FloatArg.getFloat(ctx, 'modifier'); saveState(ctx.source.server)
        return say(ctx, 'Soup saturation modifier is now ' + foodOverride.saturation + '.')
      })))
      .then(Commands.literal('effect')
        .then(Commands.literal('add').then(Commands.argument('seconds', IntArg.integer(1, 100000)).then(Commands.argument('level', IntArg.integer(1, 256))
          .then(Commands.argument('effect', StrArg.greedyString()).executes(ctx => {
            if (!loadedState) loadState(ctx.source.server)
            let id = String(StrArg.getString(ctx, 'effect')).trim(); if (id.indexOf(':') < 0) id = 'minecraft:' + id
            foodOverride = JSON.parse(JSON.stringify(foodCfg()))
            foodOverride.effects = foodOverride.effects.filter(e => e.id != id)
            foodOverride.effects.push({ id: id, seconds: IntArg.getInteger(ctx, 'seconds'), amplifier: IntArg.getInteger(ctx, 'level') - 1 })
            saveState(ctx.source.server)
            return say(ctx, 'Soup now gives ' + id + ' for ' + IntArg.getInteger(ctx, 'seconds') + 's at level ' + IntArg.getInteger(ctx, 'level') + '.')
          })))))
        .then(Commands.literal('clear').executes(ctx => {
          if (!loadedState) loadState(ctx.source.server)
          foodOverride = JSON.parse(JSON.stringify(foodCfg())); foodOverride.effects = []; saveState(ctx.source.server)
          return say(ctx, 'Soup gives no effects now.')
        })))
      .then(Commands.literal('reset').executes(ctx => {
        if (!loadedState) loadState(ctx.source.server)
        foodOverride = null; saveState(ctx.source.server)
        return say(ctx, 'Soup nutrition back to the defaults in ocean_soup_spread.js.')
      })))
    // Progress report
    .then(Commands.literal('status').executes(ctx => {
      if (!loadedState) loadState(ctx.source.server)
      let keys = Object.keys(pools)
      say(ctx, 'Converted ' + converted + ' blocks · queued ' + queue.length + ' · waiting in unloaded chunks ' + Object.keys(parked).length + ' chunks' +
        (rqueue.length || Object.keys(rparked).length ? ' · reverting ' + rqueue.length + ' (+' + Object.keys(rparked).length + ' chunks)' : '') + (granted ? ' · advancement given' : ''))
      if (!keys.length) return say(ctx, 'No soup poured into any water yet.')
      keys.forEach(k => say(ctx, (k == 'ocean' ? 'Ocean' : 'Lake ' + k.replace('body@', 'at ')) + ': ' + pools[k].soup + ' / ' + pools[k].need + ' buckets'))
      return 1
    }))
    // Stop a running spread (blocks already turned stay soup)
    .then(Commands.literal('stop').executes(ctx => {
      queue = []; queued = {}; parked = {}; rqueue = []; rqueued = {}; rparked = {}; saveState(ctx.source.server)
      return say(ctx, 'Spread and revert stopped. Existing soup stays; pour more to start again.')
    }))
    // Forget all progress (doesn't turn soup back into water)
    .then(Commands.literal('reset').executes(ctx => {
      queue = []; queued = {}; parked = {}; pools = {}; converted = 0; rqueue = []; rqueued = {}; rparked = {}; saveState(ctx.source.server)
      return say(ctx, 'All soup progress reset. Soup blocks already placed are left as they are.')
    }))
  )
})
