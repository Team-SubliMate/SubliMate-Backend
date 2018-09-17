const backend = require('backend');
const db = require('../db');

// mocking the web socket
function send(message) {

}

class mock_ws {
	send(message) {
		return;
	}
}

const ws = new mock_ws();

function reset_db() {
	db.query('DELETE * FROM items', function(err, res) {
		if (err) {
			console.log('Error here')
			console.log(err)
			return next(err)
		}
		//console.log("Database items cleaned");
    })
}

const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values (1, $1, $2, $3, $4, $5);'

function reset_and_populate_db() {
	reset_db();

	var product = "First Item";
	var weight = 200;
	var quantity = 1;
	var date = new Date();

	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
		var itemId = res.rows[0]['getnextitemid'];
		var date = new Date();
		//var item = {'shelfid': '1', 'itemid': itemId, 'product': product, 'weight': weight, 'quantity': quantity, 'entry': date};
			//ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
		db.query(INSERT_TEXT, [itemId, product, weight, quantity, date]);
		})
		.catch(e => {
			console.error(e.stack);
		})
}

function add_item(){
	reset_db();

	backend.manual_entry({'product': 'Test item', 'quantity': 1});
	backend.weight(100, ws);

	items = backend.get_items();

	
}

module.exports = {
	add_item: () => {
		add_item();
	}
}