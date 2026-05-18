/*global QUnit */
import Lib from "sap/ui/core/Lib";

QUnit.module("com.myorg.reuselib library");

QUnit.test("listLoadedShouldIncludeReuselibWhenBootedAsBootLibrary", function (assert) {
	// Arrange: the testsuite boots with "com.myorg.reuselib" as a boot library

	// Act
	const bLoaded = Lib.isLoaded("com.myorg.reuselib");

	// Assert
	assert.ok(bLoaded, "Library 'com.myorg.reuselib' is loaded and registered");
});
