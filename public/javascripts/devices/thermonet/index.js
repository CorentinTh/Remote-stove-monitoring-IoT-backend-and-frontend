moment.locale("en-gb");

function removeData(chart) {
    chart.data.labels.shift();

    chart.data.datasets.forEach(function (dataset) {
        dataset.data.shift();
    });

    chart.update();
}

function addData(data, notToChart) {
    if (!notToChart) {
        temperatureChart.data.labels.push(moment.unix(data.timestamp));
        humidityChart.data.labels.push(moment.unix(data.timestamp));

        temperatureChart.data.datasets.forEach(function (dataset) {
            dataset.data.push(data.sensors.temperature);
        });
        humidityChart.data.datasets.forEach(function (dataset) {
            dataset.data.push(data.sensors.humidity);
        });

        setThermalChart(data);
    }

    if (glb_data.filter(function (e) {
            return e.timestamp == data.timestamp;
        }).length <= 0) {
        glb_data.push(data);
    }

    glb_data.sort(function (a, b) {
        return a.timestamp > b.timestamp;
    });

    var last = glb_data[glb_data.length - 1];

    $("#big-temperature").html(Math.round(last.sensors.temperature * 10)/10 + "°C");
    $("#big-humidity").html(Math.round(last.sensors.humidity * 10)/10 + "%");
    $("#big-last-reception").html(moment.unix(last.timestamp).fromNow());

    //drawStove(last);
}

setInterval(function () {
    var last = glb_data[glb_data.length - 1];
    $("#big-last-reception").html(moment.unix(last.timestamp).fromNow());
}, 60000);

function updateCharts() {
    temperatureChart.update();
    humidityChart.update();
    thermalgridChart.update();
}

var timeFormat = 'MM/DD/YYYY HH:mm';

Chart.defaults.global.responsive = true;
var temperatureChart = new Chart(document.getElementById("temperature-chart-canvas").getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Temperature',
            data: [],
            borderColor: "rgb(24,188,156)",
            pointBackgroundColor: "rgb(24,188,156)",
            fill: false
        }]
    },
    options: {
        legend: {
            display: false
        },
        title: {
            text: "Temperature"
        },
        scales: {
            xAxes: [{
                type: "time",
                display: true,
                time: {
                    parser: timeFormat
                    // round: 'day'
                }
            }]
        }
    }
});

var humidityChart = new Chart(document.getElementById("humidity-chart-canvas").getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Humidity',
            data: [],
            borderColor: "rgb(24,188,156)",
            pointBackgroundColor: "rgb(24,188,156)",
            fill: false
        }]
    },
    options: {
        legend: {
            display: false
        },
        title: {
            text: "Humidity"
        },
        scales: {
            xAxes: [{
                type: "time",
                display: true,
                time: {
                    parser: timeFormat
                    // round: 'day'
                }
            }]
        }
    }
});

var thermalgridChart = new Chart(document.getElementById("thermalgrid-chart-canvas").getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        legend: {
            display: false
        },
        title: {
            text: "Temperature"
        },
        scales: {
            xAxes: [{
                type: "time",
                display: true,
                time: {
                    parser: timeFormat
                    // round: 'day'
                }
            }]
        }
    }
});

glb_data.forEach(function (data) {
    addData(data);
});
updateCharts();

function popData() {

    if (humidityChart.data.datasets[0].data.length > 10) {
        removeData(humidityChart);
    }

    if (temperatureChart.data.datasets[0].data.length > 10) {
        removeData(temperatureChart);
    }
}

//  ------------------- Sliders

function addSlider(id_slider, from, to) {
    $("#range-sliders").append("<div class=\"slider-container row\"><div id=\"slider-notification-period" + id_slider + "\"><span class='remove-btn' onclick='manageSliders(\"delete\", " + id_slider + ")' title=\"Remove\"><i aria-hidden=\"true\" class=\"fa fa-ban\"></i></span></div></div>");

    $("#slider-notification-period" + id_slider).slider({
        range: true,
        min: 0,
        max: 24 * 60 - 1,
        values: [from, to],
        stop: function (event, ui) {
            console.log(ui.values[0] + " " + ui.values[1]);
            manageSliders("update", id_slider, ui.values);
        }

    }).slider('float').slider('pips', {labels: {"first": "00:00", "last": "23:59"}, step: 60});
}

glb_time_ranges.forEach(function (time_range) {
    addSlider(time_range.id, time_range.range_from, time_range.range_to);
});

function manageSliders(type, id, values) {
    if ((type != "create" && type != "delete" && type != "update") || !location.pathname.match(/\/device\/[0-9]+/)) {
        console.log("Error in function 'manageSliders");
        return;
    }

    var device_id = location.pathname.split('/')[2];

    socket.emit('manage-sliders', {type: type, id: id, values: values, device_id: device_id});
}

