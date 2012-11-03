
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.helpers({
    title: 'Node-Neo4j Template'    // default title
});

// Routes

app.get('/', routes.site.index);

app.get('/users', routes.users.list);
app.post('/users', routes.users.create);
app.get('/users/:id', routes.users.show);
app.post('/users/:id', routes.users.edit);
app.del('/users/:id', routes.users.del);
app.post('/users/:id/follow', routes.users.follow);
app.post('/users/:id/unfollow', routes.users.unfollow);

app.get('/streets', routes.streets.list);
app.post('/streets', routes.streets.create);
app.get('/streets/:id', routes.streets.show);
app.post('/streets/:id', routes.streets.edit);
app.del('/streets/:id', routes.streets.del);
app.post('/streets/:id/follow', routes.streets.follow);
app.post('/streets/:id/unfollow', routes.streets.unfollow);

app.get('/streetname/:name', routes.streets.byname);
app.get('/streetlist/:id', routes.streets.streetlist);
app.get('/streetidlist/:id', routes.streets.streetidlist);

app.get('/tags', routes.points.list);
//app.post('/tags', routes.points.create);
app.get('/tags/:id', routes.points.show);
app.post('/tags/:id', routes.points.edit);
app.del('/tags/:id', routes.points.del);
app.post('/tags/:id/follow', routes.points.follow);
app.post('/tags/:id/unfollow', routes.points.unfollow);

app.get('/tagname/:tagname', routes.points.tagname);
app.get('/embed/:tagname', routes.points.embedtag);
app.post('/tagname/:tagname', routes.points.create);
app.get('/tagcheck', routes.points.tagcheck);

app.get('/access/:tagname', routes.streets.access);
app.get('/choice/:tagname', routes.streets.choice);
app.get('/geometry/:tagname', routes.streets.geometry);

//app.get('/numbers/:streetid', routes.points.getNumbers);
//app.get('/demolished/:streetid', routes.points.getDemolished);

app.get('/count/:streetname/:tagname', routes.streets.counttags);
app.get('/networkcount/:streetname/:tagname', routes.streets.networkcount);

app.get('/network/:streetid', routes.points.getNetwork);

//app.get('/addmarket/:name', routes.streets.marketbyname);
//app.get('/marketdistance/:id', routes.streets.marketdistance);

app.get('/osmbyid/:osmid', routes.streets.osmbyid);
app.get('/addid/:networkid/:osmid', routes.streets.addosmid);

app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
