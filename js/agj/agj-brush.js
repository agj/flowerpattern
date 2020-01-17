
/**
 * Classes for recording user drawing input.
 *
 * Depends on: agj.js
 *
 * Created by agj (www.agj.cl).
 */

 /*global AGJ:false*/
 /*global signals:false*/
;(function (that) {
	"use strict";

	// Imports.
	var Class = AGJ.Class;
	var Point = AGJ.Point;
	var Signal = signals.Signal;
	var defineModule = AGJ.defineModule;

	// Namespace definition.
	var brush = defineModule(AGJ, "graphics.brush");

	var StrokeGenerator = defineModule(brush, "StrokeGenerator", Class.extend({
		init: function () {
			this._strokes = [];
			this._strokeStatuses = new AGJ.Dictionary();
		},

		startStroke: function (x, y) { // Stroke
			var stroke = new Stroke(new Point(x, y));
			stroke.addNode(new StrokeNode(0, 0, 0));
			this._strokes.push(stroke);

			var status = {};
			status.startTime = status.previousTime = AGJ.getTime();
			this._strokeStatuses.set(stroke, status);

			return stroke;
		},

		extendStroke: function (stroke, x, y) { // StrokeNode
			var time = AGJ.getTime();

			var status = this._strokeStatuses.get(stroke);
			var node = new StrokeNode(x - stroke.center.x, y - stroke.center.y, time - status.previousTime);
			stroke.addNode(node);
			status.previousTime = time;

			return node;
		},

		endStroke: function (stroke) {
			stroke.kill();
			this._strokes.remove(stroke);
			this._strokeStatuses.remove(stroke);
		},

		destroy: function () {
			this._super("destroy")();

			AGJ.destroy([
				this._strokeStatuses
			]);
			this._strokes = null;
			this._strokeStatuses = null;
		}
	}));

	var Stroke = defineModule(brush, "Stroke", Class.extend({
		init: function (pointCenter) {
			this.center = pointCenter;
			this.nodes = [];

			this._isLive = true;
			this._waitCallModifiedCallback = null;
		},

		addNode: function (strokeNode) {
			if (!this._isLive)
				throw "This stroke has been killed, so you cannot add nodes to it.";
			this.nodes.push(strokeNode);
			this._waitCallModified();
		},

		kill: function () {
			if (!this._isLive)
				throw "This stroke has already been killed.";
			this._isLive = false;
			this._waitCallModified();
		},

		getIsLive: function () {
			return this._isLive;
		},

		getModified: function () {
			if (!this._modified)
				this._modified = new Signal();
			return this._modified;
		},

		toString: function () {
			return "[" + this.center.x + "," + this.center.y + "]";
		},

		_waitCallModified: function () {
			if (this._modified && this._modified.getNumListeners() > 0) {
				if (!this._waitCallModifiedCallback)
					this._waitCallModifiedCallback = AGJ.getCallback(this._callModified, null, this);
				setTimeout(this._waitCallModifiedCallback, 0);
			}
		},
		_callModified: function () {
			this._modified.dispatch();
		}
	}));

	var StrokeNode = defineModule(brush, "StrokeNode", Class.extend({
		init: function (x, y, numberDelay) {
			this.x = x;
			this.y = y;
			this.delay = numberDelay;
		},

		getData: function () {
			if (!this._data)
				this._data = {};
			return this._data;
		},
		setData: function (value) {
			this._data = value;
		},

		toString: function () {
			return "[" + this.x + "," + this.y + " " + this.delay + "]";
		}
	}));

})(this);

