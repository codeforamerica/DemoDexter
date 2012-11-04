// streets.js
// Routes to CRUD streets.

var Street = require('../models/street');
var request = require('request');
var xml = require('node-xml')

// GET /streets
exports.list = function (req, res, next) {
    Street.getAll(function (err, streets) {
        if (err) return next(err);
        res.render('streets', {
            streets: streets
        });
    });
};

// POST /streets
exports.create = function (req, res, next) {
    Street.create({
        name: req.body['name'],
        idlist: [ req.body['osmid'] ],
    }, function (err, street) {
        if (err) return next(err);
        res.redirect('/streets/' + street.id);
    });
};

// GET /streets/:id
exports.show = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        // TODO also fetch and show followers?
        street.getFollowingAndOthers(function (err, following, others) {
            if (err) return next(err);
            res.render('street', {
                street: street,
                following: following,
                others: others
            });
        });
    });
};

// GET /streetlist/:id
exports.streetlist = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        // TODO also fetch and show followers?
        street.getFollowingAndOthers(function (err, following, others) {
            if (err) return next(err);
            res.render('streetlist', {
                following: following
            });
        });
    });
};

exports.streetidlist = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        // TODO also fetch and show followers?
        street.getFollowingAndOthers(function (err, following, others) {
            if (err) return next(err);
            res.render('streetidlist', {
                following: following
            });
        });
    });
};

// GET /streetname/:name
exports.byname = function(req, res, next) {
    Street.getIDByName(req.params.name, function(err, street) {
      if (err) return next(err);
      res.send(street.id);
    });
};

// GET /count/:streetname/:tagname
exports.counttags = function(req, res, next) {
  Street.getIDByName(req.params.streetname, function(err, street) {
    Street.getCountById(street.id, req.params.tagname, function(err, streetdata) {
      if (err) return next(err);
      res.send(streetdata);
    });
  });
};

// GET /networkcount/:streetname/:tagname
exports.networkcount = function(req, res, next) {
  Street.getIDByName(req.params.streetname, function(err, street) {
    Street.getNetworkCountById(street.id, req.params.tagname, function(err, streetdata) {
      if (err) return next(err);
      res.send(streetdata);
    });
  });
};


// GET /addmarket/:name
exports.marketbyname = function(req, res, next) {
    Street.getByName(req.params.name, function(err, street) {
      Street.get(street.id, function (err, street) {
        if (err) return next(err);
        street.hasfoodmarket = "true";
        street.save(function (err) {
            if (err) return next(err);
            res.send("success");
        });
      });
    });
};

// GET /addid/:networkid/:osmid
exports.addosmid = function(req, res, next) {
    Street.get(req.params.networkid, function (err, street) {
      if (err) return next(err);
      street.addid( req.params.osmid, function(response){
        res.send(response);
      });
    });
};

// GET /access/:tagname
exports.access = function(req, res, next) {
    var closedConnection = false;
    req.on('close', function(){
      closedConnection = true;
    });
    Street.getAll(function (err, streets) {
        if (err) return next(err);
        var getNextStreet = function(index){
        	street = streets[index];
    	    street.calcdistance(req.params.tagname, function(err, nameanddist){
	            if (err) return next(err);
	            
	            if(nameanddist.name){

					var nameOfNumber = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen"];
		            var carto = "#sfstreets[name='" + nameanddist.name.replace("&apos;","") + "']{ line-color: @" + nameOfNumber[nameanddist.linkcount-2] + "; }\n";
		            res.write(carto);
	            }

	            index++;
	            if(index < streets.length && !closedConnection){
	            	getNextStreet(index);
	            }
	            else{
	            	return res.end();
	            }
	        });
        };
        res.write('/* Sample MSS Symbology - Access: https://gist.github.com/4006494 */\n')
        getNextStreet(0);
    });
};

// GET /choice/:tagname
exports.choice = function(req, res, next) {
    var closedConnection = false;
    req.on('close', function(){
      closedConnection = true;
    });
    Street.getAll(function (err, streets) {
        if (err) return next(err);
        var getNextStreet = function(index){
        	street = streets[index];
    	    street.calcchoice(req.params.tagname, function(err, nameanddist){
	            if (err) return next(err);
	            
	            if(nameanddist.name){

					var nameOfNumber = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen"];
		            var carto = "#sfstreets[name='" + nameanddist.name.replace("&apos;","") + "']{ line-color: @" + nameOfNumber[nameanddist.linkcount-2] + (nameOfNumber[nameanddist.nextlinkcount-2] || "")  + "; }\n";
		            res.write(carto);
	            }

	            index++;
	            if(index < streets.length && !closedConnection){
	            	getNextStreet(index);
	            }
	            else{
	            	return res.end();
	            }
	        });
        };
        res.write('/* Sample MSS Symbology - Choice: https://gist.github.com/4006491 */\n')
        getNextStreet(0);
    });
};

