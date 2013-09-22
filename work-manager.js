
var console = window.console ?  window.console : { log: function() {} };
var worker = null;
var testmode = false;

function readScript(n) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", n, false);
    xhr.send(null);
    var x = xhr.responseText;
    return x;
};

function onError(data) {
    $('#info').val(data.status + " " + data.responseText);
}

function onSuccess(jsonresp) {
    var response = jsonresp.result;
    var data = JSON.stringify(response);

    $('#info').val(data);

    var type = $('[type=radio]');

    if (type.length == 0) type = [ {checked:true} , {checked:false} , {checked:false}]
    var job = {};
    var gl = type[2].checked

    job.run = true;
    job.work = data;

    job.midstate = derMiner.Util.fromPoolString(response.midstate, gl);
    job.half = derMiner.Util.fromPoolString(response.data.substr(0, 128), gl);
    job.data = derMiner.Util.fromPoolString(response.data.substr(128, 256), gl);
    job.hash1 = derMiner.Util.fromPoolString(response.hash1, gl);
    job.target = derMiner.Util.fromPoolString(response.target, gl);

    if (testmode) {
        job.nonce = derMiner.Util.fromPoolString("204e2e35")[0];
    } else {
        job.nonce = Math.floor ( Math.random() * 0xFFFFFFFF );
    }

    job.hexdata = response.data;
    
    if (type[2].checked) {
        var postMessage = function(m) {
            onWorkerMessage({ data: m });
        }
        var th = $('#threads')[0].value;
        meinWebGLStart(th);
        mine(job, postMessage);
    } else if (type[0].checked) {
        var postMessage = function(m) {
            onWorkerMessage({ data: m });
        }
        worker = { postMessage : function(m) { worker.intMessage( { data: m} ); },
                   intMessage: function() {} };
        var m = readScript('miner.js');
        var s = '(function() {' + m + ';\n' + 'onmessage({ data: job });' + ' worker.intMessage = onmessage; })';
        var run = eval(s);
        run();
    } else {
        worker = new Worker("miner.js");
        worker.onmessage = onWorkerMessage;
        worker.onerror = onWorkerError;
        worker.postMessage(job);
    }
}

function begin_mining()
{
    var tm = $('#testmode');
    testmode = tm.length > 0 && tm[0].checked;
    if (testmode) {
        var dd = '{"midstate":"eae773ad01907880889ac5629af0c35438376e8c4ae77906301c65fa89c2779c","data":"0000000109a78d37203813d08b45854d51470fcdb588d6dfabbe946e92ad207e0000000038a8ae02f7471575aa120d0c85a10c886a1398ad821fadf5124c37200cb677854e0603871d07fff800000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000","hash1":"00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000","target":"0000000000000000000000000000000000000000000000000000f8ff07000000", "sol" : "31952e35"}'; // near match with nonce = 0
        onSuccess({ result: JSON.parse(dd)});
    } else {
        var enqueuMiner = function() {
            get_work();
            window.setTimeout(enqueuMiner, 120*1000);
        };
        window.setTimeout(enqueuMiner, 1000);
    }
}

function get_work() {
    if (worker) {
        try {
            worker.postMessage( { run: false } );
            worker.terminate();
        } catch (e) {}
    }

    $.post("index.php?cache=1&ts=" + (new Date().getTime()),
           '{ "method": "getwork", "id": "json", "params": [] }',
           onSuccess,
           "text json");
}

function onWorkerMessage(event) {
    var job = event.data;

    if(job.print) console.log('worker:' + job.print);

    if (job.golden_ticket) {
        $('#golden-ticket').val(job.golden_ticket);

        if (!testmode) {
            $.post("submitwork.php",
                   { golden_ticket: job.golden_ticket, work: job.work },
                   function(data, textStatus) {
                       console.log("manager:" + data + "#" + textStatus);
                   });
        }
    }
    
    var total_time = ((new Date().getTime()) - job.start_date) / 1000;
    var hashes_per_second = job.total_hashes / total_time;
    $('#total-hashes').val(job.total_hashes);
    $('#hashes-per-second').val(hashes_per_second);
}

function onWorkerError(event) {
	throw event.data;
}

window.onload = function(){

    onl();
    
    // try {
        var d = document.createElement('div');
        d.setAttribute('style', 'display:none');

        var add = false;
        var arr = [ "total-hashes", "hashes-per-second", "golden-ticket", "info" ];

        for (var i=0; i < arr.length; i++) {
            var n = arr[i];
            var l = document.getElementById(n);
            if (!l) {
                var e = document.createElement('input');
                d.appendChild(e);
                add = true;
            } else {
                l.value = "";
            }
        }

        if (add) {
            document.body.appendChild(d);
        }

    // } catch (e) {
    //     console.log("manager:" + e);
    // }
}
