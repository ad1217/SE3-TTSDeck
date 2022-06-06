useLibrary("project");

function Card(member, arkhamdb_cycle_prefix, copies_list) {
  this.member = member;
  this.arkhamdb_cycle_prefix = arkhamdb_cycle_prefix;
  this.copies_list = copies_list;

  this.component = ResourceKit.getGameComponentFromFile(member.file);
}

Card.getImageFile = function getImageFile(parent, format, page_num) {
  return new File(
    parent.file,
    parent.getName() + "_" + page_num + "." + format
  );
};

Card.prototype.makeImageUncached = function makeImageUncached(
  resolution,
  back
) {
  println("Generating image for card ", this.member);
  const sheets = this.component.createDefaultSheets();
  const card_image = sheets[back ? 1 : 0].paint(
    arkham.sheet.RenderTarget.EXPORT,
    resolution
  );

  return card_image;
};

// export front face, or retrive it from a cached file
// TODO: handle two-sided cards
Card.prototype.makeImage = function makeImage(format, resolution) {
  const cache_dir = new File(this.member.parent.file, ".ttsdeck_cache");
  const cached_file = new File(cache_dir, this.member.file.name + "." + format);

  if (
    cached_file.exists() &&
    cached_file.lastModified() > this.member.file.lastModified()
  ) {
    println("Got cached image for card", this.member);
    return ImageUtils.read(cached_file);
  } else {
    const card_image = this.makeImageUncached(resolution);

    cache_dir.mkdir();
    ImageUtils.write(card_image, cached_file, format, -1, false, resolution);

    return card_image;
  }
};

// TODO: allow setting a default copy count
// Hack to override the default return value of 1
Card.prototype.copyCount = function copyCount() {
  const entries = this.copies_list.getListEntries().map((x) => String(x));
  if (entries.indexOf(String(this.member.baseName)) == -1) {
    return 1;
  } else {
    return this.copies_list.getCopyCount(this.member.baseName);
  }
};

Card.prototype.makeJSON = function makeJSON(card_id, description) {
  let card = {
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
    Nickname: this.component.getName(),
    CardID: card_id,
    Description: description || "",
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

  // TODO: could also do other fields, like "uses"
  // Hack for AHLCG SCED deckbuilder
  if (this.arkhamdb_cycle_prefix) {
    let arkhamdb_id =
      this.arkhamdb_cycle_prefix +
      String(this.component.settings.get("CollectionNumber")).padStart(3, "0");

    card.GMNotes = JSON.stringify({
      id: arkhamdb_id,
    });
  }

  return card;
};

module.exports = Card;
