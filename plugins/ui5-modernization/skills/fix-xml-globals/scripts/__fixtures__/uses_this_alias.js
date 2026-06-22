sap.ui.define([], function () {
	return {
		formatViaAlias: function () {
			var self = this;
			return self.getModel("foo");
		}
	};
});
