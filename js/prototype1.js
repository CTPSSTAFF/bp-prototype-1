// 'Getting started' code taken from leaflet.js website, and modified

var bDebug = false; // Global debug toggle

// Innitial center and zoom level for map - approx center of MPO area
var regionCenterLat = 42.38762765728668; 
var regionCenterLng = -71.14615053347856; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Leaflet layer objects for all count locations, 'selected' count locations, and 'un-selected' count locations
var all_countlocs_layer = {},
    selected_countlocs_layer = {},
	unselectted_countlocs_layer = {};

// Arrays of GeoJSON features for ALL count locations (features) and ALL counts (the properties of these non-features)
var all_countlocs = [],
    all_counts = [];
	
// Arrays of GeoJSON features for current 'selection set' of count locations and counts
var selected_countlocs = [],
    selected_counts = [];
	
// Arrays of GeoJSON count location features NOT in the current 'selection' set
var unselected_countlocs = [];
	
// Danfo dataframes for count locations and counts - CURRENTLY UNUSED
var countlocs_df = {},
    counts_df = {};
	
// Set extent of leaflet map based on bounding box of bp_loc_ids
function set_map_extent(loc_ids) {
	// Compute bounding box of features for the given set of loc_ids
	//        1. get feature for each loc_id, and get coordinates from italics
	//        2. get bounding box (minX, minY, maxX, maxY) from that 
	var xcoords = [], ycoords = [], minx, miny, maxx, maxy, corner1, corner2, bounds;
	
	loc_ids.forEach(function(loc_id) {
		var feature = _.find(all_countlocs, function(feature) { return feature.properties.loc_id == loc_id; });
		// Guard for referential integrity error in DB or bad feature geometry
		if (feature == null) {
			console.log('Referential integrity issue with loc_id ' + loc_id);
		// The following statement is a sanity-check for dealing with possibly corrupted feature geometry during development:
		} else if (feature.geometry == null ||
		           feature.geometry.coordinates == null ||
				   feature.geometry.coordinates.length != 2 ||
				   feature.geometry.coordinates[0] == 0 || 
				   feature.geometry.coordinates[1] == 0) {
			console.log('Problem with geometry for loc_id ' + loc_id);
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
} // set_map_extent

// Return array of bp_loc_ids (B-P count locations) for a given set of counts
function counts_to_countloc_ids(counts) {
	var bp_loc_ids = _.map(counts, function(c) { return c.bp_loc_id; });
	bp_loc_ids = _.uniq(bp_loc_ids);
	return bp_loc_ids;
}

// On-change event handler for pick-lists of towns and years.
// Aside from purely UI-related tasks, the primary job of 
// this function is to compute the current 'selection set'
// (and 'un-selection set') of count locations and counts.
function pick_list_handler(e) {
	var pick_list,   // ID of pick list that triggered event
	    town, year,
		towns = [], towns_uniq = [], years = [], years_uniq = [];
	
	pick_list = e.target.id; 
	town = $("#select_town").val();
	year = $("#select_year").val();
	
	// 1. apply whatever filters have been selected
	// 2. re-calcuate selected_counts
	// 3. re-populate 'other' select list if needed
	// 4. pan/zoom map
	
	if (town !== "Any") {
		filter_func = function(count) { return count.municipality == town; };
	} else {
		filter_func = function(count) { return true; };
	}	
	selected_counts = _.filter(all_counts, filter_func);
	
	if (year !== "Any") {
		filter_func = function(count) { return count.count_date.substr(0,4) == year; };
	} else {
		filter_func = function(count) { return true; };
	}
    selected_counts = _.filter(selected_counts, filter_func);	
	
	
	if (pick_list == "select_town") {
		years = _.map(selected_counts, function(count) { return count.count_date.substr(0,4); });
		years_uniq = _.uniq(years);
		years_uniq = years_uniq.sort().reverse();
		// Disable on-change event handler for 'select_year'
		$('#select_year').off()
		// Clear-out, and populate pick list
		$('#select_year').empty();
		// $('#select_year').append(new Option('Any', 'Any'));
		years_uniq.forEach(function(year) {
			$('#select_year').append(new Option(year, year));
		});
		// Re-enable on-change event handler for 'select_year'
		$('#select_year').on('change', pick_list_handler);
	} else if (pick_list == "select_year") {
		towns =  _.map(selected_counts, function(count) { return count.municipality; });
		towns_uniq = _.uniq(towns);
		towns_uniq = towns_uniq.sort();
		// Disable on-change event handler for 'select_town'
		$('#select_town').off()
		// Clear-out, and populate pick list
		$('#select_town').empty();	
		// $('#select_town').append(new Option('Any', 'Any'));
		towns_uniq.forEach(function(town) {
			$('#select_town').append(new Option(town, town));
		});
		// Re-enable on-change event handler for 'select_town'
		$('#select_town').on('change', pick_list_handler);
	} else {
		// ASSERT
		console.log('Invalid pick-list ID: ' + pick_list);
		return;
	}
	
	// Compute 'selection sets' (and 'un-selection sets') of count locationas and counts
	selected_countloc_ids = counts_to_countloc_ids(selected_counts);
	selected_countlocs = [];
	selected_countloc_ids.forEach(function(loc_id) {
		
	});
	
	set_map_extent(selected_countloc_ids);
} // pick_list_handler


function reset_handler(e) {
	selected_countlocs = [],
    selected_counts = [];
	initialize_pick_lists(all_countlocs, all_counts);
	map.flyTo([regionCenterLat, regionCenterLng], initialZoom);
} // on-click handler for 'reset'

// Populate the pick-lists with their initial values, based on all_countlocs and all_counts
// Note on passed-in parms:
// 		countlocs parameter == all_countlocs
// 		counts parameter == all_counts
function initialize_pick_lists(countlocs, counts) {
	// Towns pick-list
	var towns, towns_uniq, years, years_uniq;
	
	towns = _.map(countlocs, function(cl) { return cl.properties.town; });
	towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();
	
	$('#select_town').empty();
	$('#select_town').append(new Option("Any", "Any"));
	towns_uniq.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	
	// Year pick-list
	years = _.map(counts, function(c) { return c.count_date.substr(0,4); });
	years_uniq = _.uniq(years);
	// Reverse list of years, latest year appears at top-of-list
	years_uniq = years_uniq.sort().reverse();
	
	$('#select_year').empty();
	$('#select_year').append(new Option("Any", "Any"));
	years_uniq.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	});
} // initialize_pick_lists


///////////////////////////////////////////////////////////////////////////////
// DIAGNOSTIC / DEBUG ROUTINES - not for use in production
// Validates integrity of geometry for all count locations
function validate_integrity_of_countloc_geometry(countlocs) {
	console.log('Validating integrity of feature geometries.');
	countlocs.forEach(function(feature) {
		loc_id = feature.properties.loc_id;
		if (feature.geometry == null) {
			console.log('Feature geometry is null: ' + loc_id);
		} else if (feature.geometry.coordinates == null) {
			console.log('Coordinates of feature geometry is null: ' + loc_id);
		} else if (feature.geometry.coordinates.length != 2) {
			console.log('Length of feature geometry coordinates for loc_id ' + loc_id + ' = ' + feature.geometry.coordinates.length);
		}
	});
} // validate_integrity_of_countloc_geometry
// Checks that the loc_id for each 'count' is found in the 'count locations' features
function validate_referential_integrity(countlocs, counts) {
	counts.forEach(function(count) {
		var count_id, bp_loc_id, feature, msg;
		count_id = count.count_id;
		bp_loc_id = count.bp_loc_id;
		feature = _.find(countlocs, function(feature) { return feature.properties.loc_id == bp_loc_id; });
		if (feature == null) {
			msg = 'Feature ID ' + bp_loc_id + ' in count ID ' + count_id + ' NOT FOUND';
			console.log(msg);
		}
	});
} // validate_referential_integrity
///////////////////////////////////////////////////////////////////////////////


function initialize_map() {
	map = L.map('map').setView([regionCenterLat, regionCenterLng], initialZoom);
	const osm_base_layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	
	// Custom options for 'circle' marker for GeoJSON features - CURRENTLY UNUSED
	var geojsonMarkerOptions = {
		radius: 3.5,
		fillColor: "#ff7800",
		color: "#000", 
		weight: 0.5,
		opacity: 1,
		fillOpacity: 0.8
	};
	
	// Add all count locations to map
	all_countlocs_layer =  L.geoJSON(all_countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Location ID = ' + feature.properties.loc_id;
			// marker = L.circleMarker(latlng, geojsonMarkerOptions);
			marker = L.marker(latlng);
			marker.bindPopup(content);
			marker.addTo(map);
		}
	});
} // initialize_map

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
		all_countlocs = bp_countlocs[0].features;
		
		// Note: the count data for each count 'feature' is found in the 'properties'
		//       list of each such count 'feature' 
		bp_counts[0].features.forEach(function(feature) {
			all_counts.push(feature.properties);
		});
		
		// DIAGNOSTIC / DEBUG
		if (bDebug == true) {
			validate_integrity_of_countloc_geometry(all_countlocs);
			validate_referential_integrity(all_countlocs, all_counts);	
		}
		
		// Initialize 'selection sets' for countlocs and counts
		selected_countlocs = _.filter(all_countlocs)
		selected_counts = _.filter(all_counts);
		
		// Convert JSON arrays to Danfo data frames - not yet used in app
		//
		// countlocs_df = new dfd.DataFrame(all_countlocs);
		// counts_df = new dfd.DataFrame(all_counts);
		
		// Populate pick-lists with initial values
		initialize_pick_lists(all_countlocs, all_counts);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town,#select_year').on('change', pick_list_handler);
		
		// Bind on-change event handler for 'reset' button 
		$('#reset').on('click', reset_handler);

		initialize_map();
	});
} // initialize
