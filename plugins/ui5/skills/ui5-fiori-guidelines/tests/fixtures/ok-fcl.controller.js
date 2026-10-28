sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/f/FlexibleColumnLayoutSemanticHelper"
], function (Controller, FlexibleColumnLayoutSemanticHelper) {
	"use strict";

	return Controller.extend("my.procurement.controller.OrderList", {

		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
		},

		_getHelper: function () {
			var oFCL = this.getOwnerComponent().getRootControl().byId("fcl");
			return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, { maxColumnsCount: 2 });
		},

		onListItemPress: function (oEvent) {
			var sOrderId = oEvent.getSource().getBindingContext().getProperty("OrderID");
			var oNextUIState = this._getHelper().getNextUIState(1);

			this.oRouter.navTo("detail", {
				layout: oNextUIState.layout,
				orderId: sOrderId
			});
		}
	});
});
