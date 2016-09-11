"use strict";

const TimeGraph = require("@yavuzmester/time-graph");
const React = require("react");
const ReactDOM = require("react-dom");

const props = require('../data.json');

setTimeout(() => {
    const tgs = ReactDOM.render(React.createElement(TimeGraph, props), document.getElementById("root"));
    tgs.on("title-click", () => console.log("title-click"));
}, 100);
