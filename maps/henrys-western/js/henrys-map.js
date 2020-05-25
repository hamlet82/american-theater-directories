let svgns = "http://www.w3.org/2000/svg";

function mouseOverEffect() {
    city = $(this).attr('city');
    state = $(this).attr('state');
    theaters = $(this).attr('theaters');

    let x = event.pageX+10;
    let y = event.pageY;
    let height = document.getElementById('map').height.baseVal.value;
    if (y > 200) {
        y -= 200;
    }
    if (x > 500) {
        x -= 275;
    }

    let fo = document.createElementNS(svgns,'foreignObject');
    fo.setAttribute('class','node');
    fo.setAttribute('x',x);
    fo.setAttribute('y',y);
    fo.setAttribute('width','175px');
    fo.setAttribute('height','30px');
    let name = document.createElement('p')
    name.innerHTML = city+", "+state;
    if (theaters > 1) {
        name.innerHTML += " ("+theaters+")";
    } 
    fo.appendChild(name);

    let rect = document.createElementNS(svgns,'rect');
    rect.setAttribute('x',x);
    rect.setAttribute('y',y);
    rect.setAttribute('width','175px');
    rect.setAttribute('height','30px');
    rect.setAttribute('rx',5);
    rect.setAttribute('ry',5);
    rect.setAttribute('fill','#ccccff');
    rect.setAttribute('stroke-width','1px');
    rect.setAttribute('stroke','black');
    $('svg').append(rect);
    $('svg').append(fo);



    /*let this_state = document.getElementById($(this).attr('id'));
    let children = this_state.childNodes;
    this_state.setAttribute('current_fill',$(this).attr('fill'));
    this_state.setAttribute('fill','DarkBlue');*/
}

function mouseOutEffect() {
    $('rect').remove();
    $('foreignObject').remove();
    /*let this_state = document.getElementById($(this).attr('id'));
    this_state.setAttribute('fill',$(this).attr('current_fill'));
    this_state.removeAttribute('current_fill');*/
}

function drawMap() {
    $.getJSON('data/henrys-towns.geojson', function (citiesFile) {
        let bounds = getBoundingBox(citiesFile);
        let svg = document.getElementsByTagName('svg')[0];
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

        $.getJSON('data/western-state-lines.geojson', function(stateFile){
    
            let coords;

            function makeLine(coords,props){
                let polyline = document.createElementNS(svgns,'polyline');
                polyline.setAttribute("stroke","black");
                polyline.setAttribute("stroke-width","1px");

                for (var j = 0; j < coords.length; j++) {
                    let longitude = coords[j][0];
                    let latitude = coords[j][1];

                    let point = mercator(longitude, latitude);

                    point = {
                        x: (point.x - bounds.xMin) * scale,
                        y: (bounds.yMax - point.y) * scale
                    };

                    let svgPoint = document.getElementById('map').createSVGPoint();
                    svgPoint.x = point.x;
                    svgPoint.y = point.y;
                    polyline.points.appendItem(svgPoint);
                }
                return polyline;
            }

            function keepLooping(arr,props,g){
                if (typeof arr[0][0] === "number") {
                    g.append(makeLine(arr,props));
                } else {
                    arr.forEach(function(a){
                        keepLooping(a,props,g);
                    });
                }
            }

            stateFile.features.forEach(function(feature){
                coordinates = feature.geometry.coordinates;
                props = feature.properties;

                let g = document.createElementNS(svgns,'g');
                g.setAttribute("fill","WhiteSmoke");

                keepLooping(coordinates,props,g);
                $('svg').prepend(g);
            });
        });


        citiesFile.features.forEach(function(c) {
            let longitude = c.geometry.coordinates[0];
            let latitude = c.geometry.coordinates[1];

            point = mercator(longitude, latitude);

            point = {
                x: (point.x - bounds.xMin) * scale,
                y: (bounds.yMax - point.y) * scale
            };

            let circle = document.createElementNS(svgns,'circle');

            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 3);
            circle.setAttribute("fill","WhiteSmoke");
            circle.setAttribute("stroke","black");
            circle.setAttribute('city', c.properties.city);
            circle.setAttribute('state', c.properties.region);
            circle.setAttribute('theaters', c.properties.venues);
            circle.addEventListener("mouseover",mouseOverEffect);
            circle.addEventListener("mouseout",mouseOutEffect);

            $('svg').append(circle);
        });
    });
}


drawMap();

$('document').ready(function() {

    $('#to-info').click(function(){
        $('#info').show();
        $('svg').hide();
    });

    $('#return').click(function() {
        $('svg').show();
        $('#info').hide();
    });

    $(window).resize(function() {
        $('#scale').remove();
        $('#map').empty();
        drawMap();
    });

});

function mercator (longitude, latitude) {
    var radius = 6378137;
    var max = 85.0511287798;
    var radians = Math.PI / 180;
    var point = {};

    point.x = radius * longitude * radians;
    point.y = Math.max(Math.min(max, latitude), -max) * radians;
    point.y = radius * Math.log(Math.tan((Math.PI / 4) + (point.y / 2)));
    return point;
}

function getBoundingBox(mapFile){
    var bounds = {}, coords, point, latitude, longitude;

    function doMath(c){
        longitude = c[0];
        latitude = c[1];

        point = mercator(longitude, latitude);

        bounds.xMin = bounds.xMin < point.x ? bounds.xMin : point.x;
        bounds.xMax = bounds.xMax > point.x ? bounds.xMax : point.x;
        bounds.yMin = bounds.yMin < point.y ? bounds.yMin : point.y;
        bounds.yMax = bounds.yMax > point.y ? bounds.yMax : point.y;
    }

    data = mapFile.features;
    data.forEach(function(feature){
        var coordinates = feature.geometry.coordinates;
        doMath(coordinates);
    });

    bounds.xMin -= 100000;
    bounds.yMin -= 100000;
    bounds.yMax += 100000;
    return bounds;
}
