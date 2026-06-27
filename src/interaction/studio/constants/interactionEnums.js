// PANEL

const PANEL_STATUS = Object.freeze({

  DRAFT: "draft",

  PUBLISHED: "published",

});

const PANEL_TYPE = Object.freeze({

  SYSTEM: "system",

  USER: "user",

});

// COMPONENT

const COMPONENT_TYPE = Object.freeze({

  BUTTON: "button",

  SELECT_MENU: "select_menu",

});

// ACTIONS

const ACTION_TYPE = Object.freeze({

  ASSIGN_ROLE: "assign_role",

  REMOVE_ROLE: "remove_role",

  TOGGLE_ROLE: "toggle_role",

  SEND_MESSAGE: "send_message",

  OPEN_TICKET: "open_ticket",

  OPEN_APPLICATION: "open_application",

  NONE: "none",

});

// BUTTON STYLE (Discord mapping)

const BUTTON_STYLE = Object.freeze({

  PRIMARY: "primary",

  SECONDARY: "secondary",

  SUCCESS: "success",

  DANGER: "danger",

});

// EDITOR SESSION MODES

const SESSION_MODE = Object.freeze({

  EDITOR: "editor",

  EMBED_EDIT: "embed_edit",

  ACTION_ROW: "action_row",

  ACTION_ROW_EDITOR: "action_row_editor",
    
  BUTTON_EDITOR: 'BUTTON_EDITOR',
    
    BUTTON_VISIBILITY_SELECTOR: 'BUTTON_VISIBILITY_SELECTOR',
    
    SELECT_OPTION_VISIBILITY_SELECTOR: 'SELECT_OPTION_VISIBILITY_SELECTOR',

  BUTTON_ACTION_SELECTOR: 'BUTTON_ACTION_SELECTOR',
    
    BUTTON_COLOR_SELECTOR: 'BUTTON_COLOR_SELECTOR',

  BUTTON_BUILDER: "button_builder",

  SELECT_BUILDER: "select_builder",
    
    SELECT_MENU_EDITOR: "SELECT_MENU_EDITOR",

SELECT_MENU_OPTION_EDITOR: "SELECT_MENU_OPTION_EDITOR",

SELECT_MENU_ACTION_SELECTOR: "SELECT_MENU_ACTION_SELECTOR",

  ACTION_BIND: "action_bind",

});



module.exports = {

  PANEL_STATUS,

  PANEL_TYPE,

  COMPONENT_TYPE,

  ACTION_TYPE,

  BUTTON_STYLE,

  SESSION_MODE,

};

