sap.ui.define([], function () {
	return {
		formatTagsText: function () {
			return this.getModel("i18n").getResourceBundle().getText("KEY");
		}
	};
});
