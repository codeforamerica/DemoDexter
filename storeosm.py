# OSM Points and Streets
# Build from nodes and ways

# For each node, add it to node-ids with lat and lng
# For each way, add them to Streets
## If Street has a node with a previous street, build a connectsto relation between the two

# 0) Opening the file
import urllib, urllib2
osmfile = open('san-francisco.osm', 'r')

allnodes = { }
nodes = { }
inway = False
incity = False
wayname = ""
waynodes = []
addedways = []
wayids = {}
isHighway = False
osmwayid = ""

firstToAdd = "benningtonstreet"
cityToAdd = '"tiger:county" v="San Francisco, CA"'

for line in osmfile:

  # 1) Becoming aware of nodes
  #if(line.find('<node id=') > -1):
  #  node_id = line[ line.find('id=') + 4 : len(line) ]
  #  node_id = node_id[ 0 : node_id.find('"') ]
  #  lat = line[ line.find('lat=') + 5 : len(line) ]
  #  lat = lat[ 0 : lat.find('"') ]
  #  lng = line[ line.find('lon=') + 5 : len(line) ]
  #  lng = lng[ 0 : lng.find('"') ]
  #  allnodes[ node_id ] = lat + "," + lng

  # 2) Add Streets
  if(line.find('<way') > -1):
    inway = True
    incity = False
    osmwayid = line[ line.find('id=') + 4 : len(line) ]
    osmwayid = osmwayid[ 0 : osmwayid.find('"') ]
    #print osmwayid

  elif(inway == True):
    if(line.find(cityToAdd) > -1):
      incity = True

    if(line.find('<nd ref') > -1):
      # add this node id
      id = line[ line.find('ref="') + 5 : len(line) ]
      id = id[ 0 : id.find('"') ]
      waynodes.append( id )
    
    elif(line.find('k="highway"') > -1):
      isHighway = True
      
    elif(line.find('k="name"') > -1):
      # found the road name
      wayname = line[ line.find('v="') + 3 : len(line) ]
      wayname = wayname[ 0 : wayname.find('"') ]
      # use database's preferred parsing of street names
      wayname = wayname.lower().replace(' ','')

    elif(line.find('</way>') > -1):
      inway = False

      # only add if this way was inside the target city
      if(incity == False):
        wayname = ""
        waynodes = []
        isHighway = False
        continue
      
      # only care about roads with names
      if(wayname != "" and isHighway == True):
        # check if way needs to be added to the database
        if(not (wayname in addedways)):
          print wayname
          addedways.append( wayname )
          values = {
            "name": wayname,
            "osmid": osmwayid
          }
          data = urllib.urlencode(values)
          # store final url: /streets/ID
          if((firstToAdd == None) or (firstToAdd == wayname)):
            wayids[ wayname ] = urllib2.urlopen(urllib2.Request('http://demodexter.herokuapp.com/streets', data)).geturl().split('streets/')[1]
            print wayids[ wayname ]
            firstToAdd = None
          else:
            # retrieve this way ID by name
            try:
              wayids[ wayname ] = urllib2.urlopen('http://demodexter.herokuapp.com/streetname/' + wayname).read()           
            except:
              continue
        
        elif(firstToAdd is None):
          # wayname has been added, but you need to add a new osm_id
          #print "added id " + osmwayid
          print urllib2.urlopen('http://demodexter.herokuapp.com/addid/' + wayids[ wayname ] + '/' + osmwayid).read()

        # now add relationships to nodes in the way
        for node in waynodes:
          if(nodes.has_key(node)):
            for streetid in nodes[node]:

              if(wayids.has_key(wayname) == False):
                continue
    
              if(streetid == wayids[wayname]):
                continue
            
              if(firstToAdd is None):
                #print "attempting connection at "
                #print allnodes[node]
                values = {
                  "streetid": wayids[wayname]  #,
                  #"latlng": allnodes[node]
                }
                data = urllib.urlencode(values)
                urllib2.urlopen(urllib2.Request('http://demodexter.herokuapp.com/streets/' + streetid + '/follow', data)).read()
                values = {
                  "streetid": streetid #,
                  #"latlng": allnodes[node]
                }
                data = urllib.urlencode(values)
                urllib2.urlopen(urllib2.Request('http://demodexter.herokuapp.com/streets/' + wayids[wayname] + '/follow', data)).read()
                print "connection made"
            
            if( wayids.has_key(wayname) == False ):
              continue
            nodes[node].append( wayids[ wayname ] )
          else:
            try:
              nodes[node] = [ wayids[wayname] ]
            except:
              s = 1
      # reset way defaults
      wayname = ""
      waynodes = []
      isHighway = False
      incity = False
