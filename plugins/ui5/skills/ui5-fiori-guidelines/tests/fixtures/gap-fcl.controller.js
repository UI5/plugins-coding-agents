sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/mvc/XMLView"
], function (Controller, XMLView) {
	"use strict";

	return Controller.extend("my.procurement.controller.OrderList", {

		onListItemPress: function (oEvent) {
			var oFCL = this.getView().getParent().getParent();
			var sPath = oEvent.getSource().getBindingContext().getPath();

			XMLView.create({ viewName: "my.procurement.view.OrderDetail" }).then(function (oDetailView) {
				oDetailView.bindElement(sPath);
				oFCL.addMidColumnPage(oDetailView);
				oFCL.setLayout("TwoColumnsMidExpanded");
			});
		},

		onCloseDetail: function () {
			this.getView().getParent().getParent().setLayout("OneColumn");
		}
	});
});
