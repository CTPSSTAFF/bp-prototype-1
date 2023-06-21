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
	var errors = [];
	var tmp = { 'count_id' : null, 'loc_id' : null };
	counts.forEach(function(count) {
		var count_id, bp_loc_id, feature, msg;
		count_id = count.count_id;
		bp_loc_id = count.bp_loc_id;
		feature = _.find(countlocs, function(feature) { return feature.properties.loc_id == bp_loc_id; });
		if (feature == null) {
			tmp = { 'count_id' : count_id, 'loc_id' : bp_loc_id };
			errors.push(tmp);
		}
	});
	return errors;
} 

function validate_count_data(counts) {
	var errors = [];
	counts.forEach(function(count) {
		var count_id = count.count_id;
		console.log(count_id);
		if (count_id == '20600') {
			var _DEBUG_HOOK = 0;
		}
		if (!count.hasOwnProperty('count_date')) {
			errors.push(count_id + 'no count_date');
		}
	});
	return errors;
}
