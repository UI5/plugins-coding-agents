sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/MessageStrip"
], function (Controller, Dialog, Text, Button, MessageStrip) {
	"use strict";

	return Controller.extend("my.procurement.controller.OrderEdit", {

		onSaveError: function (oError) {
			var oDialog = new Dialog({
				title: "Error",
				content: new Text({ text: oError.message }),
				beginButton: new Button({
					text: "OK",
					press: function () {
						oDialog.close();
					}
				})
			});
			oDialog.open();
		},

		onSaveSuccess: function () {
			this.byId("messageArea").addContent(new MessageStrip({
				text: "Purchase order saved",
				type: "Success"
			}));
		}
	});
});
