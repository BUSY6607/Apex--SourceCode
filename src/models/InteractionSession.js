const { Schema, model, Types } = require("mongoose");

const InteractionSessionSchema = new Schema(

  {

    userId: {

      type: String,

      required: true,

      index: true,

    },
      
      isProcessing: {

  type: Boolean,

  default: false

},

    guildId: {

      type: String,

      required: true,

    },

    panelId: {

      type: Types.ObjectId,

      ref: "InteractionPanel",

      required: true,

    },

    mode: {

      type: String,

      enum: [

        "editor",

        "embed_edit",

        "action_row",
          
        "action_row_editor",
          
        'BUTTON_EDITOR',

        'BUTTON_ACTION_SELECTOR',
          "BUTTON_VISIBILITY_SELECTOR",
          
          'BUTTON_COLOR_SELECTOR',

        "button_builder",

        "select_builder",

        "action_bind",
          
          "SELECT_MENU_EDITOR",

  "SELECT_MENU_OPTION_EDITOR",

  "SELECT_MENU_ACTION_SELECTOR",
          "SELECT_OPTION_VISIBILITY_SELECTOR"

      ],

      default: "editor",

    },

    lastUpdated: {

      type: Date,

      default: Date.now,

    },

  },

  { timestamps: true }

);

// one active session per user

InteractionSessionSchema.index({ userId: 1 }, { unique: true });

module.exports = model("InteractionSession", InteractionSessionSchema);

