/*
 * TTSDeck.js
 *
 * Creates a deck image and corresponding "Saved Object" JSON for use
 * in Tabletop Simulator
 */

useLibrary('project');
useLibrary('imageutils');
useLibrary('uilayout');
importClass(arkham.project.CopiesList);

const TTSJson = require('./TTSJson.js');

// The resolution (in pixels per inch) of the exported images
const RESOLUTION = 200;
// The extension of the image file format to use, e.g., png, jpg
const FORMAT = ImageUtils.FORMAT_JPEG;


const getName = () => 'TTSDeck';
const getDescription = () => 'Generates a TTS deck image and JSON file';
const getVersion = () => 1.0;
const getPluginType = () => arkham.plugins.Plugin.INJECTED;

function unload() {
  unregisterAll();
}

// Creates a test button during development that calls unload() to clean up.
testProjectScript();

// Hack to override the default return value of 1
function copyCount(copies_list, name) {
  const entries = copies_list.getListEntries().map(x => String(x));
  if (entries.indexOf(String(name)) == -1) {
    return 2;
  } else {
    return copies_list.getCopyCount(name);
  }
}

// export front face, or retrive it from a cached file
// TODO: handle two-sided cards
function makeCardImage(card) {
  const component = ResourceKit.getGameComponentFromFile(card.file);

  const cache_dir = new File(card.parent.file, '.ttsdeck_cache');
  const cached_file = new File(cache_dir, card.file.name + '.' + FORMAT);

  if (cached_file.exists() && cached_file.lastModified() > card.file.lastModified()) {
    println("Got cached image for card", card);
    return ImageUtils.read(cached_file);
  } else {
    println("Generating image for card ", card);
    const sheets = component.createDefaultSheets();
    const card_image = sheets[0].paint(arkham.sheet.RenderTarget.EXPORT, RESOLUTION);

    cache_dir.mkdir();
    ImageUtils.write(card_image, cached_file, FORMAT, -1, false, RESOLUTION);

    return card_image;
  }
}

function makeTTSDeck(cards, copies_list) {
  const columns = Math.ceil(Math.sqrt(cards.length));
  const rows = Math.ceil(cards.length / columns);
  let deck_image;
  let deck_graphics;
  let card_jsons = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns && row * columns + col < cards.length; col++) {
      let index = row * columns + col;
      let card = cards[index];
      println("Processing Card ", card);

      try {
        let component = ResourceKit.getGameComponentFromFile(card.file);
        let copies = copyCount(copies_list, card.baseName);

        for (let ii = 0; ii < copies; ii++) {
          card_jsons.push(TTSJson.makeCardJSON(100 + index, component.getName()));
        }

        let card_image = makeCardImage(card);

        if (!deck_image) {
          deck_image = ImageUtils.create(
            card_image.width * columns, card_image.height * rows, false);
          deck_graphics = deck_image.createGraphics();
        }

        deck_graphics.drawImage(card_image, col * card_image.width, row * card_image.height, null);
      } catch (ex) {
        alert('Error while processing ' + card + ': ' + ex, true);
      }
    }
    println("End of Row ", row);
  }

  const deck_json = TTSJson.makeDeckJSON('TODO', 'TODO', columns, rows, card_jsons);

  return [deck_json, deck_image];
}

function run() {
  const ttsDeckAction = JavaAdapter(TaskAction, {
    getLabel: () => 'Generate TTS Deck',
    getActionName: () => 'ttsdeck',
    // Applies to Deck Tasks
    appliesTo: function appliesTo(project, task, member) {
        if (member != null || task == null) {
            return false;
        }
        const type = task.settings.get(Task.KEY_TYPE);
        if (NewTaskType.DECK_TYPE.equals(type)) {
            return true;
        }
        return false;
    },
    perform: function perform(project, task, member) {
      member = ProjectUtilities.simplify(project, task, member);
      Eons.setWaitCursor(true);
      try {
        this.performImpl(member);
      } catch (ex) {
        Error.handleUncaught(ex);
      } finally {
        Eons.setWaitCursor(false);
      }
    },
    performImpl: function performImpl(member) {
      let copies_list;
      try {
        copies_list = new CopiesList(member);
      } catch (ex) {
        copies_list = new CopiesList();
        alert("unable to read copies list, using card count of 2 for all files", true);
      }

      const children = member.getChildren();
      const cards = children.filter(child => {
        if (ProjectUtilities.matchExtension(child, 'eon')) {
          let component = ResourceKit.getGameComponentFromFile(child.file);
          return component.isDeckLayoutSupported();
        } else {
          return false;
        }
      });

      const [deck_json, deck_image] = makeTTSDeck(cards, copies_list);
      const saved_object = TTSJson.makeSavedObjectJSON([deck_json], member.getName());

      println("Writing output files");
      const json_file = new File(member.file, member.getName() + '.json');
      ProjectUtilities.writeTextFile(json_file, JSON.stringify(saved_object, null, 4));

      const image_file = new File(member.file, member.getName() + '.' + FORMAT);
      ImageUtils.write(deck_image, image_file, FORMAT, -1, false, RESOLUTION);

      member.synchronize();
    }
  });

  ActionRegistry.register(ttsDeckAction, Actions.PRIORITY_IMPORT_EXPORT);
}
