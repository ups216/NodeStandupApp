
'use strict';

var fs = require('fs');
var path = require('path');

var DEFAULT_DB_LOCATION = 'server/db.json';
var db;

function createDb(path, callback) {
	function loadDb(clb) {
		fs.exists(path, function(exists) {
			if (exists) {
				fs.readFile(path, function(err, val) {
					if (err) {
						return clb(err);
					}
					
					return clb(null, JSON.parse(val), false);
				});
			} else {
				fs.writeFile(path, JSON.stringify({}), function(err) {
					if (err) {
						return clb(err);
					}
					
					return clb(null, {}, true);
				});
			}
		});
	}
	
	loadDb(function(err, contents, dbCreated) {
		if (err) {
			return callback(err);
		}
		
		callback(null, {
			get: function(key, c) {
				c(null, contents[key]);
			},
			
			set: function(key, value, c) {
				contents[key] = value;
				fs.writeFile(path, JSON.stringify(contents, null, '  '), c);
			},
			
			del: function(key, c) {
				delete contents[key];
				fs.writeFile(path, JSON.stringify(contents, null, '  '), c);
			}
		}, dbCreated);
	});
}

// DB Startup routine
module.exports.startup = function(callback, dblocation) {
	dblocation = dblocation || DEFAULT_DB_LOCATION;
	createDb(dblocation, function(err, jsonDb, dbCreated) {
		if (err) {
			return callback(err);
		}
		
		db = jsonDb;
		
		return callback(null, dbCreated);
	});
};

// Get stage
module.exports.getStage = function(callback) {
	return db.get('stage', callback);
};

// Set stage
module.exports.setStage = function(current, order, callback) {
	return db.set('stage', {
		current: current,
		order: order
	}, callback);	
};

// Clear stage
module.exports.clearStage = function(callback) {
	return db.del('stage', callback);
};

// IsRunning
module.exports.isRunning = function(callback) {
	db.get('stage', function(err, stage) {
		return callback(err, stage && stage.current >= 0);
	});
}

// Needs ReInit
module.exports.needsReinit = function(callback) {
	db.get('reinit', function(err, reinit) {
		if (err) {
			return callback(err);
		}
		
		if (!reinit) {
			return callback(null, true);
		}
		
		var configMtime = reinit.configMtime;
		var lastInitTime = reinit.lastInitTime;
		
		fs.stat(path.join(__dirname, '..', 'config.js'), function(err, stat) {
			if (err) {
				return callback(err);
			}
			
			if (stat.mtime.getTime() > configMtime) {
				return callback(null, true);
			}
			
			var now = new Date();
			if (now.getDate() !== new Date(lastInitTime).getDate()) {
				return callback(null, true);
			}
			
			return callback(null, false);
		});
	});
}

module.exports.reinit = function(callback) {
	fs.stat(path.join(__dirname, '..', 'config.js'), function(err, stat) {
		if (err) {
			return callback(err);
		}
		
		db.set('reinit', {
			configMtime: stat.mtime.getTime(),
			lastInitTime: new Date().getTime()
		}, callback);
	});
}