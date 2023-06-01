// 'Getting started' code taken from leaflet.js website, and modified

var regionCenterLat = 42.345111165; 
var regionCenterLng = -71.124736685; 
var initialZoom = 11; 

var map = L.map('map').setView([regionCenterLat, regionCenterLng], initialZoom);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
