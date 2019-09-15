var express = require("express");
var router = express.Router();
var path = require("path");

var request = require("request");
var cheerio = require("cheerio");

router.get("/", function(req, res) {
  res.redirect("/articles");
});

router.get("/scrape", function(req, res) {
  request("http://www.theverge.com", function(error, response, html) {
    var $ = cheerio.load(html);
    var titlesArray = [];
    $(".c-entry-box-compact_title").each(function(i, element) {
      var results = {};
      results.title = $(this)
        .children("a")
        .text();
      results.link = $(this)
        .children("a")
        .attr("href");

      if (results.title !== "" && results.link !== "") {
        if (titlesArray.indexOf(results.title) == -1) {
          titlesArray.push(results.title);
          Article.count({ title: results.title }, function(err, test) {
            if (test == 0) {
              var entry = new Articles(results);
              entry.save(function(err, doc) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(doc);
                }
              });
            }
          });
        } else {
          console.log("Article already exists!");
        }
      } else {
        console.log("Not saved into the DB, missing data");
      }
    });
    res.redirect("/");
  });
});

router.get("/articles", function(req, res) {
  Article.find()
    .sort()({ _id: -1 })
    .exec(function(err, doc) {
      if (err) {
        console.log(err);
      } else {
        var artcl = { article: doc };
        res.render("index", artcl);
      }
    });
});

router.get("/articles-json", function(req,res) {
  Article.find({}, function(err,))
}

module.exports = router