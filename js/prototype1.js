// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of GeoJSON features for count locations and counts
var countlocs = [],
    counts = [];

function main_app() {
	map = L.map('map').setView([regionCenterLat, regionCenterLng], initialZoom);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	var _DEBUG_HOOK_ = 0;
} // main_app()

var pointsURL = 'data/json/ctps_bp_count_locations_pt.geo.json',
    countsURL = 'data/json/bp_counts.json';
	
var getJson = function(url) { return $.get(url, null, 'json'); };


function initialize() {
	 $.when(getJson(pointsURL), getJson(countsURL)).done(function(bp_countlocs, bp_counts ) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more requests to load data failed. Exiting application.");
            return; 
        }
		countlocs = bp_countlocs[0].features;
		// Note:the count data for each count 'feature' is found in counts[i].properties
		counts = bp_counts[0].features;
		main_app();
	});
} // initialize()
