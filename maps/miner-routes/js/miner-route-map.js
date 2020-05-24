let svgns = "http://www.w3.org/2000/svg";

function formatDate(d) {
    let month = d.getMonth();
    month ++;
    let day = d.getDate();
    let year = d.getFullYear();
    return month + '/' + day ;
}

function whichColor(season) {
    let color;
    if (season === "1879") {
        color = 'DarkBlue';
    } else if (season === "1880") {
        color = '#e48f41';
    } else {
        color = '#eb3cb5';
    }

    return color;
}

function stopHighlight() {
    let current_color;
    $('.stop').click(function(){
        city = $(this).attr('stop_city');
        state = $(this).attr('stop_state');
        current_color = $("[city='"+city+"'][state='"+state+"']").attr('fill');
        $("[city='"+city+"'][state='"+state+"']").attr('fill','red');
    });
}

function organizeByDate(season) {
    $.getJSON('data/miner-tours.geojson', function(tourFile){
        let dates = [];
        let i, d, city, state, radius, area, display, formatted_date, current, next, line, color;
        tourFile.features.forEach(function(city){
            city.properties.dates.forEach(function(date){
                if (date.season === season){
                    dates.push([date.date,city.properties.city,city.properties.state]);
                }
            });
        });
        color = whichColor(season);
        dates.sort();
        i = 0;
        let stops = '';
        let interval = setInterval(function(){
            var date = dates[i];
            d = new Date(date[0]);
            formatted_date = formatDate(d);
            city = date[1];
            state = date[2];
            display = $("[city='"+date[1]+"'][state='"+date[2]+"']").attr('display');
            if (display != 'none') {
                radius = $("[city='"+date[1]+"'][state='"+date[2]+"']").attr('r');
                area = Math.PI*Math.pow(radius,2);
                area += 10;
                $("[city='"+date[1]+"'][state='"+date[2]+"']").attr('r',Math.sqrt(area/Math.PI));
            } else {
                $("[city='"+date[1]+"'][state='"+date[2]+"']").attr('fill',color);
                $("[city='"+date[1]+"'][state='"+date[2]+"']").attr('display','');
            }
            i++;
            if (i < dates.length) {
                next = $("[city='"+dates[i][1]+"'][state='"+dates[i][2]+"']");
                current = $("[city='"+dates[i-1][1]+"'][state='"+dates[i-1][2]+"']");
                line = document.createElementNS(svgns,'line');
                line.setAttribute('x1',current.attr('cx'));
                line.setAttribute('y1',current.attr('cy'));
                line.setAttribute('x2',next.attr('cx'));
                line.setAttribute('y2',next.attr('cy'));
                line.setAttribute('stroke',color);
                line.setAttribute('stroke-width',1.25);
                line.setAttribute('stroke-opacity',.75);
                $('svg').append(line);
            }
            stops += '<p class="stop" stop_city="'+city+'" stop_state="'+state+'">'+formatted_date+': '+city+', '+state+'</p>';
            if (i === dates.length){
                clearInterval(interval);
                $('#stops').append(stops);
                //stopHighlight();
            }
        }, 25);
    });
}

$('document').ready(function() {
    drawMap();

    $('#make-map').click(function() {
        $('circle').attr('display','none');
        $('circle').attr('r',Math.sqrt(10/Math.PI));
        $('line').remove();
        $('#stops').empty();
        let season = $('#season option:selected').attr('season');
        organizeByDate(season);
    });

    $('#to-info').click(function(){
        $('#map').hide();
        $('#info').show();
    });

    $('#return').click(function(){
        $('#info').hide();
        $('#map').show();
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

function getBoundingBox(citiesFile){
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

    /*function keepLooping(arr){
        if (typeof arr[0][0] === "number") {
            doMath(arr);
        } else {
            arr.forEach(function(a){
                keepLooping(a);
            });
        }
    }*/

    data = citiesFile.features;
    data.forEach(function(feature){
        var coordinates = feature.geometry.coordinates;
        doMath(coordinates);
    });

    bounds.xMin -= 20000;
    bounds.yMin -= 20000;
    bounds.yMax += 20000;
    return bounds;
}

let drawMap = function() {
    $.getJSON('data/miner-tours.geojson', function (citiesFile) {

        let bounds = getBoundingBox(citiesFile);
        let svg = document.getElementsByTagName('svg')[0];
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

        let stat = document.createElementNS(svgns,'g');

        $.getJSON('data/states.geojson', function(stateFile){
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
                g.setAttribute('id',props['NAME']);

                g.setAttribute("fill","WhiteSmoke");
                //g.addEventListener("mouseover",mouseOverEffect);
                //g.addEventListener("mouseout",mouseOutEffect);
                //g.addEventListener("click",focusState);

                keepLooping(coordinates,props,g);
                stat.append(g);
            });

        });

        let cit = document.createElementNS(svgns,'g');

        citiesFile.features.forEach(function(c) {
            let longitude = c.geometry.coordinates[0];
            let latitude = c.geometry.coordinates[1];

            point = mercator(longitude, latitude);

            point = {
                x: (point.x - bounds.xMin) * scale,
                y: (bounds.yMax - point.y) * scale
            };

            let circle = document.createElementNS(svgns,'circle');

            circle.setAttribute('city', c.properties.city);
            circle.setAttribute('state', c.properties.state);
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute("fill","DarkBlue");
            circle.setAttribute("stroke","black");
            circle.setAttribute("r",Math.sqrt(10/Math.PI));
            circle.setAttribute('display','none');

            cit.append(circle);
        });
        $('svg').append(stat);
        $('svg').append(cit);
    });
}
