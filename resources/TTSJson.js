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

exports.makeDeckJSON = function makeDeckJSON(pages, nickname, description) {
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
    DeckIDs: pages
      .map(page => page.card_jsons.map(card => card.CardID))
      .reduce((acc, val) => acc.concat(val), []),
    CustomDeck: pages.reduce((acc, page, index) => {
      acc[String(index + 1)] = {
        FaceURL: String(page.face_url),
        BackURL: String(page.back_url),
        NumWidth: page.columns,
        NumHeight: page.rows,
        BackIsHidden: true,
      };
      return acc;
    }, {}),
    ContainedObjects: pages
      .map(page => page.card_jsons)
      .reduce((acc, val) => acc.concat(val), []),
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
