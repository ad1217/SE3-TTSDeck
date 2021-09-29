// Helper functions for Tabletop Simulator JSON output

exports.makeCardJSON = function makeCardJSON(card_id, nickname, description) {
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
};

exports.makeDeckJSON = function makeDeckJSON(
  face_url, back_url, num_width, num_height, cards, nickname, description) {
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
};

exports.makeSavedObjectJSON = function makeSavedObjectJSON(objects, save_name) {
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
};
