"use strict";

const React = require("react");
const ReactDOM = require("react-dom");
const d3 = require("d3");
const EventEmitter = require("events").EventEmitter;
const _ = require("underscore");

const TimeGraphSvg = React.createClass({
    propTypes: {
        title: React.PropTypes.string.isRequired,
        yAxisTitle: React.PropTypes.string.isRequired,
        divWidth: React.PropTypes.number.isRequired,
        divHeight: React.PropTypes.number.isRequired,
        svgMargin: React.PropTypes.shape({
            left: React.PropTypes.number.isRequired,
            right: React.PropTypes.number.isRequired,
            top: React.PropTypes.number.isRequired,
            bottom: React.PropTypes.number.isRequired
        }).isRequired,
        svgWidth: React.PropTypes.number.isRequired,
        svgHeight: React.PropTypes.number.isRequired,
        data: React.PropTypes.arrayOf(      //Caution: lineGen expects data to be in order
            React.PropTypes.shape({
                isoDate: React.PropTypes.string.isRequired,
                value: React.PropTypes.number.isRequired,
                groupId: React.PropTypes.string.isRequired
            }).isRequired
        ).isRequired,
        groups: React.PropTypes.arrayOf(
            React.PropTypes.shape({
                groupId: React.PropTypes.string.isRequired,
                groupColor: React.PropTypes.string.isRequired
            }).isRequired
        ).isRequired,
        logaxis: React.PropTypes.bool.isRequired,
        yAxisTicksEnabled: React.PropTypes.bool,
        brushEnabled: React.PropTypes.bool
    },

    xDomain: function() {
        const {data} = this.props;
        return d3.extent(data, d => new Date(d.isoDate));
    },

    xRange: function() {
        const {svgWidth} = this.props;
        return [0, svgWidth];
    },

    xScale: function() {
        const xDomain = this.xDomain();
        return d3.scaleTime().domain(xDomain).range(this.xRange());
    },

    xAxis: function() {
        const xScale = this.xScale();
        return d3.axisBottom(xScale);
    },

    yDomain: function() {
        const {logaxis} = this.props;
        const {data} = this.props;
        return [!logaxis ? 0 : 1, d3.max(data, d => d.value)];
    },

    yRange: function() {
        const {svgHeight} = this.props;
        return [svgHeight, 0];
    },

    yScale: function() {
        const {logaxis} = this.props;
        const yDomain = this.yDomain();
        const yRange = this.yRange();

        if (!logaxis) {
            return d3.scaleLinear().domain(yDomain).range(yRange);
        }
        else {
            return d3.scaleLog().domain(yDomain).range(yRange);
        }
    },

    yAxis: function() {
        const {yAxisTicksEnabled} = this.props;
        const yScale = this.yScale();
        const yAxis = d3.axisLeft(yScale);

        if (yAxisTicksEnabled) {
            return yAxis.ticks(3, ",.0s");
        }
        else {
            return yAxis.ticks(() => "");
        }
    },

    lineGen: function() {
        const xScale = this.xScale();
        const yScale = this.yScale();
        return d3.line().x(d => xScale(new Date(d.isoDate))).y(d => yScale(d.value));
    },

    render: function() {
        const {title, yAxisTitle, divWidth, divHeight, svgMargin, svgWidth, svgHeight, brushEnabled} = this.props;

        return (
            /* Margin convention in D3: https://gist.github.com/mbostock/3019563 */
            <svg width={divWidth} height={divHeight}>
                <g className="margin axis" transform={"translate(" + svgMargin.left + "," + svgMargin.top + ")"}>
                    <g className="x axis" transform={"translate(0," + svgHeight + ")"}/>
                    <g className="y axis" transform={"translate(0,0)"}/>
                    {brushEnabled ? <g className="x brush"/> : ""}

                    <text x="-10" y="-10">
                        <tspan>{title}</tspan>
                    </text>

                    <text x="5" y="5">
                        <tspan>{yAxisTitle}</tspan>
                    </text> :
                </g>
            </svg>
        );
    },

    componentDidMount: function() {
        const {brushEnabled} = this.props;

        this.componentDidMountOrUpdate();

        if (brushEnabled) {
            this.createBrush();
        }
    },

    componentDidUpdate: function() {
        this.componentDidMountOrUpdate();
    },

    componentDidMountOrUpdate: function() {
        const {data, groups} = this.props,
            xAxis = this.xAxis(),
            yAxis = this.yAxis(),
            lineGen = this.lineGen();

        const marginAxisNode = d3.select(ReactDOM.findDOMNode(this)).select("g.margin.axis"),
            xAxisNode = marginAxisNode.select("g.x.axis"),
            yAxisNode = marginAxisNode.select("g.y.axis");

        //update axes
        xAxisNode.call(xAxis);
        yAxisNode.call(yAxis);

        //lines
        marginAxisNode.selectAll(".line").remove();
        _.each(_.groupBy(data, d => d.groupId), (groupData, groupId) => {
            const color = _.find(groups, g => g.groupId === groupId).groupColor;

            if (groupData.length > 2) {
                marginAxisNode.append("path").
                    attr("class", "line").
                    attr("d", lineGen(groupData)).
                    attr("style", "stroke-width: 2px; fill: none; stroke: " + color);
            }
        });
    },

    createBrush: function() {
        const {svgWidth, svgHeight,} = this.props,
            xScale = this.xScale();

        const brushNode = d3.select(ReactDOM.findDOMNode(this)).select("g.x.brush");

        const brush = d3.brushX();
        brush.extent([[0, 0], [svgWidth, svgHeight]]);

        brush.on("end", () => {
            if (d3.event && d3.event.sourceEvent) {
                const newBrushSelection = d3.event.selection ?
                    _.map(d3.event.selection, s => xScale.invert(s).toISOString()) : null;

                this.emit("brush", {newBrushSelection: newBrushSelection});
            }
        });

        brushNode.call(brush).selectAll("rect").attr("y", 0).attr("height", svgHeight);
    }
}); //end of TimeGraphSvg component def

Object.assign(
    TimeGraphSvg.prototype,
    EventEmitter.prototype
);

module.exports = TimeGraphSvg;
