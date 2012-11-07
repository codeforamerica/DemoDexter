// points.js
// Routes to CRUD points.

var Point = require('../models/point');
var Street = require('../models/street');

var reservedTags = [ "bart", "chipotle" ];

// GET /tags
exports.list = function (req, res, next) {
    Point.getAll(function (err, points) {
        if (err) return next(err);
        var tagnames = [ ];
        //return res.send(points);
        for(var p=points.length-1;p>=0;p--){
        	if( !points[p]._node._data.data.name || !points[p]._node._data.data.name.length || reservedTags.indexOf( points[p]._node._data.data.name.toLowerCase() ) > -1 ){
        		points.splice(p,1);
        		continue;
        	}
        	if(tagnames.indexOf( points[p]._node._data.data.name ) > -1){
        		points.splice(p,1);
        		continue;
        	}
        	tagnames.push( points[p]._node._data.data.name );
        }
        //return res.send(tagnames);
        res.render('newtag', {
            points: tagnames
        });
    });
};

// GET /demolished/:streetid
exports.getDemolished = function(req, res, next) {
    Point.getDemolished(req.params.streetid, function (err, points) {
        if (err) return next(err);
        res.render('points', {
            points: points
        });
    });
};

// GET /numbers/:streetid
exports.getNumbers = function(req, res, next) {
    Point.getNumbers(req.params.streetid, function (err, points) {
        if (err) return next(err);
        res.render('points', {
            points: points
        });
    });
};

// Get /network/:streetid
exports.getNetwork = function(req, res, next) {
    Point.getNetwork(req.params.streetid, function (err, points) {
        if (err) return next(err);
        res.render('points', {
            points: points
        });
    });
};

// GET /tagname/:tagname
exports.tagname = function(req, res, next){
	Point.getTagged(req.params.tagname, function(err, points) {
		if(err) return next(err);
		// tag has existing members
		res.render('points', {
			points: points,
			name: req.params.tagname
		});
	});
};

// GET /embed/:tagname
exports.embedtag = function(req, res, next){
	Point.getTagged(req.params.tagname, function(err, points) {
		if(err) return next(err);
		// tag has existing members
		res.render('embed', {
			points: points,
			name: req.params.tagname
		});
	});
};

// GET /tagcheck ( newname as parameter )
exports.tagcheck = function(req, res, next){
	res.redirect('/tagname/' + req.query['newname']);
};

// POST /points
exports.create = function (req, res, next) {
    Point.create({
        name: req.body['name'] || req.body['tagname'],
        streets: req.body['streets'].split(',')
    }, function (err, point) {
        if (err) return next(err);
        res.redirect('/tags/' + point.id);
    });
};

// GET /tags/:id
exports.show = function (req, res, next) {
    Point.get(req.params.id, function (err, point) {
        if (err) return next(err);
        // TODO also fetch and show followers?
        point.getFollowing(function (err, following) {
            if (err) return next(err);
            res.render('point', {
                point: point,
                following: following
            });
        });
    });
};

// POST /points/:id
exports.edit = function (req, res, next) {
    Point.get(req.params.id, function (err, point) {
        if (err) return next(err);
        point.name = req.body['name'];
        point.save(function (err) {
            if (err) return next(err);
            res.redirect('/tags/' + point.id);
        });
    });
};

// DELETE /tags/:id
exports.del = function (req, res, next) {
    Point.get(req.params.id, function (err, point) {
        if (err) return next(err);
        point.del(function (err) {
            if (err) return next(err);
            res.redirect('/tags');
        });
    });
};

// POST /points/:id/follow
exports.follow = function (req, res, next) {
    Point.get(req.params.id, function (err, point) {
        if (err) return next(err);
        Street.get((req.body.streetid || req.body.street.id), function (err, other) {
            if (err) return next(err);
            point.follow(other, function (err) {
                if (err) return next(err);
                res.redirect('/tags/' + point.id);
            });
        });
    });
};

// POST /points/:id/unfollow
exports.unfollow = function (req, res, next) {
    Point.get(req.params.id, function (err, point) {
        if (err) return next(err);
        Point.get(req.body.point.id, function (err, other) {
            if (err) return next(err);
            point.unfollow(other, function (err) {
                if (err) return next(err);
                res.redirect('/tags/' + point.id);
            });
        });
    });
};
