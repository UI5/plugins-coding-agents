sap.ui.define([], function () {
	"use strict";
	return {
		formatDate: function (sDate) {
			if (!sDate) {
				return "";
			}
			return new Date(sDate).toLocaleDateString();
		}
	};
});
