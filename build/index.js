"use strict";

const { EventEmitterMixin } = require("event-emitter-mixin");
const React = require("react"),
      Component = EventEmitterMixin(React.Component),
      PropTypes = React.PropTypes;
const ReactDOM = require("react-dom");
const d3 = require("d3");
const _ = require("underscore");

const propTypes = {
    title: PropTypes.string,
    valueAxisTitle: PropTypes.string,
    divWidth: PropTypes.number.isRequired,
    divHeight: PropTypes.number.isRequired,
    svgMargin: PropTypes.shape({
        left: PropTypes.number.isRequired,
        right: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        bottom: PropTypes.number.isRequired
    }).isRequired,
    data: PropTypes.arrayOf(PropTypes.shape({
        isoDate: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        groupId: PropTypes.string.isRequired
    }).isRequired).isRequired,
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired
    }).isRequired).isRequired,
    groupIdsToSum: PropTypes.arrayOf(PropTypes.string.isRequired),
    groupSumColor: PropTypes.string,
    logScale: PropTypes.bool,
    valueAxisTicksEnabled: PropTypes.bool,
    brushEnabled: PropTypes.bool
};

const defaultProps = {
    title: "",
    valueAxisTitle: "",
    groupIdsToSum: [],
    logScale: false,
    valueAxisTicksEnabled: false,
    brushEnabled: false
};

class TimeGraph extends Component {
    constructor(props = {}) {
        _.defaults(props, defaultProps);
        super(props);
    }

    svgWidth() {
        const { divWidth, svgMargin } = this.props;
        return divWidth - svgMargin.left - svgMargin.right;
    }

    svgHeight() {
        const { divHeight, svgMargin } = this.props;
        return divHeight - svgMargin.top - svgMargin.bottom;
    }

    groups() /*: array<object> */{
        const { groups, groupSumColor } = this.props;

        return groups.concat(groupSumColor ? [{
            id: "group-sum",
            color: groupSumColor
        }] : []);
    }

    groupSumData(groupIdsToSum /*: array<string> */) /*: array<object> */{
        if (groupIdsToSum.length == 0) {
            return [];
        } else {
            const { data } = this.props;

            const groupedData /*: object */ = _.groupBy(data, d => d.isoDate);

            return _.map(groupedData, (groupData, isoDate) => {
                return {
                    isoDate: isoDate,
                    value: groupData.filter(d => groupIdsToSum.indexOf(d.groupId) >= 0).reduce((memo, gd) => memo + gd.value, 0),
                    groupId: "group-sum"
                };
            });
        }
    }

    data() /*: array<object> */{
        const { data, groupIdsToSum } = this.props;

        const groupSumData = this.groupSumData(groupIdsToSum);

        return this._sortData(data.concat(groupSumData));
    }

    _sortData(data /*: array<object> */) /*: array<object> */{
        return _.sortBy(data, d => new Date(d.isoDate));
    }

    xDomain() {
        const data = this.data();
        return d3.extent(data, d => new Date(d.isoDate));
    }

    xRange() {
        const svgWidth = this.svgWidth();
        return [0, svgWidth];
    }

    xScale() {
        const xDomain = this.xDomain();
        return d3.scaleTime().domain(xDomain).range(this.xRange());
    }

    xAxis() {
        const xScale = this.xScale();
        return d3.axisBottom(xScale);
    }

    yDomain() {
        const { logScale } = this.props,
              data = this.data();

        return [!logScale ? 0 : 1, d3.max(data, d => d.value)];
    }

    yRange() {
        const svgHeight = this.svgHeight();
        return [svgHeight, 0];
    }

    yScale() {
        const { logScale } = this.props;
        const yDomain = this.yDomain();
        const yRange = this.yRange();

        if (!logScale) {
            return d3.scaleLinear().domain(yDomain).range(yRange);
        } else {
            return d3.scaleLog().domain(yDomain).range(yRange);
        }
    }

    yAxis() {
        const { valueAxisTicksEnabled } = this.props;
        const yScale = this.yScale();
        const yAxis = d3.axisLeft(yScale);

        if (valueAxisTicksEnabled) {
            return yAxis.ticks(3, ",.0s");
        } else {
            return yAxis.ticks(() => "");
        }
    }

    lineGen() {
        const xScale = this.xScale();
        const yScale = this.yScale();
        return d3.line().x(d => xScale(new Date(d.isoDate))).y(d => yScale(d.value));
    }

    render() {
        const { title, valueAxisTitle, divWidth, divHeight, svgMargin, brushEnabled } = this.props,
              svgHeight = this.svgHeight();

        return (
            /* Margin convention in D3: https://gist.github.com/mbostock/3019563 */
            React.createElement(
                "div",
                { className: "time-graph" },
                React.createElement(
                    "svg",
                    { width: divWidth, height: divHeight },
                    React.createElement(
                        "g",
                        { className: "margin axis", transform: "translate(" + svgMargin.left + "," + svgMargin.top + ")" },
                        React.createElement("g", { className: "x axis", transform: "translate(0," + svgHeight + ")" }),
                        React.createElement("g", { className: "y axis", transform: "translate(0,0)" }),
                        brushEnabled ? React.createElement("g", { className: "x brush" }) : "",
                        React.createElement(
                            "text",
                            { x: "-10", y: "-10" },
                            React.createElement(
                                "tspan",
                                null,
                                title
                            )
                        ),
                        React.createElement(
                            "text",
                            { x: "5", y: "5" },
                            React.createElement(
                                "tspan",
                                null,
                                valueAxisTitle
                            )
                        ),
                        " :"
                    )
                )
            )
        );
    }

    componentDidMount() {
        const { brushEnabled } = this.props;

        this.componentDidMountOrUpdate();

        if (brushEnabled) {
            this.createBrush();
        }
    }

    componentDidUpdate() {
        this.componentDidMountOrUpdate();
    }

    componentDidMountOrUpdate() {
        const data = this.data(),
              groups = this.groups(),
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
            const color = groups.find(g => g.id === groupId).color;

            if (groupData.length > 2) {
                marginAxisNode.append("path").attr("class", "line").attr("d", lineGen(groupData)).attr("style", "stroke-width: 2px; fill: none; stroke: " + color);
            }
        });
    }

    createBrush() {
        const svgWidth = this.svgWidth(),
              svgHeight = this.svgHeight(),
              xScale = this.xScale();

        const brushNode = d3.select(ReactDOM.findDOMNode(this)).select("g.x.brush");

        const brush = d3.brushX();
        brush.extent([[0, 0], [svgWidth, svgHeight]]);

        brush.on("end", () => {
            if (d3.event && d3.event.sourceEvent) {
                const newBrushSelection = d3.event.selection ? d3.event.selection.map(s => xScale.invert(s).toISOString()) : null;

                this.emit("brush", { newBrushSelection: newBrushSelection });
            }
        });

        brushNode.call(brush).selectAll("rect").attr("y", 0).attr("height", svgHeight);
    }
} //end of TimeGraph component def

TimeGraph.propTypes = propTypes;
TimeGraph.defaultProps = defaultProps;

module.exports = TimeGraph;
