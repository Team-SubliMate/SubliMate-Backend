const db = require('../db');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const weight_error = 20;

var item_added_queue = [];
var item_removed_queue = [];

// TODO: the shelfId 1 would need to change
const insert_text = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values (1, $1, $2, $3, $4, $5);'

function put_database(product, weight, quantity){
	// TODO: the 1 in this query would need to be a shelfId
	// Need these calls to be synchornous, so have to put the next ones into the callback
	// its kind of gross but what else can we do? =>
	// => make a stored procedure?
	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
			itemId = res.rows[0];
			db.query(insert_text, [ res.rows[0]['getnextitemid'], product, weight, quantity, new Date()])
				.then( res => {
					//do stuff if we need to
				})
				.catch(e => {
					console.error(e.stack);
				})
		})
		.catch(e => {
			console.error(e.stack)
		})
}

function update_removal_time(item, set_null) {
	var d = new Date()
	if (set_null){
		d = null
	}
	db.query('update items set removedat = $1 where shelfid = $2 and itemid = $3', [d, item.shelfid, item.itemid], function(err, res) {
        if (err) {
            console.log('Error here')
            console.log(err)
            return next(err) // i dont think this works as intended
        }
        //console.log(res.fields.map(f => f.name)) //list fields
        //console.log(res.rows[0])
        console.log(res.rows)
    })
}

function update_item_weight(item, weight) {
    db.query('update items set weight = $1 where shelfid = $2 and itemid = $3', [weight, item.shelfid, item.itemid], function(err, res) {
        if (err) {
            console.log('Error here')
            console.log(err)
            return next(err) // i dont think this works as intended
        }
        //console.log(res.fields.map(f => f.name)) //list fields
        //console.log(res.rows[0])
        console.log(res.rows)
    })
}

//TODO: this should really return a list of them, but it doesnt yet
function get_items(){
	db.query('SELECT * FROM items WHERE removedat IS NULL', function(err, res) {
    	if (err) {
    		console.log('Error here')
			console.log(err)
      		return next(err) // i dont think this works as intended
    	}
    	//console.log(res.fields.map(f => f.name)) //list fields
    	//console.log(res.rows[0])
    	console.log(res.rows)
 	})
}

function get_items_near_weight(weight){
	db.query('SELECT * FROM items where weight between $1 and $2 WHERE removedat IS NULL', [weight - weight_error, weight + weight_error])
		.then(res => {
        	//console.log(res.rows)
			remove_item(weight, res.rows)
    	})
		.catch(e => console.error(e.stack))
}

// TODO: have this actually create things and put item into queue
function manual_entry(product, quantity) {
    item_added_queue.push({'product': product, 'quantity': quantity})
	console.log(item_added_queue)
}

// TODO: check weight value
// if up, then check for item information
// if down, check database for things and whatever
function weight_change(difference) {
	var weight = parseInt(difference)

	// item added
	if (weight > 0){
		if (item_removed_queue.length == 1) {
            var item = item_removed_queue.pop()
            update_item_weight(item, weight)
            update_removal_time(item, true)
		} else {
            if (item_added_queue.length < 1){
                console.log('Made a mistake! weight change without an item manually added')
                return
            }
            var item = item_added_queue.pop()
            console.log(item)
            put_database(item.product, weight, item.quantity)
		}
	}
	else if (weight < 0){
		get_items_near_weight(Math.abs(weight))
	}
}

function remove_item(weight, nearby_items){
	// do something here. Remove the item or return a list if possible
	if (nearby_items.length < 1) {
        console.log('no items found')
	}
	if (nearby_items.length == 1) {
    	console.log('only one matching item')
    	item_removed_queue.push(nearby_items[0])
    	update_removal_time(nearby_items[0], false)
	}
	if (nearby_items.length > 1) {
    	//TODO send the choices to the android
    	console.log('multiple items found')
	}
}

// TODO: have barcodes handle quantity?
function quantity(num) {
	// take in a number and add it to the current item
	if (item_added_queue.length < 1){
		console.log('Made a mistake! doing nothing in quantity')
		return
	}
	var item = item_added_queue.pop()
    item_added_queue.push({'product': item['product'], 'quantity' : num})
}

// Below are module items. These are taken from the functions above
// There is a debug item for now just to test things.
module.exports = {
	add_quantity: (num) => {
		quantity(num)
	},
	add_manual: (product, quantity) => {
		manual_entry(product, quantity)
	},
	process_weight_change: (difference) => {
		weight_change(difference)
	},
	get_item_list: () => {
		get_items()
	},
	debug_add_item: (product, weight, quantity) => {
		put_database(product, weight, quantity)
	}
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
			//console.log(split[1])
            weight_change(split[1])
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