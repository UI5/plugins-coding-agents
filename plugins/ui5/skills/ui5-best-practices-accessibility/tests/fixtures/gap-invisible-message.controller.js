sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageStrip"
], function(Controller, MessageStrip) {
    "use strict";

    return Controller.extend("my.app.controller.OrderList", {

        onInit: function () {
            // GAP: InvisibleMessage not instantiated — no screen reader announcements
        },

        onSaveSuccess: function () {
            // GAP: MessageStrip added dynamically to the VBox — visible to sighted users
            // but never announced to screen reader users; InvisibleMessage.announce() missing
            var oVBox = this.byId("messageContainer");
            oVBox.addItem(new MessageStrip({
                text: "Order #12345 was saved successfully.",
                type: "Success",
                showCloseButton: true,
                close: function (oEvent) {
                    oVBox.removeItem(oEvent.getSource());
                }
            }));
        },

        onSubmitError: function () {
            // GAP: error MessageStrip added dynamically — AT users receive no announcement
            var oVBox = this.byId("messageContainer");
            oVBox.addItem(new MessageStrip({
                text: "Submission failed. Please check required fields.",
                type: "Error",
                showCloseButton: true,
                close: function (oEvent) {
                    oVBox.removeItem(oEvent.getSource());
                }
            }));
        }
    });
});
