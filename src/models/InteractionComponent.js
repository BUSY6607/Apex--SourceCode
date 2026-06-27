const { Schema, model, Types } = require("mongoose");

const InteractionComponentSchema = new Schema(

  {

    panelId: {

      type: Types.ObjectId,

      ref: "InteractionPanel",

      required: true,

      index: true,

    },

    actionRowIndex: {

      type: Number,

      min: 0,

      max: 4,

      required: true,

    },

    componentType: {

      type: String,

      enum: ["button", "select_menu"],

      required: true,

    },

    data: {

      // button

      label: String,

      emoji: String,

      style: {

        type: String,

        enum: ["primary", "secondary", "success", "danger"],

      },

      // select menu

      placeholder: String,

      minValues: Number,

      maxValues: Number,

      options: [

        {

          label: String,

          value: String,

          emoji: String,

        },

      ],

    },

  },

  { timestamps: true }

);

module.exports = model("InteractionComponent", InteractionComponentSchema);

