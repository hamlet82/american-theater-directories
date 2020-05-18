let svgns = "http://www.w3.org/2000/svg";

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
    bounds.xMin -= 300000;
    bounds.xMax -= 500000;
    bounds.yMin -= 100000;
    bounds.yMax += 300000;
    return bounds;
}

let drawMap = function() {
    $.getJSON('data/state-lines.geojson', function(stateFile){
        let bounds = getBoundingBox(stateFile);
        let svg = document.getElementById('svgid');
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

        let coords;

        function makeLine(coords){
            let polyline = document.createElementNS(svgns,'polyline');
            polyline.setAttribute("fill","none");
            polyline.setAttribute("stroke","black");
            polyline.setAttribute("stroke-width",".75px");

            for (var j = 0; j < coords.length; j++) {
                let longitude = coords[j][0];
                let latitude = coords[j][1];

                let point = mercator(longitude, latitude);

                point = {
                    x: (point.x - bounds.xMin) * scale,
                    y: (bounds.yMax - point.y) * scale
                };

                let svgPoint = document.getElementById('svgid').createSVGPoint();
                svgPoint.x = point.x;
                svgPoint.y = point.y;
                polyline.points.appendItem(svgPoint);
            }
            $('svg').append(polyline);
        }

        function keepLooping(arr){
            if (typeof arr[0][0] === "number") {
                makeLine(arr);
            } else {
                arr.forEach(function(a){
                    keepLooping(a);
                });
            }
        }

        stateFile.features.forEach(function(feature){
            coordinates = feature.geometry.coordinates;
            keepLooping(coordinates);
        });
    });
}

function makeCircle(city, state, geometry, id, bounds, scale, theaterCount){
    let longitude = geometry.coordinates[0];
    let latitude = geometry.coordinates[1];

    point = mercator(longitude, latitude);

    point = {
        x: (point.x - bounds.xMin) * scale,
        y: (bounds.yMax - point.y) * scale
    };

    let circle = document.createElementNS(svgns,'circle');

    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r',Math.sqrt(theaterCount/Math.PI*25));
    circle.setAttribute("fill","black");
    circle.setAttribute("stroke","black");
    circle.setAttribute("fill-opacity",".2");
    circle.setAttribute('id', id);
    circle.setAttribute('city', city);
    circle.setAttribute('state', state);
    circle.setAttribute('theaterCount', theaterCount);

    $('svg').append(circle);
}


let drawTheaters = function(year,cityId) {
    $.getJSON('data/state-lines.geojson', function(stateFile){
        let bounds = getBoundingBox(stateFile);
        let svg = document.getElementById('svgid');
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

        $.getJSON('data/syndicate-theaters.geojson', function(data){
            let cities = [];
            let totalTheaters = 0;
            $('circle').not('[cahn]').not('[allcities]').remove();
            if (year === "0") {
                data.features.forEach(function(location){
                    let city = location.properties.city;
                    let state = location.properties.state;
                    let theaterCount = location.properties.theaters.length;
                    totalTheaters += theaterCount;
                    let id = location.id;
                    option = '<option value="'+id+'">'+city+', '+state+' ('+theaterCount+')</option>';
                    cities.push([city+state,option,id]);
                    makeCircle(city,state,location.geometry,id,bounds,scale,theaterCount);
                });
            } else {
                yearInt = parseInt(year);
                data.features.forEach(function(location){
                    let city = location.properties.city;
                    let state = location.properties.state;
                    let theaterCount = 0;
                    location.properties.theaters.forEach(function(theater) {
                        if (theater[year] != null) {
                            theaterCount++;
                        }
                    });
                    totalTheaters += theaterCount;
                    let id = location.id;
                    option = '<option value="'+id+'">'+city+', '+state+' ('+theaterCount+')</option>';
                    cities.push([city+state,option,id]);
                    makeCircle(city,state,location.geometry,id,bounds,scale,theaterCount);
                });
            }
            buildCitySelector(cities,totalTheaters);
            if (cityId != "0") {
                $('[id='+cityId+']').attr('fill','red');
                $('[id='+cityId+']').attr('fill-opacity','1');
                populateInformation(cityId);
                $("#city-selector").val(cityId);
            } else {
                $("#city-selector").val("0");
            }
        });
    });
}

let contains = function(list,value) {
    for (l in list){
        if (list[l][2] === parseInt(value)) {
            return true;
        }
    }
    return false;
}

let buildYearSelector = function() {
    $('#year-selector option').remove();
    option = '<option value="0">All</option>';
    $('#year-selector').append(option);
    for (var y=1898; y<1911; y++){
        let option = '<option value="'+y+'">'+y+'</option>';
        $('#year-selector').append(option);
    }
}

let buildCitySelector = function(cities,totalTheaters) {
    $('#city-selector option').remove();
    option = '<option value="0">All ('+totalTheaters+')</option>';
    $('#city-selector').append(option);
    cities.sort();
    cities.forEach(function(c){
        $('#city-selector').append(c[1]);
    });
}

let populateInformation = function(cityId) {
    let year = parseInt($('#year-selector').val());
    let venues = []
    $.getJSON('data/syndicate-theaters.geojson', function(data){
        data.features.forEach(function(location){
            if (location.id === parseInt(cityId)) {
                let city = location.properties.city;
                let state = location.properties.state;
                if (year != 0) {
                    location.properties.theaters.forEach(function(theater) {
                        if (theater[year] != null) {
                            venues.push([theater['theater'], theater[year]]);
                        }
                    });
                } else {
                    location.properties.theaters.forEach(function(theater) {
                        venues.push(theater['theater']);
                    });
                }
            }
        });
        venues.sort();
        if (typeof venues[0] === "string") {
            venues.forEach(function(v) {
                let row = '<tr><td>'+v+'</td><td></td></tr>';
                $('table').append(row);
            });
        } else {
            venues.forEach(function(v) {
                let row = '<tr><td>'+v[0]+'</td><td>'+v[1]+'</tr>';
                $('table').append(row);
            });
        }
    });
}

