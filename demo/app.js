"use strict";

const TimeGraphSvg = require("@yavuzmester/time-graph-svg");
const React = require("react");
const ReactDOM = require("react-dom");

const props = require('../data.json');

setTimeout(() => {
    const tgs = ReactDOM.render(React.createElement(TimeGraphSvg, props), document.getElementById("root"));
    tgs.on("title-click", () => console.log("title-click"));
}, 100);
