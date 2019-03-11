const db = require('../db');
var moment = require('moment');

const WEIGHT_ERROR = 0.05;
const TIME_THRESHOLD = 15; //300 for real, 15 for testing, 30 for demo?

var itemAddedQueue = []
var itemRemovedQueue = []

// TODO: the shelfId 1 would need to change
const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry, UPC, ImgUrl)' +
					'Values (1, $1, $2, $3, $4, $5, $6, $7);'

function cleanQueues() {
  var now = moment(new Date());

  for (var i = 0; i < itemRemovedQueue.length; i++) {
    var item = itemRemovedQueue.pop()
    var diff = moment(now).diff(item.lasttouched, 'seconds');
    console.log(diff);
    if (diff <= TIME_THRESHOLD){
      itemRemovedQueue.push(item);
    }
  }

  for (var i = 0; i < itemAddedQueue.length; i++) {
    var item = itemAddedQueue.pop()
    var diff = moment(now).diff(item.lasttouched, 'seconds');
    console.log(diff);
    if (diff <= TIME_THRESHOLD){
      itemAddedQueue.push(item);
    }
  }
}

function getUpcData() {
  db.query('SELECT Product, UPC, ImgUrl FROM items WHERE UPC IS NOT NULL')
    .then(res => {
      return res.rows;
    })
    .catch(e => {
      console.error(e.stack);
    });
}

function putDatabase(product, weight, quantity, upc, imgurl, ws){
	// TODO: the 1 in this query would need to be a shelfId

	db.query('SELECT * FROM GetNextItemId(1)')
		.then(res => {
      var itemId = res.rows[0]['getnextitemid'];
      var date = new Date();
      var item = {'shelfid': '1', 'itemid': itemId, 'product': product, 'weight': weight, 'quantity': quantity, 'entry': date, 'imgurl': imgurl};
			ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
      db.query(INSERT_TEXT, [itemId, product, weight, quantity, date, upc, imgurl])
      .then(res => {}).catch(e => {console.error(e.stack);});
		})
		.catch(e => {
			console.error(e.stack);
		});
}

function incrementItemQuantity(item) {
  db.query('update items set quantity = quantity + 1 where shelfid = $1 and itemid = $2', [item.shelfid, item.itemid], function(err, res) {
    if (err) {
          console.log('Error here')
          console.log(err)
          return next(err)
      }
      console.log(res.rows)
  });
}

function decrementItemQuantity(item) {
  db.query('update items set quantity = quantity - 1 where shelfid = $1 and itemid = $2', [item.shelfid, item.itemid], function(err, res) {
    if (err) {
          console.log('Error here')
          console.log(err)
          return next(err)
      }
      console.log(res.rows)
  });
}

function updateItemQuantity(item) {
  db.query('update items set quantity = $1 where shelfid = $2 and itemid = $3', [item.quantity, item.shelfid, item.itemid], function(err, res) {
      if (err) {
          console.log('Error here')
          console.log(err)
          return next(err)
      }
      console.log(res.rows)
  });
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
    });
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
  });
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
 	});
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
    itemAddedQueue.push({'product': item.product, 'quantity': item.quantity, 'lasttouched': moment(new Date()), 'upc': item.upc, 'imgurl': item.imgurl});
}

// used in weightChange for checking things from the removed queue
// need to see if actually remove the item or just update the quantity
function updateItemFromRemovedQueue(item, weight, ws) {
  updateItemWeight(item, weight);
  item.lasttouched = moment(new Date());
  if (item.quantity <= 1) {
    incrementItemQuantity(item);
    updateRemovalTime(item, true);
  }
  else {
    item.quantity -= 1;
    incrementItemQuantity(item);
    updateRemovalTime(item, true);
    itemRemovedQueue.push(item);
  }
  ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
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
      var item = itemRemovedQueue.pop();
      updateItemFromRemovedQueue(item, weight, ws);
		} else if (itemRemovedQueue.length > 1) {
      //multiple items removed, re-adding one of the removed items
      var item = itemRemovedQueue[0];
      for (var i = 0; i < itemRemovedQueue.length; i++) {
        if (Math.abs(itemRemovedQueue[i].weight - difference) < Math.abs(item.weight - difference)) {
          item = itemRemovedQueue[i];
        }
      }
      itemRemovedQueue.splice(itemRemovedQueue.indexOf(item),1);
      updateItemFromRemovedQueue(item, weight, ws);
    } else {
      if (itemAddedQueue.length < 1){
        console.log('Made a mistake! weight change without an item manually added')
        return
      }
      var itemInfo = itemAddedQueue.pop()
      weight = weight / itemInfo.quantity
      putDatabase(itemInfo.product, weight, itemInfo.quantity, itemInfo.upc, itemInfo.imgurl, ws)
		}
	}
	else if (weight < 0){
		getItemsNearWeight(Math.abs(weight), ws)
	}
}