$(document).ready(function() {

    drawMap();
    drawTheaters('0','0');
    drawCahnTheaters();
    drawAllCities();

    buildYearSelector();

    $('#year-selector').change(function(){
        var cityId = $('#city-selector').val();
        var id = $(this).val();
        $('tr').not('#header').remove();
        drawTheaters(id,cityId);
    });

    $('#city-selector').change(function(){
        var id = $(this).val();
        $('circle').not('[cahn]').not('[allcities]').each(function(){
            $(this).attr('fill','black');
            $(this).attr('fill-opacity','.2');
            $(this).attr('r',Math.sqrt($(this).attr('theaterCount')/Math.PI*25));
        });
        $('tr').not('#header').remove();
        if (id != "0") {
            $('[id='+id+']').attr('fill','red');
            $('[id='+id+']').attr('fill-opacity','1');
            $('[id='+id+']').attr('r',Math.sqrt($('[id='+id+']').attr('theaterCount')/Math.PI*25));
            populateInformation(id);
        }
    });

    $('#description').click(function(){
        let text = $(this).text();
        if ( text === "Read a Description" ) {
            $('#map-and-explanation').hide();
            $('#overview').show();
            $(this).text('Return to Map');
            $('#resize').toggle();
        } else {
            $('#map-and-explanation').show();
            $('#overview').hide();
            $(this).text('Read a Description');
            $('#resize').toggle();
        }
    });

    $('#show-cahn').click(function(){
        $('circle[cahn]').toggle();
    });

    $('#show-all-cities').click(function(){
        $('circle[allcities]').toggle();
    });

    $('#resize').click(function(){
        $('h1').toggle();
        $('h2').toggle();
        $('#explanation').toggle();
        $('#description').toggle();
        $('#interactive').toggle();
        $('#year-selector').val("0");
        $('tr').not('#header').remove();
        $('#theater-info').toggle();
        $('svg').empty();
        if ($('svg').attr('width') === '50vw') {
            $('svg').attr('width','72vw');
            $('svg').attr('height','40vw');
        } else {
            $('svg').attr('width','50vw');
            $('svg').attr('height','25vw');
        }
        drawMap();
        drawTheaters('0','0');
        drawCahnTheaters();
        drawAllCities();
    });
});

function makeCahnCircle(city, state, geometry, bounds, scale, theater){
    let longitude = geometry.coordinates[0];
    let latitude = geometry.coordinates[1];

    point = mercator(longitude, latitude);

    point = {
        x: (point.x - bounds.xMin) * scale,
        y: (bounds.yMax - point.y) * scale
    };

    let circle = document.createElementNS(svgns,'circle');

    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r',2);
    circle.setAttribute("fill","blue");
    circle.setAttribute("stroke","black");
    circle.setAttribute("fill-opacity",".5");
    circle.setAttribute('city', city);
    circle.setAttribute('state', state);
    circle.setAttribute('theater', theater);
    circle.setAttribute('cahn','');
    circle.setAttribute('display','none');

    $('svg').append(circle);
}


let drawCahnTheaters = function() {
    $.getJSON('data/state-lines.geojson', function(stateFile){
        let bounds = getBoundingBox(stateFile);
        let svg = document.getElementById('svgid');
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;

        $.getJSON('data/cahn-theaters.geojson', function(data){
            data.features.forEach(function(location){
                let city = location.properties.city;
                let state = location.properties.state;
                let theater = location.properties.theater;
                let id = location.id;
                makeCahnCircle(city,state,location.geometry,bounds,scale,theater);
            });
        });
    });
}

function makeAllCitiesCircle(city, state, geometry, bounds, scale){
    let longitude = geometry.coordinates[0];
    let latitude = geometry.coordinates[1];

    point = mercator(longitude, latitude);

    point = {
        x: (point.x - bounds.xMin) * scale,
        y: (bounds.yMax - point.y) * scale
    };

    let circle = document.createElementNS(svgns,'circle');

    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r',1);
    circle.setAttribute("fill","red");
    circle.setAttribute("stroke","black");
    circle.setAttribute("fill-opacity","1");
    circle.setAttribute('city', city);
    circle.setAttribute('state', state);
    circle.setAttribute('allcities','');
    circle.setAttribute('display','none');

    $('svg').append(circle);
}

let drawAllCities = function() {
    $.getJSON('data/state-lines.geojson', function(stateFile){
        let bounds = getBoundingBox(stateFile);
        let svg = document.getElementById('svgid');
        let width = svg.width.baseVal.value;
        let height = svg.height.baseVal.value;

        let xScale = width / Math.abs(bounds.xMax - bounds.xMin);
        let yScale = height / Math.abs(bounds.yMax - bounds.yMin);
        let scale = xScale < yScale ? xScale : yScale;
        $.getJSON('data/theater-cities_cahn-vol-15.geojson', function(data){
            data.features.forEach(function(location){
                let city = location.properties.city;
                let state = location.properties.region;
                let id = location.id;
                makeAllCitiesCircle(city,state,location.geometry,bounds,scale);
            });
        });
    });
}
