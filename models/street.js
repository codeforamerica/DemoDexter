// street.js
// Street model logic.

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474');

// constants:

var INDEX_NAME = 'nodes';
var INDEX_KEY = 'type';
var INDEX_VAL = 'street';

var FOLLOWS_REL = 'connectsto';

// private constructor:

var Street = module.exports = function Street(_node) {
    // all we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// pass-through node properties:

function proxyProperty(prop, isData) {
    Object.defineProperty(Street.prototype, prop, {
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
proxyProperty('hasfoodmarket', true); // food network map
proxyProperty('idlist', true);

// private instance methods:

Street.prototype._getFollowingRel = function (other, callback) {
    var query = [
        'START street=node({streetId}), other=node({otherId})',
        'MATCH (street) -[rel?:FOLLOWS_REL]-> (other)',
        'RETURN rel'
    ].join('\n')
        .replace('FOLLOWS_REL', FOLLOWS_REL);

    var params = {
        streetId: this.id,
        otherId: other.id,
    };

    db.query(query, params, function (err, results) {
        if (err) return callback(err);
        var rel = results[0] && results[0]['rel'];
        callback(null, rel);
    });
};

// public instance methods:

Street.prototype.save = function (callback) {
    this._node.save(function (err) {
        callback(err);
    });
};

Street.prototype.del = function (callback) {
    this._node.del(function (err) {
        callback(err);
    }, true);   // true = yes, force it (delete all relationships)
};

Street.prototype.follow = function (other, latlng, callback) {
    this._node.createRelationshipTo(other._node, 'connectsto', {}, function (err, rel) {
        callback(err);
        /*rel.data["latlng"] = latlng;
        rel.save(function(err){
          if(err){
            console.log(banana);
          }
        });*/
    });
};

Street.prototype.unfollow = function (other, callback) {
    this._getFollowingRel(other, function (err, rel) {
        if (err) return callback(err);
        if (!rel) return callback(null);
        rel.del(function (err) {
            callback(err);
        });
    });
};

Street.prototype.addMarket = function () {
	this._node.setProperty("hasfoodmarket", "true", function(err, node){
		callback(err);
	});
};

Street.prototype.addid = function (id, callback) {
	this._node.data['idlist'].push( id );
	this._node.save(function(err){
	   callback(err || "looks good");
	});
};

Street.prototype.calcdistance = function(tagname, callback){
    var query = [
        'START street=node({streetId}), other=node:nodes(type="point")',
        'MATCH p = shortestPath( (other) -[*..15]-> (street) )',
        'WHERE other.name! = {tagname}',
        'RETURN p'
    ].join('\n');
    

    var params = {
    	streetId: this.id,
        tagname: tagname
    };

    var street = this;
    db.query(query, params, function (err, results) {
        if (err) return callback(err);
        
        if(!results.length){
          return callback(err, { });
        }
        
        results.sort(function(a, b){
          return a.p._nodes.length - b.p._nodes.length;
        });
        
        var shortestlinks = null;
        for(var r=0;r<results.length;r++){
          if(results[r].p._nodes){
            shortestlinks = results[r].p._nodes.length;
            break;
          }
        }
        if(!shortestlinks){
          return callback(err, { });
        }
        
        callback(err, { linkcount: shortestlinks, name: street.name });
    });
};

Street.prototype.calcchoice = function(tagname, callback){
    var query = [
        'START street=node({streetId}), other=node:nodes(type="point")',
        'MATCH p = shortestPath( (other) -[*..15]-> (street) )',
        'WHERE other.name! = {tagname}',
        'RETURN p'
    ].join('\n');
    

    var params = {
    	streetId: this.id,
        tagname: tagname
    };

    var street = this;
    db.query(query, params, function (err, results) {
        if (err) return callback(err);
        
        if(!results.length){
          return callback(err, { });
        }
        
        results.sort(function(a, b){
          return a.p._nodes.length - b.p._nodes.length;
        });
        
        var shortestlinks = null;
        var nextshortestlinks = null;
        for(var r=0;r<results.length;r++){
          if(results[r].p._nodes){
            if(!shortestlinks){
              shortestlinks = results[r].p._nodes.length;
            }
            else{
              nextshortestlinks = results[r].p._nodes.length;
              break;
            }
          }
        }
        if(!shortestlinks){
          return callback(err, { });
        }
        
        callback(err, { linkcount: shortestlinks, nextlinkcount: nextshortestlinks, name: street.name });
    });
};

// calls callback w/ (err, following, others) where following is an array of
// users this user follows, and others is all other users minus him/herself.
Street.prototype.getFollowingAndOthers = function (callback) {
    // query all users and whether we follow each one or not:
    var query = [
        'START street=node({streetId}), other=node:INDEX_NAME(INDEX_KEY="INDEX_VAL")',
        'MATCH (street) -[rel?:FOLLOWS_REL]-> (other)',
        'RETURN other, COUNT(rel)'  // COUNT(rel) is a hack for 1 or 0
    ].join('\n')
        .replace('INDEX_NAME', INDEX_NAME)
        .replace('INDEX_KEY', INDEX_KEY)
        .replace('INDEX_VAL', INDEX_VAL)
        .replace('FOLLOWS_REL', FOLLOWS_REL);

    var params = {
        streetId: this.id,
    };

    var street = this;
    db.query(query, params, function (err, results) {
        if (err) return callback(err);

        var following = [];
        var others = [];

        for (var i = 0; i < results.length; i++) {
            var other = new Street(results[i]['other']);
            var follows = results[i]['COUNT(rel)'];
                // XXX neo4j bug: returned names are always lowercase!
                // TODO FIXME when updating to the next version of neo4j.

            if (street.id === other.id) {
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

// static methods:

Street.get = function (id, callback) {
    db.getNodeById(id, function (err, node) {
        if (err) return callback(err);
        callback(null, new Street(node));
    });
};

Street.getCountById = function(streetId, tagname, callback) {
    var query = [
        'START street=node({streetId}), tag=node:nodes(type="point")',
        'MATCH (tag) -[:partof]-> (street)',
        'WHERE tag.name! = {tagname}',
        'RETURN tag'
    ].join('\n');
    var params = {
        streetId: streetId * 1,
        tagname: tagname
    };
    db.query(query, params, function(err, tags) {
        if (err) return callback(err);
        callback(null, { count: tags.length });
    });
};

Street.getNetworkCountById = function(streetId, tagname, callback) {
    var query = [
        'START street=node({streetId}), tag=node:nodes(type="point")',
        'MATCH (tag) -[:partof]-> (neighborstreet) -[:connectsto]-> (street)',
        'WHERE tag.name! = {tagname}',
        'RETURN tag'
    ].join('\n');
    var params = {
        streetId: streetId * 1,
        tagname: tagname
    };
    db.query(query, params, function(err, tags) {
        if (err) return callback(err);
        var tagids = [ ];
        for(var t=0;t<tags.length;t++){
          var streetslug = tags[t].tag._data.data.streets.join(',');
          if(tagids.indexOf( streetslug ) == -1){
            tagids.push( streetslug );
          }
        }
        callback(null, { count: tagids.length });
    });
};

Street.getIDByName = function(name, callback) {
    var query = [
        'START street=node:nodes(type="street")',
        'WHERE street.name = {streetName}',
        'RETURN street'
    ].join('\n');
    var params = {
        streetName: name,
    };
    db.query(query, params, function(err, streets) {
        if (err) return callback(err);
        if(streets.length == 0){
          callback(null, { id: "-1" });
        }
        else{
          callback(null, { id: streets[0].street._data.self.substring( streets[0].street._data.self.lastIndexOf("/") + 1 ) });
        }
    });
};

Street.getByName = function(name, callback) {
    var query = [
        'START street=node:nodes(type="street")',
        'WHERE street.name! = {streetName}',
        'RETURN street'
    ].join('\n');
    var params = {
        streetName: name,
    };
    db.query(query, params, function(err, streets) {
        if (err) return callback(err);
        callback(null, streets[0].street);
    });
};

Street.getTagged = function(tagname, callback) {

    var query = [
        'START point=node:nodes(type="point"), streets=node:nodes(type="street")',
        'MATCH (point) -[:partof]-> (streets)',
        'WHERE point.name! = {pointName}',
        'RETURN streets'
    ].join('\n');
    var params = {
        pointName: tagname,
    };
    db.query(query, params, function(err, streets) {
        callback(err, streets);
    });
};

Street.getNeighbors = function(tagname, callback) {
    var query = [
        'START point=node:nodes(type="point"), streets=node:nodes(type="street")',
        'MATCH (point) -[:partof]-> (tagged) -[:connectsto]-> (streets)',
        'WHERE point.name! = {pointName}',
        'RETURN streets'
    ].join('\n');
    var params = {
        pointName: tagname,
    };
    db.query(query, params, function(err, streets) {
        callback(err, streets);
    });
};

Street.getAll = function (callback) {
    db.getIndexedNodes(INDEX_NAME, INDEX_KEY, INDEX_VAL, function (err, nodes) {
        // if (err) return callback(err);
        // XXX FIXME the index might not exist in the beginning, so special-case
        // this error detection. warning: this is super brittle!!
        if (err) return callback(null, []);
          // maximum of 50 nodes returned
          // nodes = nodes.slice(0, 50);
        var streets = nodes.map(function (node) {
            return new Street(node);
        });
        callback(null, streets);
    });
};



// creates the user and persists (saves) it to the db, incl. indexing it:
Street.create = function (data, callback) {
    var node = db.createNode(data);
    var street = new Street(node);
    node.save(function (err) {
        if (err) return callback(err);
        node.index(INDEX_NAME, INDEX_KEY, INDEX_VAL, function (err) {
            if (err) return callback(err);
            callback(null, street);
        });
    });
};