socket.on('manage-sliders', function (data) {
    if (data.type != "create" && data.type != "delete" && data.type != "update") {
        console.log("Error in io 'manage-sliders");
        return;
    }

    if (data.type == "create") {
        addSlider(data.id, data.values[0], data.values[1]);
    } else if (data.type == "update") {
        $("#slider-notification-period" + data.id).slider({values: data.values});
    } else if (data.type == "delete") {
        $("#slider-notification-period" + data.id).parent().remove();
    }
});

//  ------------------- Panels

var panelState = 0;

$("#nav-panels").find("i").each(function (i) {
    var e = $(this);
    e.click(function () {
        if (e.attr('id') == "chevron-right") {
            if (panelState == 2) return;

            if (panelState == 0) {
                setPanel(1);
            } else {
                setPanel(2);
            }

        } else if (e.attr('id') == "chevron-left") {
            if (panelState == 0) return;

            if (panelState == 1) {
                setPanel(0);
            } else {
                setPanel(1);
            }

        }
    })
});

function setPanel(panelNumber) {
    panelState = panelNumber;
    switch (panelNumber) {
        case 0:
            $("#container1").animate({"margin-left": 0});
            $("#container2").animate({"margin-left": "100%"});
            $("#container3").animate({"margin-left": "200%"});
            $("#circle2").removeClass("fa-circle").addClass("fa-circle-o");
            $("#circle1").removeClass("fa-circle-o").addClass("fa-circle");
            $("#circle3").removeClass("fa-circle").addClass("fa-circle-o");

            $("#chevron-right").removeClass('hide-chevron');
            $("#chevron-left").addClass('hide-chevron');
            break;
        case 1:
            $("#container1").animate({"margin-left": "-100%"});
            $("#container2").animate({"margin-left": 0});
            $("#container3").animate({"margin-left": "100%"});

            $("#circle2").removeClass("fa-circle-o").addClass("fa-circle");
            $("#circle1").removeClass("fa-circle").addClass("fa-circle-o");
            $("#circle3").removeClass("fa-circle").addClass("fa-circle-o");
            $("#chevron-left").removeClass('hide-chevron');
            $("#chevron-right").removeClass('hide-chevron');
            break;
        case 2:
            $("#container1").animate({"margin-left": "-200%"});
            $("#container2").animate({"margin-left": "-100%"});
            $("#container3").animate({"margin-left": 0});

            $("#circle2").removeClass("fa-circle").addClass("fa-circle-o");
            $("#circle1").removeClass("fa-circle").addClass("fa-circle-o");
            $("#circle3").removeClass("fa-circle-o").addClass("fa-circle");

            $("#chevron-right").addClass('hide-chevron');
            $("#chevron-left").removeClass('hide-chevron');
            break;
    }
}


var timeoutHandler = -1;

socket.on('new_data_to_display', function (data) {
    console.log("Data received");


    if (window.location.pathname === "/device/" + data.device_id) {
        console.log("Data received");
        console.log(data);

        addData(data.data);
        popData();
        updateCharts();

        $("#big-state").html("ON").parent().removeClass("panel-danger").addClass("panel-primary");

        if (timeoutHandler != 1) {
            clearTimeout(timeoutHandler);
        }

        timeoutHandler = setTimeout(function () {
            $("#big-state").html("OFF").parent().removeClass("panel-primary").addClass("panel-danger");
        }, 1000 * 60 * 10);
    }
});


// --------------- Settings

function settings(e) {
    if (!location.pathname.match(/\/device\/[0-9]+/)) {
        console.log("Error in function 'settings");
        return;
    }

    var device_id = location.pathname.split('/')[2];

    var data = {
        type: $(e).attr('id'),
        device_id: device_id
    };

    if (data.type === 'allow-notifications') {
        data.data = $(e).prop('checked');
    } else if (data.type === 'change-name') {
        data.data = $("#name-input").val();
    }

    socket.emit('device-settings', data);
}

socket.on('device-settings', function (data) {
    if (data.type === 'allow-notifications') {
        $("#allow-notifications").prop('checked', data.data);
    } else if (data.type === 'change-name') {
        $("#name-input").val(data.data);
    }
});

// ---------------------- Thermal grid

var displayTemperature = false;

function toogleDisplay() {
    displayTemperature = !displayTemperature;
}

$(document).ready(function () {
    drawGrid(glb_data[glb_data.length - 1].sensors.thermalgrid);
});

function heatMapColorforValue(value) {
    return "hsl(" + ((1.0 - value) * 240) + ", 100%, 50%)";
}

function map(n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}

