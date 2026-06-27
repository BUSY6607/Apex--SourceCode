const tempSelectMenus = new Map();

function setTempSelectMenu(messageId, menu) {

  tempSelectMenus.set(messageId, menu);

}

function getTempSelectMenu(messageId) {

  return tempSelectMenus.get(messageId);

}

function clearTempSelectMenu(messageId) {

  tempSelectMenus.delete(messageId);

}

module.exports = {

  setTempSelectMenu,

  getTempSelectMenu,

  clearTempSelectMenu

};