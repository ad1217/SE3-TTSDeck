/*
 * TTSDeck.js
 *
 * Creates a deck image and corresponding "Saved Object" JSON for use
 * in Tabletop Simulator
 */

useLibrary('project');
useLibrary('imageutils');
useLibrary('uilayout');

// The resolution (in pixels per inch) of the exported images
const RESOLUTION = 200;
// The extension of the image file format to use, e.g., png, jpg
const FORMAT = ImageUtils.FORMAT_JPEG;


function getName() {
	return 'TTSDeck';
}
function getDescription() {
  return 'Generates a TTS deck image and JSON file';
}
function getVersion() {
	return 1.0;
}
function getPluginType() {
	return arkham.plugins.Plugin.INJECTED;
}

function unload() {
  unregisterAll();
}

// Creates a test button during development that calls unload() to clean up.
testProjectScript();

function makeCardJSON(card_id, nickname, description) {
  return {
    Name: "Card",
    Transform: {
      posX: 0,
      posY: 0,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    },
    Nickname: String(nickname),
    CardID: card_id,
    Description: String(description || ""),
    ColorDiffuse: {
      r: 0.713235259,
      g: 0.713235259,
      b: 0.713235259,
    },
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    SidewaysCard: false,
  };
}

function makeDeckJSON(face_url, back_url, num_width, num_height, cards, nickname, description) {
  const deck_ids = cards.map(function (card) {
    return card.CardID;
  });
  return {
    Name: "DeckCustom",
    Transform: {
      posX: 0,
      posY: 0,
      posZ: 0,
      rotX: 0,
      rotY: 0.0,
      rotZ: 0.0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
    },
    Nickname: String(nickname || ""),
    Description: String(description || ""),
    ColorDiffuse: {
      r: 0.713239133,
      g: 0.713239133,
      b: 0.713239133,
    },
    Grid: true,
    Locked: false,
    SidewaysCard: false,
    DeckIDs: deck_ids,
    CustomDeck: {
      "1": {
        FaceURL: String(face_url),
        BackURL: String(back_url),
        NumWidth: num_width,
        NumHeight: num_height,
      }
    },
    ContainedObjects: cards,
  };
}

function makeSavedObjectJSON(objects, save_name) {
  return {
    SaveName: String(save_name || ""),
    GameMode: "",
    Date: "",
    Table: "",
    Sky: "",
    Note: "",
    Rules: "",
    PlayerTurn: "",
    ObjectStates: objects,
  };
}

function run() {
  const ttsDeckAction = JavaAdapter(TaskAction, {
    getLabel: function getLabel() {
      return 'Generate TTS Deck';
    },
    getActionName: function getActionName() {
      return 'ttsdeck';
    },
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
      const children = member.getChildren();
      const cards = children.filter(function (child) {
        if (ProjectUtilities.matchExtension(child, 'eon')) {
          let component = ResourceKit.getGameComponentFromFile(child.file);
          return component.isDeckLayoutSupported();
        } else {
          return false;
        }
      });

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
            let sheets = component.createDefaultSheets();

            card_jsons.push(makeCardJSON(100 + index, component.getName()));

            // export front face
            // TODO: handle two-sided cards
            let card_image = sheets[0].paint(arkham.sheet.RenderTarget.EXPORT, RESOLUTION);

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

      const deck_json = makeDeckJSON('TODO', 'TODO', columns, rows, card_jsons);
      const saved_object = makeSavedObjectJSON([deck_json], member.getName());

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
