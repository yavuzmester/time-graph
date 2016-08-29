"use strict";

const React = require("react");
const TimeGraphSvg = require("..");
const ReactTestUtils = require("react-addons-test-utils");
const {jsdom} = require("jsdom");
const assert = require("assert");

const props = require('../data.json');

createDocument();

describe("<TimeGraphSvg/>", function() {
    it("should render", function() {
        const renderer = ReactTestUtils.createRenderer();

        renderer.render(React.createElement(TimeGraphSvg, props), document.getElementById("root"));
        const result = renderer.getRenderOutput();

        assert.notStrictEqual(result, null);
    });
});

function createDocument() {
    const document = jsdom("<html><body><div id='root'/></body></html>");
    const window = document.defaultView;
    global.document = document;
    global.window = window;

    Object.keys(window).forEach((key) => {
        if (!(key in global)) {
            global[key] = window[key];
        }
    });

    return document;
}