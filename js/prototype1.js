// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of GeoJSON features for count locations (features) and counts (just properties of these non-features)
var countlocs_features = [],
    counts_properties = [];
	
// Danfo dataframes for count locations and counts
var countlocs_df = {},
    counts_df = {};
	
// On-change vent handlers for pick-lists
function town_change_handler(e) {
	var town, filter_func, counts_for_town, years, years_uniq;
	
	town = $( "#select_town" ).val();
	// Find years for which we have counts for the town
	// First, find all counts for town; then find years of all these counts
	if (town !== "All") {
		filter_func = function(c) { return c.municipality == town; };
	} else {
		filter_func = function(c) { return true; };
	}
	counts_for_town = _.filter(counts_properties, filter_func);

	years = _.map(counts_for_town, function(c) { return c.count_date.substr(0,4); });
	years_uniq = _.uniq(years);
	years_uniq = years_uniq.sort().reverse();
	
	// Disable on-change event handler for 'select_year'
	$('#select_year').off()
	// Clear-out, and populate pick list
	$('#select_year').empty();
	years_uniq.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	});
	// Re-enable on-change event handler for 'select_year'
	$('#select_year').on('change', year_change_handler);
}

function year_change_handler(e) {
	var _DEBUG_HOOK = 0;
	console.log("In 'year' on-change handler.");
}

// Populate the pick-lists, given the selected sets of countlocs and counts
function populate_pick_lists(countlocs, counts) {
	// Towns pick-list
	var towns = _.map(countlocs, function(e) { return e.properties.town; });
	var towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();
	
	$('#select_town').append(new Option("All", "All"));
	towns_uniq.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	
	// Year pick-list
	var years = _.map(counts, function(e) { return e.count_date.substr(0,4); });
	var years_uniq = _.uniq(years);
	// Reverse list of years, latest year appears at top-of-list
	years_uniq = years_uniq.sort().reverse();
	$('#select_year').append(new Option("All", "All"));
	years_uniq.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	});
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
		
		// Note: the count data for each count 'feature' is found in the 'properties'
		//       list of each such count 'feature' 
		bp_counts[0].features.forEach(function(feature) {
			counts_properties.push(feature.properties);
		});
		
		// Convert JSON arrays to Danfo data frames
		countlocs_df = new dfd.DataFrame(countlocs_features);
		counts_df = new dfd.DataFrame(counts_properties);
		
		// Populate pick-lists
		populate_pick_lists(countlocs_features, counts_properties);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town').on('change', town_change_handler);
		$('#select_year').on('change', year_change_handler);

		main_app();
	});
} // initialize()
