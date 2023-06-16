// Prototype # of next-gen bike-ped counts web application
//
// Data: All data loaded from local GeoJSON files, 
//       no interaction with backing DB server
// Mapping platform: leaflet.json
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org

var bDebug = true; // Debug/diagnostics toggle

// Data sources: count locations and count data
var pointsURL = 'data/json/ctps_bp_count_locations_pt.geo.json',
    countsURL = 'data/json/bp_counts.json';

// Innitial center and zoom level for map - approx center of MPO area
var regionCenterLat = 42.38762765728668; 
var regionCenterLng = -71.14615053347856; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Arrays of leaflet markers for selected and un-selected count locations
var all_countloc_markers = [],
	selected_countloc_markers = [],
    unselected_countloc_markers = [];
	
// Leaflet icon for 'selected' count locations (un-selected locations use default marker icon)
// Credit to: https://github.com/pointhi/leaflet-color-markers
var selected_countloc_icon = new L.Icon({
	iconUrl: 'img/marker-icon-gold.png',
	shadowUrl: 'img/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

// Arrays of GeoJSON features for ALL count locations (features) and ALL counts (the properties of these non-features)
var all_countlocs = [],
    all_counts = [];
	
// Arrays of GeoJSON features for current 'selection set' of count locations and counts
var selected_countlocs = [],
    selected_counts = [];
	
// Arrays of GeoJSON count location features NOT in the current 'selection set'
var unselected_countlocs = [];
	
// update_map:
// 1. set extent of leaflet map based on bounding box of bp_loc_ids
// 2. add layers for current set of 'selected' and 'unselected' count locations
function update_map(loc_ids) {
	// Compute bounding box of features for the given set of loc_ids
	//        1. get feature for each loc_id, and get coordinates from italics
	//        2. get bounding box (minX, minY, maxX, maxY) from that 
	var i, xcoords = [], ycoords = [], minx, miny, maxx, maxy, corner1, corner2, bounds;
	
	// *** WARNING: TEMPORARY HACK ***
	// The following is a sanity-check / bail-out for count locations in the database
	// that currently have NO counts associated with them.
	// THESE NEED TO BE PRUNED FROM THE DATABASE.
	if (loc_ids.length === 0) { 
		var msg = 'No counts available for selected {town, year}.'
		console.log(msg);
		alert(msg);
		reset_handler(null);
		return; 
	}
	
	loc_ids.forEach(function(loc_id) {
		var feature = _.find(all_countlocs, function(feature) { return feature.properties.loc_id == loc_id; });
		// Guard for referential integrity error in DB or bad feature geometry
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
	
	// Remove markers for selected count locations
	for (i = 0; i < selected_countloc_markers.length; i++) {
		map.removeLayer(selected_countloc_markers[i]);
	}
	selected_countloc_markers = [];
	// Remove markers for un-selectec count locations
	for (i = 0; i < unselected_countloc_markers.length; i++) {
		map.removeLayer(unselected_countloc_markers[i]);
	}
	unselected_countloc_markers = [];
	
	// Add SELECTED count locations to map, and cache them in 'selected_countloc_markers'
	L.geoJSON(selected_countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Selected location ID = ' + feature.properties.loc_id;
			marker = L.marker(latlng, { icon: selected_countloc_icon });
			marker.bindPopup(content);
			marker.addTo(map);
			selected_countloc_markers.push(marker);
		}
	});
	// Add UN-SELECTED count locations to map, and cache them in 'unselected_countloc_markers'
	L.geoJSON(unselected_countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Un-selected location ID = ' + feature.properties.loc_id;
			// Use default marker icon for un-selected count locations
			marker = L.marker(latlng);
			marker.bindPopup(content);
			marker.addTo(map);
			unselected_countloc_markers.push(marker);
		}
	});
} // update_map

