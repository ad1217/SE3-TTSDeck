/*
 * TTSDeck.js
 *
 * Creates a deck image and corresponding "Saved Object" JSON for use
 * in Tabletop Simulator
 */

useLibrary('project');
useLibrary('imageutils');
useLibrary('threads');
useLibrary('uilayout');
useLibrary('uicontrols');
importClass(arkham.project.CopiesList);

const TTSJson = require('./TTSJson.js');

const TTS_CARDS_PER_IMAGE = 69;
const TTS_MAX_ROWS = 7;


const getName = () => 'TTSDeck';
const getDescription = () => 'Generates a TTS deck image and JSON file';
const getVersion = () => 1.0;
const getPluginType = () => arkham.plugins.Plugin.INJECTED;

function unload() {
  unregisterAll();
}

// Creates a test button during development that calls unload() to clean up.
testProjectScript();

// TODO: allow setting a default copy count
// Hack to override the default return value of 1
function copyCount(copies_list, name) {
  const entries = copies_list.getListEntries().map(x => String(x));
  if (entries.indexOf(String(name)) == -1) {
    return 1;
  } else {
    return copies_list.getCopyCount(name);
  }
}

// export front face, or retrive it from a cached file
// TODO: handle two-sided cards
function makeCardImage(card, format, resolution) {
  const component = ResourceKit.getGameComponentFromFile(card.file);

  const cache_dir = new File(card.parent.file, '.ttsdeck_cache');
  const cached_file = new File(cache_dir, card.file.name + '.' + format);

  if (cached_file.exists() && cached_file.lastModified() > card.file.lastModified()) {
    println("Got cached image for card", card);
    return ImageUtils.read(cached_file);
  } else {
    println("Generating image for card ", card);
    const sheets = component.createDefaultSheets();
    const card_image = sheets[0].paint(arkham.sheet.RenderTarget.EXPORT, resolution);

    cache_dir.mkdir();
    ImageUtils.write(card_image, cached_file, format, -1, false, resolution);

    return card_image;
  }
}

function TTSDeckPage(busy_props, image_format, image_resolution, page_num, page_cards, copies_list) {
  this.rows = Math.min(Math.ceil(Math.sqrt(page_cards.length)), TTS_MAX_ROWS);
  this.columns = Math.ceil(page_cards.length / this.rows);
  this.deck_image = null;
  let deck_graphics;

  this.card_jsons = [];
  for (let row = 0; row < this.rows; row++) {
    for (let col = 0; col < this.columns && row * this.columns + col < page_cards.length; col++) {
      if (busy_props.cancelled) return;
      let index = row * this.columns + col;
      let card = page_cards[index];
      busy_props.status = "Processing Card " + card;
      busy_props.currentProgress = (page_num - 1) * TTS_CARDS_PER_IMAGE + index;

      try {
        let component = ResourceKit.getGameComponentFromFile(card.file);
        let copies = copyCount(copies_list, card.baseName);

        for (let ii = 0; ii < copies; ii++) {
          this.card_jsons.push(TTSJson.makeCardJSON(page_num * 100 + index, component.getName()));
        }

        let card_image = makeCardImage(card, image_format, image_resolution);

        if (!this.deck_image) {
          this.deck_image = ImageUtils.create(
            card_image.width * this.columns, card_image.height * this.rows, false);
          deck_graphics = this.deck_image.createGraphics();
        }

        deck_graphics.drawImage(card_image, col * card_image.width, row * card_image.height, null);
      } catch (ex) {
        Thread.invokeLater(() => alert('Error while processing ' + card + ': ' + ex, true));
      }
    }
    println("End of Row ", row);
  }

  // TODO: this should either prompt the user or provde automatic uploading somewhere
  this.face_url = String((new File(page_cards[0].parent.file,
                                   page_cards[0].parent.getName() + '_' + page_num + '.' + image_format)).toPath().toUri());
  this.back_url = "TODO";
}

