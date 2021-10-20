let svgns = "http://www.w3.org/2000/svg";

let drawMap = function() {
    $.getJSON('data/summer-stock_state-lines.geojson', function(regionFile){
        let bounds = getBoundingBox(regionFile);
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

        regionFile.features.forEach(function(feature){
            coordinates = feature.geometry.coordinates;
            props = feature.properties;

            let region = props['ABBR'];

            let g = document.createElementNS(svgns,'g');
            g.setAttribute("id",region);

            let categories = ['name'];

            categories.forEach(function(c){
                g.setAttribute(c,props[c]);
            });

            g.setAttribute("fill","WhiteSmoke");
            //g.addEventListener("mouseover",mouseOverEffect);
            //g.addEventListener("mouseout",mouseOutEffect);
            g.addEventListener("click",focusState);

            keepLooping(coordinates,props,g);
            $('svg').append(g);
        });

        $.getJSON('data/summer-stock.geojson', function (citiesFile) {
            citiesFile.features.forEach(function(c) {
                let longitude = c.geometry.coordinates[0];
                let latitude = c.geometry.coordinates[1];

                point = mercator(longitude, latitude);

                point = {
                    x: (point.x - bounds.xMin) * scale,
                    y: (bounds.yMax - point.y) * scale
                };

                let circle = document.createElementNS(svgns,'circle');

                let theaterCount = c.properties.theaters.length;

                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute("fill","black");
                circle.setAttribute("stroke","black");
                if (theaterCount >= 2) {
                    circle.setAttribute('r',Math.sqrt(theaterCount/Math.PI*10));
                    circle.setAttribute("fill-opacity",".2");
                    circle.addEventListener("mouseover",cityMouseOverEffect);
                    circle.addEventListener("mouseout",cityMouseOutEffect);
                    circle.addEventListener("click",makeTable);
                } else {
                    circle.setAttribute('r',.5);
                    circle.setAttribute("fill-opacity","1");
                }
                circle.setAttribute('city', c.properties.city);
                circle.setAttribute('state', c.properties.state);
                circle.setAttribute('theaters', theaterCount);
                //circle.setAttribute('display','none');

                $('svg').append(circle);
            });
        });

    });
}

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

function mouseOverEffect() {
    let x = event.pageX+10;
    let y = event.pageY;
    let height = document.getElementById('map').height.baseVal.value;
    if (y > 200) {
        y -= 120;
    }
    if (x > 500) {
        x -= 275;
    }

    let rect = document.createElementNS(svgns,'rect');
    rect.setAttribute('x',x);
    rect.setAttribute('y',y);
    rect.setAttribute('width','200px');
    rect.setAttribute('height','100px');
    rect.setAttribute('rx',5);
    rect.setAttribute('ry',5);
    rect.setAttribute('fill','#ccccff');
    rect.setAttribute('stroke-width','1px');
    rect.setAttribute('stroke','black');
    $('svg').append(rect);

    let fo = document.createElementNS(svgns,'foreignObject');
    fo.setAttribute('class','node');
    fo.setAttribute('x',x);
    fo.setAttribute('y',y);
    fo.setAttribute('width','225px');
    fo.setAttribute('height','120px');
    let name = document.createElement('p')
    name.innerHTML = "<b>"+$(this).attr('NAME')+"</b>";
    fo.appendChild(name);

    let region = $(this);
    
    $('svg').append(fo);

    let this_region = document.getElementById($(this).attr('id'));
    let children = this_region.childNodes;
    this_region.setAttribute('current_fill',$(this).attr('fill'));
    this_region.setAttribute('fill','DarkBlue');
}

function mouseOutEffect() {
    $('rect').remove();
    $('foreignObject').remove();
    let this_region = document.getElementById($(this).attr('id'));
    this_region.setAttribute('fill',$(this).attr('current_fill'));
    this_region.removeAttribute('current_fill');
}

drawMap();

$('document').ready(function() {

    $('#to-info').click(function(){
        $('#info').show();
        $('svg').hide();
    });

    $('.button').click(function(){
        if ( !($(this)[0].hasAttribute('inactive')) && ($(this).attr('id') != 'show-cities')) {
            let cat = $(this).attr('id');
            drawScale(cat);
        }
    });

    $('#return').click(function() {
        $('svg').show();
        $('#info').hide();
    });

    $('#reset').click(function() {
        $('#city_table').remove();
        $('#scale').remove();
        $('#info').hide();
        $('svg').empty();
        $('svg').show();
        /*$('#info').hide();
        $('.button').each(function(){
            $(this).removeAttr('inactive');
        });
        $('#year').removeAttr('inactive');
        $('#show-cities').text('Show Cities');*/
        drawMap();
    });

    $(window).resize(function() {
        $('#scale').remove();
        $('#map').empty();
        drawMap();
    });

});

