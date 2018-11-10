const backend = require('../backend');
const db = require('./test_db_helper.js')

// mocking the web socket
function send(message) {

}

class mock_ws {
	send(message) {
		return;
	}
}

const ws = new mock_ws();

function addItem(){
	db.ResetAndPopulateDb();
	console.log("test1");

	backend.manualEntry({'product': 'Test item', 'quantity': 1});
	console.log("test2");
	backend.processWeightChange(100, ws);
	console.log("test3");

	items = backend.getItemList();
	console.log("test4");

	
}

function testReset(){
	db.ResetAndPopulateDb();
	return true;
}

module.exports.AddItem = addItem;
module.exports.TestReset = testReset;

/*module.exports = {
	addItem: () => {
		addItem();
	}
}*/