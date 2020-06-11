let svgns = "http://www.w3.org/2000/svg";

let drawMap = function() {
    $.getJSON('data/black-theaters_state-lines.geojson', function(stateFile){
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

            let state = props['ABBR'];

            let g = document.createElementNS(svgns,'g');
            g.setAttribute("id",state);

            let categories = ["NAME","black_population","white_population","theaters","black_owners","white_owners","unknown_owners","picture_houses","performance_houses","pictures_equipped_for_performance","cities","ABBR"];

            categories.forEach(function(c){
                g.setAttribute(c,props[c]);
            });

            g.setAttribute("fill","WhiteSmoke");
            g.addEventListener("mouseover",mouseOverEffect);
            g.addEventListener("mouseout",mouseOutEffect);
            g.addEventListener("click",focusState);

            keepLooping(coordinates,props,g);
            $('svg').append(g);
        });

        $.getJSON('data/black-theaters_cities.geojson', function (citiesFile) {
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
                } else {
                    circle.setAttribute('r',.5);
                    circle.setAttribute("fill-opacity","1");
                }
                circle.setAttribute('city', c.properties.city);
                circle.setAttribute('state', c.properties.state);
                circle.setAttribute('theaters', theaterCount);
                circle.setAttribute('black_population', formatNumber(c.properties.black_population));
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

    let categories = ["black_population","white_population","cities","theaters"];

    let state = $(this);
    
    categories.forEach(function(c){
        let p = document.createElement('p');
        let label = c.replace('_',' ').replace('population','Population');
        //label = label.replace('population','Pop.');
        label = label[0].toUpperCase() + label.slice(1);
        p.innerHTML = label + ': '+ formatNumber(state.attr(c));
        fo.appendChild(p);
    });
    $('svg').append(fo);

    let this_state = document.getElementById($(this).attr('id'));
    let children = this_state.childNodes;
    this_state.setAttribute('current_fill',$(this).attr('fill'));
    this_state.setAttribute('fill','DarkBlue');
}

function mouseOutEffect() {
    $('rect').remove();
    $('foreignObject').remove();
    let this_state = document.getElementById($(this).attr('id'));
    this_state.setAttribute('fill',$(this).attr('current_fill'));
    this_state.removeAttribute('current_fill');
}

function drawScale(cat) {
    let id;
    let year = $('#year').val();
    if (cat != 'tprr'){
        id = cat + '_' + year;
    } else {
        id = 'tprr_1913';
    }
    
    let values = [];
    $('g').each(function(state){
        if ($(this).attr('id') != 'DC'){
            values.push($(this).attr(id));
        }
    });

    $('#scale').remove();
    $('#nav').append('<div id="scale" category="'+cat+'"></div>');
    $('#scale').css('margin','5px 5px');
    let canvas = document.createElement('canvas');
    canvas.setAttribute('width','150px');
    canvas.setAttribute('height','200px');
    var ctx = canvas.getContext("2d");
    var grd = ctx.createLinearGradient(0,25,0,150);
    grd.addColorStop(0,"white");
    grd.addColorStop(0.5,"red");
    grd.addColorStop(1,"black");
    ctx.fillStyle = grd;
    ctx.fillRect(0,25,50,150);
    ctx.strokeRect(0,25,50,150);
    ctx.font = "16px Georgia";
    ctx.fillStyle = 'black';
    $('#scale').append(canvas);

    let min = Math.min.apply(Math, values);
    let max = Math.max.apply(Math, values);

    if (min >= 2) {
        ctx.fillText(formatNumber(min), 55, 32);
        ctx.fillText(formatNumber(parseInt(min+((max-min)/2))), 55, 107);
        ctx.fillText(formatNumber(max), 55, 175);
    } else {
        ctx.fillText(min, 55, 32);
        ctx.fillText((min+((max-min)/2)).toFixed(2), 55, 107);
        ctx.fillText(max, 55, 175);
    }

    $('g').each(function(state){
        let perc = ($(this).attr(id)-min)/(max-min)*100;
        let p = 100 - perc;
        let this_state = document.getElementById($(this).attr('id'));
        this_state.setAttribute('fill','hsl(0,100%,'+p+'%)');
    });
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
        $('#scale').remove();
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
    let id = $(this).attr('id');
    $('#show-cities').text('Hide Cities');
    $('svg').empty();
    $('#scale').remove();
    $('.button').each(function(){
        $(this).attr('inactive','');
    });
    $('#year').attr('inactive','');
    $.getJSON('data/black-theaters_state-lines.geojson', function(stateFile){
        stateFile.features.forEach(function(feature) {
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

                let state = props['ABBR'];

                let g = document.createElementNS(svgns,'g');
                g.setAttribute("id",state);
                g.setAttribute("fill","WhiteSmoke");
                g.setAttribute('transform-origin','center center');

                $('#nav').append('<div id="scale"></div>');
                $('#scale').css('margin-top','20px');
                $('#scale').css('margin-left','5px');
                
                keepLooping(coordinates,props,g);
                $('svg').append(g);

                makeCircle(state,bounds,scale);
            }

        });

    });
}

function makeCircle(state, bounds, scale){
    $.getJSON('data/black-theaters_cities.geojson', function(citiesFile){

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
                circle.setAttribute('black_population', formatNumber(c.properties.black_population));
                circle.addEventListener("mouseover",makeTable);
                circle.addEventListener("mouseout",removeTable);

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
    rect.setAttribute('width','180px');
    rect.setAttribute('height','80px');
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
    fo.setAttribute('width','180px');
    fo.setAttribute('height','80px');
    let name = document.createElement('p')
    name.innerHTML = "<b>"+$(this).attr('city')+", "+$(this).attr('state')+"</b>";
    fo.appendChild(name);

    var p = document.createElement('p');
    p.innerHTML = 'Black Pop.: '+$(this).attr('black_population');
    fo.appendChild(p);
    p = document.createElement('p');
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

function removeTable() {
    $('#city_table').remove();
}

function makeTable() {
    let city = $(this).attr('city');
    let state = $(this).attr('state');
    $.getJSON('data/black-theaters_cities.geojson', function (citiesFile) {
        let text = '<div id="city_table"><h2>'+city+', '+state+'</h2>';
        citiesFile.features.forEach(function(c) {
            if ((c.properties.city === city) && (c.properties.state === state)) {
                let p = c.properties;
                if (p.black_population != '') {
                    text += '<p>Black Pop.: '+formatNumber(parseInt(p.black_population))+'</p>';
                }
                text += '<table>';
                let categories = [['name',"Venue"],['type',"Type"],['owner',"Owner"],['owner_race','Owner Race']];

                text += "<tr>";
                categories.forEach(function(c){
                    text += "<th>"+c[1]+"</th>";
                });
                text += "</tr>"; 

                p.theaters.forEach(function(t){
                    text += '<tr>';
                    categories.forEach(function(c){
                        text += "<td>"+t[c[0]]+"</td>";
                    });
                    text += "</tr>";
                });

            }
        });
        text += '</table></div>';
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

function getStateBoundingBox(state){
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

    var coordinates = state.geometry.coordinates;
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
    return bounds;
}
