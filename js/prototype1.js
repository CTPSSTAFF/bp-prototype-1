// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of GeoJSON features for count locations and counts
var countlocs_features = [],
    counts_features = [];
	
// Danfo dataframes for count locations and counts
var countlocs_df = {},
    counts_df = {};
	
// On-change vent handlers for pick-lists
function town_change_handler(e) {
	var _DEBUG_HOOK = 0;
}

function year_change_handler(e) {
	var _DEBUG_HOOK = 0;
}

// Populate the pick-lists, given the selected sets of countlocs and counts
function populate_pick_lists(countlocs, counts) {
	// Towns pick-list
	var towns = _.map(countlocs, function(e) { return e.properties.town; });
	var towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();
	$('#select_town').empty();
	towns_uniq.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	
	
	// Year pick-list - TBD
	var years = [];
}

function main_app() {
	map = L.map('map').setView([regionCenterLat, regionCenterLng], initialZoom);
	const osm_base_layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	
	var _DEBUG_HOOK_ = 0;
	
	////////////////////////////////////
	// Add count locations to map
	var geojsonMarkerOptions = {
		radius: 3,
		fillColor: "#ff7800",
		color: "#000",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};
	const countlocs_layer =  L.geoJSON(countlocs_features, {
		pointToLayer: function (feature, latlng) {
			return L.circleMarker(latlng, geojsonMarkerOptions);
		}
	}).addTo(map);
	
	_DEBUG_HOOK_ = 1;
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
		countlocs_features = bp_countlocs[0].features;
		
		// Note: the count data for each count 'feature' is found in counts[i].properties;
		//       it needs to be 'hoisted up' one level (so to speak) before being loaded
		//       into the 'counts' array
		counts_features = bp_counts[0].features;
		counts_features.forEach(function(feature) {
			counts_features.push(feature.properties);
		});
		
		// Convert JSON arrays to Danfo data frames
		countlocs_df = new dfd.DataFrame(countlocs_features);
		counts_df = new dfd.DataFrame(counts_features);
		
		// Populate pick-lists
		populate_pick_lists(countlocs_features, counts_features);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town').change(town_change_handler);
		$('#select_year').change(year_change_handler);

		main_app();
	});
} // initialize()
