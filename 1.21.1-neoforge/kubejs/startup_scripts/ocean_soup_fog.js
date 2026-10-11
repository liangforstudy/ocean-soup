// Thick soup fog when your head is inside Ocean Soup (like being in lava).
// Startup script: changes need a full game restart, /reload won't pick them up.
// NeoForge 1.21.1 / KubeJS 7 version: uses NativeEvents + NeoForge event classes. Never lets an error reach the renderer.

const SOUP_FOG = {
  color: [0.42, 0.28, 0.13],  // red, green, blue from 0 to 1 (dark broth brown)
  near: 0.0,                  // fog starts this many blocks from your eyes
  far: 1.6,                   // can't see past this (lava is about 1.0, water is about 96)
}

let soupFogBroken = false

function soupFogInSoup(event) {
  // Camera.getBlockAtCamera() is a NeoForge method; the block state's text looks like "Block{kubejs:ocean_soup}[level=0]"
  return String(event.getCamera().getBlockAtCamera()).indexOf('kubejs:ocean_soup') >= 0
}

function soupFogSafely(name, fn) {
  if (soupFogBroken) return
  try { fn() } catch (err) {
    soupFogBroken = true   // switch the fog off for this session instead of crashing the game
    console.error('Ocean Soup fog disabled after an error in ' + name + ': ' + err)
  }
}

function soupFogListen(cls, fn) {
  try { NativeEvents.onEvent(Java.loadClass(cls), fn) }
  catch (err) { console.error('Ocean Soup fog: could not hook ' + cls + ' (' + err + ')') }
}

// The fog events only exist on the client. Hooking them on a dedicated server crashes it.
if (Platform.isClientEnvironment()) {
  soupFogListen('net.neoforged.neoforge.client.event.ViewportEvent$RenderFog', event => {
    soupFogSafely('RenderFog', () => {
      if (!soupFogInSoup(event)) return
      event.setNearPlaneDistance(SOUP_FOG.near)
      event.setFarPlaneDistance(SOUP_FOG.far)
      event.setCanceled(true) // NeoForge only applies the new distances when the event is cancelled
    })
  })

  soupFogListen('net.neoforged.neoforge.client.event.ViewportEvent$ComputeFogColor', event => {
    soupFogSafely('ComputeFogColor', () => {
      if (!soupFogInSoup(event)) return
      event.setRed(SOUP_FOG.color[0])
      event.setGreen(SOUP_FOG.color[1])
      event.setBlue(SOUP_FOG.color[2])
    })
  })
}
