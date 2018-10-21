const db = require('../../db');

function ResetDb() {
	db.query('DELETE FROM items', function(err, res) {
		if (err) {
			console.log('Error here')
			console.log(err)
			//return next(err)
		}
		console.log("Database items cleaned");
    });

    return;
}

const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values (1, $1, $2, $3, $4, $5);'

function ResetAndPopulateDb() {
	ResetDb();

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
		db.query(INSERT_TEXT, [1, 1, product, weight, quantity, date]);
		})
		.catch(e => {
			console.error(e.stack);
		});

	return;
}

function GetDbPWQ() {
	var output = "";

	db.query('SELECT Product, Weight, Quantity FROM items')
		.then(res => {
			console.log("Hello There!")
			res.rows.forEach((item, index) => {
				output = output + item.Product + ',' + item.Weight + ',' + item.Quantity + ';';
			});
		});

	console.log('output: ' + output)

	return output
}

module.exports = {
	ResetDb: () => {
		ResetDb();
	},

	ResetAndPopulateDb: () => {
		ResetAndPopulateDb();
	},

	GetDbPWQ: () => {
		GetDbPWQ();
	}
};