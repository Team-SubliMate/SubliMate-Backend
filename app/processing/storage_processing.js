const db = require('../db');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var item_queue = []

// TODO: the shelfId 1 would need to change
const insert_text = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values (1, $1, $2, $3, $4, $5);'

function put_database(product, weight, quantity){
	// TODO: the 1 in this query would need to be a shelfId
	// Need these calls to be synchornous, so have to put the next ones into the callback
	// its kind of gross but what else can we do?
	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
			console.log('Now inside the item id')
			console.log(res.rows[0]['getnextitemid'])
			itemId = res.rows[0]
			db.query(insert_text, [ res.rows[0]['getnextitemid'], product, weight, quantity, new Date()])
				.then( res => {
					//do stuff if we need to
					console.log('We made it to the insert!')
				})
				.catch(e => {
					console.error(e.stack)
				})
		})
		.catch(e => {
			console.error(e.stack)
		})
}

function get_items(){
	db.query('SELECT * FROM items', function(err, res) {
    	if (err) {
    		console.log('Error here')
      		return next(err)
    	}
    	console.log(res.fields.map(f => f.name))
    	console.log(res.rows[0])
    	console.log(res.rows)
 	})
}

// TODO: have this actually create things and put item into queue
function manual_entry(product, quantity) {
	item_queue.push(['product' : product, 'quantity' : quantity])
}

// TODO: check weight value
// if up, then check for item information
// if down, check database for things and whatever
function weight_change(difference) {
	var weight = parseInt(difference)

	if (weight > 0){
		if (item_queue.size < 1){
			console.log('Made a mistake! doing nothing in quantity')
			return
		}
		var item = item_queue.pop()
		put_database(item[0], weight, item[1])
	}
	else if (weight < 0){
		remove_item(abs(weight))
	}
}

function remove_item(weight){
	// do something here. Remove the item or return a list if possible
}

// TODO: have barcodes handle quantity?
function quantity(num) {
	// take in a number and add it to the current item
	if (item_queue.size < 1){
		console.log('Made a mistake! doing nothing in quantity')
		return
	}
	var item = item_queue.pop()
	item_queue.push(['product' : item['product'], 'quantity' : num])
}



/*function splitString(stringToSplit, separator) {
	var arrayOfStrings = stringToSplit.split(separator);

	//console.log('The original string is: "' + stringToSplit + '"');
	//console.log('The separator is: "' + separator + '"');
	//console.log('The array has ' + arrayOfStrings.length + ' elements: ' + arrayOfStrings.join(' / '));
}*/

//setting up command line interface
// should this be in another file? I don't think this is automatically run...
// Ask donny later. For now, just test the connectivity

rl.on('SIGINT', () => {
  rl.question('Are you sure you want to exit? ', (answer) => {
    if (answer.match(/^y(es)?$/i)) rl.close();
  });
});

rl.setPrompt('Input: ')
rl.prompt()

//setting up the call line function (every end of line)
rl.on('line', (input) => {
	rl.pause()
	console.log('Recieved: "' + input + '"');

	split = input.split(' ')

	switch(split[0]){
		case 'list':
			get_items()
			break;
		case 'weight':
			console.log(split[1])
			break;
		case 'barcode':
			console.log(split[1])
			break;
		case 'manual':
			if (split.length != 3){
				console.log('Incorrect number of arguements, expecting 3')
				break;
			}
			manual_entry(split[1], split[2])
			console.log(split[1])
			break;
		case 'put':
			if (split.length != 4){
				console.log('Incorrect number of arguements, expecting 4')
				break;
			}
			console.log("putting")
			put_database(split[1], split[2], split[3])
			break;
		case 'quantity':
			quantity(split[1])
			break;
		default:
			console.log(' Improper command. Try again.')
			break;
	}

	rl.resume()
	rl.prompt()
})


/*while(true){
	rl.prompt()
	rl.pause()
}*/