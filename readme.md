# About DemoDexter

<a href="http://demodexter.herokuapp.com">DemoDexter</a> uses a node.js server and a neo4j graph database to build a street network from OpenStreetMap data.

Visiting <a href="http://demodexter.herokuapp.com/streets/709">a street's page</a> shows you all named streets which are connected to it.

Neo4j network view:<br/>
<img src="http://i.imgur.com/DhfvS.png"/>

## Neo4j, a graph database

Collecting statistics on a neighborhood level for every point in a large dataset becomes much simpler using a graph database.

DemoDexter stores tagged items (like BART stations and Chipotle restaurants) as Points, and links them to Streets. Then Streets are linked to any connecting Streets. This allows us to collect information on a network / neighborhood level.  It also lets us count links between any street in the city and the nearest BART station or similar target.


## San Francisco: an Open Network API and Datastore

<img src="http://i.imgur.com/bsmlG.png"/>

Experimental project. Here's how to get started with the API:

* /tags - add a new tag, see existing tags

* /tagname/YOUR_TAG - see a map and tag additional streets

* /embed/YOUR_TAG - draws a map of tagged streets and connecting streets

* /access/YOUR_TAG - returns Carto which color-codes your streets by access to the nearest tag

* /choice/YOUR_TAG - returns Carto which color-codes your streets by access to the two nearest tags

You can put Carto into TileMill to draw pretty maps.


## Macon: Demolition Data

### These features were available only on the Macon instance of DemoDexter.

<a href="http://houseplot.herokuapp.com/demolished/709">/demolished</a> searches for demolished houses on a street:

    var params = {
        streetId: req.query['id'] * 1,
        status: "Demolished & Cleared"
    };
    var query = [
        'START points=node:nodes(type="point"), street=node({streetId})',
        'MATCH (points) -[:partof]-> (street)',
        'WHERE points.action = {status}',
        'RETURN points'
    ].join('\n');

<a href="http://houseplot.herokuapp.com/network/709">/network</a> returns the demolished houses on streets <b>connected to your street</b>:

    var params = {
        streetId: req.query['id'] * 1,
        status: "Demolished & Cleared"
    };
    var query = [
        'START points=node:nodes(type="point"), street=node({streetId})',
        'MATCH (points) -[:partof]-> (neighborstreet) -[:connectsto]-> (street)',
        'WHERE points.action = {status}',
        'RETURN points'
    ].join('\n');

## Building the street network

### Locally
<ul>
<li>Download a .OSM file from <a href="http://metro.teczno.com/">metro.teczno.com</a></li>
<li>Start your neo4j database:

    neo4j-community-1.8/bin/neo4j start

</li>
<li>Start the DemoDexter server:

    npm start

</li>
<li>Edit and run the storeosm.py script (included in repo) to add and connect streets from the .osm file to your database. This can take a few hours.</li>
<li>If your upload is interrupted, delete the last street and set firstToAdd eqaul to the street name (lowercase, no spaces)</li>
</ul>

### Cloud process through Heroku
<ul>
<li>Follow the installation directions for Heroku and install the neo4j addon</li>
<li>Include your .osm file and a modified storeosm.py file and submit them to the repo</li>
<li>Run storeosm.py using
    heroku run:detached 'python storeosm.py'
</li>
<li>Use 'heroku logs' to check the status of your script</li>
<li>Once you have finished adding streets, make a commit to remove the script and OSM file</li>
</ul>


## Adding houses
<ul>
<li>Put your houses or other point data into a CSV file</li>
<li>Run <a href="https://gist.github.com/3454788">HouseNet.py</a> or a similar script to import each case as a Point, and link it to a Street</li>
<li>Depending on stats you would like to collect, you may need to write some code to collect network stats. <a href="https://gist.github.com/3473604">NetworkStats.py</a> is a sample script.</li>
</ul>

## Adding supermarkets
<ul>
<li>Call /addmarket/streetname using the shortened name for each street with a supermarket. For example, /addmarket/mainst</li>
<li>Call /marketdistance/id using the numeric id of a street to return carto of that road name and supermarket distance</li>
</ul>

# About Node-Neo4j Template

<a href="https://github.com/aseemk/node-neo4j-template">Node-Neo4j Template from aseemk</a> simplifies the use of [Neo4j][] from Node.js. It uses the
[node-neo4j][] library, available on npm as `neo4j`.

The app introduces you to Neo4j with a social network manager: it lets you add and remove users and "follows" relationships between them.

## Installation

```bash
# Install the required dependencies
npm install

# Install Neo4j 1.8 locally
curl "http://dist.neo4j.org/neo4j-community-1.8-unix.tar.gz" --O "db-unix.tar.gz"
tar -zxvf db-unix.tar.gz 2> /dev/null
rm db-unix.tar.gz
```

## Usage

```bash
# Start the local Neo4j instance
neo4j-community-1.8/bin/neo4j start

# Run the app!
npm start
```

The app will now be accessible at [http://localhost:3000/](http://localhost:3000/).

# Uploading to Heroku

Both node-neo4j template and DemoDexter support deploying to Heroku.

## Create the app and add a neo4j 1.8 addon

    heroku create APP_NAME
    heroku addons:add neo4j --neo4j-version 1.8
    git push heroku master

## Miscellany

- MIT license.

[Neo4j]: http://www.neo4j.org/
[node-neo4j]: https://github.com/thingdom/node-neo4j

[coffeescript]: http://www.coffeescript.org/
[streamline]: https://github.com/Sage/streamlinejs
