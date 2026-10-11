# Ocean Soup

A KubeJS script pack that turns the ocean into soup. Pour buckets of Ocean Soup into water and it spreads. Once enough has turned you earn **THE OCEAN IS A SOUP**.

It needs **only KubeJS and the libraries KubeJS itself needs**. No other mods are required.

- **Create is optional.** If it is installed, soup can also be made in a heated Create basin with a mixer, and you can right-click a basin with an ingredient. Without Create, soup is made at a crafting table: a water bucket plus 3 to 8 soup ingredients (fish, meat, vegetables, fruit, kelp and so on).
- Any other mods are fine. You can add modded ingredients to the list in `server_scripts/ocean_soup_recipes.js`.
- The commands are in [COMMANDS.md](COMMANDS.md). They start with `/oceansoup`, and need op or cheats on.
- The spread is permanent, so try it in a copy of your world first.

Pick your Minecraft version:

- [Minecraft 1.20.1 (Forge)](#minecraft-1201-forge)
- [Minecraft 1.21.1 (NeoForge)](#minecraft-1211-neoforge)

## Minecraft 1.20.1 (Forge)

**[Download the pack: ocean-soup-1.20.1-forge-v1.3.mrpack](https://github.com/liangforstudy/ocean-soup/raw/main/1.20.1-forge/dist/ocean-soup-1.20.1-forge-v1.3.mrpack)** (Modrinth `.mrpack`, needs Java 17; the launchers below fetch it for you)

The pack is Forge 47.4.10, the mods below and the scripts in [`1.20.1-forge/kubejs`](1.20.1-forge/kubejs). The `.mrpack` holds download links, not mod files.

| Required mod | Version | File |
|---|---|---|
| [Architectury API](https://modrinth.com/mod/architectury-api) | 9.2.14+forge | `architectury-9.2.14-forge.jar` |
| [KubeJS](https://modrinth.com/mod/kubejs) | 2001.6.5-build.26+forge | `kubejs-forge-2001.6.5-build.26.jar` |
| [Rhino](https://modrinth.com/mod/rhino) | 2001.2.3-build.10+forge | `rhino-forge-2001.2.3-build.10.jar` |

### Option A: install with Prism Launcher (easiest)

Prism Launcher is a free launcher that handles Java and the mod loader for you. These steps assume you don't have it yet.

1. Go to [prismlauncher.org/download](https://prismlauncher.org/download/) and download the Windows installer (or the portable zip, which you just unzip anywhere). Run it.
2. Open Prism Launcher. The first-run setup asks for a language and Java. Accept the defaults and let it download Java if it offers to.
3. Add your Minecraft account. Click the **Profile** icon (top right), then **Manage Accounts > Add Microsoft Account**, and sign in. Prism needs a purchased Java Edition account to start the game.
4. Download the `.mrpack` from the link above and keep it somewhere you can find it.
5. In Prism click **Add Instance**, then **Import** on the left. Click the folder button (or paste the file path) and choose the `.mrpack`. Press **OK**.
6. Prism installs Forge 47.4.10 and downloads the mods. When the instance appears, double-click it to play.
7. If the game runs out of memory, right-click the instance, choose **Edit > Settings > Java**, tick **Memory**, and raise the maximum to about 4 GB.

### Option B: vanilla Minecraft Launcher, no launcher mods

1. In the vanilla launcher, add an installation for `release 1.20.1`, press Play once, then quit at the title screen.
2. Get the Forge 47.4.10 installer for 1.20.1 from [Forge](https://files.minecraftforge.net/net/minecraftforge/forge/index_1.20.1.html). Run it and choose **Install client**. It needs Java 17 ([Adoptium](https://adoptium.net/)).
3. Make a new empty game folder, for example `C:\Games\OceanSoup1.20.1`. Inside it make a `mods` folder.
4. Download the mods in the table above (the **Versions** tab on each Modrinth page; pick the version shown, for Minecraft 1.20.1) and put the `.jar` files in `mods`.
5. Copy this repo's [`1.20.1-forge/kubejs`](1.20.1-forge/kubejs) folder into the game folder. You should end up with `...\OceanSoup1.20.1\kubejs\server_scripts\ocean_soup_spread.js`. (On GitHub use **Code > Download ZIP** and unzip it.)
6. In the vanilla launcher go to **Installations > New installation**: set the version to the **1.20.1-forge** entry the installer added, and **Game directory** to your new folder. Press **Play**.

## Minecraft 1.21.1 (NeoForge)

**[Download the pack: ocean-soup-1.21.1-neoforge-v1.1.mrpack](https://github.com/liangforstudy/ocean-soup/raw/main/1.21.1-neoforge/dist/ocean-soup-1.21.1-neoforge-v1.1.mrpack)** (Modrinth `.mrpack`, needs Java 21; the launchers below fetch it for you)

The pack is NeoForge 21.1.256, the mods below and the scripts in [`1.21.1-neoforge/kubejs`](1.21.1-neoforge/kubejs). The `.mrpack` holds download links, not mod files.

| Required mod | Version | File |
|---|---|---|
| [KubeJS](https://modrinth.com/mod/kubejs) | 2101.7.2-build.377 | `kubejs-neoforge-2101.7.2-build.377.jar` |
| [Rhino](https://modrinth.com/mod/rhino) | 2101.2.7-build.85+Rhino-1.21 | `rhino-2101.2.7-build.85.jar` |

### Option A: install with Prism Launcher (easiest)

Prism Launcher is a free launcher that handles Java and the mod loader for you. These steps assume you don't have it yet.

1. Go to [prismlauncher.org/download](https://prismlauncher.org/download/) and download the Windows installer (or the portable zip, which you just unzip anywhere). Run it.
2. Open Prism Launcher. The first-run setup asks for a language and Java. Accept the defaults and let it download Java if it offers to.
3. Add your Minecraft account. Click the **Profile** icon (top right), then **Manage Accounts > Add Microsoft Account**, and sign in. Prism needs a purchased Java Edition account to start the game.
4. Download the `.mrpack` from the link above and keep it somewhere you can find it.
5. In Prism click **Add Instance**, then **Import** on the left. Click the folder button (or paste the file path) and choose the `.mrpack`. Press **OK**.
6. Prism installs NeoForge 21.1.256 and downloads the mods. When the instance appears, double-click it to play.
7. If the game runs out of memory, right-click the instance, choose **Edit > Settings > Java**, tick **Memory**, and raise the maximum to about 6 GB.

### Option B: vanilla Minecraft Launcher, no launcher mods

1. In the vanilla launcher, add an installation for `release 1.21.1`, press Play once, then quit at the title screen.
2. Get the NeoForge 21.1.256 installer for 1.21.1 from [NeoForge](https://neoforged.net/). Run it and choose **Install client**. It needs Java 21 ([Adoptium](https://adoptium.net/)).
3. Make a new empty game folder, for example `C:\Games\OceanSoup1.21.1`. Inside it make a `mods` folder.
4. Download the mods in the table above (the **Versions** tab on each Modrinth page; pick the version shown, for Minecraft 1.21.1) and put the `.jar` files in `mods`.
5. Copy this repo's [`1.21.1-neoforge/kubejs`](1.21.1-neoforge/kubejs) folder into the game folder. You should end up with `...\OceanSoup1.21.1\kubejs\server_scripts\ocean_soup_spread.js`. (On GitHub use **Code > Download ZIP** and unzip it.)
6. In the vanilla launcher go to **Installations > New installation**: set the version to the **neoforge-21.1.256** entry the installer added, and **Game directory** to your new folder. Press **Play**.

