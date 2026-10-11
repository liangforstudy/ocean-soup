// Thick soup fog when your head is inside Ocean Soup (like being in lava).
// Startup script: changes need a full game restart, /reload won't pick them up.
// Only uses Forge methods (not scrambled in a real game) and never lets an error reach the renderer.

const SOUP_FOG = {
  color: [0.42, 0.28, 0.13],  // red, green, blue from 0 to 1 (dark broth brown)
  near: 0.0,                  // fog starts this many blocks from your eyes
  far: 1.6,                   // can't see past this (lava is about 1.0, water is about 96)
}

let soupFogBroken = false

function soupFogInSoup(event) {
  // Camera.getBlockAtCamera() is a Forge method; the block state's text looks like "Block{kubejs:ocean_soup}[level=0]"
  return String(event.getCamera().getBlockAtCamera()).indexOf('kubejs:ocean_soup') >= 0
}

function soupFogSafely(name, fn) {
  if (soupFogBroken) return
  try { fn() } catch (err) {
    soupFogBroken = true   // switch the fog off for this session instead of crashing the game
    console.error('Ocean Soup fog disabled after an error in ' + name + ': ' + err)
  }
}

// The fog events only exist on the client. Hooking them on a dedicated server crashes it.
if (Platform.isClientEnvironment()) {
  ForgeEvents.onEvent('net.minecraftforge.client.event.ViewportEvent$RenderFog', event => {
    soupFogSafely('RenderFog', () => {
      if (!soupFogInSoup(event)) return
      event.setNearPlaneDistance(SOUP_FOG.near)
      event.setFarPlaneDistance(SOUP_FOG.far)
      event.setCanceled(true) // Forge only applies the new distances when the event is cancelled
    })
  })

  ForgeEvents.onEvent('net.minecraftforge.client.event.ViewportEvent$ComputeFogColor', event => {
    soupFogSafely('ComputeFogColor', () => {
      if (!soupFogInSoup(event)) return
      event.setRed(SOUP_FOG.color[0])
      event.setGreen(SOUP_FOG.color[1])
      event.setBlue(SOUP_FOG.color[2])
    })
  })
}
