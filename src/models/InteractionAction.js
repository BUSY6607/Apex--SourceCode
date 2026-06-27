const { Schema, model, Types } = require("mongoose");

const InteractionActionSchema = new Schema(

  {

    componentId: {

      type: Types.ObjectId,

      ref: "InteractionComponent",

      required: true,

      unique: true,

    },

    actionType: {

      type: String,

      enum: [

        "add_role",

        "remove_role",

        "toggle_role",

        "send_message",

        "open_ticket",

        "open_application",

        "none",

      ],

      default: "none",

    },

    config: {

      roleId: String,

      message: String,

      ephemeral: {

        type: Boolean,

        default: true,

      },

    },

  },

  { timestamps: true }

);

module.exports = model("InteractionAction", InteractionActionSchema);

