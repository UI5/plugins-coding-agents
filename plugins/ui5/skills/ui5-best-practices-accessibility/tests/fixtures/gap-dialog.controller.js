sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], function(Controller, Dialog, Button, Text) {
    "use strict";

    return Controller.extend("my.app.controller.OrderList", {

        onDeletePress: function () {
            if (!this._oDialog) {
                // GAP: showHeader:false with no ariaLabelledBy — dialog has no accessible name
                this._oDialog = new Dialog({
                    showHeader: false,
                    content: [
                        new Text({ text: "Are you sure you want to delete this order?" })
                    ],
                    buttons: [
                        new Button({
                            text: "Delete",
                            press: this.onConfirmDelete.bind(this)
                        }),
                        new Button({
                            text: "Cancel",
                            press: function () { this._oDialog.close(); }.bind(this)
                        })
                    ]
                });
            }
            this._oDialog.open();
        },

        onConfirmDelete: function () {
            this._oDialog.close();
        }
    });
});
