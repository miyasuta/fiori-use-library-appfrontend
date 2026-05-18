// karma-ui5 usage: https://github.com/SAP/karma-ui5
module.exports = function (config) {
    config.set({
        frameworks: ["ui5"],
        browsers: ["Chrome"],
        // Suppress the false "full page reload" error caused by karma-ui5
        // navigating between the testsuite and individual test pages.
        customContextFile: "test/karma-context.html"
    });
};