function makeTTSDeck(busy_props, image_format, image_resolution, cards, copies_list) {
  const pages = [];

  busy_props.title = "Processing Cards";
  busy_props.maximumProgress = cards.length;

  for (let page_num = 0; page_num * TTS_CARDS_PER_IMAGE < cards.length; page_num++) {
    let page_cards = cards.slice(page_num * TTS_CARDS_PER_IMAGE, (page_num + 1) * TTS_CARDS_PER_IMAGE);
    printf("Making page %d, with %d cards:\n", page_num + 1, page_cards.length);
    pages.push(new TTSDeckPage(busy_props, image_format, image_resolution, page_num + 1, page_cards, copies_list));
    if (busy_props.cancelled) return [,];
  }

  const deck_json = TTSJson.makeDeckJSON(pages);

  return [deck_json, pages.map(page => page.deck_image)];
}

function settingsDialog(deck_task) {
  const task_settings = deck_task.getSettings();

  const image_format_field = comboBox([
    ImageUtils.FORMAT_JPEG,
    ImageUtils.FORMAT_PNG
  ]);
  image_format_field.setSelectedItem(task_settings.get("tts_image_format", "jpg"));
  const resolution_field = textField(task_settings.get("tts_image_resolution", "200"), 15);

  const clear_cache_button = button("Clear Cache", undefined, function (e) {
    const cache_dir = new File(deck_task.file, '.ttsdeck_cache');
    cache_dir.listFiles().forEach((file) => file.delete());
  });

  const panel = new Grid();
  panel.place(
    "Image Format", "",
    image_format_field, "grow,span",
    "Resolution", "",
    resolution_field, "grow,span",
    clear_cache_button, "grow,span"
  );
  const close_button = panel.createDialog('TTS Export').showDialog();
  return [close_button, image_format_field.getSelectedItem(), Number(resolution_field.text)];
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
      let deck_task = ProjectUtilities.simplify(project, task, member);
      const [close_button, image_format, image_resolution] = settingsDialog(deck_task);

      // User canceled the dialog or closed it without pressing ok
      if (close_button != 1) {
        return;
      }
      // persist settings
      const task_settings = deck_task.getSettings();
      task_settings.set("tts_image_format", image_format);
      task_settings.set("tts_image_resolution", image_resolution);
      deck_task.writeTaskSettings();

      Eons.setWaitCursor(true);
      try {
        Thread.busyWindow(
          (busy_props) => this.performImpl(busy_props, image_format, image_resolution, deck_task),
          'Setting up...',
          true);
      } catch (ex) {
        Error.handleUncaught(ex);
      } finally {
        Eons.setWaitCursor(false);
      }
    },
    performImpl: function performImpl(busy_props, image_format, image_resolution, member) {
      let copies_list;
      try {
        copies_list = new CopiesList(member);
      } catch (ex) {
        copies_list = new CopiesList();
        alert("unable to read copies list, using card count of 2 for all files", true);
      }

      const children = member.getChildren();
      const page_cards = children.filter(child => {
        if (ProjectUtilities.matchExtension(child, 'eon')) {
          let component = ResourceKit.getGameComponentFromFile(child.file);
          return component.isDeckLayoutSupported();
        } else {
          return false;
        }
      });

      const [deck_json, deck_images] = makeTTSDeck(busy_props, image_format, image_resolution, page_cards, copies_list);
      if (busy_props.cancelled) return;
      const saved_object = TTSJson.makeSavedObjectJSON([deck_json], member.getName());

      busy_props.status = "";
      busy_props.maximumProgress = -1;
      busy_props.title = "Writing JSON";
      const json_file = new File(member.file, member.getName() + '.json');
      ProjectUtilities.writeTextFile(json_file, JSON.stringify(saved_object, null, 4));

      busy_props.title = "Writing Images";
      busy_props.maximumProgress = deck_images.length;
      deck_images.forEach((deck_image, index) => {
        busy_props.currentProgress = index;
        const image_file = new File(member.file, member.getName() + '_' + (index + 1) + '.' + image_format);
        ImageUtils.write(deck_image, image_file, image_format, -1, false, image_resolution);
      });

      member.synchronize();
    }
  });

  ActionRegistry.register(ttsDeckAction, Actions.PRIORITY_IMPORT_EXPORT);
}
