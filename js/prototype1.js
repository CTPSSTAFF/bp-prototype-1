// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of GeoJSON features for count locations and counts
var countlocs = [],
    counts = [];
	
// Danfo dataframes for count locations and counts
var countlocs_df = {},
    counts_df = {};

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
		// Note: the count data for each count 'feature' is found in counts[i].properties;
		//       it needs to be 'hoisted up' one level (so to speak) before being loaded
		//       into the 'counts' array
		var count_features = bp_counts[0].features;
		count_features.forEach(function(feature) {
			counts.push(feature.properties);
		});
		// Convert JSON arrays to Danfo data frames
		countlocs_df = new dfd.DataFrame(countlocs);
		counts_df = new dfd.DataFrame(counts);
		
		// temp
		countlocs_df.print()
		
		var _DEBUG_HOOK_ = 0;
		main_app();
	});
} // initialize()
