var db = require('./db');
var crypto = require('crypto');
var config = require('./config');
var request = require('request');

module.exports = {
  registration: function(user, webhook, cb) {
    // create baron receipt with username
    var bpReceipt = { userId: user.userId, username: user.username };
    generateBPReceipt(bpReceipt, function(err, bpReceipt) {
      if (err) { return cb(err, undefined); }

      // generate an invoice for the registration fee
      var invoice = createRegistrationInvoice(user, webhook, bpReceipt);

      generateInvoice(invoice, bpReceipt, cb);
    });
  },
  auction: function(auctionId, user, webhook, cb) {
    // create baron receipt with username and auctionId
    var bpReceipt = {
      auctionId: auctionId,
      userId: user.userId,
      username: user.username
    };
    generateBPReceipt(bpReceipt, function(err, bpReceipt) {
      if (err) { return cb(err, undefined); }

      // generate an invoice for auction winners
      var invoice = createAuctionInvoice(auctionId, user, webhook, bpReceipt._id);
      
      generateInvoice(invoice, bpReceipt, cb);
    });
  }
};

function createAuctionInvoice(auctionId, user, webhook, token) {
  var invoice = {};
  invoice.currency = "BTC";
  invoice.min_confirmations = Number(config.bitcoin.numberOfConfs);
  invoice.line_items = [];
  for (var i = 0; i < user.lineItems.length; i++) {
    var lineItem = {};
    lineItem.description = "Auction " + auctionId + " Ad Slot";
    lineItem.quantity = 1;
    lineItem.amount = Number(user.lineItems[i]);
    invoice.line_items.push(lineItem);
  }
  invoice.access_token = config.baron.key;
  invoice.webhooks = {};
  invoice.webhooks.paid = {url: webhook, token: token};
  return invoice;
}

function createRegistrationInvoice(user, webhook, bpReceipt) {
  var invoice = {};
  invoice.currency = "BTC";
  invoice.min_confirmations = Number(config.bitcoin.numberOfConfs);
  invoice.line_items = [{
    description: user.username + " Auction Registration Fee",
    quantity: 1,
    amount: 0.25,
  }];
  invoice.access_token = config.baron.key;
  invoice.webhooks = {};
  invoice.webhooks.paid = {url: webhook, token: bpReceipt._id};
  return invoice;
}

function generateBPReceipt(bpReceipt, cb) {
  // insert baron receipt into db
  db.newBPReceipt(bpReceipt, function(err, body) {
    if (err) { return cb(err, undefined); }

    // use baron receipt id as webhook token
    bpReceipt._id = body.id;
    console.log("Created a BP Receipt with ID: " + body.id);

    cb(null, bpReceipt);
  });
}

function generateInvoice(invoiceForm, bpReceipt, cb) {
  // send invoice to baron and get invoice id
  request.post(
    {
      uri: config.baron.internalUrl + '/invoices',
      method: "POST",
      form: invoiceForm
    },
    function(err, response, body) {
      if (err) { return cb(err, undefined); }
      
      var invoiceId;
      try {
        // parse body into json (invoice)
        var invoice = JSON.parse(body);
        // get the invoiceId
        invoiceId = invoice.id;
      }
      catch (err) { return cb(err, undefined); }

      console.log("Invoice " + invoiceId + " created for BPReceipt: " + bpReceipt._id);

      // update baron receipt with invoiceId
      bpReceipt.invoiceId = invoiceId;
      bpReceipt.token = crypto.createHash('sha256').update(bpReceipt._id).digest('hex');
      db.updateBPReceipt(bpReceipt, function(err, body) {
        if (err) { return cb(err, undefined); }
        console.log("Updated BP Receipt " + bpReceipt._id + " with Invoice ID " + bpReceipt.invoiceId);
        cb(null, invoiceId);
      });
    }
  );
}