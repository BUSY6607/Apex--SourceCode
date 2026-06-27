const { Schema, model } = require("mongoose");

const InteractionPanelSchema = new Schema(

  {

    guildId: {

      type: String,

      required: true,

      index: true,

    },

    channelId: {

      type: String,

      default: null,

    },

    messageId: {

      type: String,

      default: null,

    },

    createdBy: {

      type: String,

      required: true,

    },

    status: {

      type: String,

      enum: ["draft", "published"],

      default: "draft",

    },

    panelType: {

      type: String,

      enum: ["system", "user"],

      required: true,

    },
      
      actionRows: [

  {

    id: { type: String, required: true }, // uuid

    name: { type: String, default: "Action Row" },

    components: [

      {

        type: { type: String, enum: ["button", "select"], required: true },

        data: { type: Object, required: true } // component config

      }

    ]

  }

],

    embed: {

      title: {

        type: String,

        default: "",

      },

      description: {

        type: String,

        default: "",

      },

      color: {

        type: Number,

        default: null,

      },
        
        author: {

    name: {

      type: String,

      default: "",

    },

    iconURL: {

      type: String,

      default: null,

    },

  },

      thumbnail: {

        type: String,

        default: null,

      },

      image: {

        type: String,

        default: null,

      },

    },

  },

  { timestamps: true }

);

module.exports = model("InteractionPanel", InteractionPanelSchema);

