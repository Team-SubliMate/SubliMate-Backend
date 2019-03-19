var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

var foodkeeper = require('../expiration/foodkeeper.json');
var bulk = [];

// check if elastocsearch is set up, if not, set it up
// probably could/should change to .then, but im lazy and this works
const exists =  client.count({
  index: 'product_expir'
}, function(error, response,  status) {
  if (error) {
    if (response.error.type === 'index_not_found_exception') {
      client.indices.create({
          index: 'product_expir'
      }, function(error, response, status) {
        if (error) {
          console.log(error)
        } else {
          // index created, push data into it
          console.log("created a new index");
          foodkeeper.forEach(product =>{
            bulk.push({index:{ 
                _index:"product_expir", 
                _type:"product_list",
              }          
            })
            bulk.push(product)
          })
          //perform bulk indexing of the data passed
          client.bulk({body:bulk}, function( err, response  ){ 
            if( err ){ 
               console.log("Failed Bulk operation".red, err) 
            } else { 
              console.log("Successfully imported".green);
            }
          });
        }
      });
    }
  } else {
    if (response.count > 0) {
      console.log('index exists with data in it');
    }
  }
});

function getDateFromItem(item) {
  var duration;
  var metric;

  if (!item) {
    // not good
    return;
  }

  if (item.Pantry_Max) {
    duration = item.Pantry_Max;
    metric = item.Pantry_Metric;
  }

  if (item.DOP_Pantry_Max) {
    duration = item.DOP_Pantry_Max;
    metric = item.DOP_Pantry_Metric;
  }

  if (item.Refrigerate_Max) {
    duration = item.Refrigerate_Max;
    metric = item.Refrigerate_Metric;
  }

  if (item.DOP_Refrigerate_Max) {
    duration = item.DOP_Refrigerate_Max;
    metric = item.DOP_Refrigerate_Metric;
  }

  if (duration && metric) {
    var today = new Date();
    var expirationDate = new Date();

    if (metric === "Days") {
      expirationDate.setDate(today.getDate() + duration);
    } else if (metric === "Weeks") {
      expirationDate.setDate(today.getDate() + (duration * 7));
    } else if (metric === "Months") {
      expirationDate.setMonth(today.getMonth() + duration);
    } else if (metric === "Years") {
      expirationDate.setFullYear(today.getFullYear() + duration);
    } else {
      // not good
      return;
    }

    return expirationDate;

  } else {
    // not good
    return;
  }
}

function getExpiryDate(title) {
  var body = {
    size: 1,
    from: 0, 
    "query": {
      "multi_match" : {
        "query": title,
        "type": "best_fields",
        "fields": [ "Name^2", "Keywords" ],
        "tie_breaker": 0.3
      }
    }
  };

  return client.search({index:'product_expir',  body:body, type:'product_list'})
  .then(results => {
    if (results.hits.hits[0]) {
      var itemExpirationInfo = results.hits.hits[0]._source;
      var ret = getDateFromItem(itemExpirationInfo);

      return ret;
    }
  })
  .catch(err=>{
    console.log(err)
  });
}

module.exports.getExpiryDate = getExpiryDate;
