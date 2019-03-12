const readline = require('readline');
const backend = require('../processing/backend.js');



class mock_ws {
	send(message) {
		return;
	}
}

let Item = class {
	constructor(product, quantity) {
		this.product = product;
		this.quantity = quantity;
	}
};

let Bitem = class {
	constructor(product, quantity, upc){
		this.product = product;
		this.quantity = quantity;
		this.upc = upc;
	}
};

const ws = new mock_ws();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var upcData = {};

function callback(res) {
	upcData = res;
}

rl.on('SIGINT', () => {
  rl.question('Are you sure you want to exit? ', (answer) => {
    if (answer.match(/^y(es)?$/i)) rl.close();
  });
});

rl.setPrompt('Input What you wish to happen. DB calls are async so wait for them to return first.\n ')
rl.prompt()

//setting up the call line function (every end of line)
rl.on('line', (input) => {
	rl.pause()
	console.log('Recieved: "' + input + '"');

	split = input.split(' ')

	switch(split[0]){
		case 'list':
			backend.getItemList();
			break;
		case 'weight':
			if (split.length != 2){
				console.log('Incorrect number of arguements, expecting 2')
				break;
			}
			//console.log(split[1])
            backend.processWeightChange(split[1], ws);
			break;
		case 'barcode':
			if (split.length != 4){
				console.log('Incorrect number of arguements, expecting 4');
				break;
			}
			var item = new Bitem(split[2], split[3], split[1]);
			backend.manualEntry(item)
			break;
		case 'manual':
			if (split.length != 3){
				console.log('Incorrect number of arguements, expecting 3');
				break;
			}
			var item = new Item(split[1], split[2]);
			backend.manualEntry(item)
			break;
		case 'put':
			if (split.length != 4){
				console.log('Incorrect number of arguements, expecting 4');
				break;
			}
			console.log("putting")
			backend.addItem(split[1], split[2], split[3], ws)
			break;
		case 'quantity':
			if (split.length != 2){
				console.log('Incorrect number of arguements, expecting 2');
				break;
			}
			backend.addQuantity(split[1]);
			break;
		case 'remove':
			if (split.length != 2){
				console.log('Incorrect number of arguements, expecting 2');
				break;
			}
			backend.itemRemoved(split[1], ws);
			break;
		case 'aq':
			backend.getAQueue();
			break;
		case 'rq':
			backend.getRQueue();
			break;
		case 'cq':
			backend.cleanQueue();
			break;
		case 'gupc':
			backend.getAllUpcData(callback);
			break;
		case 'dupc':
			console.log(upcData);
			break;
		case 'tupc':
			upc = split[1];
			for (data in upcData) {
				if (upc == upcData[data].upc){
					console.log(true);
					break;
				}
			}
			break;
		default:
			console.log(' Improper command. Try again.');
			break;
	}

	rl.resume()
	//rl.prompt()
})