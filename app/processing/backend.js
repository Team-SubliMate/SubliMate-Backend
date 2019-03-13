const db = require('../db');
var moment = require('moment');

const WEIGHT_ERROR = 0.05;
const TIME_THRESHOLD = 15; //300 for real, 15 for testing, 30 for demo?

var itemAddedQueue = [];
var itemRemovedQueue = [];
var items = [];

function setItems(res){
  items = res;
}

getItems(setItems);

var soundList = {
  'BEEP': 'beep',
  'ERROR': 'error'
};

// TODO: the shelfId 1 would need to change
const INSERT_TEXT = 'INSERT INTO items(ShelfId, ItemId, Product, Weight, Quantity, Entry, UPC, ImgUrl)' +
					'Values (1, $1, $2, $3, $4, $5, $6, $7);'

const UPDATE_TEXT = 'UPDATE items SET Weight=$3, Quantity=$4, RemovedAt=$5 WHERE ItemId=$1 AND ShelfId=$2';

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

function sendErrorToClient(ws, message, sound, additional) {
  ws.send(JSON.stringify({
    'type': 'FLOW_ERROR',
    'message': message,
    'additional': additional,
    'sound': sound
  }));
}

function getUpcData(callback) {
  db.query('SELECT Product, UPC, ImgUrl FROM items WHERE UPC IS NOT NULL')
    .then(res => {
      if (res.rowCount > 0){
        callback(res.rows);  
      }
    })
    .catch(e => {
      console.error(e.stack);
    });
}

function updateItem(item, ws){
  removedAt = null;
  if (item.quantity <= 0){
    removedAt = new Date();
  }
  db.query(UPDATE_TEXT, [item.itemid, item.shelfid, item.weight, item.quantity, removedAt])
    .catch(e => {
      console.error(e.stack);
      sendErrorToClient(ws, "Failed to update item in db");
    })
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
        .then(res => { getItems(setItems); }).catch(e => {console.error(e.stack);});
		})
		.catch(e => {
			console.error(e.stack);
      sendErrorToClient(ws, "Failed to get next item id");
		});
}

//TODO: this should really return a list of them, but it doesnt yet
function getItems(callback){
	db.query('SELECT * FROM items WHERE removedat IS NULL')
    .then( res => {
    	console.log(res.rows);
      callback(res.rows);
 	  })
    .catch(err => {console.error(e.stack)});
}

function getLocalItemsNearWeight(weight, ws) {
  nearby = [];
  for(item in items){
    if (items[item].weight < weight *  (1 + WEIGHT_ERROR) &&
      items[item].weight > weight *  (1 - WEIGHT_ERROR)){
      nearby.push(items[item]);
    }
  }

  return nearby;
}

// TODO: have this actually create things and put item into queue
function manualEntry(item) {
    itemAddedQueue.push({'product': item.product, 'quantity': item.quantity, 'lasttouched': moment(new Date()), 'upc': item.upc, 'imgurl': item.imgurl});
}

function getItemFromLocal(itemid){
  for (item in items){
    if (items[item].itemid == itemid){
      return items[item];
    }
  }
  console.log("SOMETIMES ERROR: didn't find item in local with id " + itemid);
  return null;
}

function removeItemFromLocal(itemid){
  for (item in items){
    if (items[item].itemid == itemid){
     items.splice(item ,1);
    }
  }
}

// used in weightChange for checking things from the removed queue
// need to see if actually remove the item or just update the quantity
function updateItemFromRemovedQueue(removedItem, weight, ws) {
  var item = getItemFromLocal(removedItem.itemid);
  if (item == null){
    console.log(removedItem);
    removedItem.quantity = 1;
    removedItem.weight = weight;
    ws.send(JSON.stringify({'type': 'ITEM_ADDED','value': item}));
    updateItem(removedItem);
    items.push(removedItem);
    return;
  }

  removedItem.lasttouched = moment(new Date());
  item.quantity += 1;
  item.weight = weight;
  ws.send(JSON.stringify({'type': 'ITEM_UPDATED','itemid': item.itemid, 'quantity': item.quantity}));

  removedItem.weight = weight;
  removedItem.quantity -= 1;
  if (removedItem.quantity > 0){
    itemRemovedQueue.push(removedItem);
  }
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
      var removedItem = itemRemovedQueue.pop();
      updateItemFromRemovedQueue(removedItem, weight, ws);
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
        sendErrorToClient(ws, "Unexpected item in the weight area!", soundList['BEEP']);
        console.log('Made a mistake! weight change without an item manually added')
        return;
      }
      var itemInfo = itemAddedQueue.pop();
      weight = weight / itemInfo.quantity;
      putDatabase(itemInfo.product, weight, itemInfo.quantity, itemInfo.upc, itemInfo.imgurl, ws)
		}
	}
	else if (weight < 0){
		nearby = getLocalItemsNearWeight(Math.abs(weight), ws)
    console.log("nearby " + nearby);
    nearbyItems(nearby, ws);
	}
}

function updateItemRemovedQueue(localItem) {
  for (var i = 0; i < itemRemovedQueue.length; i++) {
    if (localItem.itemid == itemRemovedQueue[i].itemid) {
      var item = itemRemovedQueue[i];
      item.quantity += 1;
      item.lasttouched = moment(new Date());
      return;
    }
  }

  var item = JSON.parse(JSON.stringify(localItem));
  item.quantity = 1;
  item.lasttouched = moment(new Date());
  itemRemovedQueue.push(item);
}

function removeAnItem(itemid, ws){
  console.log(itemid);
  var item = getItemFromLocal(itemid);
  console.log("ITEM:::");
  console.log(item)
  item.quantity -= 1;
  updateItem(item);
  updateItemRemovedQueue(item);
  if (item.quantity < 1){
    removeItemFromLocal(item.itemid);
    ws.send(JSON.stringify({'type': 'ITEM_REMOVED','value': item.itemid}))
  }
  else{
    ws.send(JSON.stringify({'type': 'ITEM_UPDATED','itemid': item.itemid, 'quantity': item.quantity, 'where': 'here'}))
  }
}

function nearbyItems(nearbyItems, ws){
  console.log("nearbyItems:::")
  console.log(nearbyItems)
	// do something here. Remove the item or return a list if possible
	if (nearbyItems.length < 1) {
    sendErrorToClient(ws, "No items found with that weight.", soundList['BEEP']);
    console.log('no items found')
	}
	else if (nearbyItems.length == 1) {
  	console.log('only one matching item')
  	removeAnItem(nearbyItems[0].itemid, ws);
	}
	else if (nearbyItems.length > 1) {
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
  itemAddedQueue.push({'product': item['product'], 'quantity' : num, 'lasttouched': moment(new Date()), 'upc': item.upc, 'imgurl': item.imgurl});
}

function getAddedQueue() {
  for (var i = 0; i < itemAddedQueue.length; i++) {
    console.log("Item " + (i+1));
    console.log(itemAddedQueue[i]);
  }
}

function getRemovedQueue() {
  for (var i = 0; i < itemRemovedQueue.length; i++) {
    console.log("Item " + (i+1));
    console.log(itemRemovedQueue[i]);
  }
}

function placeholder () {

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
    console.log(items);
	},
	addItem: (product, weight, quantity, ws) => {
    cleanQueues();
		putDatabase(product, weight, quantity, ws);
	},
  itemRemoved: (itemId, ws) => {
    cleanQueues();
    removeAnItem(itemId, ws);
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
  getAllUpcData: (callback) => {
    getUpcData(callback);
  }
}