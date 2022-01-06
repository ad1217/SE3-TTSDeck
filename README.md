# SE3 Tabletop Simulator Deck Generator

This plugin for [Strange Eons 3](https://strangeeons.cgjennings.ca/index.html) allows you to generate images and corresponding "Saved Object" JSONs for decks which can be used in [Tabletop Simulator](https://tabletopsimulator.com/).

## Features

- Creates correctly sized deck images for Tabletop Simulator, splitting into multiple pages when necessary.
- Supports multiple copies of cards, without duplicating them in the image.
- Creates a "Saved Object" JSON that joins all of the pages into a single deck, and assigns the name of the card.

## Installation

Paste this URL into the top bar of the Plug-in Catalog in Strange Eons 3: `https://dev.adamgoldsmith.name/se3plugins/`.
You should then be able to just select it from the list of available plugins.
See the [official docs](http://se3docs.cgjennings.ca/um-plugins-catalogue.html) for more details.

Alternatively, you can clone this repository and build/install the plugin following [these instructions from the SE3 docs](http://se3docs.cgjennings.ca/dm-first-plugin.html#building-the-plug-in-bundle).

## Usage

With the plugin installed, right click on a Deck task, then select "Generate TTS Deck" from the dropdown menu.

The plugin will create a JSON file with the same name as the Deck task, as well as a number of JPEG files.
Copy/move/symlink the JSON file to the `Saves/Saved Objects` folder in your [Tabletop Simulator Save Game Data](https://kb.tabletopsimulator.com/getting-started/technical-info/#save-game-data-location).
Do not move the jpg files; their paths are absolute and must be changed in the JSON file if you move them.

The absolute paths to deck images are written into the TTS json, so it will only work locally unless you upload the images, and correct the URLs in the JSON file.
Alternatively, you should in theory be able to use the [Upload All](https://kb.tabletopsimulator.com/custom-content/cloud-manager/#upload-all) feature in Tabletop Simulator to upload them to the Steam Cloud, although I have not have any success with this.

The first time you run the plugin will take a very long time, but future runs will be faster as the cards' images will be cached.

### Copies

This plugin supports the [Copies File](http://se3docs.cgjennings.ca/um-proj-deck-task.html#the-copies-file) for indicating the number of copies of a card to create.

## Limitations

This only supports decks of uniformly sized, single-sided cards (ie all with the same back).
(Note that rotated cards do not count as being the same size for this purpose).
The workaround for this is just to put each size/type of card into it's own deck.

The back image is taken from the first card in the deck.
