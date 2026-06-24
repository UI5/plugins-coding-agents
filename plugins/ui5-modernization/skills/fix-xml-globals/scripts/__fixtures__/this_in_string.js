sap.ui.define([], function () {
	return {
		formatDate: function (sDate) {
			var msg = "this.foo not real";
			var msg2 = 'this.bar not real';
			return sDate + msg + msg2;
		}
	};
});
