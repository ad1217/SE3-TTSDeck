/*
 * TTSDeck.js
 *
 * Creates a deck image and corresponding "Saved Object" JSON for use
 * in Tabletop Simulator
 */

importClass(java.io.File);
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

      for (let row = 0; row < rows; row++) {
        let row_image;
        for (let col = 0; col < columns && row * columns + col < cards.length; col++) {
          let card = cards[row * columns + col];
          println("Processing Card ", card);

          try {
            let component = ResourceKit.getGameComponentFromFile(card.file);
            let sheets = component.createDefaultSheets();
            // export front face
            // TODO: handle two-sided cards
            let card_image = sheets[0].paint(arkham.sheet.RenderTarget.EXPORT, RESOLUTION);

            if (!row_image) {
              row_image = card_image;
            } else {
              row_image = ImageUtils.stitch(row_image, card_image, ImageUtils.STITCH_HORIZONTAL);
            }
          } catch (ex) {
            alert('Error while processing ' + card, true);
          }
        }
        println("End of Row ", row);
        if (!deck_image) {
          deck_image = row_image;
        }
        else {
          deck_image = ImageUtils.stitch(deck_image, row_image, ImageUtils.STITCH_VERTICAL);
        }
      }

      const target_file = new File(member.file, 'tts.png');
      ImageUtils.write(deck_image, target_file, FORMAT, -1, false, RESOLUTION);

      member.synchronize();
    }
  });

  ActionRegistry.register(ttsDeckAction, Actions.PRIORITY_IMPORT_EXPORT);
}
