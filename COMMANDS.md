# Ocean Soup commands

These commands come from `kubejs/server_scripts/ocean_soup_spread.js`. You need op or cheats enabled to use them. After you change any script, run `/reload`. If a command doesn't show up in tab-complete, rejoin the world.

## /oceansoup

| Command | What it does |
|---|---|
| `/oceansoup fill` | Finds the nearest water source within 8 blocks of you. It counts that lake or ocean as full of soup and starts the spread straight away. |
| `/oceansoup revert` | Finds the nearest soup within 8 blocks of you and turns everything connected to it back into water. |
| `/oceansoup revoke` | Takes away **THE OCEAN IS A SOUP** and does a full reset, so it can be earned again. |
| `/oceansoup overlay [0-255 \| reset]` | Shows or sets how see-through the brown film is when your head is in soup. |
| `/oceansoup food ...` | Shows or changes what drinking a bucket of soup gives you. |
| `/oceansoup status` | Shows how the spread is going. |
| `/oceansoup stop` | Stops a running spread or revert. |
| `/oceansoup reset` | Forgets all soup progress. |

### fill
- Use it next to the water you want to turn into soup.
- It's for testing, so you skip pouring 256 buckets into an ocean.
- The spread runs at 400 blocks per tick (`PER_TICK`).
- When it reaches chunks that aren't loaded, it pauses there and carries on once you visit.
- Once 5,000 blocks have turned (`ACHIEVE_AT`), you get the advancement.
- **The spread is permanent**, so test in a copy of your world.

### revert
- Use it next to the soup you want gone.
- Soup source blocks become **water**, and flowing soup becomes **air**.
- It also stops any spread still running and clears the bucket counts.
- Soup in chunks that aren't loaded is remembered and turns back into water when you visit.
- While a revert is running, soup poured near you isn't scooped up, so the revert can't leave holes.

### revoke
- Takes the advancement away from every player.
- It also stops the spread and any revert, and resets the bucket counts and the converted-block count. Without that, a spread still running would earn the advancement again within seconds.
- Soup that has already spread stays. Use `revert` for that.
- Use this rather than the vanilla `/advancement revoke`. The vanilla command doesn't tell the script, so the soup count would still be over 5,000.

### overlay
| Command | Result |
|---|---|
| `/oceansoup overlay` | Shows the current opacity and where it comes from. |
| `/oceansoup overlay 120` | Sets the opacity. 0 is invisible and 255 is solid. |
| `/oceansoup overlay reset` | Goes back to the value in `ocean_soup_fx.js`, or 100 if there isn't one. |

- The new value applies straight away, even while you're underwater in soup.
- It's saved with the world and survives restarts.
- A value set with this command takes priority over the opacity in `ocean_soup_fx.js` until you use `reset`.

### food
To drink, right-click air with a bucket of Ocean Soup, like milk. Aiming at a block within reach pours it instead; sneaking or pressing up against a wall also drinks. You get the empty bucket back.

| Command | Result |
|---|---|
| `/oceansoup food` | Shows the current hunger, saturation and effects. |
| `/oceansoup food hunger 8` | Sets the hunger points restored, from 0 to 20. A full bar is 20 and a steak is 8. |
| `/oceansoup food saturation 0.6` | Sets the saturation modifier, from 0 to 5. Vanilla "normal" food is 0.6 and "good" food is 1.2. |
| `/oceansoup food effect add 30 1 water_breathing` | Adds or replaces an effect: seconds, then level, then effect ID. Modded effects work with their full ID, for example `cobblemon:...`. |
| `/oceansoup food effect clear` | Removes all effects. |
| `/oceansoup food reset` | Goes back to the defaults: 8 hunger, 0.6 saturation and 30 s of Water Breathing. |

Changes are saved with the world. The defaults themselves are `FOOD_DEFAULT` at the top of `ocean_soup_spread.js`.

### status
Example output:
```
[Ocean Soup] Converted 5320 blocks · queued 812 · waiting in unloaded chunks 14 chunks · advancement given
[Ocean Soup] Ocean: 256 / 256 buckets
[Ocean Soup] Lake at 120,62,-44: 3 / 9 buckets
```
- **queued:** blocks waiting to turn into soup in loaded chunks.
- **waiting in unloaded chunks:** chunks the spread will continue into when you visit.
- **reverting:** only shown while a revert is running.

### stop
- Stops both the spread and any revert.
- Soup that has already spread stays as it is.
- Bucket counts are kept, so pouring more soup restarts the spread.

### reset
- Clears the bucket counts, the converted-block count and anything queued.
- Soup blocks already in the world stay as they are.
- Doesn't touch the advancement. Use `revoke` for that.

## Useful vanilla and KubeJS commands

| Command | Use |
|---|---|
| `/give @s kubejs:ocean_soup_bucket 16` | Gives you soup buckets. |
| `/advancement grant @s only kubejs:ocean_is_a_soup` | Shows the challenge toast and fanfare and gives 1000 XP. Run `/oceansoup revoke` first. |
| `/reload` | Reloads server scripts, the advancement and `ocean_soup_fx.js`. |
| `/kubejs errors` | Lists script errors. The full log is in `logs/kubejs/server.log`. |

## How pouring soup works (no commands)
- **Dissolving:** soup next to water is **scooped up**. The source block disappears and the flowing soup drains away. Each source counts as one bucket for that body of water.
- **How many buckets:**
  - A lake needs 1 bucket for every 200 water blocks (`BLOCKS_PER_BUCKET`).
  - Anything bigger than 20,000 blocks (`MEASURE_CAP`) counts as an ocean and needs 256 buckets (`OCEAN_BUCKETS`).
- **Shared ocean count:** every body of water counted as an ocean shares one bucket count.
- **Particles and sound:** set by `ocean_soup_fx.js`. Edit it in the **Dissolve FX** tab of `soup_texture_bench.html`.
- **Underwater view:** with your head in soup, the screen gets thick brown fog plus a soup film.
  - The film's texture is `kubejs/assets/kubejs/textures/misc/soup_overlay.png`. Make it in the bench's **Overlay** tab.
  - The texture is stretched over the whole screen, so it only repeats if a layer in it is set to tile.
  - Fog colour and thickness are at the top of `kubejs/startup_scripts/ocean_soup_fog.js`. Changes there need a full restart.

## Settings at the top of ocean_soup_spread.js

| Setting | Default | Meaning |
|---|---|---|
| `PER_TICK` | 400 | Blocks converted or reverted per tick. Lower it if the game lags. |
| `SEED_RADIUS` | 6 | How close you must be for poured soup to be detected. |
| `ACHIEVE_AT` | 5000 | Blocks turned to soup before the advancement. |
| `BLOCKS_PER_BUCKET` | 200 | Lake size per bucket needed. |
| `MEASURE_CAP` | 20000 | Above this size, water counts as an ocean. |
| `OCEAN_BUCKETS` | 256 | Buckets needed for an ocean. |
| `DEBUG` | false | Prints soup checks to chat. |