function updateItemRemovedQueue(item) {
  for (var i = 0; i < itemRemovedQueue.length; i++) {
    if (item.itemid == itemRemovedQueue[i].itemid) {
      var item = itemRemovedQueue[i];
      item.quantity += 1;
      return;
    }
  }

  item.quantity = 1;
  item.lasttouched = moment(new Date());
  itemRemovedQueue.push(item);
}

// need to check if should remove item or change quantity
function updateItemThatWasJustRemoved(item, ws) {
  console.log("ITEM:::");
  console.log(item)
  if (item.quantity <= 1){
    decrementItemQuantity(item);
    updateItemRemovedQueue(item);
    updateRemovalTime(item, false);
    ws.send(JSON.stringify({'type': 'ITEM_REMOVED','value': item.itemid, 'quantityChange': false}))
  }
  else {
    decrementItemQuantity(item);
    updateItemRemovedQueue(item);
    ws.send(JSON.stringify({'type': 'ITEM_REMOVED','value': item.itemid, 'quantityChange': true}))
  }
}

function itemRemoved(itemId, ws) {
  db.query('SELECT * FROM items WHERE ItemId = $1', [itemId])
    .then(res => {
      updateItemThatWasJustRemoved(res.rows[0], ws);
    })
    .catch(e => console.error(e.stack))
}

function nearbyItems(nearbyItems, ws){
  console.log("nearbyItems:::")
  console.log(nearbyItems)
	// do something here. Remove the item or return a list if possible
	if (nearbyItems.length < 1) {
    console.log('no items found')
	}
	if (nearbyItems.length == 1) {
  	console.log('only one matching item')
  	updateItemThatWasJustRemoved(nearbyItems[0], ws);
	}
	if (nearbyItems.length > 1) {
  	//TODO send the choices to the android
  	console.log('multiple items found')
    ws.send(JSON.stringify({'type': 'WHICH_ITEM_REMOVED','value': nearbyItems.map(x => x.itemid)}))
	}
}

// TODO: have barcodes handle quantity?
function quantity(num) {
	// take in a number and add it to the current item
	if (itemAddedQueue.length < 1){
		console.log('Made a mistake! doing nothing in quantity')
		return
	}
	var item = itemAddedQueue.pop()
  itemAddedQueue.push({'product': item['product'], 'quantity' : num, 'lasttouched': moment(new Date())});
}

function getAddedQueue() {
  for (var i = 0; i < itemAddedQueue.length; i++) {
    console.log("Item " + (i+1));
    console.log("ItemId: " + itemAddedQueue[i].itemid)
    console.log("Product: " + itemAddedQueue[i].product);
    console.log("Quantity: " + itemAddedQueue[i].quantity);
    console.log("LastTouched: " + itemAddedQueue[i].lasttouched);
  }
}

function getRemovedQueue() {
  for (var i = 0; i < itemRemovedQueue.length; i++) {
    console.log("Item " + (i+1));
    console.log("ItemId: " + itemRemovedQueue[i].itemid)
    console.log("Product: " + itemRemovedQueue[i].product);
    console.log("Quantity: " + itemRemovedQueue[i].quantity);
    console.log("Weight: " + itemRemovedQueue[i].weight);
    console.log("LastTouched: " + itemRemovedQueue[i].lasttouched);
  }
}

module.exports = {
	addQuantity: (num) => {
    cleanQueues();
		quantity(num);
	},
	manualEntry: (item) => {
    cleanQueues();
		manualEntry(item);
	},
	processWeightChange: (difference, ws) => {
    cleanQueues();
		weightChange(difference, ws);
	},
	getItemList: () => {
    cleanQueues();
		getItems();
	},
	addItem: (product, weight, quantity, ws) => {
    cleanQueues();
		putDatabase(product, weight, quantity, ws);
	},
  itemRemoved: (itemId, ws) => {
    cleanQueues();
    itemRemoved(itemId, ws);
  },
  getAQueue: () => {
    getAddedQueue();
  },
  getRQueue: () => {
    getRemovedQueue();
  },
  cleanQueue: () => {
    cleanQueues();
  },
  getAllUpcData: () => {
    getUpcData();
  }
}