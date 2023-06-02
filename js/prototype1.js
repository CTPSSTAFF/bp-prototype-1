// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Complete GeoJSON 'blob' for count locations
var countlocs_geojson = {};

// Arrays of GeoJSON features for count locations and counts
var countlocs_features = [],
    counts_features = [];
	
// Danfo dataframes for count locations and counts
var countlocs_df = {},
    counts_df = {};

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
	const countlocs_layer =  L.geoJSON(countlocs_geojson, {
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
		// The following line is probably not needed
		countlocs_geojson = bp_countlocs; 
		
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
		
		var _DEBUG_HOOK_ = 0;
		main_app();
	});
} // initialize()
