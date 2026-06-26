sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Title",
    "sap/ui/core/library",
    "sap/m/Toolbar",
    "sap/m/Button",
    "sap/m/Text"
], function(Controller, Dialog, Title, coreLibrary, Toolbar, Button, Text) {
    "use strict";

    var TitleLevel = coreLibrary.TitleLevel;

    return Controller.extend("my.app.controller.OrderList", {

        onDeletePress: function () {
            if (!this._oDialog) {
                // CORRECT: customHeader with Title (level H1) — framework automatically links
                // the Title to the dialog via aria-labelledby, no explicit association needed
                this._oDialog = new Dialog({
                    customHeader: new Toolbar({
                        content: [
                            new Title({ text: "Confirm Deletion", level: TitleLevel.H1 })
                        ]
                    }),
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
