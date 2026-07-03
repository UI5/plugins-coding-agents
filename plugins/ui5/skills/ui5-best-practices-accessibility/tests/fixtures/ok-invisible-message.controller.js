sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageStrip",
    "sap/ui/core/InvisibleMessage",
    "sap/ui/core/library"
], function(Controller, MessageStrip, InvisibleMessage, library) {
    "use strict";

    var InvisibleMessageMode = library.InvisibleMessageMode;

    return Controller.extend("my.app.controller.OrderList", {

        onInit: function () {
            // CORRECT: InvisibleMessage singleton obtained once on init
            this.oInvisibleMessage = InvisibleMessage.getInstance();
        },

        onSaveSuccess: function () {
            // CORRECT: MessageStrip added dynamically AND announced to screen reader users
            var sText = "Order #12345 was saved successfully.";
            var sType = "Success";
            var oVBox = this.byId("messageContainer");
            oVBox.addItem(new MessageStrip({
                text: sText,
                type: sType,
                showCloseButton: true,
                close: function (oEvent) {
                    oVBox.removeItem(oEvent.getSource());
                }
            }));
            this.oInvisibleMessage.announce(
                "New message of type " + sType + " " + sText,
                InvisibleMessageMode.Polite
            );
        },

        onSubmitError: function () {
            // CORRECT: error MessageStrip added dynamically and announced assertively
            var sText = "Submission failed. Please check required fields.";
            var sType = "Error";
            var oVBox = this.byId("messageContainer");
            oVBox.addItem(new MessageStrip({
                text: sText,
                type: sType,
                showCloseButton: true,
                close: function (oEvent) {
                    oVBox.removeItem(oEvent.getSource());
                }
            }));
            this.oInvisibleMessage.announce(
                "New message of type " + sType + " " + sText,
                InvisibleMessageMode.Assertive
            );
        }
    });
});
