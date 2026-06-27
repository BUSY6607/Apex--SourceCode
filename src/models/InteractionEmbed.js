const mongoose = require('mongoose');

const InteractionEmbedSchema = new mongoose.Schema({

  name: {

    type: String,

    required: true

  },

  guildId: {

    type: String,

    required: true

  },

  embed: {

    type: Object,

    required: true

  },

  createdBy: {

    type: String,

    required: true

  },

  createdAt: {

    type: Date,

    default: Date.now

  }

});

module.exports = mongoose.model('InteractionEmbed', InteractionEmbedSchema);