function focusState() {
    $('#city_table').remove();
    let id = $(this).attr('id');
    $('svg').empty();
    $('#scale').remove();
    $('.button').each(function(){
        $(this).attr('inactive','');
    });
    $.getJSON('data/summer-stock_state-lines.geojson', function(regionFile){
        regionFile.features.forEach(function(feature) {
            if (feature.properties['ABBR'] === id) {

                let bounds = getStateBoundingBox(feature);
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
                    polyline.setAttribute("stroke-width","2px");

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

                coordinates = feature.geometry.coordinates;
                props = feature.properties;

                let region = props['ABBR'];

                let g = document.createElementNS(svgns,'g');
                g.setAttribute("id",region);
                g.setAttribute("fill","WhiteSmoke");
                g.setAttribute('transform-origin','center center');

                $('#nav').append('<div id="scale"></div>');
                $('#scale').css('margin-top','20px');
                $('#scale').css('margin-left','5px');
                
                keepLooping(coordinates,props,g);
                $('svg').append(g);

                makeCircle(region,bounds,scale);
            }

        });

    });
}

function makeCircle(region, bounds, scale){
    $.getJSON('data/summer-stock.geojson', function(citiesFile){
        citiesFile.features.forEach(function(c){
            if (c.properties.state === region) {
                let longitude = c.geometry.coordinates[0];
                let latitude = c.geometry.coordinates[1];

                point = mercator(longitude, latitude);

                point = {
                    x: (point.x - bounds.xMin) * scale,
                    y: (bounds.yMax - point.y) * scale
                };

                let circle = document.createElementNS(svgns,'circle');

                let theaterCount = c.properties.theaters.length;

                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r',Math.sqrt(theaterCount/Math.PI*25));
                circle.setAttribute("fill","black");
                circle.setAttribute("stroke","black");
                circle.setAttribute("fill-opacity",".2");
                circle.setAttribute('city', c.properties.city);
                circle.setAttribute('state', c.properties.state);
                circle.setAttribute('theaters', theaterCount);
                circle.addEventListener("click",makeTable);
                circle.addEventListener("mouseover",cityMouseOverEffect);
                circle.addEventListener("mouseout",cityMouseOutEffect);

                $('svg').append(circle);
            }
        });
    });
}

function cityMouseOverEffect() {
    let x = event.pageX;
    let y = event.pageY;
    let height = document.getElementById('map').height.baseVal.value;
    if (y > 200) {
        y -= 120;
    }
    if (x > 500) {
        x -= 150;
    }

    let rect = document.createElementNS(svgns,'rect');
    rect.setAttribute('x',x);
    rect.setAttribute('y',y);
    rect.setAttribute('width','135px');
    rect.setAttribute('height','65px');
    rect.setAttribute('rx',5);
    rect.setAttribute('ry',5);
    rect.setAttribute('fill','#ccccff');
    rect.setAttribute('stroke-width','1px');
    rect.setAttribute('stroke','black');
    $('svg').append(rect);

    let fo = document.createElementNS(svgns,'foreignObject');
    fo.setAttribute('class','node');
    fo.setAttribute('x',x);
    fo.setAttribute('y',y);
    fo.setAttribute('width','135px');
    fo.setAttribute('height','65px');
    let name = document.createElement('p')
    name.innerHTML = "<b>"+$(this).attr('city')+", "+$(this).attr('state')+"</b>";
    fo.appendChild(name);

    var p = document.createElement('p');
    p.innerHTML = 'Theaters: '+$(this).attr('theaters');
    fo.appendChild(p);
    $('svg').append(fo);

    $(this).attr('fill','DarkBlue');
    $(this).attr('fill-opacity','1');
}


function cityMouseOutEffect() {
    $('rect').remove();
    $('foreignObject').remove();

    $(this).attr('fill','black');
    $(this).attr('fill-opacity','.2');
}

function makeTable() {
    $('#city_table').remove();
    let city = $(this).attr('city');
    let state = $(this).attr('state');
    $.getJSON('data/summer-stock.geojson', function (citiesFile) {
        let text = '<div id="city_table"><h2>'+city+', '+state+'</h2>';
        citiesFile.features.forEach(function(c) {
            if ((c.properties.city === city) && (c.properties.state === state)) {
                let p = c.properties;
                text += '<div id="theaters_list"><table>';
                let categories = [['name',"Venue"]];
                text += "<tr>";
                categories.forEach(function(c){
                    text += "<th>"+c[1]+"</th>";
                });
                text += "</tr>"; 

                let theaters = p.theaters.sort((a, b) => (a.name > b.name) ? 1 : -1);

                theaters.forEach(function(t){
                    text += '<tr>';
                    categories.forEach(function(c){
                        if (t[c[0]] == null) {
                            text += "<td></td>";
                        } else {
                            text += "<td>"+t[c[0]]+"</td>";
                        }
                    });
                    text += "</tr>";
                });

            }
        });
        text += '</table></div></div>';
        $('#nav').append(text);
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

function getStateBoundingBox(region){
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

    var coordinates = region.geometry.coordinates;
    keepLooping(coordinates);

    return bounds;
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

    //bounds.xMin -= 750000;
    return bounds;
}
