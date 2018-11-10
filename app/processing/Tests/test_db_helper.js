const db = require('../../db');

function ResetDb() {
	var ret = false;
	db.query('DELETE FROM items')
		.then(res => {
			ret = true;
			console.log("Database items cleaned");
	    })
	    .catch(e => {
	    	ret = true;
	    	console.error(e.stack);
	    });

	while (!ret){
		//console.log("inf1")
	};

	return;
}

const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values ( $1, $2, $3, $4, $5, $6);'

function ResetAndPopulateDb() {
	ResetDb();

	var product = "First Item";
	var weight = 200;
	var quantity = 1;
	var date = new Date();

	var ret = false;

	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
			var itemId = res.rows[0]['getnextitemid'];
			var date = new Date();
			//var item = {'shelfid': '1', 'itemid': itemId, 'product': product, 'weight': weight, 'quantity': quantity, 'entry': date};
				//ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
			db.query(INSERT_TEXT, [1, 1, product, weight, quantity, date])
				.then(res => {
					ret = true;
				}).catch(e => {
					ret = true;
					console.error(e.stack);
				});
		})
		.catch(e => {
			ret = true;
			console.error(e.stack);
		});

	while (!ret){
		//console.log("inf2")
	};

	return;


}

function GetDbPWQ() {
	var output = "";

	var ret = false;

	db.query('SELECT Product, Weight, Quantity FROM items')
		.then(res => {
			console.log("Hello There!");
			res.rows.forEach((item, index) => {
				output = output + item.Product + ',' + item.Weight + ',' + item.Quantity + ';';
			});
			console.log('output: ' + output);

			ret =true;
		})
		.catch(e =>{
			console.error(e.stack);
			ret = true;
		});

	while (!ret){
		//console.log("inf3")
	};

	return output;
	
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