function update_table(countlocs) {
	var data_array = [];
	// Populate 'data' array with info about the selected count locations
	selected_countlocs.forEach(function(cl) {
		// NOTE: cl.properties.loc_id has the B-P count location ID
		data_array.push({'Count Location' : cl.properties.description, 'Town' : cl.properties.town});
	});
		
	$('#output_table').empty();
		
	$("#output_table").jsGrid({
			height: "90%",
			width: "100%",
			sorting: true,
			paging: true,
			data: data_array,
			fields: [
				{ name: "Count Location", type: "text", width: 300 },
				{ name: "Town", type: "text", width: 100 }
			]
	});
	
	var _DEBUG_HOOK = 0;
} // update_table

// Return array of bp_loc_ids (B-P count locations) for a given set of counts
function counts_to_countloc_ids(counts) {
	var bp_loc_ids = _.map(counts, function(c) { return c.bp_loc_id; });
	bp_loc_ids = _.uniq(bp_loc_ids);
	return bp_loc_ids;
}

// pick_list_handler: On-change event handler for pick-lists of towns and years.
//
// Aside from purely UI-related tasks, the primary job of this function is 
// to compute the current 'selection set' and 'un-selection set) of count locations.
// Once these sets have been computed, this function calls 'update_map' to update
// the leaflfet map accordingly.
//
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
	// 4. calculate selected_countlocs and unselected_countlocs
	// 5. call 'update_map' to update the leaflet map, accordingly
	
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
	
	// Compute 'selection set' and 'un-selection set' of count locations.
	// God bless the people who wrote the ES6 language definition - doing this is easy now!
	selected_countloc_ids = counts_to_countloc_ids(selected_counts);
	selected_countlocs = [];
	var countloc_id_set = new Set(selected_countloc_ids);
	selected_countlocs = all_countlocs.filter(rec => countloc_id_set.has(rec.properties.loc_id));
	unselected_countlocs = all_countlocs.filter(rec => !countloc_id_set.has(rec.properties.loc_id));
	
	update_map(selected_countloc_ids);
	update_table(selected_countlocs);
} // pick_list_handler

// reset_handler: on-click event handler for 'reset' button
//
function reset_handler(e) {
	var i;

	selected_countlocs = [];
	for (i = 0; i< selected_countloc_markers.length; i++) { 
		map.removeLayer(selected_countloc_markers[i]);
	}
	selected_countloc_markers = [];
	
	uselected_countlocs = [];
	for (i = 0; i< unselected_countloc_markers.length; i++) { 
		map.removeLayer(unselected_countloc_markers[i]);
	}
	unselected_countloc_markers = [];
	
	// Add all count locations to map, and cache them in 'unselected_countloc_markers'
	// All countlocs are 'un-selected' at reset
	L.geoJSON(all_countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Location ID = ' + feature.properties.loc_id;
			// marker = L.circleMarker(latlng, geojsonMarkerOptions);
			marker = L.marker(latlng);
			marker.bindPopup(content);
			marker.addTo(map);
			unselected_countloc_markers.push(marker);
		}
	});
	
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
	L.geoJSON(all_countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = 'Location ID = ' + feature.properties.loc_id;
			// marker = L.circleMarker(latlng, geojsonMarkerOptions);
			marker = L.marker(latlng);
			marker.bindPopup(content);
			marker.addTo(map);
			unselected_countloc_markers.push(marker);
		}
	});
} // initialize_map
	
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
		
		// DIAGNOSTIC / DEBUG - requires loading of separate 'js/diagnostics.js' file
		if (bDebug == true) {
			// validate_integrity_of_countloc_geometry(all_countlocs);
			var errors = validate_referential_integrity(all_countlocs, all_counts);	
			var _DEBUG_HOOK = 0;
		}
		
		// Initialize 'selection sets' for countlocs and counts
		selected_countlocs = _.filter(all_countlocs)
		selected_counts = _.filter(all_counts);
		
		// Populate pick-lists with initial values
		initialize_pick_lists(all_countlocs, all_counts);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town,#select_year').on('change', pick_list_handler);
		
		// Bind on-change event handler for 'reset' button 
		$('#reset').on('click', reset_handler);

		initialize_map();
	});
} // initialize
