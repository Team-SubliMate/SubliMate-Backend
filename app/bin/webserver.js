
//var fs = require('fs');
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
const fs = require('fs');
const WebSocket = require('ws');
const https = require('https');

//const server = new https.createServer({

const server = new https.createServer({
	cert: fs.readFileSync('/home/pi/cert.pem'),
	key: fs.readFileSync('/home/pi/key.pem'),
	passphrase: "sublimate"
});

const wss = new WebSocket.Server({server});

const clients = {};

function lookupBarcode(upc) {
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

// TODO: have this actually create things
function manual_entry(info) {
	// do things with a manaul entry
}

// TODO: add the weight item to queue? how do we handle this?
function weight_change(diff) {
	weight_queue.push(diff);
}

// TODO: have barcodes handle quantity?
function quantity(num) {
	// take in a number and add it to the current thing
}


function handleEvt(ws, evt) {
	switch(evt.type) {
		case "NEW_CLIENT":
			registerClient(evt.value);
			break;
		case "BARCODE_SCANNED":
			lookupBarcode(evt.value);
			break;
		case "MANUAL_ENTRY":
			// may just pass in the event?
			manual_entry(evt.value);
			break;
		case "WEIGHT_CHANGE":
			weight_change(evt.value);
			break;
		case "QUANTITY":
			handle_quantity(evt.value);
			break;
	}
}

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);
		evt = JSON.parse(message);
		handleEvt(ws,evt);
	});
	/*setInterval( function() {
		var msg = Math.random();
		ws.send(msg);
		console.log('sent: %s', msg);
	});*/
});

server.listen(8080);
/*
setInterval( function() {
	var msg = Math.random();
	ws.send(msg);
	console.log('sent: %s', msg);
});
*/
