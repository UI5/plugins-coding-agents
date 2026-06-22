sap.ui.define([], function () {
	return {
		isKPIsTileCountEnabled: function () {
			var fn = function () { return 1; };
			jQuery.proxy(fn, this);
			return false;
		}
	};
});