function drawGrid(data) {
    var canvas = document.getElementById('thermal-grid-canvas'),
        ctx = document.getElementById('thermal-grid-canvas').getContext('2d');

    var tile = Math.round(canvas.width / 8);
    var threshold = 50;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px Verdana';

    for (var x = 0; x < 8; ++x) {
        for (var y = 0; y < 8; ++y) {
            var val = Math.max(Math.min(data[y * 8 + x] - 20, threshold), 0);

            ctx.beginPath();
            ctx.fillStyle = heatMapColorforValue(map(val, 0, threshold, 0, 1));
            ctx.rect(x * tile, y * tile, tile, tile);
            ctx.fill();

            if (displayTemperature) {
                ctx.fillStyle = "#fff";
                ctx.fillText(Math.round(data[y * 8 + x]) + '°', x * tile + tile / 2, y * tile + tile / 2)
            }
        }
    }
}

function getLocalMaxes(data) {
    var threshold = 40;
    var maxes = [];

    for (var x = 0; x < 8; ++x) {
        for (var y = 0; y < 8; ++y) {
            var val = data[y * 8 + x],
                vUp = data[y * 8 + (x - 1)],
                vDown = data[y * 8 + (x + 1)],
                vRight = data[(y + 1) * 8 + x],
                vLeft = data[(y - 1) * 8 + x];


            if (val > threshold && val > vUp && val > vDown && val > vRight && val > vLeft) {
                maxes.push({x: x, y: y, value: val});
            }
        }
    }
    return maxes;
}

drawStove([]);
function drawStove(data) {
    // var maxes = [];
    var maxes = JSON.parse(JSON.stringify(getLocalMaxes(data)));

    var canvas = document.getElementById('stove-canvas'),
        ctx = canvas.getContext('2d'),
        tile = canvas.width / 7,
        W = canvas.width,
        H = canvas.height;

    ctx.fillStyle = 'rgb(44,62,80)';
    ctx.fillRect(0, 0, W, H);

    //ctx.font="80px Verdana";
    ctx.font = "30px Verdana";
    ctx.fillStyle = '#18bc9c';
    ctx.strokeStyle = '#18bc9c';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (maxes.length == 0) {
        ctx.fillText("All plates are cold", W / 2, H / 2);
        return;
    }

    maxes.forEach(function (max) {
        max.x = Math.max(Math.min(max.x, 5), 2);
        max.y = Math.max(Math.min(max.y, 5), 2);

        if (max.x == 3 || max.x == 4) {
            max.x = 3.5;
        }
        if (max.y == 3 || max.y == 4) {
            max.y = 3.5;
        }

        ctx.beginPath();
        ctx.arc(max.x * tile, max.y * tile, tile * 1.2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillText(Math.round(max.value) + '°C', max.x * tile, max.y * tile);
    });

    ctx.beginPath();
    var X = W / 2 - 30 * (maxes.length - 1) / 2,
        Y = H - 20;

    for (var i = 0; i < maxes.length; ++i) {
        ctx.arc(X + i * 30, Y, 8, 0, 2 * Math.PI);
    }
    ctx.fill();
}

function setThermalChart(data) {
    var maxes = JSON.parse(JSON.stringify(getLocalMaxes(data.sensors.thermalgrid)));

    if (!maxes || maxes.length == 0) return;

    thermalgridChart.data.labels.push(moment.unix(data.timestamp));

    maxes.forEach(function (max) {

        if(max.value > 500) return;

        var hasNoDataset = true;
        for (var i = thermalgridChart.data.datasets.length - 1; i >= 0; --i) {
            var dataset = thermalgridChart.data.datasets[i];

            if (data.timestamp < Date.now() / 1000 - 10 * 60) {
                thermalgridChart.data.datasets.splice(i, 1);
                hasNoDataset = false;
            } else {
                if (dataset.identification == ('x:' + max.x + ',y:' + max.y)) {
                    dataset.data.push(max.value);
                    hasNoDataset = false;
                }
            }
        }

        if (hasNoDataset) {
            var newDataset = {
                label: 'Plate',
                identification: ('x:' + max.x + ',y:' + max.y),
                data: [],
                borderColor: "rgb(24,188,156)",
                pointBackgroundColor: "rgb(24,188,156)",
                fill: false,
                spanGaps: true
            };

            try {
                var maxPlot = thermalgridChart.data.datasets.sort(function (a, b) {
                        return b.data.length - a.data.length;
                    })[0].length || 0;
            }catch (e){
                var maxPlot = 0;
            }



            for (var j = 0; j < maxPlot-1; ++j){
                newDataset.data.push(null);
            }

            newDataset.data.push(max.value);

            thermalgridChart.data.datasets.push(newDataset);
        }
    })
}

var fps = {frame: 0};
var lastLoop = new Date;
socket.on('new_data_live', function (data) {

    if (data.data.sensors.thermalgrid) {
        drawGrid(data.data.sensors.thermalgrid);
        drawStove(data.data.sensors.thermalgrid);


        var thisLoop = new Date;
        var val = 1000 / (thisLoop - lastLoop);
        lastLoop = thisLoop;

        $('#fps-thermal-live').html(Math.round(val * 100) / 100 + ' FPS');

    } else {
        console.log("Bad format live data");
    }
});