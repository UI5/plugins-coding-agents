sap.ui.define([], function () {
	return {
		getKPIsTileCount: function (oEvent) {
			if (oEvent && oEvent.getSource) {
				var src = oEvent.getSource();
				if (src) {
					return this.getBindingContext().getProperty("count");
				}
			}
			return 0;
		}
	};
});
