// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of GeoJSON features for count locations (features) and counts (the properties of these non-features)
var countlocs = [],
    counts = [];
	
// Danfo dataframes for count locations and counts
var countlocs_df = {},
    counts_df = {};
	
// Set extent of leaflet map based on bounding box of bp_loc_ids
function set_map_extent(loc_ids) {
	// Compute bounding box of features for the given set of loc_ids
	//        1. get feature for each loc_id, and get coordinates from italics
	//        2. get bounding box (minX, minY, maxX, maxY) from that 
	var xcoords = [], ycoords = [], minx, miny, maxx, maxy, corner1, corner2, bounds;
	
	loc_ids.forEach(function(loc_id) {
		var feature = _.find(countlocs, function(feature) { return feature.properties.loc_id == loc_id; });
		// Guard for referential integrity error in DB
		if (feature == null) {
			console.log('Referential integrity issue with loc_id ' + loc_id);
		} else {
			xcoords.push(feature.geometry.coordinates[0]);
			ycoords.push(feature.geometry.coordinates[1]);
		}
	});
	minx = _.min(xcoords);
	miny = _.min(ycoords);
	maxx = _.max(xcoords);
	maxy = _.max(ycoords);
	corner1 = L.latLng(miny, minx);
	corner2 = L.latLng(maxy, maxx);
	bounds  = L.latLngBounds(corner1, corner2);
	map.flyToBounds(bounds);
} 

// Return array of bp_loc_ids (B-P count locations) for a given set of counts
function counts_to_countlocs(counts) {
	var bp_loc_ids = _.map(counts, function(c) { return c.bp_loc_id; });
	bp_loc_ids = _.uniq(bp_loc_ids);
	return bp_loc_ids;
}
	
// On-change event handlers for pick-lists
// #1 on-change event handler for towns
function town_change_handler(e) {
	var town, filter_func, counts_for_town, years, years_uniq, town_countlocs;
	
	town = $("#select_town").val();
	// Find years for which we have counts for the given town
	// First, find all counts for town; then find years of all these counts
	if (town !== "Any") {
		filter_func = function(c) { return c.municipality == town; };
	} else {
		filter_func = function(c) { return true; };
	}
	counts_for_town = _.filter(counts, filter_func);

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
	
	town_countlocs = counts_to_countlocs(counts_for_town);
	set_map_extent(town_countlocs);
}
// #2 on-change event handler for years
function year_change_handler(e) {
	var year, filter_func, counts_for_year, towns, towns_uniq, year_countlocs;
	
	year = $("#select_year").val();
	// Find towns for which we have counts for the given year
	// First, find all counts for year; then find towns of all these counts
	if (year !== "Any") {
		filter_func = function(c) { return c.count_date.substr(0,4) == year; };
	} else {
		filter_func = function(c) { return true; };
	}
	counts_for_year = _.filter(counts, filter_func);

	towns =  _.map(counts_for_year, function(c) { return c.municipality; });
	towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();
	
	// Disable on-change event handler for 'select_town'
	$('#select_town').off()
	// Clear-out, and populate pick list
	$('#select_town').empty();	
	
	towns_uniq.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	// Re-enable on-change event handler for 'select_town'
	$('#select_town').on('change', town_change_handler);	
	
	year_countlocs = counts_to_countlocs(counts_for_year);
	set_map_extent(year_countlocs);
}

// Populate the pick-lists with their initial values, based on countlocs and counts
function initialize_pick_lists(countlocs, counts) {
	// Towns pick-list
	var towns = _.map(countlocs, function(e) { return e.properties.town; });
	var towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();
	
	$('#select_town').append(new Option("Any", "Any"));
	towns_uniq.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	
	// Year pick-list
	var years = _.map(counts, function(e) { return e.count_date.substr(0,4); });
	var years_uniq = _.uniq(years);
	// Reverse list of years, latest year appears at top-of-list
	years_uniq = years_uniq.sort().reverse();
	$('#select_year').append(new Option("Any", "Any"));
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
	
	// Add all count locations to map
	var geojsonMarkerOptions = {
		radius: 3.5,
		fillColor: "#ff7800",
		color: "#000", 
		weight: 0.5,
		opacity: 1,
		fillOpacity: 0.8
	};
	const countlocs_layer =  L.geoJSON(countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Location ID = ' + feature.properties.loc_id;
			// DEBUG 
			if (feature.properties.loc_id == '20111') {
				console.log('Found it!');
			}
			// marker = L.circleMarker(latlng, geojsonMarkerOptions);
			marker = L.marker(latlng);
			marker.bindPopup(content);
			marker.addTo(map);
		}
	});
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
		
		// Note: the count data for each count 'feature' is found in the 'properties'
		//       list of each such count 'feature' 
		bp_counts[0].features.forEach(function(feature) {
			counts.push(feature.properties);
		});
		
		// Convert JSON arrays to Danfo data frames - not yet used in app
		countlocs_df = new dfd.DataFrame(countlocs);
		counts_df = new dfd.DataFrame(counts);
		
		// Populate pick-lists with initial values
		initialize_pick_lists(countlocs, counts);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town').on('change', town_change_handler);
		$('#select_year').on('change', year_change_handler);

		main_app();
	});
} // initialize()
