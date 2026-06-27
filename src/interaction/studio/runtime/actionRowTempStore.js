const actionRowStore = new Map();

/**

 * Create / overwrite temp action row for a message

 */

function setTempActionRow(messageId, row) {

  actionRowStore.set(messageId, row);

}

/**

 * Get temp action row

 */

function getTempActionRow(messageId) {

  return actionRowStore.get(messageId) || null;

}

/**

 * Clear temp action row

 */

function clearTempActionRow(messageId) {

  actionRowStore.delete(messageId);

}

module.exports = {

  setTempActionRow,

  getTempActionRow,

  clearTempActionRow

};

