var express = require('express');
var router = express.Router();
const db = require('../db')

/* GET API page. */
router.get('/', function(req, res, next) {
  var routes = router.stack.map(r => r.route && r.route.path);
  routes.shift() // Remove the '/' route

  res.render('api', {
      title: 'SubliMate APIs',
      routes: routes
  });
});

router.get('/inventory', function(req, res, next) {
  const mock = {
    items: [
      {
        "shelfid":1,
        "itemid":1,
        "weight":150,
        "product":"Test",
        "quantity":2,
        "entry":"2018-07-13T04:00:00.000Z",
        "bestbefore":null,
        "removedat":null
      },
      {
        "shelfid":1,
        "itemid":2,
        "weight":120,
        "product":"Test2",
        "quantity":1,
        "entry":"2018-07-13T04:00:00.000Z",
        "bestbefore":null,
        "removedat":null
      },
      {
        "shelfid":1,
        "itemid":3,
        "weight":50,
        "product":"Test75",
        "quantity":2,
        "entry":"2018-07-13T04:00:00.000Z",
        "bestbefore":null,
        "removedat":null
      }
    ]
  };

  // TODO: Retrieve data from database and send as json
  db.query('SELECT * FROM items WHERE removedat IS NULL', function(err, result) {
    if (err) {
      console.log("Error in DB: " + err);
      res.json(mock);
      return;
    }
    for (var i = 0; i < result.rows.length; i++) {
	if (result.rows[i].bestbefore) {
	    result.rows[i].bestbefore = result.rows[i].bestbefore.toLocaleDateString();
	}
    }

    var data = {
      items: result.rows
    };
    console.log(data);

    res.json(data);
  });
});

module.exports = router;
