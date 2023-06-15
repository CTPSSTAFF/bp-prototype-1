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
	})
} 

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
} 
