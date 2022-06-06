useLibrary("threads");

const Card = require("ttsdeck/Card.js");

const TTS_CARDS_PER_IMAGE = 69;
const TTS_MAX_ROWS = 7;

function TTSDeckPage(image_format, image_resolution, page_num, cards) {
  this.image_format = image_format;
  this.image_resolution = image_resolution;
  this.page_num = page_num;
  this.cards = cards;

  this.rows = Math.min(Math.ceil(Math.sqrt(cards.length)), TTS_MAX_ROWS);
  this.columns = Math.ceil(cards.length / this.rows);
  this.deck_image = null;
  this.card_jsons = [];

  this.face_url = String(
    Card.getImageFile(cards[0].member.parent, image_format, this.page_num)
      .toPath()
      .toUri()
  );
  this.back_url = String(
    Card.getImageFile(cards[0].member.parent, image_format, "back")
      .toPath()
      .toUri()
  );
}

TTSDeckPage.prototype.build = function build(busy_props) {
  let deck_graphics;

  for (let row = 0; row < this.rows; row++) {
    for (
      let col = 0;
      col < this.columns && row * this.columns + col < this.cards.length;
      col++
    ) {
      if (busy_props.cancelled) return this;

      let index = row * this.columns + col;
      let card = this.cards[index];
      busy_props.status = "Processing Card " + card.member;
      busy_props.currentProgress =
        (this.page_num - 1) * TTS_CARDS_PER_IMAGE + index;

      try {
        let copies = card.copyCount();

        for (let ii = 0; ii < copies; ii++) {
          this.card_jsons.push(card.makeJSON(this.page_num * 100 + index));
        }

        let card_image = card.makeImage(
          this.image_format,
          this.image_resolution
        );

        if (!this.deck_image) {
          this.deck_image = ImageUtils.create(
            card_image.width * this.columns,
            card_image.height * this.rows,
            false
          );
          deck_graphics = this.deck_image.createGraphics();
        }

        deck_graphics.drawImage(
          card_image,
          col * card_image.width,
          row * card_image.height,
          null
        );
      } catch (ex) {
        Thread.invokeLater(() =>
          alert("Error while processing " + card + ": " + ex, true)
        );
      }
    }
    println("End of Row ", row);
  }

  return this;
};

function TTSDeck(image_format, image_resolution, cards) {
  this.image_format = image_format;
  this.image_resolution = image_resolution;
  this.cards = cards;

  this.pages = [];
}

TTSDeck.prototype.build = function build(busy_props) {
  busy_props.title = "Processing Cards";
  busy_props.maximumProgress = this.cards.length;

  for (
    let page_num = 0;
    page_num * TTS_CARDS_PER_IMAGE < this.cards.length;
    page_num++
  ) {
    if (busy_props.cancelled) return this;

    let page_cards = this.cards.slice(
      page_num * TTS_CARDS_PER_IMAGE,
      (page_num + 1) * TTS_CARDS_PER_IMAGE
    );
    printf("Making page %d, with %d cards:\n", page_num + 1, page_cards.length);
    this.pages.push(
      new TTSDeckPage(
        this.image_format,
        this.image_resolution,
        page_num + 1,
        page_cards
      ).build(busy_props)
    );
  }

  return this;
};

TTSDeck.prototype.getImages = function getImages() {
  return this.pages.map((page) => page.deck_image);
};

TTSDeck.prototype.makeJSON = function makeJSON(nickname, description) {
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
    Nickname: nickname || "",
    Description: description || "",
    ColorDiffuse: {
      r: 0.713239133,
      g: 0.713239133,
      b: 0.713239133,
    },
    Grid: true,
    Locked: false,
    SidewaysCard: false,
    DeckIDs: this.pages
      .map((page) => page.card_jsons.map((card) => card.CardID))
      .reduce((acc, val) => acc.concat(val), []),
    CustomDeck: this.pages.reduce((acc, page, index) => {
      acc[String(index + 1)] = {
        FaceURL: page.face_url,
        BackURL: page.back_url,
        NumWidth: page.columns,
        NumHeight: page.rows,
        BackIsHidden: true,
      };
      return acc;
    }, {}),
    ContainedObjects: this.pages
      .map((page) => page.card_jsons)
      .reduce((acc, val) => acc.concat(val), []),
  };
};

module.exports = {
  TTSDeckPage: TTSDeckPage,
  TTSDeck: TTSDeck,
};
