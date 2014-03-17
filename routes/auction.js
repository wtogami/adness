var db = require(__dirname + '/../db');

module.exports = {
  showAuction: function(req, res) {
    req.model.load('auction', req);
    req.model.load('bids', req);
    req.model.end(function(err, models) {
      var auction = models.auction;
      var bids = models.bids;
      if (err) console.log(err);
        var latestPrice;
        if (auction.winningBids.length > 0) {
          latestPrice = auction.winningBids[0].price + 0.05;
        }
        else {
          latestPrice = 0.50;
        }
      // remove first item because it's the auction
      models.bids.splice(0, 1);
      res.render('auction', {
        auction: auction,
        bids: bids,
        browsePrefix: req.browsePrefix,
        latestPrice: latestPrice,
        user: req.user
      });
    });
  },
  editAuction: function(req, res) {
    req.model.load('auction', req);
    req.model.end(function(err, models) {
      if (err) console.log(err);
      res.render('auctionEdit', {
        auction: models.auction,
        browsePrefix: req.browsePrefix,
        user: req.user
      });
    });
  },
  enableAuction: function(req, res) {
    req.model.load('auction', req);
    req.model.end(function(err, models) {
      if (err) { console.log(err); res.redirect('/admin'); }
      else {
        // enable auction
        models.auction.enabled = true;
        // save auction
        db.updateAuction(models.auction, function(err, body, header) {
          if (err) { console.log(err); }
          res.redirect('/admin');
        });
      }
    });
  },
  disableAuction: function(req, res) {
    req.model.load('auction', req);
    req.model.end(function(err, models) {
      if (err) { console.log(err); res.redirect('/admin'); }
      else {
        // disable auction
        models.auction.enabled = false;
        // save auction
        db.updateAuction(models.auction, function(err, body, header) {
          if (err) { console.log(err); }
          res.redirect('/admin');
        });
      }
    });
  },
  newAuction: function(req, res) {
    db.newAuction(req.body, function(err, body, header) {
      if (err) { console.log(err); }
      res.redirect('/admin');
    });
  },
  updateAuction: function(req, res) {
    req.params.auctionId = req.body.auctionId;
    req.model.load('auction', req);
    req.model.end(function(err, models) {
      if (err) { console.log(err); res.redirect('/admin'); }
      else {
        var auction = models.auction;
        if (req.body.start) auction.start = req.body.start;
        if (req.body.end) auction.end = req.body.end;
        if (req.body.slots) auction.slots = req.body.slots;
        if (req.body.enabled) auction.enabled = req.body.enabled;
        db.updateAuction(auction, function(err, body) {
          if (err) { console.log(err); }
          res.redirect('/admin');
        });
      }
    });
  },
  deleteAuction: function(req, res) {
    db.deleteAuction(req.params.auctionId, function(err, body) {
      if (err) { console.log(err); }
      res.end();
    });
  }
};
