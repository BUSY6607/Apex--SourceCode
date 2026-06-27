const ticketStates = new Map();

function createState(guildId, adminId, messageId) {
    const state = {
        guildId,
        adminId,
        messageId,
        embed: {
            title: `🎫 Support Tickets`,
           description: `Select a category below to create a ticket.`,
           color: `Blue`,
            image: null
        },
        editorMessage: {

  embeds: [],

  components: []

},
        categories: [],
        lastInteractionAt: Date.now(),
        timeout: null
    };
          
          ticketStates.set(guildId, state);
    return state;
}
function resetTimeout(state, onExpire) {
    if (state.timeout)
        clearTimeout(state.timeout);
    
    state.timeout = setTimeout(() => {
        onExpire(state);
    }, 10*60*1000);
}

function deleteState(guildId) {
    const state = ticketStates.get(guildId);
    if (state?.timeout)
        clearTimeout(state.timeout);
    ticketStates.delete(guildId);
}

function getState(guildId) {
    return ticketStates.get(guildId);
}

module.exports = {
    ticketStates,
    createState,
    resetTimeout,
    deleteState,
    getState
};