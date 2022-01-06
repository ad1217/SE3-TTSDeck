// Helper functions for Tabletop Simulator JSON output

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
