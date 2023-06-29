// Prototype # of next-gen bike-ped counts web application
//
// Data: All count data loaded from local JSON file
//       'All count locations' displayed in map using WMS service
//       TBD display of 'selected count locations'
//
// Mapping platform: leaflet.js
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org

var bDebug = true; // Debug/diagnostics toggle

// Data sources: count locations and count data
var pointsURL = 'data/json/ctps_bp_count_locations_pt.geo.json',  // Unused in this version (fossil)
    countsURL = 'data/json/bp_counts.json';
	
var serverRoot = 'https://www.ctps.org/maploc/',
	wms_serverRoot = serverRoot + 'WMS/';
	wfs_serverRoot = serverRoot + 'wfs/';	// Not yet used
	
var all_countlocs_wms_layer = 'postgis:ctps_bp_countlocs_pt';

// Innitial center and zoom level for map - approx center of MPO area
var regionCenterLat = 42.38762765728668; 
var regionCenterLng = -71.14615053347856; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Array of GeoJSON features for ALL count locations
var all_countlocs = [];

// Array of 'non-features' for ALL counts and selected counts
var all_counts = [],
    selected_counts = [];

// Leaflet icon for 'selected' count locations
// Credit to: https://github.com/pointhi/leaflet-color-markers
var selected_countloc_icon = new L.Icon({
	iconUrl: 'img/marker-icon-gold.png',
	shadowUrl: 'img/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});
// Leaflet icon for 'unselected' count locations - this 'should' be the default leaflet icon
var unselected_countloc_icon = new L.Icon({
	iconUrl: 'img/marker-icon-blue.png',
	shadowUrl: 'img/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

// Custom options for 'circle' marker for GeoJSON features
// *** CURRENTLY UNUSED ***
var geojsonMarkerOptions = {
	radius: 3.5,
	fillColor: "#ff7800",
	color: "#000", 
	weight: 0.5,
	opacity: 1,
	fillOpacity: 0.8
};

// Un-initialized objecs for 'selected' and 'un-selected' countlocs;
var selected_countlocs 	 = { 'countlocs'	: [], 
                             'markers' 		: [],
							 'icon' 		: selected_countloc_icon },
    unselected_countlocs = { 'countlocs' 	: [], 
	                         'markers' 		: [],
							 'icon' 		: unselected_countloc_icon } ;

// Begin: Functions to manage 'selected_countlocs' and 'unselected_countlocs'
function add_countlocs_to_cl_set(cls, countlocs) {
	cls.countlocs = countlocs;
}

function clear_cl_set(cls) {
	cls.countlocs = [];
}

// For all counts (or count_summaries) in the input array 'c',
// compute the sum of all count values for the AM peak peroid,
// and return it.
// The AM peak period defined as: 0630 to 0900 hours.
function calc_am_peak(c) {
	retval = ((c.cnt_0630 != null) ? c.cnt_0630 : 0) + 
	         ((c.cnt_0645 != null) ? c.cnt_0645 : 0) +
	         ((c.cnt_0700 != null) ? c.cnt_0700 : 0) +
			 ((c.cnt_0715 != null) ? c.cnt_0715 : 0) +
			 ((c.cnt_0730 != null) ? c.cnt_0730 : 0) + 
			 ((c.cnt_0745 != null) ? c.cnt_0745 : 0) +
		     ((c.cnt_0800 != null) ? c.cnt_0800 : 0) +
			 ((c.cnt_0815 != null) ? c.cnt_0815 : 0) +
			 ((c.cnt_0830 != null) ? c.cnt_0830 : 0) + 
			 ((c.cnt_0845 != null) ? c.cnt_0845 : 0);
	return retval;
}

// For all counts (or count_summaries) in the input array 'c',
// compute the sum of all count values for the PM peak peroid,
// and return it.
// The PM peak period defined as: 1600 to 1900 hours.
function calc_pm_peak(c) {
	retval = ((c.cnt_1600 != null) ? c.cnt_1600 : 0) +
	         ((c.cnt_1615 != null) ? c.cnt_1615 : 0) + 
			 ((c.cnt_1630 != null) ? c.cnt_1630 : 0) + 
			 ((c.cnt_1645 != null) ? c.cnt_1645 : 0) +
	         ((c.cnt_1700 != null) ? c.cnt_1700 : 0) + 
			 ((c.cnt_1715 != null) ? c.cnt_1715 : 0) +
			 ((c.cnt_1730 != null) ? c.cnt_1730 : 0) + 
			 ((c.cnt_1745 != null) ? c.cnt_1745 : 0) +
			 ((c.cnt_1800 != null) ? c.cnt_1800 : 0) +
		     ((c.cnt_1815 != null) ? c.cnt_1815 : 0) +
			 ((c.cnt_1830 != null) ? c.cnt_1830 : 0) +
			 ((c.cnt_1845 != null) ? c.cnt_1845 : 0);
	return retval;
}

// summarize_set_of_counts: 
// Given an input array of 'counts' records, calculate the summary across all
// records for each 15-minute time period and return it in an object,
// keyed by of the form 'cnt_<hhmm>'.
function summarize_set_of_counts(counts) {
	retval = { 'cnt_0630' : 0, 'cnt_0645' : 0,
               'cnt_0700' : 0, 'cnt_0715' : 0, 'cnt_0730' : 0, 'cnt_0745' : 0,
               'cnt_0800' : 0, 'cnt_0815' : 0, 'cnt_0830' : 0, 'cnt_0845' : 0,
               'cnt_0900' : 0, 'cnt_0915' : 0, 'cnt_0930' : 0, 'cnt_0945' : 0,
               'cnt_1000' : 0, 'cnt_1015' : 0, 'cnt_1030' : 0, 'cnt_1045' : 0,
               'cnt_1100' : 0, 'cnt_1115' : 0, 'cnt_1130' : 0, 'cnt_1145' : 0,
               'cnt_1200' : 0, 'cnt_1215' : 0, 'cnt_1230' : 0, 'cnt_1245' : 0,
               'cnt_1300' : 0, 'cnt_1315' : 0, 'cnt_1330' : 0, 'cnt_1345' : 0,
               'cnt_1400' : 0, 'cnt_1415' : 0, 'cnt_1430' : 0, 'cnt_1445' : 0,
               'cnt_1500' : 0, 'cnt_1515' : 0, 'cnt_1530' : 0, 'cnt_1545' : 0,
               'cnt_1600' : 0, 'cnt_1615' : 0, 'cnt_1630' : 0, 'cnt_1645' : 0,
               'cnt_1700' : 0, 'cnt_1715' : 0, 'cnt_1730' : 0, 'cnt_1745' : 0,
               'cnt_1800' : 0, 'cnt_1815' : 0, 'cnt_1830' : 0, 'cnt_1845' : 0,
               'cnt_1900' : 0, 'cnt_1915' : 0, 'cnt_1930' : 0, 'cnt_1945' : 0,
               'cnt_2000' : 0, 'cnt_2015' : 0, 'cnt_2030' : 0, 'cnt_2045' : 0
	}

	retval.cnt_0630 =  _.sum(_.map(counts, function(c) { return c.cnt_0630; }));
	retval.cnt_0645 =  _.sum(_.map(counts, function(c) { return c.cnt_0645; }));
	
	retval.cnt_0700 =  _.sum(_.map(counts, function(c) { return c.cnt_0700; }));
	retval.cnt_0715 =  _.sum(_.map(counts, function(c) { return c.cnt_0715; }));	
	retval.cnt_0730 =  _.sum(_.map(counts, function(c) { return c.cnt_0730; }));	
	retval.cnt_0745 =  _.sum(_.map(counts, function(c) { return c.cnt_0745; }));	

	retval.cnt_0800 =  _.sum(_.map(counts, function(c) { return c.cnt_0800; }));	
	retval.cnt_0815 =  _.sum(_.map(counts, function(c) { return c.cnt_0815; }));	
	retval.cnt_0830 =  _.sum(_.map(counts, function(c) { return c.cnt_0830; }));	
	retval.cnt_0845 =  _.sum(_.map(counts, function(c) { return c.cnt_0845; }));
	
	retval.cnt_0900 =  _.sum(_.map(counts, function(c) { return c.cnt_0900; }));	
	retval.cnt_0915 =  _.sum(_.map(counts, function(c) { return c.cnt_0915; }));	
	retval.cnt_0930 =  _.sum(_.map(counts, function(c) { return c.cnt_0930; }));	
	retval.cnt_0945 =  _.sum(_.map(counts, function(c) { return c.cnt_0945; }));	

	retval.cnt_1000 =  _.sum(_.map(counts, function(c) { return c.cnt_1000; }));	
	retval.cnt_1015 =  _.sum(_.map(counts, function(c) { return c.cnt_1015; }));	
	retval.cnt_1030 =  _.sum(_.map(counts, function(c) { return c.cnt_1030; }));	
	retval.cnt_1045 =  _.sum(_.map(counts, function(c) { return c.cnt_1045; }));	

	retval.cnt_1100 =  _.sum(_.map(counts, function(c) { return c.cnt_1100; }));	
	retval.cnt_1115 =  _.sum(_.map(counts, function(c) { return c.cnt_1115; }));	
	retval.cnt_1130 =  _.sum(_.map(counts, function(c) { return c.cnt_1130; }));	
	retval.cnt_1145 =  _.sum(_.map(counts, function(c) { return c.cnt_1145; }));	

	retval.cnt_1200 =  _.sum(_.map(counts, function(c) { return c.cnt_1200; }));	
	retval.cnt_1215 =  _.sum(_.map(counts, function(c) { return c.cnt_1215; }));	
	retval.cnt_1230 =  _.sum(_.map(counts, function(c) { return c.cnt_1230; }));	
	retval.cnt_1245 =  _.sum(_.map(counts, function(c) { return c.cnt_1245; }));	

	retval.cnt_1300 =  _.sum(_.map(counts, function(c) { return c.cnt_1300; }));	
	retval.cnt_1315 =  _.sum(_.map(counts, function(c) { return c.cnt_1315; }));	
	retval.cnt_1330 =  _.sum(_.map(counts, function(c) { return c.cnt_1330; }));	
	retval.cnt_1345 =  _.sum(_.map(counts, function(c) { return c.cnt_1345; }));	

	retval.cnt_1400 =  _.sum(_.map(counts, function(c) { return c.cnt_1400; }));	
	retval.cnt_1415 =  _.sum(_.map(counts, function(c) { return c.cnt_1415; }));	
	retval.cnt_1430 =  _.sum(_.map(counts, function(c) { return c.cnt_1430; }));	
	retval.cnt_1445 =  _.sum(_.map(counts, function(c) { return c.cnt_1445; }));	

	retval.cnt_1500 =  _.sum(_.map(counts, function(c) { return c.cnt_1500; }));	
	retval.cnt_1515 =  _.sum(_.map(counts, function(c) { return c.cnt_1515; }));	
	retval.cnt_1530 =  _.sum(_.map(counts, function(c) { return c.cnt_1530; }));	
	retval.cnt_1545 =  _.sum(_.map(counts, function(c) { return c.cnt_1545; }));	

	retval.cnt_1600 =  _.sum(_.map(counts, function(c) { return c.cnt_1600; }));	
	retval.cnt_1615 =  _.sum(_.map(counts, function(c) { return c.cnt_1615; }));	
	retval.cnt_1630 =  _.sum(_.map(counts, function(c) { return c.cnt_1630; }));	
	retval.cnt_1645 =  _.sum(_.map(counts, function(c) { return c.cnt_1645; }));	

	retval.cnt_1700 =  _.sum(_.map(counts, function(c) { return c.cnt_1700; }));	
	retval.cnt_1715 =  _.sum(_.map(counts, function(c) { return c.cnt_1715; }));	
	retval.cnt_1730 =  _.sum(_.map(counts, function(c) { return c.cnt_1730; }));	
	retval.cnt_1745 =  _.sum(_.map(counts, function(c) { return c.cnt_1745; }));	

	retval.cnt_1800 =  _.sum(_.map(counts, function(c) { return c.cnt_1800; }));	
	retval.cnt_1815 =  _.sum(_.map(counts, function(c) { return c.cnt_1815; }));	
	retval.cnt_1830 =  _.sum(_.map(counts, function(c) { return c.cnt_1830; }));	
	retval.cnt_1845 =  _.sum(_.map(counts, function(c) { return c.cnt_1845; }));	

	retval.cnt_1900 =  _.sum(_.map(counts, function(c) { return c.cnt_1900; }));	
	retval.cnt_1915 =  _.sum(_.map(counts, function(c) { return c.cnt_1915; }));	
	retval.cnt_1930 =  _.sum(_.map(counts, function(c) { return c.cnt_1930; }));	
	retval.cnt_1945 =  _.sum(_.map(counts, function(c) { return c.cnt_1945; }));	
	
	retval.cnt_2000 =  _.sum(_.map(counts, function(c) { return c.cnt_2000; }));	
	retval.cnt_2015 =  _.sum(_.map(counts, function(c) { return c.cnt_2015; }));	
	retval.cnt_2030 =  _.sum(_.map(counts, function(c) { return c.cnt_2030; }));	
	retval.cnt_2045 =  _.sum(_.map(counts, function(c) { return c.cnt_2045; }));	

	return retval;
} // summarize_set_of_counts


function make_popup_content(feature) {
	var loc_id, counts, 
	    oldest_count_date, newest_count_date, 
	    oldest_counts = [], newest_counts = [],
		oldest_count_summary = {}, 
	    am_peak = 0,  pm_peak = 0;
		
	loc_id = feature.properties.loc_id;
	counts = _.filter(all_counts, function(c) { return c.bp_loc_id == loc_id; });
	
	// Defensive programming:
	// Believe it or not, there are some count locations with no counts!
	if (counts.length == 0) {
		var _DEBUG_HOOK = 0;
		console.log('No counts with count loc_id == ' + loc_id + ' found.');
		return;
	}
	
	counts = _.sortBy(counts, [function(o) { return o.count_date.substr(0,10); }]);
	oldest_count_date = counts[0].count_date.substr(0,10);
	newest_count_date = counts[counts.length-1].count_date.substr(0,10);
	
	oldest_counts = _.filter(counts, function(c) { return c.count_date.substr(0,10) == oldest_count_date; });
	newest_counts = _.filter(counts, function(c) { return c.count_date.substr(0,10) == newest_count_date; });
	
	// Debug 
	console.log(loc_id + ' #oldest_counts = ' + oldest_counts.length + ' #newest_counts = ' + newest_counts.length);
	
	newest_count_summary = summarize_set_of_counts(newest_counts);

	am_peak = calc_am_peak(newest_count_summary);
	pm_peak = calc_pm_peak(newest_count_summary);
		  
	content = 'Location ID ' + loc_id + '</br>';
    content += feature.properties.description + '</br>';
	content += 'Most recent count : ' + newest_count_date + '</br>';
	content += 'Total volume AM peak : ' + am_peak + '</br>';
	content += 'Total volume PM peak : ' + pm_peak + '</br>';
	content += 'Oldest count : ' + oldest_count_date + '</br>';			  
	
	return content;
}

// Add markers for  countlocs to the leaflet map
// As each marker is created, it is added to the cls.markers array	
function add_markers_for_cl_set(cls) {
	var _DEBUG_HOOK = 0;
	L.geoJSON(cls.countlocs, {
		pointToLayer: function (feature, latlng) {
			var content, marker;
			content = make_popup_content(feature);
			// marker = L.circleMarker(latlng, geojsonMarkerOptions);
			marker = L.marker(latlng, { icon: cls.icon });
			marker.bindPopup(content);
			marker.addTo(map);
			cls.markers.push(marker);
		}
	});	
	DEBUG_HOOK = 1;
}

// In leaflet, each 'marker' is a layer.
// Thus to remove a set of markers, the layer for each must be removed individually
function remove_markers_for_cl_set(cls) {
	var i;
	for (i = 0; i < cls.markers; i++ ) {
		map.removeLayer(cls.markers[i]);
	}
	cls.markers = [];
}
// End: Functions to manage 'selected_countlocs' and 'unselected_countlocs'


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
	
	// map.flyToBounds(bounds);
	map.fitBounds(bounds);
	
	// Replace the old set of 'selected' countloc markers with the new one
	remove_markers_for_cl_set(selected_countlocs);
	add_markers_for_cl_set(selected_countlocs);

	// Replace the old set of 'selected' countloc markers with the new one
	remove_markers_for_cl_set(unselected_countlocs);
	add_markers_for_cl_set(unselected_countlocs);
} // update_map

function update_table(countlocs) {
	var data_array = [];
	// Populate 'data' array with info about the selected count locations
	selected_countlocs.countlocs.forEach(function(cl) {
		// NOTE: cl.properties.loc_id has the B-P count location ID
		data_array.push({'countloc' : cl.properties.description, 'town' : cl.properties.town});
	});
		
	$("#output_table").jsGrid({
			height: "30%",
			width: "80%", 
			sorting: true,
			paging: true,
			data: data_array,
			fields: [
				{ name: "countloc", title: "Count Location", type: "text", width: 300 },
				{ name: "town", title: "Town", type: "text", width: 100 }
			]
	});
	$('#output_table').show();
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
	
	// HERE: We have an array of the selected counts
	//       We need to turn this into a set of selected count locations
	//       and a set of un-selected count locations
	
	// Compute 'selection set' and 'un-selection set' of count locations.
	// God bless the people who wrote the ES6 language definition - performing these computations is easy now!
	selected_countloc_ids = counts_to_countloc_ids(selected_counts);
	var countloc_id_set = new Set(selected_countloc_ids);
	var selected = all_countlocs.filter(rec => countloc_id_set.has(rec.properties.loc_id));
	var unselected = all_countlocs.filter(rec => !countloc_id_set.has(rec.properties.loc_id));
	
	add_countlocs_to_cl_set(selected_countlocs, selected);
	add_countlocs_to_cl_set(unselected_countlocs, unselected);
	
	update_map(selected_countloc_ids);
	update_table(selected_countlocs);
} // pick_list_handler

// reset_handler: on-click event handler for 'reset' button
//
function reset_handler(e) {
	// Re-initialize 'selected' countlocs
	remove_markers_for_cl_set(selected_countlocs);
	add_countlocs_to_cl_set(selected_countlocs, []);

	// Re-initialize 'un-selected' countlocs
	remove_markers_for_cl_set(unselected_countlocs);
	add_countlocs_to_cl_set(unselected_countlocs, _.filter(all_countlocs));
	add_markers_for_cl_set(unselected_countlocs);
	
	initialize_pick_lists(all_countlocs, all_counts);
	// map.flyTo([regionCenterLat, regionCenterLng], initialZoom);
	map.setView([regionCenterLat, regionCenterLng], initialZoom);
	$('#output_table').hide();
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
		
	const all_countlocs_layer = L.tileLayer.wms(wms_serverRoot, {
									layers: all_countlocs_wms_layer,
									format: 'image/png',
									transparent: true,
									crs: 'epsg:26986',
									uppercase: true
								});
	all_countlocs_layer.addTo(map);
}

var getJson = function(url) { return $.get(url, null, 'json'); };

function initialize() {
	var _DEBUG_HOOK = 0;
	
	 $.when(getJson(pointsURL), getJson(countsURL)).done(function(bp_countlocs, bp_counts ) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more requests to load data failed. Exiting application.");
            return; 
        } 
		all_countlocs = bp_countlocs[0].features;
		
		// Note: the count data for each count 'feature' is found in the 'properties'
		//       property of each such count 'feature' 
		bp_counts[0].features.forEach(function(feature) {
			all_counts.push(feature.properties);
		});
		
		// DIAGNOSTIC / DEBUG - requires that separate 'js/diagnostics.js' file has been loaded.
		if (bDebug == true) {
			var errors;
			// validate_integrity_of_countloc_geometry(all_countlocs);
			errors = validate_referential_integrity(all_countlocs, all_counts);	
			_DEBUG_HOOK = 1;
		}
		
		// Initialize 'selection sets' for countlocs and counts
		add_countlocs_to_cl_set(selected_countlocs, []); // Not really necessary, just to be explicit
		add_countlocs_to_cl_set(unselected_countlocs, _.filter(all_countlocs));
		
		// Populate pick-lists with initial values
		initialize_pick_lists(all_countlocs, all_counts);
		
		// Bind on-change event handler(s) for pick-list controls
		$('#select_town,#select_year').on('change', pick_list_handler);
		
		// Bind on-change event handler for 'reset' button 
		$('#reset').on('click', reset_handler);
		_DEBUG_HOOK = 2;
		
		// Initialize leaflet map, and add markers for unselected countlocs to it
		initialize_map();
		// add_markers_for_cl_set(unselected_countlocs);
		_DEBUG_HOOK = 3;
	 });
} // initialize
