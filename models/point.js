// point.js
// Point / Tag model logic.

var neo4j = require('neo4j');
var Street = require('./street.js')
var db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474');

// constants:

var INDEX_NAME = 'nodes';
var INDEX_KEY = 'type';
var INDEX_VAL = 'point';

var FOLLOWS_REL = 'partof';

// private constructor:

var Point = module.exports = function Point(_node) {
    // all we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// pass-through node properties:

function proxyProperty(prop, isData) {
    Object.defineProperty(Point.prototype, prop, {
        get: function () {
            if (isData) {
                return this._node.data[prop];
            } else {
                return this._node[prop];
            }
        },
        set: function (value) {
            if (isData) {
                this._node.data[prop] = value;
            } else {
                this._node[prop] = value;
            }
        }
    });
}

proxyProperty('id');
proxyProperty('exists');

proxyProperty('name', true);

// private instance methods:

Point.prototype._getFollowingRel = function (other, callback) {
    var query = [
        'START point=node({pointId}), other=node({otherId})',
        'MATCH (point) -[rel?:FOLLOWS_REL]-> (other)',
        'RETURN rel'
    ].join('\n')
        .replace('FOLLOWS_REL', FOLLOWS_REL);

    var params = {
        pointId: this.id,
        otherId: other.id,
    };

    db.query(query, params, function (err, results) {
        if (err) return callback(err);
        var rel = results[0] && results[0]['rel'];
        callback(null, rel);
    });
};

// public instance methods:

Point.prototype.save = function (callback) {
    this._node.save(function (err) {
        callback(err);
    });
};

Point.prototype.del = function (callback) {
    this._node.del(function (err) {
        callback(err);
    }, true);   // true = yes, force it (delete all relationships)
};

// using to represent Point PARTOF Street
Point.prototype.follow = function (other, callback) {
    //banana('hello?');
    this._node.createRelationshipTo(other._node, 'partof', {}, function (err, rel) {
        callback(err);
    });
};

Point.prototype.unfollow = function (other, callback) {
    this._getFollowingRel(other, function (err, rel) {
        if (err) return callback(err);
        if (!rel) return callback(null);
        rel.del(function (err) {
            callback(err);
        });
    });
};

// calls callback w/ (err, following, others) where following is an array of
// users this user follows, and others is all other users minus him/herself.
Point.prototype.getFollowingAndOthers = function (callback) {
    // query all users and whether we follow each one or not:
    var query = [
        'START point=node({pointId}), street=node:nodes(type="street")',
        'MATCH (point) -[rel?:partof]-> (street)',
        'RETURN street, COUNT(rel)'  // COUNT(rel) is a hack for 1 or 0
    ].join('\n')
        .replace('INDEX_NAME', INDEX_NAME)
        .replace('INDEX_KEY', INDEX_KEY)
        //.replace('INDEX_VAL', INDEX_VAL) looking for streets now
        .replace('FOLLOWS_REL', FOLLOWS_REL);

    var params = {
        pointId: this.id,
    };

    var point = this;
    db.query(query, params, function (err, results) {
        if (err) return callback(err);

        var following = [];
        var others = [];

        for (var i = 0; i < results.length; i++) {
            var other = new Street(results[i]['street']);
            var follows = results[i]['COUNT(rel)'];
                // XXX neo4j bug: returned names are always lowercase!
                // TODO FIXME when updating to the next version of neo4j.

            if (point.id === other.id) {
                continue;
            } else if (follows) {
                following.push(other);
            } else {
                others.push(other);
            }
        }

        callback(null, following, others);
    });
};


Point.prototype.getFollowing = function (callback) {
    var query = [
        'START point=node({pointId}), street=node:nodes(type="street")',
        'MATCH (point) -[:partof]-> (street)',
        'RETURN street'
    ].join('\n')
        .replace('INDEX_NAME', INDEX_NAME)
        .replace('INDEX_KEY', INDEX_KEY)
        //.replace('INDEX_VAL', INDEX_VAL) looking for streets now
        .replace('FOLLOWS_REL', FOLLOWS_REL);

    var params = {
        pointId: this.id,
    };

    var point = this;
    db.query(query, params, function (err, results) {
        if (err) return callback(err);

        var following = [];
        var others = [];

        for (var i = 0; i < results.length; i++) {
            var other = new Street(results[i]['street']);
            following.push(other);
        }

        callback(null, following, others);
    });
};

// static methods:

Point.get = function (id, callback) {
    db.getNodeById(id, function (err, node) {
        if (err) return callback(err);
        callback(null, new Point(node));
    });
};

Point.getTagged = function(name, callback) {
    var query = [
        'START point=node:nodes(type="point")',
        'WHERE point.name! = {pointName}',
        'RETURN point'
    ].join('\n');
    var params = {
        pointName: name,
    };
    db.query(query, params, function(err, points) {
        if (err) return callback(err);
        callback(null, points);
    });
};

Point.getDemolished = function(streetid, callback) {
    var query = [
        'START points=node:nodes(type="point"), street=node({streetId})',
        'MATCH (points) -[:partof]-> (street)',
        'WHERE points.action = {status}',
        'RETURN points'
    ].join('\n');
    var params = {
        streetId: streetid * 1,
        status: "Demolished & Cleared"
    };
    db.query(query, params, function(err, results) {
        if (err) return callback(err);
        var points = [];
        var numbers = [];
        for(var r=0;r<results.length;r++){
          var point = new Point(results[r]["points"]);
          if(numbers.indexOf(point.number) == -1){
            points.push(point);
          }
        }
        callback(null, points);
    });
};

Point.getNumbers = function(streetid, callback) {
    var query = [
        'START points=node:nodes(type="point"), street=node({streetId})',
        'MATCH (points) -[:partof]-> (street)',
        'RETURN points'
    ].join('\n');
    var params = {
        streetId: streetid * 1
    };
    db.query(query, params, function(err, results) {
        if (err) return callback(err);
        var points = [];
        var numbers = [];
        for(var r=0;r<results.length;r++){
          var point = new Point(results[r]["points"]);
          if(numbers.indexOf(point.number) == -1){
            numbers.push(point.number);
            points.push(point);
          }
        }
        callback(null, points);
    });
};

Point.getNetwork = function(streetid, callback) {
    var query = [
        'START points=node:nodes(type="point"), street=node({streetId})',
        'MATCH (points) -[:partof]-> (neighbors) -[:connectsto]-> (street)',
        'RETURN points'
    ].join('\n');
    var params = {
        streetId: streetid * 1
    };
    db.query(query, params, function(err, results) {
        if (err) return callback(err);
        var points = [];
        var numbers = [];
        for(var r=0;r<results.length;r++){
          var point = new Point(results[r]["points"]);
          if(numbers.indexOf(point.number) == -1){
            numbers.push(point.number);
            points.push(point);
          }
        }
        callback(null, points);
    });
};

Point.getAll = function (callback) {
    db.getIndexedNodes(INDEX_NAME, INDEX_KEY, INDEX_VAL, function (err, nodes) {
        // if (err) return callback(err);
        // XXX FIXME the index might not exist in the beginning, so special-case
        // this error detection. warning: this is super brittle!!
        if (err) return callback(null, []);
        var points = nodes.map(function (node) {
            return new Point(node);
        });
        callback(null, points);
    });
};

var replaceAll = function(src, oldr, newr){
	while(src.indexOf(oldr) > -1){
		src = src.replace(oldr, newr);
	}
	return src;
};

// creates the user and persists (saves) it to the db, incl. indexing it:
Point.create = function (data, callback) {
    var node = db.createNode(data);
    var point = new Point(node);
    node.save(function (err) {
        if (err) return callback(err);
        node.index(INDEX_NAME, INDEX_KEY, INDEX_VAL, function (err) {
            if (err || !data.streets.length) return callback(err);
            var getNextStreet = function( index ){
            	Street.getByName( replaceAll( data.streets[index].toLowerCase(), " ", "" ), function(err, streetnode){
            		if(err){
            			return callback(err);
            		}
	            	point.follow( new Street( streetnode ), function(err){
	            		if(err){
	            			return callback(err);
	            		}
	            		index++;
	            		if(index < data.streets.length){
		            		getNextStreet(index);
		            	}
		            	else{
		            		callback( null, point );
		            	}
	            	});
	            });
            };
            
            getNextStreet(0);
        });
    });
};
