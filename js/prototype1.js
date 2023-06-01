// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

// Leaflet 'map' Object
var map = {};

// Array of GeoJSON features for count locations
var countlocs = [];

function main_app() {
	map = L.map('map').setView([regionCenterLat, regionCenterLng], initialZoom);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
	var _DEBUG_HOOK_ = 0;
} // main_app()

var pointsURL = 'data/json/ctps_bp_count_locations_pt.geo.json',
    countsURL = 'data/csv/bp_counts.csv';
	
var getJson = function(url) { return $.get(url, null, 'json'); };
var getCsv  = function(url) { return $.get(url, null, 'csv' ); };


// Beginning of code from Nathan Sebhastian: https://github.com/nsebhastian/javascript-csv-array-example
//
function csvToArray(str, delimiter = ",") {
    // slice from start of text to the first \n index
    // use split to create an array from string by delimiter
    const headers = str.slice(0, str.indexOf("\n")).split(delimiter);

    // slice from \n index + 1 to the end of the text
    // use split to create an array of each csv value row
    const rows = str.slice(str.indexOf("\n") + 1).split("\n");

    // Map the rows
    // split values from each row into an array
    // use headers.reduce to create an object
    // object properties derived from headers:values
    // the object passed as an element of the array
    const arr = rows.map(function (row) {
        const values = row.split(delimiter);
        const el = headers.reduce(function (object, header, index) {
            object[header] = values[index];
            return object;
         }, {});
        return el;
     });

    // return the array
    return arr;
}

const reader = new FileReader();
reader.onload = function (e) {
    const text = e.target.result;
    const data = csvToArray(text);
    // document.write(JSON.stringify(data));
};
//
// End of code derived from Nathan Sebhastian

function initialize() {
	 $.when(getJson(pointsURL), getCsv(countsURL)).done(function(points, counts ) {
        var ok = _.every(arguments, function(arg) { return arg[1] === "success"; });
        if (ok === false) {
            alert("One or more requests to load data failed. Exiting application.");
            return; 
        }
		// Data is in points[0].features and should be counts[0].features
		// However, CSV loader doesn't seem to be doing quite the right thing
		// TODO: fix issue with CSV loader
		countlocs = points[0].features;
		main_app();
	});
} // initialize()
