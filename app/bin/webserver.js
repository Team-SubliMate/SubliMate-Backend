
// var fs = require('fs');
//var https = require('https');

/*var io = require('socket.io')(http);

https.listen(8080, function(){
	console.log('listening on *:8080');
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

setInterval( function() {
	var msg = Math.random();
	io.emit('message',msg);
	console.log(msg);
}, 1000);
*/
//const fs = require('fs');
const WebSocket = require('ws');
const https = require('https');

const backend = require('../processing/backend.js');
const expiration = require('../expiration/expiry_dates.js');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

var foodkeeper = require('../expiration/foodkeeper.json');
var bulk = [];

// check if elastocsearch is set up, if not, set it up
// probably could/should change to .then, but im lazy and this works
const exists =  client.count({
  index: 'product_expir'
}, function(error, response,  status) {
	if (error) {
		if (response.error.type === 'index_not_found_exception') {
			client.indices.create({
		      index: 'product_expir'
		  }, function(error, response, status) {
		    if (error) {
					console.log(error)
		    } else {
		    	// index created, push data into it
		      console.log("created a new index");
		      foodkeeper.forEach(product =>{
					  bulk.push({index:{ 
								_index:"product_expir", 
								_type:"product_list",
							}          
						})
					  bulk.push(product)
					})
					//perform bulk indexing of the data passed
					client.bulk({body:bulk}, function( err, response  ){ 
						if( err ){ 
						   console.log("Failed Bulk operation".red, err) 
						} else { 
						  console.log("Successfully imported".green);
						}
					});
		    }
			});
		}
	} else {
		if (response.count > 0) {
			console.log('index exists with data in it');
		}
	}
});

//const server = new https.createServer({

/*const server = new https.createServer({
	cert: fs.readFileSync('/home/pi/cert.pem'),
	key: fs.readFileSync('/home/pi/key.pem'),
	passphrase: "sublimate"
});*/

var test = expiration.getExpiryDate("Frozen pretzels", client);

const wss = new WebSocket.Server({port: 8090});

const clients = {};

var upcData = {};
function setUpcData(res) {
	console.log(res);
	upcData = res;
	return;
}

backend.getAllUpcData(setUpcData);

function checkIfInUpcCache(upc){
	for (data in upcData) {
		if (upc == upcData[data].upc){
			return upcData[data];
		}
	}
	return null;
}

// TODO: put the created item in a socket
function lookupBarcode(upc) {
	cached = checIfInUpcCache(upc)
	if (cached != null) {
		backend.manualEntry({'product': cached.product, 'quantity': '1', 'upc': upc, 'imgurl': cached.imgurl});
		return;
	}

	https.get('https://api.upcitemdb.com/prod/trial/lookup?upc=' + upc, (resp) => {
		let data = "";
		resp.on('data', (chunk) => {
			data += chunk;
		});

		resp.on('end', () => {
			console.log(data);
			try {
				barcodeData = JSON.parse(data);
				console.log(barcodeData.items[0].title);
				backend.manualEntry({'product': barcodeData.items[0].title, 'quantity': '1', 'upc': upc, 'imgurl': barcodeData.items[0].images[0]});
				upcData.push({'product': barcodeData.items[0].title, 'upc': upc, 'imgurl': barcodeData.items[0].images[0]})
			} catch (err) {
				console.log(err.message);
			}
		});
	}).on("error", (err) => {
		console.log("Error: " + err.message);
	});
}

function registerClient(ws, identifier) {
	clients[identifier] = ws;
}

handleEvents = true;

function handleEvent(ws, evt) {
	if (handleEvents) {
		handleEvt(ws, evt);
	}
	else {
		if (evt.type == 'START_HANDLING'){
			handleEvents = true;
		}
	}
}

function handleEvt(ws, evt) {
	switch(evt.type) {
		case "NEW_CLIENT":
			registerClient(ws, evt.value);
			break;
		case "BARCODE_SCANNED":
			lookupBarcode(evt.value);
			break;
		case "MANUAL_ENTRY":
			// may just pass in the event?
			backend.manualEntry(evt.value);
			break;
		case "WEIGHT_CHANGED":
			backend.processWeightChange(evt.value, clients["android"]);
			break;
		// TODO: do we need this?
		case "THIS_ITEM_REMOVED":
			backend.itemRemoved(evt.value, clients["android"]);
			break;
		case "QUANTITY":
			handle_quantity(evt.value);
			break;
		case "STOP_HANDLING":
			handleEvents = false;
			break;
	}
}

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		//console.log('received: %s', message);
		evt = JSON.parse(message);
		handleEvent(ws,evt);
	});
	/*setInterval( function() {
		var msg = Math.random();
		ws.send(msg);
		console.log('sent: %s', msg);
	});*/
});

//server.listen(8080);
/*
setInterval( function() {
	var msg = Math.random();
	ws.send(msg);
	console.log('sent: %s', msg);
});
*/
