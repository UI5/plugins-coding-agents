sap.ui.define([], function () {
	return {
		formatViaArrow: function () {
			var f = () => this.x;
			return f();
		}
	};
});
