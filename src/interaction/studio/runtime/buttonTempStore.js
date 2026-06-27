const buttonStore = new Map();

function setTempButton(messageId, button) {

  buttonStore.set(messageId, button);

}

function getTempButton(messageId) {

  return buttonStore.get(messageId) || null;

}

function clearTempButton(messageId) {

  buttonStore.delete(messageId);

}

module.exports = { setTempButton, getTempButton, clearTempButton };

