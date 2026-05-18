// eslint-disable-next-line no-undef
sap.ui.define(function() {
	"use strict";

	return {
		name: "QUnit TestSuite for com.myorg.reuselib",
		defaults: {
			bootCore: true,
			ui5: {
				libs: "sap.ui.core,com.myorg.reuselib",
				theme: "sap_fiori_3",
				noConflict: true,
				preload: "auto"
			},
			qunit: {
				version: 2,
				reorder: false
			},
			sinon: {
				version: 4,
				qunitBridge: true,
				useFakeTimers: false
			},
			module: "./{name}.qunit"
		},
		tests: {
			// add test files here once library controls are implemented
		}
	};

});
