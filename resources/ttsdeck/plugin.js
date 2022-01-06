/*
 * TTSDeck.js
 *
 * Creates a deck image and corresponding "Saved Object" JSON for use
 * in Tabletop Simulator
 */

useLibrary("project");
useLibrary("imageutils");
useLibrary("threads");
useLibrary("uilayout");
useLibrary("uicontrols");
importClass(arkham.project.CopiesList);

const Card = require("./Card.js");
const { TTSDeck } = require("./TTSDeck.js");
const TTSJson = require("./TTSJson.js");

const getName = () => "TTSDeck";
const getDescription = () => "Generates a TTS deck image and JSON file";
const getVersion = () => 1.0;
const getPluginType = () => arkham.plugins.Plugin.INJECTED;

function unload() {
  unregisterAll();
}

// Creates a test button during development that calls unload() to clean up.
testProjectScript();

function settingsDialog(deck_task) {
  const task_settings = deck_task.getSettings();

  const image_format_field = comboBox([
    ImageUtils.FORMAT_JPEG,
    ImageUtils.FORMAT_PNG,
  ]);
  image_format_field.setSelectedItem(
    task_settings.get("tts_image_format", "jpg")
  );
  const resolution_field = textField(
    task_settings.get("tts_image_resolution", "200"),
    15
  );

  const clear_cache_button = button("Clear Cache", undefined, function (e) {
    const cache_dir = new File(deck_task.file, ".ttsdeck_cache");
    cache_dir.listFiles().forEach((file) => file.delete());
  });

  const panel = new Grid();
  // prettier-ignore
  panel.place(
    "Image Format", "",
    image_format_field, "grow,span",
    "Resolution", "",
    resolution_field, "grow,span",
    clear_cache_button, "grow,span"
  );
  const close_button = panel.createDialog("TTS Export").showDialog();
  return [
    close_button,
    image_format_field.getSelectedItem(),
    Number(resolution_field.text),
  ];
}

function run() {
  const ttsDeckAction = JavaAdapter(TaskAction, {
    getLabel: () => "Generate TTS Deck",
    getActionName: () => "ttsdeck",
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
      const [close_button, image_format, image_resolution] =
        settingsDialog(deck_task);

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
          (busy_props) =>
            this.performImpl(
              busy_props,
              image_format,
              image_resolution,
              deck_task
            ),
          "Setting up...",
          true
        );
      } catch (ex) {
        Error.handleUncaught(ex);
      } finally {
        Eons.setWaitCursor(false);
      }
    },
    performImpl: function performImpl(
      busy_props,
      image_format,
      image_resolution,
      member
    ) {
      let copies_list;
      try {
        copies_list = new CopiesList(member);
      } catch (ex) {
        copies_list = new CopiesList();
        alert(
          "unable to read copies list, using card count of 2 for all files",
          true
        );
      }

      const children = member.getChildren();
      const cards = children
        .map((child) => {
          if (ProjectUtilities.matchExtension(child, "eon")) {
            let card = new Card(child, copies_list);
            if (card.component.isDeckLayoutSupported()) {
              return card;
            }
          }
          return undefined;
        })
        .filter((card) => card !== undefined);

      const deck = new TTSDeck(
        image_format,
        image_resolution,
        cards,
        copies_list
      ).build(busy_props);

      if (busy_props.cancelled) return;

      const saved_object = TTSJson.makeSavedObjectJSON(
        [deck.makeJSON()],
        member.getName()
      );

      busy_props.status = "";
      busy_props.maximumProgress = -1;
      busy_props.title = "Writing JSON";
      const json_file = new File(member.file, member.getName() + ".json");
      ProjectUtilities.writeTextFile(
        json_file,
        JSON.stringify(saved_object, null, 4)
      );

      const deck_images = deck.getImages();
      busy_props.title = "Writing Images";
      busy_props.maximumProgress = deck_images.length;
      deck_images.forEach((deck_image, index) => {
        busy_props.currentProgress = index;
        const image_file = Card.getImageFile(member, image_format, index + 1);
        ImageUtils.write(
          deck_image,
          image_file,
          image_format,
          -1,
          false,
          image_resolution
        );
      });

      let back_image = cards[0].makeImageUncached(image_resolution, true);
      const back_image_file = Card.getImageFile(member, image_format, "back");
      ImageUtils.write(
        back_image,
        back_image_file,
        image_format,
        -1,
        false,
        image_resolution
      );

      member.synchronize();
    },
  });

  ActionRegistry.register(ttsDeckAction, Actions.PRIORITY_IMPORT_EXPORT);
}
