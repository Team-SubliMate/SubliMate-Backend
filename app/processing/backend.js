const db = require('../db');

const WEIGHT_ERROR = 0.05;

var itemAddedQueue = []
var itemRemovedQueue = []

// TODO: the shelfId 1 would need to change
const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry)' +
					'Values (1, $1, $2, $3, $4, $5);'

function putDatabase(product, weight, quantity, ws){
	// TODO: the 1 in this query would need to be a shelfId
	// Need these calls to be synchornous, so have to put the next ones into the callback
	// its kind of gross but what else can we do? =>
	// => make a stored procedure?
	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
      var itemId = res.rows[0]['getnextitemid'];
      var date = new Date();
      var item = {'shelfid': '1', 'itemid': itemId, 'product': product, 'weight': weight, 'quantity': quantity, 'entry': date};
			ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
      db.query(INSERT_TEXT, [itemId, product, weight, quantity, date]);
		})
		.catch(e => {
			console.error(e.stack);
		})
}

function updateRemovalTime(item, setNull) {
	var d = new Date()
	if (setNull){
		d = null
	}
	db.query('update items set removedat = $1 where shelfid = $2 and itemid = $3', [d, item.shelfid, item.itemid], function(err, res) {
        if (err) {
            console.log('Error here')
            console.log(err)
            return next(err)
        }
        console.log(res.rows)
    })
}

function updateItemWeight(item, weight) {
  item.weight = weight;
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
function getItems(){
	db.query('SELECT * FROM items WHERE removedat IS NULL', function(err, res) {
    	if (err) {
    		console.log('Error here')
			console.log(err)
      		return next(err)
    	}
    	console.log(res.rows)
 	})
}

function getItemsNearWeight(weight, ws){
	db.query('SELECT * FROM items where removedat IS NULL and weight between $1 and $2', [weight * (1 - WEIGHT_ERROR), weight *  (1 + WEIGHT_ERROR)])
		.then(res => {
			nearbyItems(res.rows, ws)
  	})
		.catch(e => console.error(e.stack))
}

// TODO: have this actually create things and put item into queue
function manualEntry(item) {
    itemAddedQueue.push({'product': item.product, 'quantity': item.quantity})
}

// TODO: check weight value
// if up, then check for item information
// if down, check database for things and whatever
function weightChange(difference, ws) {
	var weight = parseInt(difference)

	// item added
	if (weight > 0){
		if (itemRemovedQueue.length == 1) {
      //updating weight on last removed item
      var item = itemRemovedQueue.pop()
      updateItemWeight(item, weight)
      updateRemovalTime(item, true)
      ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
		} else if (itemRemovedQueue.length > 1) {
      //multiple items removed, re-adding one of the removed items
      var item = itemRemovedQueue[0];
      for (var i = 0; i < itemRemovedQueue.length; i++) {
        if (Math.abs(itemRemovedQueue[i].weight - difference) < Math.abs(item.weight - difference)) {
          item = itemRemovedQueue[i];
        }
      }
      updateItemWeight(item, weight);
      updateRemovalTime(item, true);
      itemRemovedQueue.splice(itemRemovedQueue.indexOf(item),1);
    } else {
      if (itemAddedQueue.length < 1){
        console.log('Made a mistake! weight change without an item manually added')
        return
      }
      var itemInfo = itemAddedQueue.pop()
      putDatabase(itemInfo.product, weight, itemInfo.quantity, ws)
		}
	}
	else if (weight < 0){
		getItemsNearWeight(Math.abs(weight), ws)
	}
}

function itemRemoved(itemId, ws) {
  db.query('SELECT * FROM items WHERE ItemId = $1', [itemId])
    .then(res => {
      itemRemovedQueue.push(res.rows[0]);
      updateRemovalTime(res.rows[0], false);
      ws.send(JSON.stringify({'type': 'ITEM_REMOVED','value': itemId}))
    })
    .catch(e => console.error(e.stack))
}

function nearbyItems(nearbyItems, ws){
	// do something here. Remove the item or return a list if possible
	if (nearbyItems.length < 1) {
        console.log('no items found')
	}
	if (nearbyItems.length == 1) {
  	console.log('only one matching item')
  	itemRemovedQueue.push(nearbyItems[0])
  	updateRemovalTime(nearbyItems[0], false)
    //send to android that we removed one item
    ws.send(JSON.stringify({'type': 'ITEM_REMOVED','value': nearbyItems[0].itemid}))
	}
	if (nearbyItems.length > 1) {
  	//TODO send the choices to the android
  	console.log('multiple items found')
    ws.send(JSON.stringify({'type': 'WHICH_ITEM_REMOVED','value': nearbyItems.map(x => x.itemid)}))
	}
}

function removeItem(itemId, ws) {
  db.query('SELECT * FROM items where itemid = $1', itemId)
    .then(res => {
      nearbyItems(res.rows, ws)
    })
    .catch(e => console.error(e.stack))
}

// TODO: have barcodes handle quantity?
function quantity(num) {
	// take in a number and add it to the current item
	if (itemAddedQueue.length < 1){
		console.log('Made a mistake! doing nothing in quantity')
		return
	}
	var item = itemAddedQueue.pop()
    itemAddedQueue.push({'product': item['product'], 'quantity' : num})
}

module.exports = {
	addQuantity: (num) => {
		quantity(num)
	},
	manualEntry: (item) => {
		manualEntry(item)
	},
	processWeightChange: (difference, ws) => {
		weightChange(difference, ws)
	},
	getItemList: () => {
		getItems()
	},
	addItem: (product, weight, quantity) => {
		putDatabase(product, weight, quantity, ws)
	},
  itemRemoved: (itemId, ws) => {
    itemRemoved(itemId, ws)
  }
}