function getShape(wayid, callback){
    var osmurl = 'http://www.openstreetmap.org/api/0.6/way/' + wayid + '/full'

    var requestOptions = {
      'uri': osmurl,
      'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
    };
    
    request(requestOptions, function (err, response, body) {
      var park = {
        "wayid": wayid,
        "vertices": [ ]
      };
      var latlngs = { };
      var lastObject = null;
      var parser = new xml.SaxParser(function(alerts){
        alerts.onStartElementNS(function(elem, attarray, prefix, uri, namespaces){
          var attrs = { };
          for(var a=0;a<attarray.length;a++){
            attrs[ attarray[a][0] ] = attarray[a][1];
          }
          if(elem == "node"){
            latlngs[ attrs["id"] ] = [ attrs["lat"] * 1, attrs["lon"] * 1 ];
            lastObject = "node";
          }
          else if(elem == "way"){
            lastObject = "way";
          }
          else if(elem == "nd"){
            park.vertices.push( latlngs[ attrs["ref"] ] );
          }
          else if(elem == "tag"){
            if(lastObject == "way" && attrs["k"] == "name"){
              park.name = attrs["v"];
            }
          }
        });
        alerts.onEndDocument(function(){
          callback( park );
        });
      });
      parser.parseString(body);
    });
}

// GET /osmbyid/:osmid
exports.osmbyid = function(req, res, next) {
  getShape(req.params.osmid, function(shape){
    res.send(shape);
  });
};

// GET /geometry/:tagname
exports.geometry = function(req, res, next) {
	var streetnames = [ ];
    if(req.query['branched'] && req.query['branched'] == "1"){
        // neighbors
        Street.getNeighbors(req.params.tagname, function(err, streets){
            if(err){ return res.write(JSON.stringify(err)); } 
            
            if(streets.length == 0){
              return res.send([ ]);
            }
            
            //return res.send(streets || "no content");
            var loadStreet = function(index){
                // if this street has already been sent, don't send it again
                if(streetnames.indexOf( streets[index].streets._data.data.name ) != -1){
                  index++;
                  if(index >= streets.length){
                    // finished streets - close response
                    res.write(']');
                    return res.end();
                  }
                  else{
                    // next street
                    return loadStreet(index);
                  }
                }
                
                // send every OSM geometry making up this street
                streetnames.push( streets[index].streets._data.data.name );
                if(index != 0){
                  res.write(',');
                }
                var osmids = streets[index].streets._data.data.idlist;
                var loadOSMID = function(osmindex){
                  //getShape( osmids[osmindex], function(shape){
                    res.write( JSON.stringify( osmids[osmindex] * 1 || shape || "shape not sent" ) );
                    osmindex++;
                    if(osmindex >= osmids.length){
                      // finished OSM wayids for this street - go to next street
                      index++;
                      if(index >= streets.length){
                        // finished streets - close response
                        res.write(']');
                        res.end();
                      }
                      else{
                        // next street
                        loadStreet(index);
                      }
                    }
                    else{
                      // next OSM id
                      res.write(',');
                      loadOSMID(osmindex);
                    }
                  //});
                }
                loadOSMID(0);
            };
            res.write('[');
            loadStreet(0);
            //res.write('prepare for indexes')
        });
    }
    else{
        // tagged
        Street.getTagged(req.params.tagname, function(err, streets){
            if(err){ return res.write(JSON.stringify(err)); } 

            if(streets.length == 0){
              return res.send([ ]);
            }

            //return res.send(streets || "no content");
            var loadStreet = function(index){
                // if this street has already been sent, don't send it again
                if(streetnames.indexOf( streets[index].streets._data.data.name ) != -1){
                  index++;
                  if(index >= streets.length){
                    // finished streets - close response
                    res.write(']');
                    return res.end();
                  }
                  else{
                    // next street
                    return loadStreet(index);
                  }
                }
                
                // send every OSM geometry making up this street
                streetnames.push( streets[index].streets._data.data.name );
                if(index != 0){
                  res.write(',');
                }
                var osmids = streets[index].streets._data.data.idlist;
                var loadOSMID = function(osmindex){
                  //getShape( osmids[osmindex], function(shape){
                    res.write( JSON.stringify( osmids[osmindex] * 1 || shape || "shape not sent" ) );
                    osmindex++;
                    if(osmindex >= osmids.length){
                      // finished OSM wayids for this street - go to next street
                      index++;
                      if(index >= streets.length){
                        // finished streets - close response
                        res.write(']');
                        res.end();
                      }
                      else{
                        // next street
                        loadStreet(index);
                      }
                    }
                    else{
                      // next OSM id
                      res.write(',');
                      loadOSMID(osmindex);
                    }
                  //});
                }
                loadOSMID(0);
            };
            res.write('[');
            loadStreet(0);
            //res.write('prepare for indexes')
        });
    }
};

// POST /streets/:id
exports.edit = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        street.name = req.body['name'];
        street.save(function (err) {
            if (err) return next(err);
            res.redirect('/streets/' + street.id);
        });
    });
};

// DELETE /streets/:id
exports.del = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        street.del(function (err) {
            if (err) return next(err);
            res.redirect('/streets');
        });
    });
};

// POST /streets/:id/follow
exports.follow = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        Street.get((req.body.streetid || req.body.street.id), function (err, other) {
            if (err) return next(err);
            street.follow(other, req.body.latlng, function (err) {
                if (err) return next(err);
                res.redirect('/streets/' + street.id);
            });
        });
    });
};

// POST /streets/:id/unfollow
exports.unfollow = function (req, res, next) {
    Street.get(req.params.id, function (err, street) {
        if (err) return next(err);
        Street.get(req.body.street.id, function (err, other) {
            if (err) return next(err);
            street.unfollow(other, function (err) {
                if (err) return next(err);
                res.redirect('/streets/' + street.id);
            });
        });
    });
};
