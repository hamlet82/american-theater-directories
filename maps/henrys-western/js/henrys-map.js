let svgns = "http://www.w3.org/2000/svg";

function drawMap() {
    $.getJSON('data/western-state-lines.geojson', function(stateFile){
        let bounds = getBoundingBox(stateFile);
        let svg = document.getElementsByTagName('svg')[0];
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

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
            $('svg').append(g);
        });

        $.getJSON('data/henrys-towns.geojson', function (citiesFile) {
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
                circle.setAttribute('r', 2);
                circle.setAttribute("fill","WhiteSmoke");
                circle.setAttribute("stroke","black");
                circle.setAttribute('city', c.properties.city);

                $('svg').append(circle);
            });
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

function makeCircle(state, bounds, scale){
    $.getJSON('data/cahn-cities_1902.geojson', function(citiesFile){

        citiesFile.features.forEach(function(c){
            if (c.properties.state === state) {
                let longitude = c.geometry.coordinates[0];
                let latitude = c.geometry.coordinates[1];

                point = mercator(longitude, latitude);

                point = {
                    x: (point.x - bounds.xMin) * scale,
                    y: (bounds.yMax - point.y) * scale
                };

                let circle = document.createElementNS(svgns,'circle');

                let theaterCount = c.properties.theaters;

                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r',Math.sqrt(theaterCount/Math.PI*25));
                circle.setAttribute("fill","black");
                circle.setAttribute("stroke","black");
                circle.setAttribute("fill-opacity",".2");
                circle.setAttribute('city', c.properties.city);
                circle.setAttribute('theaters', theaterCount);
                circle.addEventListener("mouseover",cityMouseOverEffect);
                circle.addEventListener("mouseout",cityMouseOutEffect);

                $('svg').append(circle);
            }
        });
    });
}


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

    function doMath(coords){
        coords.forEach(function(c){
            longitude = c[0];
            latitude = c[1];

            point = mercator(longitude, latitude);

            bounds.xMin = bounds.xMin < point.x ? bounds.xMin : point.x;
            bounds.xMax = bounds.xMax > point.x ? bounds.xMax : point.x;
            bounds.yMin = bounds.yMin < point.y ? bounds.yMin : point.y;
            bounds.yMax = bounds.yMax > point.y ? bounds.yMax : point.y;
        });
    }

    function keepLooping(arr){
        if (typeof arr[0][0] === "number") {
            doMath(arr);
        } else {
            arr.forEach(function(a){
                keepLooping(a);
            });
        }
    }

    data = mapFile.features;
    data.forEach(function(feature){
        var coordinates = feature.geometry.coordinates;
        keepLooping(coordinates);
    });
    return bounds;
}
