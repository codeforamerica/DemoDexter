// BigTagMap.js

// put a toner map in the background
var map = new L.Map('map');
map.attributionControl.setPrefix('');
var toner = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png';
var tonerAttrib = 'Map data &copy; 2012 OpenStreetMap contributors, Tiles &copy; 2012 Stamen Design';
terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
map.addLayer(terrainLayer);
map.setView(new L.LatLng(37.739091, -122.449493), 12);

// color in tagged streets
var taggedStreets = [ ];
$.getJSON("/geometry/" + tagname, function(ways){
  for(var w=0;w<ways.length;w++){
    if(taggedStreets.indexOf( ways[w] ) > -1){
      continue;
    }
    $.getJSON("/osmbyid/" + ways[w], function(tags){
      mapWay( tags.vertices, "#f00" );
    });
    taggedStreets.push( ways[w] );
  }

  // color in streets connected to tagged streets
  $.getJSON("/geometry/" + tagname + "?branched=1", function(ways){
    for(var w=0;w<ways.length && w<15;w++){
      // don't map repeats
      if(taggedStreets.indexOf( ways[w] ) > -1){
        continue;
      }
      $.getJSON("/osmbyid/" + ways[w], function(neighbor){
        mapWay( neighbor.vertices, "#00f" );
      });
      taggedStreets.push( ways[w] );
    }
  });
});

function mapWay( waypts, color ){
  var latlngs = [ ];
  for(var w=0;w<waypts.length;w++){
    latlngs.push( new L.LatLng( waypts[w][0], waypts[w][1] ) );
  }
  new L.polyline( latlngs, { "color": color } ).addTo(map);
}